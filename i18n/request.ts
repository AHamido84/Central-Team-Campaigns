import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { APP_TIME_ZONE, DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, type Locale } from "./config";

export default getRequestConfig(async () => {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value as Locale | undefined;
  const locale: Locale = c && (LOCALES as readonly string[]).includes(c) ? c : DEFAULT_LOCALE;
  return {
    locale,
    timeZone: APP_TIME_ZONE,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
