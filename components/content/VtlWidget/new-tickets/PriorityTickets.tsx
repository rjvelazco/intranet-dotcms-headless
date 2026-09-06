"use client";

import { useHelpdeskBoard } from "../useHelpdeskBoard";
import { PriorityList } from "./PriorityList";
import { TOP_N } from "./sla";

/**
 * Priority TODO rail (`widgetType: "new-tickets"`).
 *
 * The React port of `/application/vtl/support/priority-tickets.vtl`: the
 * agent's open tickets ranked by how close they are to breaching SLA, trimmed
 * to the ten most urgent, with a live countdown on each.
 *
 * That VTL was presentation only — it consumed the same `$opentickets` list
 * detect-agent.vtl published for the helpdesk board. `useHelpdeskBoard` keeps
 * that arrangement: both widgets on `/support` share one `/api/helpdesk`
 * request, and the Freshdesk credentials stay on the server.
 */
export function PriorityTickets() {
  const { board, error } = useHelpdeskBoard();

  const open = board?.open ?? [];
  const notice = error ?? board?.error;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-3">
        <h2 className="text-base font-semibold text-slate-900">
          🔥 SLA Priority Response 🔥
        </h2>
        {notice || !board ? null : (
          <p className="mt-0.5 text-sm text-slate-500">
            <strong className="font-semibold text-slate-700">Total:</strong>{" "}
            {open.length}
            {open.length > TOP_N ? ` — showing the top ${TOP_N}` : null}
          </p>
        )}
      </header>

      {notice ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200/70">
          {notice}
        </p>
      ) : !board ? (
        <p className="text-sm text-slate-400">Loading tickets…</p>
      ) : (
        <PriorityList tickets={open} domain={board.domain} />
      )}
    </div>
  );
}
