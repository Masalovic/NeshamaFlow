import React from "react";
import { setPro } from "../lib/pro";
import { track } from "../lib/metrics";
import { useTranslation } from "react-i18next";

export default function UpgradeCard() {
  const { t } = useTranslation(["common"]);

  return (
    <div className="rounded-xl border p-4 bg-white text-sm">
      <div className="font-medium mb-1">
        {t("common:buttons.goPro", "Go Pro")}
      </div>
      <p className="text-gray-600 mb-3">
        {t(
          "common:insights.cta",
          "Get deeper insights and export your data."
        )}
      </p>
      <button
        className="btn btn-primary"
        onClick={async () => {
          track("upgrade_click", { source: "upgrade_card" });
          await setPro(true); // local preview
          track("pro_enabled");
        }}
      >
        {t("common:buttons.upgradeToPro", "Upgrade to Pro")}
      </button>
    </div>
  );
}
