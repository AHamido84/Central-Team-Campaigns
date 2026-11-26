import { useTranslations } from "next-intl";
import { Logo } from "./logo";

export function BrandBlock() {
  const t = useTranslations("app");
  return (
    <div className="flex items-center gap-3 px-6 py-6">
      <Logo size={38} />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[15px] font-semibold text-white">{t("org")}</p>
        <p className="truncate text-xs text-brand-accent">{t("name")}</p>
      </div>
    </div>
  );
}
