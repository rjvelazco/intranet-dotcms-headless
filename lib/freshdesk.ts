/**
 * Freshdesk data layer for the helpdesk widget.
 *
 * This is a port of `/application/vtl/support/detect-agent.vtl` section (B):
 * resolve the current agent, fetch their tickets once, enrich each one with
 * company/requester/custom fields, score it, and bucket it by status.
 *
 * Two differences from the VTL, both forced by going headless:
 *
 *   - The VTL reads the agent off the dotCMS session (`$session USER_ID` ->
 *     Staff contentlet). This app has no dotCMS session, so the agent comes
 *     from FRESHDESK_AGENT_ID / FRESHDESK_AGENT_EMAIL. Swap `resolveAgent`
 *     for a session lookup once the app has real auth.
 *   - The VTL's `$dotcache` TTLs become Next `revalidate` values.
 *
 * Server only. The content component registry is imported by a client
 * component (`DotCMSPage`), so anything the widget imports directly would be
 * bundled for the browser — where the credentials don't exist. The widget
 * reaches this through `app/api/helpdesk/route.ts` instead, and the
 * `server-only` import makes a client import a build error rather than a
 * runtime one.
 */
import "server-only";

import { client } from "./dotcms";
import type { Agent, HelpdeskBoard, Ticket } from "./freshdesk.types";

export type { Agent, HelpdeskBoard, Ticket } from "./freshdesk.types";

/** detect-agent.vtl: `$dotcache.put($detailCacheKey, $detail, 300)`. */
const TICKET_TTL = 300;
/** detect-agent.vtl: `$dotcache.put($companyCacheKey, ..., 3600)`. */
const COMPANY_TTL = 3600;

/** Freshdesk status codes the board buckets on. Anything else is dropped. */
const STATUS = { open: 2, pending: 3, onHold: 9 } as const;

/**
 * Freshdesk group ids -> display names, from freshdesk-main.vtl. Unmapped ids
 * render as "Group <id>", same as the VTL's `#else` branch.
 */
const GROUP_NAMES: Record<number, string> = {
  153000436974: "Support Tier 1",
  153000436975: "Support Tier 2",
  153000477107: "Support Tier 3",
  153000255883: "Cloud Engineering",
};

type SearchHit = {
  id: number;
  subject?: string;
  priority?: number;
  status?: number;
  group_id?: number;
  fr_due_by?: string;
  due_by?: string;
  created_at?: string;
};

type TicketDetail = {
  created_at?: string;
  company_id?: number | string;
  company?: { id?: number | string; name?: string };
  requester?: { id?: number | string; name?: string; company_id?: number | string };
  custom_fields?: Record<string, unknown>;
};

