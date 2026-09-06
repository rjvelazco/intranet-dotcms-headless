import { notFound } from "next/navigation";
import { createDotCMSClient } from "@dotcms/client";
import { requiredEnv } from "./env";

/**
 * DOTCMS_HOST and DOTCMS_AUTH_TOKEN are the app's critical variables: without
 * them there is no content to render, so they throw rather than warn. The
 * client is built on first use, not at module scope, so that failure lands on
 * the request that needed it instead of every route importing this file.
 */
let cached: ReturnType<typeof createDotCMSClient> | undefined;

function dotcmsHost(): string {
  return requiredEnv("DOTCMS_HOST").replace(/\/+$/, "");
}

export function getClient() {
  cached ??= createDotCMSClient({
    dotcmsUrl: dotcmsHost(),
    authToken: requiredEnv("DOTCMS_AUTH_TOKEN"),
    siteId: process.env.DOTCMS_SITE_ID,
    logLevel: process.env.NODE_ENV === "development" ? "verbose" : "default",
  });

  return cached;
}

/**
 * `client.page.get` throws a `DotErrorPage`, which isn't exported at runtime,
 * so the NOT_FOUND code is duck-typed off the thrown value.
 */
function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "NOT_FOUND"
  );
}

/** Fetches a dotCMS page, rendering app/not-found.tsx when it doesn't exist. */
export async function getPage(url: string) {
  try {
    return await getClient().page.get(url, { languageId: "1" });
  } catch (error) {
    if (isNotFound(error)) notFound();

    throw error;
  }
}

/** The dotCMS folder the site navigation is built from. */
export const NAV_ROOT = "/support";

export type NavItem = {
  title: string;
  /** Route in this app, with NAV_ROOT stripped off. */
  href: string;
  /** dotCMS href, e.g. "/support/cloud". */
  dotcmsHref: string;
  type: string;
  target: string;
};

type DotCMSNavResponse = {
  entity?: {
    children?: {
      title: string;
      href: string;
      type: string;
      target: string;
    }[];
  };
};

/** Maps a dotCMS nav href onto a route in this app. */
function toRoute(dotcmsHref: string): string {
  const stripped = dotcmsHref.startsWith(NAV_ROOT)
    ? dotcmsHref.slice(NAV_ROOT.length)
    : dotcmsHref;

  return stripped.replace(/\/index$/, "") || "/";
}

/**
 * The inverse of `toRoute`: turns the catch-all route's slug segments back
 * into the dotCMS page path. `/` is the section index, so it maps to
 * `${NAV_ROOT}/index` rather than the bare folder.
 */
export function toDotCMSPath(slug: string[] | undefined): string {
  const path = (slug ?? []).join("/");

  return path ? `/${path}` : `${NAV_ROOT}/index`;
}

/**
 * Fetches the navigation tree under `path`.
 *
 * This calls the REST endpoint rather than `client.nav.get()`, which can't be
 * used here for two reasons: it takes no site parameter, so it resolves
 * against the instance's default site instead of DOTCMS_SITE_ID, and its
 * declared `DotCMSNavigationItem[]` return type is really a single root node
 * with a `children` array.
 *
 * Returns [] on failure so a nav outage degrades the chrome instead of
 * taking down every page.
 */
export async function getNav(
  path: string = NAV_ROOT,
  depth = 2,
): Promise<NavItem[]> {
  const params = new URLSearchParams({ depth: String(depth) });
  const siteId = process.env.DOTCMS_SITE_ID;
  if (siteId) {
    params.set("host_id", siteId);
  }

  const url = `${dotcmsHost()}/api/v1/nav/${path.replace(/^\/+/, "")}?${params}`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${requiredEnv("DOTCMS_AUTH_TOKEN")}` },
      next: { revalidate: 300, tags: ["dotcms-nav"] },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const { entity }: DotCMSNavResponse = await response.json();

    // dotCMS already returns these in display order, and `order` repeats
    // across siblings, so don't re-sort.
    return (entity?.children ?? []).map((child) => ({
      title: child.title,
      href: toRoute(child.href),
      dotcmsHref: child.href,
      type: child.type,
      target: child.target,
    }));
  } catch (error) {
    console.warn(`[dotcms] navigation fetch failed for "${path}":`, error);

    return [];
  }
}
