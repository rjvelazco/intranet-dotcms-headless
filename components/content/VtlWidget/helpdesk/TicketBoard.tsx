"use client";

import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import type { Ticket } from "@/lib/freshdesk.types";

/** freshdesk-main.vtl: `sessionStorage` key prefix for the manual order. */
const STORAGE_PREFIX = "ticketOrder:";

/**
 * The manual order lives in sessionStorage, so it's read through
 * `useSyncExternalStore` rather than mirrored into component state: the
 * server renders the urgency order, and hydration swaps in the saved one.
 *
 * `cache` keeps the raw JSON per list so snapshots stay referentially stable
 * between renders, which `useSyncExternalStore` requires.
 */
const listeners = new Set<() => void>();
const cache = new Map<string, string | null>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function readOrder(listId: string): string | null {
  if (!cache.has(listId)) {
    try {
      cache.set(listId, sessionStorage.getItem(STORAGE_PREFIX + listId));
    } catch {
      // Private mode or blocked storage: no saved order.
      cache.set(listId, null);
    }
  }

  return cache.get(listId) ?? null;
}

function writeOrder(listId: string, ids: number[]): void {
  const raw = JSON.stringify(ids);

  try {
    sessionStorage.setItem(STORAGE_PREFIX + listId, raw);
  } catch {
    // Manual order just doesn't persist; the in-page order still updates.
  }

  cache.set(listId, raw);
  listeners.forEach((listener) => listener());
}

function clearOrders(listIds: string[]): void {
  for (const listId of listIds) {
    try {
      sessionStorage.removeItem(STORAGE_PREFIX + listId);
    } catch {
      // Nothing to clear.
    }

    cache.set(listId, null);
  }

  listeners.forEach((listener) => listener());
}

/**
 * Applies a saved order to the live tickets: saved ids first, in their saved
 * order, then anything that appeared since. Same merge as the VTL's
 * `applySavedOrder`.
 */
function applyOrder(tickets: Ticket[], raw: string | null): Ticket[] {
  if (!raw) return tickets;

  let saved: number[];
  try {
    saved = JSON.parse(raw) as number[];
  } catch {
    return tickets;
  }

  const byId = new Map(tickets.map((ticket) => [ticket.id, ticket]));
  const ordered = saved
    .map((id) => byId.get(id))
    .filter((ticket): ticket is Ticket => Boolean(ticket));
  const seen = new Set(ordered.map((ticket) => ticket.id));

  return [...ordered, ...tickets.filter((ticket) => !seen.has(ticket.id))];
}

const PRIORITY = {
  4: { label: "🔥 Urgent", className: "text-rose-700 bg-rose-50 ring-rose-200/70" },
  3: { label: "⚠️ High", className: "text-amber-700 bg-amber-50 ring-amber-200/70" },
  2: { label: "⚖️ Medium", className: "text-sky-700 bg-sky-50 ring-sky-200/70" },
} as const;

const LOW = { label: "✅ Low", className: "text-slate-600 bg-slate-50 ring-slate-200" };

function priorityBadge(priority: number) {
  return PRIORITY[priority as keyof typeof PRIORITY] ?? LOW;
}

/** Grid template shared by the header row and the ticket rows. */
const COLUMNS = "grid-cols-[1.5rem_6.5rem_5rem_1fr_10rem_9rem]";

export type TicketSection = { id: string; heading: string; tickets: Ticket[] };

/**
 * The ticket board: one reorderable list per status.
 *
 * Server order is already by `sortScore`; drag-and-drop overrides it and
 * persists for the browser session, as in freshdesk-main.vtl.
 */
export function TicketBoard({
  sections,
  domain,
}: {
  sections: TicketSection[];
  domain: string;
}) {
  const listIds = sections.map((section) => section.id).join(",");

  const reset = useCallback(() => {
    clearOrders(listIds.split(","));
  }, [listIds]);

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <TicketList key={section.id} section={section} domain={domain} />
      ))}

      <div className="flex items-center gap-3 text-xs text-slate-500">
        <button
          type="button"
          onClick={reset}
          title="Discard manual order and revert to urgency order"
          className="rounded border border-slate-300 bg-slate-100 px-2.5 py-1 text-slate-700 hover:bg-slate-200"
        >
          ↺ Reset order
        </button>
        <span>Drag rows to reorder — saved for this session.</span>
      </div>
    </div>
  );
}

function TicketList({
  section,
  domain,
}: {
  section: TicketSection;
  domain: string;
}) {
  const { id: listId, tickets } = section;

  const raw = useSyncExternalStore(
    subscribe,
    () => readOrder(listId),
    () => null,
  );

  const ordered = useMemo(() => applyOrder(tickets, raw), [tickets, raw]);
  const dragging = useRef<number | undefined>(undefined);

  // Moves the dragged ticket to the target's position, then persists.
  const drop = useCallback(
    (targetId: number) => {
      const draggedId = dragging.current;
      dragging.current = undefined;
      if (draggedId === undefined || draggedId === targetId) return;

      const moving = ordered.find((ticket) => ticket.id === draggedId);
      if (!moving) return;

      const without = ordered.filter((ticket) => ticket.id !== draggedId);
      const at = without.findIndex((ticket) => ticket.id === targetId);
      if (at < 0) return;

      writeOrder(listId, [
        ...without.slice(0, at).map((ticket) => ticket.id),
        moving.id,
        ...without.slice(at).map((ticket) => ticket.id),
      ]);
    },
    [listId, ordered],
  );

  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-800">
        {section.heading}{" "}
        <span className="font-normal text-slate-400">({ordered.length})</span>
      </h3>

      {ordered.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">No tickets.</p>
      ) : (
        <ul id={listId} className="mt-2 divide-y divide-slate-100">
          <li
            className={`grid ${COLUMNS} items-center gap-3 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400`}
          >
            <span />
            <span>Priority</span>
            <span>Ticket</span>
            <span>Subject</span>
            <span>Company</span>
            <span>Group</span>
          </li>

          {ordered.map((ticket) => (
            <TicketRow
              key={ticket.id}
              ticket={ticket}
              domain={domain}
              onDragStart={() => {
                dragging.current = ticket.id;
              }}
              onDrop={() => drop(ticket.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function TicketRow({
  ticket,
  domain,
  onDragStart,
  onDrop,
}: {
  ticket: Ticket;
  domain: string;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  const badge = priorityBadge(ticket.priority);
  const href = `https://${domain}/a/tickets/${ticket.id}`;

  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
      className={`grid ${COLUMNS} cursor-grab items-center gap-3 py-2 text-sm hover:bg-slate-50 active:cursor-grabbing`}
    >
      <span
        aria-hidden="true"
        title="Drag to reorder"
        className="select-none text-center font-bold tracking-tighter text-slate-400"
      >
        ⋮⋮
      </span>

      <span
        className={`justify-self-start rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${badge.className}`}
      >
        {badge.label}
      </span>

      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="font-mono text-xs text-blue-700 hover:underline"
      >
        #{ticket.id}
      </a>

      <span className="truncate text-slate-700" title={ticket.subject}>
        {ticket.subject}
      </span>

      <span className="truncate text-slate-600" title={ticket.company}>
        {ticket.company ? (
          <a href={href} target="_blank" rel="noreferrer" className="hover:underline">
            {ticket.company}
          </a>
        ) : null}
      </span>

      <span className="truncate text-xs text-slate-500" title={ticket.groupName}>
        {ticket.groupName}
      </span>
    </li>
  );
}