function config() {
  const apiKey = process.env.FRESHDESK_API_KEY;
  const domain = (process.env.FRESHDESK_DOMAIN ?? "").replace(/^https?:\/\//, "");

  if (!apiKey || !domain) return undefined;

  return {
    domain,
    // Freshdesk takes the API key as the basic-auth username with any
    // password; the VTL stored this pre-encoded in `host.freshdeskApiKey`.
    authorization: `Basic ${Buffer.from(`${apiKey}:X`).toString("base64")}`,
  };
}

async function api<T>(
  cfg: NonNullable<ReturnType<typeof config>>,
  path: string,
  revalidate: number,
): Promise<T | undefined> {
  try {
    const response = await fetch(`https://${cfg.domain}/api/v2${path}`, {
      headers: { Authorization: cfg.authorization, "Content-Type": "application/json" },
      next: { revalidate, tags: ["freshdesk"] },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    console.warn(`[freshdesk] ${path} failed:`, error);

    return undefined;
  }
}

/**
 * Resolves whose board to render.
 *
 * Mirrors detect-agent.vtl's chain: an explicit agent id wins, otherwise look
 * the email up in the dotCMS Staff content type for its `freshdeskAgentId`,
 * and fall back to asking Freshdesk directly.
 */
async function resolveAgent(
  cfg: NonNullable<ReturnType<typeof config>>,
): Promise<Agent | undefined> {
  const explicitId = process.env.FRESHDESK_AGENT_ID?.trim();
  const email = process.env.FRESHDESK_AGENT_EMAIL?.trim();

  if (explicitId) return { id: explicitId, email };
  if (!email) return undefined;

  const staff = await staffByEmail(email);
  if (staff?.id) return staff;

  const agents = await api<{ id: number }[]>(
    cfg,
    `/agents?email=${encodeURIComponent(email)}`,
    TICKET_TTL,
  );

  const id = agents?.[0]?.id;

  return id ? { id: String(id), email } : undefined;
}

/** dotCMS Staff record for an agent, matching detect-agent.vtl's `$dotcontent.pull`. */
async function staffByEmail(email: string): Promise<Agent | undefined> {
  type Staff = {
    freshdeskAgentId?: number | string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };

  try {
    const { contentlets } = await client.content
      .getCollection<Staff>("Staff")
      .query((qb) => qb.field("email").equals(email))
      .sortBy([{ field: "modDate", order: "desc" }])
      .limit(1);

    const staff = contentlets?.[0];
    if (!staff?.freshdeskAgentId) return undefined;

    return {
      id: String(staff.freshdeskAgentId),
      email: staff.email ?? email,
      firstName: staff.firstName,
      lastName: staff.lastName,
    };
  } catch (error) {
    console.warn(`[freshdesk] Staff lookup failed for "${email}":`, error);

    return undefined;
  }
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

/**
 * detect-agent.vtl: `critTier * 1000 + (4 - priority)`, lower being more
 * urgent — critical severity outranks priority, priority breaks the tie.
 */
function sortScore(severity: string, priority: number): number {
  const critTier = severity.toLowerCase() === "critical" ? 0 : 1;

  return critTier * 1000 + (4 - priority);
}

/**
 * Resolves a company name from a ticket detail, walking the same three
 * sources the VTL does: the embedded company, the requester's company_id,
 * then the ticket's own company_id. `cache` dedupes lookups within a render.
 */
async function resolveCompany(
  cfg: NonNullable<ReturnType<typeof config>>,
  detail: TicketDetail | undefined,
  cache: Map<string, Promise<string>>,
): Promise<{ name: string; id?: string }> {
  if (!detail) return { name: "" };

  if (detail.company?.name) {
    return { name: detail.company.name, id: text(detail.company.id) || undefined };
  }

  const companyId =
    text(detail.requester?.company_id) || text(detail.company_id) || "";

  if (!companyId) return { name: "" };

  let pending = cache.get(companyId);
  if (!pending) {
    pending = api<{ name?: string }>(cfg, `/companies/${companyId}`, COMPANY_TTL).then(
      (company) => company?.name ?? "",
    );
    cache.set(companyId, pending);
  }

  return { name: await pending, id: companyId };
}

/** Enriches one search hit into a `Ticket`, as detect-agent.vtl's `#processTicket`. */
async function toTicket(
  cfg: NonNullable<ReturnType<typeof config>>,
  hit: SearchHit,
  cache: Map<string, Promise<string>>,
): Promise<Ticket> {
  const detail = await api<TicketDetail>(
    cfg,
    `/tickets/${hit.id}?include=requester,company,stats`,
    TICKET_TTL,
  );

  const custom = detail?.custom_fields ?? {};
  const severity = text(custom.cf_severity);
  const company = await resolveCompany(cfg, detail, cache);
  const priority = hit.priority ?? 1;
  const groupId = hit.group_id;

  return {
    id: hit.id,
    subject: hit.subject ?? "",
    priority,
    status: hit.status ?? 0,
    groupId,
    groupName: groupId ? (GROUP_NAMES[groupId] ?? `Group ${groupId}`) : "",
    createdAt: detail?.created_at ?? hit.created_at,
    frDueBy: hit.fr_due_by,
    dueBy: hit.due_by,
    company: company.name,
    companyId: company.id,
    requesterName: text(detail?.requester?.name),
    severity,
    supportType: text(custom.cf_support_type),
    pluginSupport: text(custom.cf_plugin_support),
    clientType: text(custom.cf_client_type),
    sortScore: sortScore(severity, priority),
  };
}

async function search(
  cfg: NonNullable<ReturnType<typeof config>>,
  query: string,
): Promise<SearchHit[]> {
  const response = await api<{ results?: SearchHit[] }>(
    cfg,
    `/search/tickets?query=${encodeURIComponent(`"${query}"`)}`,
    TICKET_TTL,
  );

  return response?.results ?? [];
}

/**
 * Builds the agent's ticket board.
 *
 * Never throws: a misconfigured or unreachable Freshdesk returns an `error`
 * so the widget degrades to a notice instead of taking the page down.
 */
export async function getHelpdeskBoard(): Promise<HelpdeskBoard> {
  const cfg = config();
  const empty = { domain: cfg?.domain ?? "", open: [], pending: [], onHold: [] };

  if (!cfg) {
    return {
      ...empty,
      error: "Set FRESHDESK_DOMAIN and FRESHDESK_API_KEY in .env.local.",
    };
  }

  const agent = await resolveAgent(cfg);
  if (!agent) {
    return {
      ...empty,
      error: "No Freshdesk agent resolved. Set FRESHDESK_AGENT_EMAIL or FRESHDESK_AGENT_ID.",
    };
  }

  const hits = (
    await Promise.all([
      search(cfg, `agent_id:${agent.id} AND (status:2 OR status:3)`),
      search(cfg, `agent_id:${agent.id} AND status:9`),
    ])
  ).flat();

  const cache = new Map<string, Promise<string>>();
  const tickets = await Promise.all(hits.map((hit) => toTicket(cfg, hit, cache)));

  // freshdesk-main.vtl sorts client-side by sortScore, then ticket id.
  const byUrgency = (a: Ticket, b: Ticket) =>
    a.sortScore - b.sortScore || a.id - b.id;

  return {
    agent,
    domain: cfg.domain,
    open: tickets.filter((t) => t.status === STATUS.open).sort(byUrgency),
    pending: tickets.filter((t) => t.status === STATUS.pending).sort(byUrgency),
    onHold: tickets.filter((t) => t.status === STATUS.onHold).sort(byUrgency),
  };
}
