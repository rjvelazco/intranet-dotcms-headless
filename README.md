# intranet-dotcms-headless

Headless dotCMS front end on Next.js 16 (App Router).

## Setup

```bash
cp .env.local.example .env.local   # then fill in DOTCMS_AUTH_TOKEN
npm run dev
```

Get a token from the dotCMS UI: **My Account → API Access Token**. The token
must come from the same instance as `DOTCMS_HOST` — a token minted on one
instance is rejected by another with `401 Invalid User`.

## What's wired

| Path | Role |
| --- | --- |
| `lib/env.ts` | `optionalEnv()` (warns) and `requiredEnv()` (throws) |
| `lib/dotcms.ts` | Client instance, `getPage()` (maps `NOT_FOUND` to the 404 page), `getNav()` |
| `lib/freshdesk.ts` | Freshdesk data layer for the helpdesk widget |
| `app/layout.tsx` | Fetches the nav, composes side nav + top nav + content area |
| `app/[[...slug]]/page.tsx` | Every route; maps the slug to a dotCMS path and fetches that page |
| `app/api/helpdesk/route.ts` | Server-side Freshdesk data for the helpdesk widget |
| `components/DotCMSPage.tsx` | Client wrapper: `useEditableDotCMSPage` (UVE) + `DotCMSLayoutBody` |
| `components/content/index.ts` | **Content type component registry — add your components here** |
| `components/content/VtlWidget/` | Dispatches VTL widgets on their `widgetType` field |
| `components/layout/` | `SideNav` and `TopNav`, both driven by `getNav()` |
| `app/not-found.tsx` | 404 page |

## Navigation

Both navs render live dotCMS data from the folder named by `NAV_ROOT`
(`/support`) via `getNav()`.

This calls `/api/v1/nav/{path}` directly instead of the SDK's
`client.nav.get()`, which can't be used here:

- it takes no site parameter, so it resolves against the instance's default
  site rather than `DOTCMS_SITE_ID`;
- its declared `DotCMSNavigationItem[]` return type is really a single root
  node with a `children` array.

dotCMS hrefs are mapped onto app routes by stripping `NAV_ROOT` and collapsing
`/index`, so `/support/cloud` becomes `/cloud` and `/support/index` becomes `/`.

## Routing

`app/[[...slug]]/page.tsx` is the only page. It's an *optional* catch-all, so
`/` matches it too — there's no separate `app/page.tsx`.

`toDotCMSPath()` in `lib/dotcms.ts` is the inverse of `toRoute()`: it joins the
slug segments under `NAV_ROOT`, and maps the empty slug to `${NAV_ROOT}/index`.
So `/cloud` fetches `/support/cloud`, and `/` fetches `/support/index`. A path
dotCMS doesn't have renders `app/not-found.tsx`.

Routes render on demand rather than being prerendered, because the set of
dotCMS pages isn't known at build time. The dotCMS calls underneath are still
cached (`getNav` for 300s), so this costs a render, not a round trip. Add
`generateStaticParams` driven by `getNav()` if you want the nav's pages
prerendered.

The nav fetch sets `revalidate: 300`, which also caps the whole route's
revalidation at 5 minutes. On failure `getNav()` logs a warning and returns
`[]`, so an outage empties the nav instead of breaking every page.

## Adding a content type component

Register components in `components/content/index.ts`, keyed by the content
type's **variable name** — matching is an exact string comparison, so casing
matters (this instance uses `Vtlwidget`, not `VtlWidget`). Unregistered types
render the SDK's `No Component for <Type>` placeholder in development, which
tells you what still needs building.

VTL widgets are a component map of their own: `VtlWidget` reads `widgetType` and
delegates to `components/content/VtlWidget/vtl-components.ts`. Widgets with no
`widgetType`, or an unmapped one, render a "Component in progress" card naming
the type.

`widgetType` is a Select field on the `Vtlwidget` content type. Its only option
today is `helpdesk` ("Helpdesk Dashboard").

Each mapped widget owns a folder named after its `widgetType`, with an
`index.ts` re-exporting the entry component, so its parts stay next to it:

```
VtlWidget/
  VtlWidget.tsx        # the dispatcher
  VtlWidgetPending.tsx # fallback for unmapped types
  vtl-components.ts    # the map
  helpdesk/            # widgetType: "helpdesk"
    Helpdesk.tsx
    TicketBoard.tsx
    index.ts
```

## Helpdesk widget

`Helpdesk.tsx` is the React port of two VTL files on the intranet site:

| VTL | Ported to |
| --- | --- |
| `/application/vtl/support/detect-agent.vtl` | `lib/freshdesk.ts` |
| `/application/vtl/support/freshdesk-main.vtl` | `components/content/VtlWidget/helpdesk/TicketBoard.tsx` |

`detect-agent.vtl` was the data layer: it fetched the agent's tickets once and
published `$opentickets` / `$pendingtickets` / `$onholdtickets` into the shared
Velocity context for the presentation widgets below it. `getHelpdeskBoard()`
does the same work and returns the three lists.

Behaviour kept from the VTL:

- Tickets come from `/search/tickets` for statuses 2, 3 and 9, then each is
  enriched via `/tickets/{id}?include=requester,company,stats`.
- Company name is resolved from the embedded company, then the requester's
  `company_id`, then the ticket's own — the VTL's three-step fallback.
- `sortScore` is `critTier * 1000 + (4 - priority)`, lower being more urgent,
  so `cf_severity: critical` outranks priority.
- Group ids map to tier names; unmapped ids render as `Group <id>`.
- Rows drag to reorder, persisted in `sessionStorage` for the session, with a
  **Reset order** button.
- The VTL's `$dotcache` TTLs become `fetch` `revalidate` values: 300s per
  ticket, 3600s per company.

One thing could not be ported. `detect-agent.vtl` resolved the agent off the
dotCMS session (`$session USER_ID` → `Staff` contentlet → `freshdeskAgentId`).
This app has no dotCMS session, so the agent comes from the environment:

- `FRESHDESK_AGENT_ID` wins if set;
- otherwise `FRESHDESK_AGENT_EMAIL` is looked up in the `Staff` content type
  for its `freshdeskAgentId`, then in Freshdesk's `/agents?email=`.

Replace `resolveAgent()` in `lib/freshdesk.ts` once the app has real auth.

Every `FRESHDESK_*` variable is optional. Missing one logs a `[env]` warning
naming the variable and the consequence, the widget renders a notice, and the
rest of the app is unaffected. Only `DOTCMS_HOST` and `DOTCMS_AUTH_TOKEN` are
critical enough to throw.

`FRESHDESK_API_KEY` is a secret and lives only in `.env.local` (gitignored).
dotCMS keeps the same key on the site as `host.freshdeskApiKey`, base64'd as
`<key>:X`; this app stores the raw key and encodes it at call time.

The widget never throws: a missing key, an unresolved agent, or an unreachable
Freshdesk renders a notice in place of the board.

## Next steps

- **Faster payloads** — the SDK logs a warning because no GraphQL query is
  supplied, so it falls back to `_map` and returns every field. Pass
  `graphql: { page, content, fragments }` to `client.page.get` to request only
  what you render.
- **On-demand nav revalidation** — the nav fetch is tagged `dotcms-nav`, so
  `revalidateTag("dotcms-nav")` can refresh it from a dotCMS webhook.
