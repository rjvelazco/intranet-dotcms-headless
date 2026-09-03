import type { DotCMSBasicContentlet } from "@dotcms/types";

/**
 * A VTL widget contentlet.
 *
 * `vtlType` is the discriminator that selects which React component renders
 * this widget. It is optional because the field doesn't exist in dotCMS yet.
 */
export type VtlWidgetContentlet = DotCMSBasicContentlet & {
  vtlType?: string;
  widgetTitle?: string;
};

export type VtlComponent = React.ComponentType<VtlWidgetContentlet>;
