import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { PasswordForm } from "@/components/account/password-form";
import { requirePage } from "@/lib/auth/session";

export default async function AccountPage() {
  const user = await requirePage();
  const t = await getTranslations();
  return (
    <>
      <PageHeader title={t("account.title")} description={t("account.subtitle", { login: user.email })} />
      {user.id.startsWith("env:") ? <p className="max-w-md rounded-lg bg-muted p-4 text-sm text-muted-foreground">{t("errors.envAdminPassword")}</p> : <PasswordForm />}
    </>
  );
}
