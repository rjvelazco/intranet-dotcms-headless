import type { DotCMSBasicContentlet } from "@dotcms/types";

/**
 * A VTL widget contentlet.
 *
 * `widgetType` is the discriminator that selects which React component renders
 * this widget. It is optional because the field may be empty on a contentlet.
 */
export type VtlWidgetContentlet = DotCMSBasicContentlet & {
  widgetType?: string;
  widgetTitle?: string;
};

export type VtlComponent = React.ComponentType<VtlWidgetContentlet>;
