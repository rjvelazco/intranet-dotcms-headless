import type { VtlWidgetContentlet } from "./types";

function CodeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M17.25 6.75 22.5 12l-5.25 5.25M6.75 6.75 1.5 12l5.25 5.25M14.25 3.75l-4.5 16.5" />
    </svg>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-slate-400">{label}</dt>
      <dd className="min-w-0 truncate font-mono text-slate-600">{value}</dd>
    </div>
  );
}

/**
 * Shown when a VTL widget has no component mapped for its `widgetType`,
 * or has no `widgetType` at all.
 */
export function VtlWidgetPending({
  contentlet,
  widgetType,
}: {
  contentlet: VtlWidgetContentlet;
  widgetType?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-200/70">
          <CodeIcon />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-800">
              Component in progress
            </h3>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-amber-700 ring-1 ring-amber-200/70">
              Not built yet
            </span>
          </div>

          {widgetType ? (
            <p className="mt-1.5 text-sm text-slate-500">
              No component is mapped for{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[13px] text-slate-700">
                {widgetType}
              </code>{" "}
              yet.
            </p>
          ) : (
            <p className="mt-1.5 text-sm text-slate-500">
              This widget has no{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[13px] text-slate-700">
                widgetType
              </code>{" "}
              set, so there is nothing to look up.
            </p>
          )}

          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-100 pt-3 text-xs">
            <Field label="Content type" value={contentlet.contentType} />
            {contentlet.widgetTitle ? (
              <Field label="Widget" value={contentlet.widgetTitle} />
            ) : null}
          </dl>
        </div>
      </div>
    </div>
  );
}
