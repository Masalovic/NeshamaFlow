import type { TFunction } from "i18next";

export type MedGuide = {
  title: string; // "What to do"
  why?: string;
  whyBullets?: string[];
  steps: string[];
  tip?: string;
};

const MAX_STEPS = 12;
const MAX_WHY_BULLETS = 8;

export function tMedGuide(t: TFunction, id: string): MedGuide {
  const baseKey = `meditation:guides.${id}`;

  // you can keep this, or change to a meditation-specific label later
  const title = t("ritual:player.whatToDo", "What to do");

  // --- steps
  const steps: string[] = [];
  for (let i = 0; i < MAX_STEPS; i++) {
    const key = `${baseKey}.steps.${i}`;
    const val = t(key, "");
    // skip if empty or obviously an untranslated key
    if (!val || val === key || val.endsWith(`.steps.${i}`)) break;
    steps.push(val);
  }

  // --- why
  const whyRaw = t(`${baseKey}.why`, "");
  const why = whyRaw && whyRaw !== `${baseKey}.why` ? whyRaw : undefined;

  // --- why bullets
  const whyBullets: string[] = [];
  for (let i = 0; i < MAX_WHY_BULLETS; i++) {
    const key = `${baseKey}.whyBullets.${i}`;
    const val = t(key, "");
    if (!val || val === key || val.endsWith(`.whyBullets.${i}`)) break;
    whyBullets.push(val);
  }

  const tipRaw = t(`${baseKey}.tip`, "");
  const tip = tipRaw && tipRaw !== `${baseKey}.tip` ? tipRaw : undefined;

  return {
    title,
    steps,
    why,
    whyBullets: whyBullets.length ? whyBullets : undefined,
    tip,
  };
}
