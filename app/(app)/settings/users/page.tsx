import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { UsersPanel } from "@/components/settings/users-panel";
import { requirePage } from "@/lib/auth/session";
import { companyName } from "@/lib/data/analytics";
import { getAll } from "@/lib/sheets";
import { envAdmin } from "@/lib/auth/users";

const ROLE_ORDER = ["Admin", "Manager", "MediaBuyer", "Designer", "Viewer"];

export default async function UsersPage() {
  const me = await requirePage("user:manage");
  const [t, locale, users, companies] = await Promise.all([getTranslations(), getLocale(), getAll("Users"), getAll("Companies")]);
  const env = envAdmin();
  const rows = users
    .map((u) => ({ id: u.id, email: u.email.toLowerCase(), name: u.name || u.email, role: u.role, company_ids: u.company_ids, hasPassword: !!u.password_hash }))
    .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.name.localeCompare(b.name, locale));
  return (
    <>
      <PageHeader title={t("settings.users.title")} description={t("settings.users.subtitle")} />
      <UsersPanel
        users={rows}
        me={me.email}
        envAdmin={env?.username ?? ""}
        companies={companies.filter((c) => c.status !== "archived").map((c) => ({ id: c.id, name: companyName(c, locale) }))}
      />
    </>
  );
}
