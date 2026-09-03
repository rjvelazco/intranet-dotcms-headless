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
| `lib/dotcms.ts` | Client instance, `getPage()` (maps `NOT_FOUND` to the 404 page), `getNav()` |
| `app/layout.tsx` | Fetches the nav, composes side nav + top nav + content area |
| `app/page.tsx` | Server component; fetches the `/support/index` page asset |
| `components/DotCMSPage.tsx` | Client wrapper: `useEditableDotCMSPage` (UVE) + `DotCMSLayoutBody` |
| `components/content/index.ts` | **Content type component registry — add your components here** |
| `components/content/VtlWidget/` | Dispatches VTL widgets on their `vtlType` field |
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
Once a catch-all route exists (see Next steps), drop `toRoute()` and link to
`dotcmsHref` directly.

The nav fetch sets `revalidate: 300`, which also caps the whole route's
revalidation at 5 minutes. On failure `getNav()` logs a warning and returns
`[]`, so an outage empties the nav instead of breaking every page.

## Adding a content type component

Register components in `components/content/index.ts`, keyed by the content
type's **variable name** — matching is an exact string comparison, so casing
matters (this instance uses `Vtlwidget`, not `VtlWidget`). Unregistered types
render the SDK's `No Component for <Type>` placeholder in development, which
tells you what still needs building.

VTL widgets are a component map of their own: `VtlWidget` reads `vtlType` and
delegates to `components/content/VtlWidget/vtl-components.ts`. Widgets with no
`vtlType`, or an unmapped one, render a "Component in progress" card naming
the type.

## Next steps

- **All routes, not just the support home** — move `app/page.tsx` to
  `app/[[...slug]]/page.tsx` and pass the joined slug to `getPage()`.
- **Faster payloads** — the SDK logs a warning because no GraphQL query is
  supplied, so it falls back to `_map` and returns every field. Pass
  `graphql: { page, content, fragments }` to `client.page.get` to request only
  what you render.
- **On-demand nav revalidation** — the nav fetch is tagged `dotcms-nav`, so
  `revalidateTag("dotcms-nav")` can refresh it from a dotCMS webhook.
