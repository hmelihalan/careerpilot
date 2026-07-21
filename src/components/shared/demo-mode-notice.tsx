import { Eye } from "lucide-react";

export function DemoModeNotice() {
  return (
    <aside
      className="flex flex-wrap items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-xs text-indigo-800"
      aria-label="Demo mode"
    >
      <span className="inline-flex items-center gap-1 font-semibold uppercase tracking-wide">
        <Eye className="size-3.5" aria-hidden="true" />
        Demo Mode
      </span>
      <span className="text-indigo-700">
        Interactions are simulated with sample data, and nothing is stored.
      </span>
    </aside>
  );
}
