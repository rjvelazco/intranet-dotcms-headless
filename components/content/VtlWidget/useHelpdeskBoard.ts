"use client";

import { useEffect, useState } from "react";
import type { HelpdeskBoard } from "@/lib/freshdesk.types";

/**
 * Shared access to `/api/helpdesk` for the widgets that need it.
 *
 * In the VTL these widgets read one shared `$opentickets` list that
 * detect-agent.vtl put in the Velocity context, so the page hit Freshdesk
 * once no matter how many widgets rendered. `/support` still carries two of
 * them — the helpdesk board and the priority rail — so the in-flight promise
 * is memoized here to keep that single-fetch behaviour.
 *
 * The cache is deliberately per page load: it is never invalidated, and a
 * failure clears it so a later mount can retry. Freshness is the API route's
 * job, through the `revalidate` windows in `lib/freshdesk.ts`.
 */
let inflight: Promise<HelpdeskBoard> | undefined;

function loadBoard(): Promise<HelpdeskBoard> {
  inflight ??= fetch("/api/helpdesk")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      return response.json() as Promise<HelpdeskBoard>;
    })
    .catch((cause: unknown) => {
      // Don't cache the failure: the next widget to mount should try again.
      inflight = undefined;

      throw cause;
    });

  return inflight;
}

export type HelpdeskBoardState = {
  board?: HelpdeskBoard;
  /** Set when the fetch itself failed; `board.error` covers upstream ones. */
  error?: string;
};

/**
 * Loads the agent's board once per page and hands it to every caller.
 *
 * The request is shared, so it isn't aborted on unmount — one widget going
 * away must not cancel the fetch another is still waiting on. The `active`
 * flag drops the result instead.
 */
export function useHelpdeskBoard(): HelpdeskBoardState {
  const [state, setState] = useState<HelpdeskBoardState>({});

  useEffect(() => {
    let active = true;

    loadBoard()
      .then((board) => {
        if (active) setState({ board });
      })
      .catch((cause: unknown) => {
        console.warn("[helpdesk] board fetch failed:", cause);
        if (active) setState({ error: "Couldn't load the ticket board." });
      });

    return () => {
      active = false;
    };
  }, []);

  return state;
}
