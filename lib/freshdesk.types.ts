/**
 * Shapes shared between the Freshdesk data layer and the widget that renders
 * it. Kept out of `lib/freshdesk.ts` because that module is `server-only` and
 * the widget is a client component.
 */

export type Ticket = {
  id: number;
  subject: string;
  priority: number;
  status: number;
  groupId?: number;
  groupName: string;
  createdAt?: string;
  frDueBy?: string;
  dueBy?: string;
  company: string;
  companyId?: string;
  requesterName: string;
  severity: string;
  supportType: string;
  pluginSupport: string;
  clientType: string;
  /** Lower is more urgent; computed by `sortScore` in `lib/freshdesk.ts`. */
  sortScore: number;
};

export type Agent = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
};

export type HelpdeskBoard = {
  agent?: Agent;
  /** Freshdesk domain, so the client can build ticket links. */
  domain: string;
  open: Ticket[];
  pending: Ticket[];
  onHold: Ticket[];
  /** Set when the board can't be built; the widget renders this instead. */
  error?: string;
};
