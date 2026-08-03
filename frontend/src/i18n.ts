import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import aiCopilotEn from "@/locales/en/ai_copilot.json";
import controls3dEn from "@/locales/en/3d_controls.json";
import commonEn from "@/locales/en/common.json";
import cropsEn from "@/locales/en/crops.json";
import simulationEn from "@/locales/en/simulation.json";

import aiCopilotEs from "@/locales/es/ai_copilot.json";
import controls3dEs from "@/locales/es/3d_controls.json";
import commonEs from "@/locales/es/common.json";
import cropsEs from "@/locales/es/crops.json";
import simulationEs from "@/locales/es/simulation.json";

import aiCopilotFr from "@/locales/fr/ai_copilot.json";
import controls3dFr from "@/locales/fr/3d_controls.json";
import commonFr from "@/locales/fr/common.json";
import cropsFr from "@/locales/fr/crops.json";
import simulationFr from "@/locales/fr/simulation.json";

import aiCopilotIt from "@/locales/it/ai_copilot.json";
import controls3dIt from "@/locales/it/3d_controls.json";
import commonIt from "@/locales/it/common.json";
import cropsIt from "@/locales/it/crops.json";
import simulationIt from "@/locales/it/simulation.json";

import type { SupportedLocale } from "@/types/greenhouse";

export const SUPPORTED_LOCALES: SupportedLocale[] = ["en", "it", "es", "fr"];

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: "English",
  it: "Italiano",
  es: "Español",
  fr: "Français",
};

void i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: commonEn,
      simulation: simulationEn,
      crops: cropsEn,
      "3d_controls": controls3dEn,
      ai_copilot: aiCopilotEn,
    },
    it: {
      common: commonIt,
      simulation: simulationIt,
      crops: cropsIt,
      "3d_controls": controls3dIt,
      ai_copilot: aiCopilotIt,
    },
    es: {
      common: commonEs,
      simulation: simulationEs,
      crops: cropsEs,
      "3d_controls": controls3dEs,
      ai_copilot: aiCopilotEs,
    },
    fr: {
      common: commonFr,
      simulation: simulationFr,
      crops: cropsFr,
      "3d_controls": controls3dFr,
      ai_copilot: aiCopilotFr,
    },
  },
  lng: "en",
  fallbackLng: "en",
  defaultNS: "common",
  ns: ["common", "simulation", "crops", "3d_controls", "ai_copilot"],
  interpolation: { escapeValue: false },
});

export function changeAppLocale(locale: SupportedLocale): void {
  void i18n.changeLanguage(locale);
}

export default i18n;
