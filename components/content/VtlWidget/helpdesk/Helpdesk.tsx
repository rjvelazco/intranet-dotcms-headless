"use client";

import { useEffect, useState } from "react";
import type { HelpdeskBoard } from "@/lib/freshdesk.types";
import { TicketBoard } from "./TicketBoard";
import type { VtlWidgetContentlet } from "../types";

/**
 * Helpdesk dashboard widget (`widgetType: "helpdesk"`).
 *
 * The React port of `/application/vtl/support/freshdesk-main.vtl`: the ticket
 * board for the current Freshdesk agent, grouped by status and ordered by
 * urgency.
 *
 * This is a client component because the registry it's mapped in is imported
 * by `DotCMSPage`, which is one itself. So the data comes over the wire from
 * `/api/helpdesk`, keeping the Freshdesk credentials on the server — see
 * `lib/freshdesk.ts`, which ports what `detect-agent.vtl` did in the shared
 * Velocity context.
 */
export function Helpdesk({ widgetTitle }: VtlWidgetContentlet) {
  const [board, setBoard] = useState<HelpdeskBoard>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/helpdesk", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }

        return response.json() as Promise<HelpdeskBoard>;
      })
      .then(setBoard)
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;

        console.warn("[helpdesk] board fetch failed:", cause);
        setError("Couldn't load the ticket board.");
      });

    return () => {
      controller.abort();
    };
  }, []);

  const name = [board?.agent?.firstName, board?.agent?.lastName]
    .filter(Boolean)
    .join(" ");

  const notice = error ?? board?.error;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900">
          {widgetTitle || "Helpdesk"}
        </h2>
        {name ? <p className="text-sm text-slate-500">Welcome back {name}</p> : null}
      </header>

      {notice ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200/70">
          {notice}
        </p>
      ) : !board ? (
        <p className="text-sm text-slate-400">Loading tickets…</p>
      ) : (
        <TicketBoard
          domain={board.domain}
          sections={[
            { id: "ticket-list", heading: "🟢 Open Tickets", tickets: board.open },
            {
              id: "ticket-list-pending",
              heading: "🟡 Pending Tickets",
              tickets: board.pending,
            },
            {
              id: "ticket-list-onhold",
              heading: "🟠 On-hold Tickets",
              tickets: board.onHold,
            },
          ]}
        />
      )}
    </div>
  );
}
