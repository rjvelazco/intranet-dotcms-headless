import { getHelpdeskBoard } from "@/lib/freshdesk";

/**
 * The helpdesk widget's data endpoint.
 *
 * The widget can't fetch this itself: the content component registry is
 * imported by `DotCMSPage`, a client component, so the widget runs in the
 * browser and has no access to the Freshdesk credentials. This handler keeps
 * them server-side and returns only the assembled board.
 *
 * Assembly is dynamic; the expensive upstream calls carry their own
 * `revalidate` windows inside `lib/freshdesk.ts`.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getHelpdeskBoard());
}
