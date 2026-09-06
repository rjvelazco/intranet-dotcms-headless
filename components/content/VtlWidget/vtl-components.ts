import { Helpdesk } from "./helpdesk";
import { PriorityTickets } from "./new-tickets";
import type { VtlComponent } from "./types";

/**
 * Maps a widget's `widgetType` value to the component that renders it.
 *
 * Each entry gets its own folder next to this file, named after the key, with
 * an `index.ts` re-exporting the entry component:
 *
 *   ticket-list/
 *     TicketList.tsx    <- the entry component
 *     TicketRow.tsx     <- parts only this widget uses
 *     index.ts          <- export { TicketList } from "./TicketList";
 *
 *   import { TicketList } from "./ticket-list";
 *   export const vtlComponents = { "ticket-list": TicketList };
 *
 * Anything unmapped — or a widget with no `widgetType` at all — falls through
 * to VtlWidgetPending, which names the missing type on screen.
 */
export const vtlComponents: Record<string, VtlComponent> = {
  helpdesk: Helpdesk,
  "new-tickets": PriorityTickets,
};
