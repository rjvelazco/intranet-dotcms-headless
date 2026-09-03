import { DotCMSPage } from "@/components/DotCMSPage";
import { getPage } from "@/lib/dotcms";

export default async function Home() {
  const pageResponse = await getPage("/support/index");

  return <DotCMSPage pageResponse={pageResponse} />;
}
