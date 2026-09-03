import type { VtlComponent } from "./types";

/**
 * Maps a widget's `vtlType` value to the component that renders it.
 *
 * Keys are whatever strings you put in the dotCMS `vtlType` field:
 *
 *   import { TicketList } from "./TicketList";
 *   export const vtlComponents = { "ticket-list": TicketList };
 *
 * Anything unmapped — or a widget with no `vtlType` at all — falls through to
 * VtlWidgetPending, which names the missing type on screen.
 */
export const vtlComponents: Record<string, VtlComponent> = {
  // "ticket-list": TicketList,
};
