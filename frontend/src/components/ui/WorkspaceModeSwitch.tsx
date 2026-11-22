import { useTranslation } from "react-i18next";

import { useWorkspaceStore, type WorkspaceMode } from "@/store/useWorkspaceStore";

const MODES: WorkspaceMode[] = ["greenhouse", "fertigation"];

export function WorkspaceModeSwitch() {
  const { t } = useTranslation("common");
  const mode = useWorkspaceStore((state) => state.mode);
  const setMode = useWorkspaceStore((state) => state.setMode);

  return (
    <div
      className="flex items-center rounded-lg border border-border bg-surface-page p-0.5"
      role="tablist"
      aria-label={t("workspace.ariaLabel")}
    >
      {MODES.map((item) => (
        <button
          key={item}
          type="button"
          role="tab"
          aria-selected={mode === item}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            mode === item
              ? "bg-white text-gray-900 shadow-sm"
              : "text-label hover:text-gray-800"
          }`}
          onClick={() => setMode(item)}
        >
          {t(`workspace.${item}`)}
        </button>
      ))}
    </div>
  );
}