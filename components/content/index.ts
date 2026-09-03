import type { DotCMSBasicContentlet } from "@dotcms/types";

/** Reserved key for the fallback used when a content type has no component. */
export const CUSTOM_NO_COMPONENT = "CustomNoComponent";

/**
 * Content type components live in this folder and get registered here.
 *
 * Keys are dotCMS **content type variable names** (`Banner`, `Product`,
 * `Activity`, ...). The matching contentlet's fields are passed in as props:
 *
 *   // components/content/Banner.tsx
 *   export function Banner({ title }: DotCMSBasicContentlet) { ... }
 *
 *   // here
 *   import { Banner } from "./Banner";
 *   export const contentComponents = { Banner };
 *
 * Anything not registered renders the SDK's own placeholder naming the missing
 * content type — useful while building. Register CUSTOM_NO_COMPONENT to
 * override that placeholder.
 */
export const contentComponents: Record<
  string,
  React.ComponentType<DotCMSBasicContentlet>
> = {
  // Banner,
  // [CUSTOM_NO_COMPONENT]: Fallback,
};
