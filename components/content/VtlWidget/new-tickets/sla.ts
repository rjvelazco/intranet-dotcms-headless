import type { Ticket } from "@/lib/freshdesk.types";

/**
 * The ranking and countdown rules from priority-tickets.vtl.
 *
 * All of this ran in the browser in the VTL, for a reason the comment at the
 * top of that file spells out: Velocity had no working clock, so the server
 * emitted every open ticket as an `<li>` with `data-*` attributes and the
 * inline script scored, sorted and trimmed them. Here it is just functions —
 * but they still run client-side, because the board arrives over `fetch`.
 */

const HOUR = 3600 * 1000;
export const TWO_HOURS = 2 * HOUR;
export const EIGHT_HOURS = 8 * HOUR;
const ONE_DAY = 24 * HOUR;

/** priority-tickets.vtl: `TOP_N` — the rail shows the ten most urgent. */
export const TOP_N = 10;

/** priority-tickets.vtl truncated the subject server-side at 60 characters. */
const SUBJECT_MAX = 60;

export type SlaBucket = 0 | 1 | 2 | 3 | 4;

/**
 * How close a ticket is to breaching: 0 overdue, 1 under 2h, 2 under 8h,
 * 3 under 24h, 4 later or no SLA set.
 */
export function slaBucket(dueMs: number, now: number): SlaBucket {
  if (Number.isNaN(dueMs)) return 4;

  const delta = dueMs - now;
  if (delta <= 0) return 0;
  if (delta <= TWO_HOURS) return 1;
  if (delta <= EIGHT_HOURS) return 2;
  if (delta <= ONE_DAY) return 3;

  return 4;
}

/** Priority 4 (urgent) ranks first; anything below medium shares the last tier. */
function priorityBucket(priority: number): number {
  return priority === 4 ? 0 : priority === 3 ? 1 : priority === 2 ? 2 : 3;
}

export type RankedTicket = Ticket & {
  bucket: SlaBucket;
  critical: boolean;
  dueMs: number;
  score: number;
  truncatedSubject: string;
};

function truncate(subject: string): string {
  return subject.length > SUBJECT_MAX
    ? `${subject.slice(0, SUBJECT_MAX - 3)}...`
    : subject;
}

/**
 * Scores one ticket. Lower is more urgent:
 *
 *   critical * 100000 + slaBucket * 10000 + priorityBucket * 1000 - ageDays
 *
 * Severity outranks the SLA clock, which outranks priority; age breaks ties
 * in favour of the older ticket. `ageDays` is capped at 999 so a stale ticket
 * can never cross into the tier above it.
 */
export function rank(ticket: Ticket, now: number): RankedTicket {
  const critical = ticket.severity.toLowerCase() === "critical";
  const dueMs = Date.parse(ticket.dueBy ?? "");
  const bucket = slaBucket(dueMs, now);

  const createdMs = Date.parse(ticket.createdAt ?? "");
  const ageDays = Number.isNaN(createdMs)
    ? 0
    : Math.min(999, Math.floor((now - createdMs) / ONE_DAY));

  return {
    ...ticket,
    bucket,
    critical,
    dueMs,
    score:
      (critical ? 0 : 1) * 100000 +
      bucket * 10000 +
      priorityBucket(ticket.priority) * 1000 -
      ageDays,
    truncatedSubject: truncate(ticket.subject),
  };
}

/** Ranks the open tickets, most urgent first, ties broken by ticket id. */
export function rankAll(tickets: Ticket[], now: number): RankedTicket[] {
  return tickets
    .map((ticket) => rank(ticket, now))
    .sort((a, b) => a.score - b.score || a.id - b.id);
}

/**
 * SLA label and row styling. A critical ticket keeps its own treatment
 * whatever the clock says, as in the VTL's `slaClassAndLabel`.
 */
export function slaStyle(bucket: SlaBucket, critical: boolean) {
  const label = (["Overdue", "<2h", "<8h", "<24h", "On track"] as const)[bucket];

  if (critical) {
    return { label, className: "border-l-red-900 bg-red-50 ring-1 ring-red-200" };
  }

  const className = [
    "border-l-red-600 bg-red-50",
    "border-l-orange-600 bg-orange-50",
    "border-l-amber-500 bg-amber-50",
    "border-l-yellow-500 bg-slate-50",
    "border-l-emerald-500 bg-slate-50",
  ][bucket];

  return { label, className };
}

/** Marker colour matching the row's SLA tier. */
export function markerClass(bucket: SlaBucket, critical: boolean): string {
  if (critical) return "bg-red-900";

  return ["bg-red-600", "bg-orange-600", "bg-amber-500", "bg-yellow-500", "bg-emerald-500"][
    bucket
  ];
}

const PRIORITY_BADGES: Record<number, string> = {
  4: "🔥 Urgent",
  3: "⚠️ High",
  2: "⚖️ Medium",
};

export function priorityBadge(priority: number): string {
  return PRIORITY_BADGES[priority] ?? "✅ Low";
}

/**
 * The live countdown, as `1d 04h 12m` or `04:12:33`, suffixed "left" or
 * "over". Ported from the VTL's `fmt`.
 */
export function formatCountdown(ms: number): string {
  const overdue = ms < 0;
  const abs = Math.abs(ms);

  const seconds = Math.floor(abs / 1000) % 60;
  const minutes = Math.floor(abs / 60000) % 60;
  const hours = Math.floor(abs / HOUR) % 24;
  const days = Math.floor(abs / ONE_DAY);

  const pad = (n: number) => String(n).padStart(2, "0");
  const core =
    days > 0
      ? `${days}d ${pad(hours)}h ${pad(minutes)}m`
      : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return overdue ? `+${core} over` : `${core} left`;
}
