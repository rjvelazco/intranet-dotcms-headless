"use client";

import { DotCMSLayoutBody, useEditableDotCMSPage } from "@dotcms/react";
import type { DotCMSPageResponse } from "@dotcms/types";
import { contentComponents } from "./content";

export function DotCMSPage({
  pageResponse,
}: {
  pageResponse: DotCMSPageResponse;
}) {
  // Subscribes to the Universal Visual Editor. Outside the editor this just
  // returns the server-fetched response unchanged.
  const editablePage = useEditableDotCMSPage(pageResponse);

  return (
    <DotCMSLayoutBody
      page={editablePage?.pageAsset}
      components={contentComponents}
      // 'development' renders placeholders for unmapped content types.
      mode={process.env.NODE_ENV === "development" ? "development" : "production"}
    />
  );
}
