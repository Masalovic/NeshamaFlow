import type { TFunction } from "i18next";
import type { RitualId } from "./ritualEngine";

export function tRitualTitle(t: TFunction, id: RitualId, fallback: string) {
  const s = t(`ritual:titles.${id}`, "");
  return typeof s === "string" && s ? s : fallback;
}

export interface Guide {
  title: string;
  steps: string[];
  tip?: string;
  why?: string;
  whyBullets?: string[];
}

export function tGuide(t: TFunction, id: RitualId, base: Guide): Guide {
  const title = t(`ritual:guides.${id}.title`, base.title) as string;
  const steps = (base.steps ?? []).map((s, i) =>
    t(`ritual:guides.${id}.steps.${i}`, s) as string
  );
  const tip = base.tip ? (t(`ritual:guides.${id}.tip`, base.tip) as string) : undefined;
  const why = base.why ? (t(`ritual:guides.${id}.why`, base.why) as string) : undefined;
  const whyBullets = (base.whyBullets ?? []).map((b, i) =>
    t(`ritual:guides.${id}.whyBullets.${i}`, b) as string
  );
  return { title, steps, tip, why, whyBullets };
}
