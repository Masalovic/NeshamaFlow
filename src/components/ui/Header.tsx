import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Header({
  title,
  back = false,
}: {
  title: string;
  back?: boolean;
}) {
  const nav = useNavigate();
  const { t } = useTranslation("common");

  const backLabel = t("a11y.back", "Back");

  return (
    <header className="bg-nav sticky top-0 z-40 px-4 py-3">
      <div className="relative h-12 flex items-center border-b">
        
        {/* BACK BUTTON (left corner) */}
        {back && (
          <button
            onClick={() => nav(-1)}
            className="absolute left-0 btn btn-ghost h-10 w-10 rounded-full flex items-center justify-center"
            aria-label={backLabel}
            title={backLabel}
          >
            ←
          </button>
        )}

        {/* CENTERED TITLE */}
        <h1 className="ios-title w-full text-center">
          {title}
        </h1>

      </div>
    </header>
  );
}