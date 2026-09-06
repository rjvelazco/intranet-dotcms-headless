"use client";

import { useEffect, useMemo, useState } from "react";
import type { Ticket } from "@/lib/freshdesk.types";
import {
  EIGHT_HOURS,
  TOP_N,
  TWO_HOURS,
  formatCountdown,
  markerClass,
  priorityBadge,
  rankAll,
  slaStyle,
  type RankedTicket,
} from "./sla";

/**
 * The ranked top-ten list with its live SLA countdown.
 *
 * Ranking and the countdown use two different clocks, as in the VTL: the
 * order is fixed once per board so rows don't reshuffle underneath the
 * reader, while `now` ticks every second to drive the countdown.
 */
export function PriorityList({ tickets, domain }: { tickets: Ticket[]; domain: string }) {
  const { now, startedAt } = useClock();
  const ranked = useMemo(() => rankAll(tickets, startedAt), [tickets, startedAt]);

  if (ranked.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-slate-500">
        🎉 You&apos;re all clear — no open tickets assigned.
      </p>
    );
  }

  return (
    <ol className="space-y-1.5">
      {ranked.slice(0, TOP_N).map((ticket, index) => (
        <PriorityRow
          key={ticket.id}
          ticket={ticket}
          position={index + 1}
          domain={domain}
          now={now}
        />
      ))}
    </ol>
  );
}

/**
 * Two clocks off one mount: `startedAt` is frozen and ranks the list once,
 * `now` ticks every second and only drives the countdown.
 */
function useClock(): { now: number; startedAt: number } {
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      clearInterval(id);
    };
  }, []);

  return { now, startedAt };
}

function PriorityRow({
  ticket,
  position,
  domain,
  now,
}: {
  ticket: RankedTicket;
  position: number;
  domain: string;
  now: number;
}) {
  const sla = slaStyle(ticket.bucket, ticket.critical);
  const href = `https://${domain}/a/tickets/${ticket.id}`;

  return (
    <li
      className={`relative rounded border-l-[3px] py-2 pl-9 pr-2 text-xs ${sla.className}`}
    >
      <span
        aria-hidden="true"
        className={`absolute left-2 top-2 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold text-white ${markerClass(
          ticket.bucket,
          ticket.critical,
        )}`}
      >
        {position}
      </span>

      {ticket.critical ? (
        <p className="mb-1 inline-block rounded bg-red-900 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white">
          🚨 CRITICAL
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded border border-slate-200 bg-white px-1.5 py-px text-[10px] font-bold uppercase text-slate-700">
          {sla.label}
        </span>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-[11px] font-semibold text-blue-600 hover:underline"
        >
          #{ticket.id}
        </a>
        <span className="ml-auto whitespace-nowrap text-[10px]">
          {priorityBadge(ticket.priority)}
        </span>
      </div>

      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        title={ticket.subject}
        className="mt-1 block leading-snug text-slate-900 hover:text-blue-600"
      >
        {ticket.truncatedSubject}
      </a>

      {ticket.company ? (
        <p className="mt-0.5 text-[10px] text-slate-500">{ticket.company}</p>
      ) : null}

      <Countdown dueBy={ticket.dueBy} dueMs={ticket.dueMs} now={now} />
    </li>
  );
}

/** Time to the SLA deadline, recoloured as it runs down. */
function Countdown({
  dueBy,
  dueMs,
  now,
}: {
  dueBy?: string;
  dueMs: number;
  now: number;
}) {
  const delta = dueMs - now;

  const value = !dueBy ? "no SLA set" : Number.isNaN(dueMs) ? "—" : formatCountdown(delta);

  const tone = Number.isNaN(dueMs)
    ? "text-slate-700"
    : delta < 0
      ? "text-red-600 animate-pulse"
      : delta < TWO_HOURS
        ? "text-orange-600 animate-pulse"
        : delta < EIGHT_HOURS
          ? "text-amber-700"
          : "text-slate-700";

  return (
    <p className="mt-1.5 flex items-center gap-1.5 border-t border-dashed border-slate-200 pt-1.5 font-mono text-[11px]">
      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
        SLA:
      </span>
      <span className={`font-semibold tabular-nums ${tone}`}>{value}</span>
    </p>
  );
}
