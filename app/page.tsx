import { DotCMSPage } from "@/components/DotCMSPage";
import { getPage } from "@/lib/dotcms";

export default async function Home() {
  const pageResponse = await getPage("/index");

  return <DotCMSPage pageResponse={pageResponse} />;
}
