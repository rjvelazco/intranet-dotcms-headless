import type { VtlWidgetContentlet } from "./types";
import { vtlComponents } from "./vtl-components";
import { VtlWidgetPending } from "./VtlWidgetPending";

/**
 * Renders a VTL widget by dispatching on its `widgetType` field.
 *
 * This is a component map, not a renderer: it looks `widgetType` up in
 * `vtlComponents` and delegates. Unmapped or missing types fall through to
 * VtlWidgetPending so the page shows what still needs building.
 */
export function VtlWidget(contentlet: VtlWidgetContentlet) {
  const widgetType = contentlet.widgetType?.trim() || undefined;
  const Component = widgetType ? vtlComponents[widgetType] : undefined;

  if (Component) {
    return <Component {...contentlet} />;
  }

  return <VtlWidgetPending contentlet={contentlet} widgetType={widgetType} />;
}
