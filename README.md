# intranet-dotcms-headless

Minimal headless dotCMS front end on Next.js 16 (App Router).

## Setup

```bash
cp .env.local.example .env.local   # then fill in DOTCMS_AUTH_TOKEN
npm run dev
```

Get a token from the dotCMS UI: **My Account → API Access Token**.

## What's wired

| Path | Role |
| --- | --- |
| `lib/dotcms.ts` | `createDotCMSClient` instance + `getPage()` (maps `NOT_FOUND` to the 404 page) |
| `app/page.tsx` | Server component; fetches the `/index` page asset |
| `components/DotCMSPage.tsx` | Client wrapper: `useEditableDotCMSPage` (UVE) + `DotCMSLayoutBody` |
| `components/content/index.ts` | **Content type component registry — add your components here** |
| `app/not-found.tsx` | 404 page |

## Adding a content type component

Nothing is registered yet, so in dev every contentlet renders `No Component for <Type>`.
That tells you exactly what to build.

1. Create `components/content/Banner.tsx` — contentlet fields arrive as props.
2. Register it in `components/content/index.ts`.

Keys are dotCMS **content type variable names**.

## Next steps

- **All routes, not just `/index`** — move `app/page.tsx` to `app/[[...slug]]/page.tsx` and pass the joined slug to `getPage()`.
- **Faster payloads** — the SDK logs a warning because no GraphQL query is supplied, so it falls back to `_map` and returns every field. Pass `graphql: { page, content, fragments }` to `client.page.get` to request only what you render.
