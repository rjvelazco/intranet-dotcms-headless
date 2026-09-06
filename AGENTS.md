<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Secrets never live in the repo

Any credential you encounter — an API key, token, password, connection string,
signing secret, or private endpoint — gets extracted to an environment
variable. This applies to secrets you find in source files, in dotCMS content
or site fields, in VTL files you are porting, and to ones handed to you in
chat. Never inline one, and never commit one.

Every time, all three steps:

1. **Add the value to `.env.local`.** This file is gitignored. Read it through
   `process.env` — no fallback literal in the code.
2. **Add the *name only* to `.env.local.example`,** with an empty value and a
   comment saying what it is and where to get it. This file *is* committed, so
   it must never carry a value.
3. **Tell the user it has to be set on the host too** — Vercel, or wherever
   this deploys. `.env.local` is local-only, so a build that passes here still
   fails in production until the variable exists there. Name the variables
   explicitly; do not assume the user will infer them from the diff.

Also:

- If a secret was already committed, say so plainly. Rotating it is the user's
  call, but it needs raising — moving it to an env var does not un-leak it.
- Prefer storing the raw credential and deriving encoded forms (base64, basic
  auth headers) in code, so the env value stays recognisable.
- Server-only secrets must never be prefixed `NEXT_PUBLIC_`; that ships them
  to the browser.

# A missing env var warns; it does not crash the app

Assume every variable will be missing somewhere — a fresh clone, a preview
deploy, a teammate who pulled before reading the diff. Losing one feature
there is fine. Losing the whole app is not.

So when you add an environment variable, decide which kind it is:

- **Optional** — the app runs without it and one feature degrades. This is the
  default; assume it unless you can argue otherwise. Read it with
  `optionalEnv()` from `lib/env.ts`, which warns once and returns `undefined`.
  The feature then handles that: return an empty result, skip the call, render
  a notice. Never throw.
- **Critical** — nothing meaningful renders without it, like `DOTCMS_HOST`.
  Read it with `requiredEnv()`, which throws.

A feature-scoped credential is optional, even though the feature is useless
without it. `FRESHDESK_API_KEY` is the example: no key means the helpdesk
widget shows a notice, and every other page still works.

Two things to get right either way:

- **Never read a variable at module scope.** A throw there takes down every
  route that transitively imports the file, not just the one that needed the
  variable. Read it inside the function that uses it, and memoize the client
  or config it builds if that's expensive.
- **Say what the user will see.** The warning names the variable and the
  consequence — "the helpdesk widget will show a notice instead of the ticket
  board", not "missing config".

When a feature is degraded because of this, say so in the UI too. A silent
empty state reads as a bug; a short notice reads as configuration.
