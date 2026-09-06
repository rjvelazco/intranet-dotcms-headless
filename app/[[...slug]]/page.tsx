import { DotCMSPage } from "@/components/DotCMSPage";
import { getPage, toDotCMSPath } from "@/lib/dotcms";

/**
 * Every route in the app.
 *
 * An optional catch-all, so `/` and any depth below it both land here. The
 * slug is mapped back onto a dotCMS path by `toDotCMSPath`; a path dotCMS
 * doesn't have renders `app/not-found.tsx`, via `getPage`.
 */
export default async function Page({ params }: PageProps<"/[[...slug]]">) {
  const { slug } = await params;
  const pageResponse = await getPage(toDotCMSPath(slug));

  return <DotCMSPage pageResponse={pageResponse} />;
}
