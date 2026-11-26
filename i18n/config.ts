export const LOCALES = ["ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ar";
export const LOCALE_COOKIE = "NEXT_LOCALE";
export const APP_TIME_ZONE = process.env.APP_TIME_ZONE || "Asia/Riyadh";
export const dirOf = (l: Locale) => (l === "ar" ? "rtl" : "ltr");
