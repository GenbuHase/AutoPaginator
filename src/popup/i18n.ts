import { createI18n } from "vue-i18n";
import en from "./locales/en.json";
import ja from "./locales/ja.json";

const i18n = createI18n({
  legacy: false, // Use Composition API
  locale: chrome.i18n.getUILanguage()?.split("-")[0] || "en", // Detect browser language
  fallbackLocale: "en",
  messages: { en, ja }
});

export default i18n;
