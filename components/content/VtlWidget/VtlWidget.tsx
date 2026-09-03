import type { VtlWidgetContentlet } from "./types";
import { vtlComponents } from "./vtl-components";
import { VtlWidgetPending } from "./VtlWidgetPending";

/**
 * Renders a VTL widget by dispatching on its `vtlType` field.
 *
 * This is a component map, not a renderer: it looks `vtlType` up in
 * `vtlComponents` and delegates. Unmapped or missing types fall through to
 * VtlWidgetPending so the page shows what still needs building.
 */
export function VtlWidget(contentlet: VtlWidgetContentlet) {
  const vtlType = contentlet.vtlType?.trim() || undefined;
  const Component = vtlType ? vtlComponents[vtlType] : undefined;

  if (Component) {
    return <Component {...contentlet} />;
  }

  return <VtlWidgetPending contentlet={contentlet} vtlType={vtlType} />;
}
