import { notFound } from "next/navigation";
import { createDotCMSClient } from "@dotcms/client";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.local.example to .env.local.`);
  }
  return value;
}

export const client = createDotCMSClient({
  dotcmsUrl: required("DOTCMS_HOST"),
  authToken: required("DOTCMS_AUTH_TOKEN"),
  siteId: process.env.DOTCMS_SITE_ID,
  logLevel: process.env.NODE_ENV === "development" ? "verbose" : "default",
});

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
    return await client.page.get(url, { languageId: "1" });
  } catch (error) {
    if (isNotFound(error)) notFound();

    throw error;
  }
}
