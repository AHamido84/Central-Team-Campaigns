import { getLocale, getTranslations } from "next-intl/server";
import { userNameMap } from "@/lib/data/lookups";
import type { ActivityLog } from "@/types/entities";
import { NoData } from "./panels";

export async function ActivityList({ items }: { items: ActivityLog[] }) {
  const [t, locale, names] = await Promise.all([getTranslations(), getLocale(), userNameMap()]);
  if (!items.length) return <NoData text={t("activity.none")} />;
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: process.env.APP_TIME_ZONE || "Asia/Riyadh" });
  return (
    <ol className="space-y-3 border-s ps-4">
      {items.map((l) => {
        let name = "";
        try {
          name = (JSON.parse(l.details || "{}") as { name?: string }).name ?? "";
        } catch {}
        return (
          <li key={l.id} className="relative text-sm">
            <span className="absolute -start-[21px] top-1.5 size-2.5 rounded-full border-2 border-card bg-brand-accent" />
            <p>
              <span className="font-medium">{names[l.user] ?? l.user}</span> {t(`activity.action.${l.action}`)} {t(`activity.entity.${l.entity}`)}
              {name && <span className="text-muted-foreground"> · {name}</span>}
            </p>
            <p className="num text-xs text-muted-foreground">{fmt.format(new Date(l.timestamp))}</p>
          </li>
        );
      })}
    </ol>
  );
}
