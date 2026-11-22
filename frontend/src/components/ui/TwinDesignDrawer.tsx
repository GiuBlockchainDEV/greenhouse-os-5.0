import { useTranslation } from "react-i18next";

import { DimensionControls } from "@/components/ui/DimensionControls";

interface TwinDesignDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function TwinDesignDrawer({ open, onClose }: TwinDesignDrawerProps) {
  const { t } = useTranslation("experience");

  if (!open) {
    return null;
  }

  return (
  <>
      <button
        type="button"
        aria-label={t("design.close")}
        className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="fixed bottom-0 left-0 top-[4.5rem] z-50 flex w-[min(100%,320px)] flex-col border-r border-border bg-white shadow-2xl">
        <p className="border-b border-border px-4 py-3 text-xs font-bold text-gray-900">
          {t("design.title")}
        </p>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <DimensionControls />
        </div>
      </aside>
    </>
  );
}