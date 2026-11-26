import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { getTranslations } from "next-intl/server";
import { auth, signIn } from "@/auth";
import { LocaleToggle } from "@/components/layout/locale-toggle";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth();
  if (session?.user) redirect("/");
  const { error } = await searchParams;
  const t = await getTranslations();

  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("password", { login: String(formData.get("login") ?? ""), password: String(formData.get("password") ?? ""), redirectTo: "/" });
    } catch (e) {
      if (e instanceof AuthError) {
        const c = (e as AuthError & { code?: string }).code;
        const code = e.type === "CredentialsSignin" ? (c === "locked" || c === "database" ? c : "invalid") : "config";
        redirect(`/login?error=${code}`);
      }
      throw e;
    }
  }

  const ERR: Record<string, string> = { invalid: "login.invalid", locked: "login.locked", AccessDenied: "login.denied", database: "login.database", config: "login.config", Configuration: "login.config" };
  const errorMsg = error ? t(ERR[error] ?? "login.error") : null;

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-brand-primary p-12 text-white lg:flex lg:flex-col">
        <div className="absolute -end-24 -top-24 size-96 rounded-full border-[40px] border-brand-accent/10" />
        <div className="absolute -bottom-32 -start-16 size-[28rem] rounded-full border-[56px] border-white/5" />
        <div className="relative flex items-center gap-3">
          <Logo size={44} />
          <div>
            <p className="text-lg font-semibold">{t("app.org")}</p>
            <p className="text-sm text-brand-accent">{t("app.team")}</p>
          </div>
        </div>
        <div className="relative mt-auto max-w-md">
          <div className="mb-6 h-1 w-16 rounded-full bg-brand-accent" />
          <h1 className="text-4xl font-semibold leading-tight">{t("app.name")}</h1>
          <p className="mt-4 text-lg leading-relaxed text-white/70">{t("login.subtitle")}</p>
        </div>
      </section>

      <section className="flex flex-col p-6 sm:p-10">
        <div className="flex justify-end">
          <LocaleToggle />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo size={40} />
            <div>
              <p className="font-semibold">{t("app.org")}</p>
              <p className="text-sm text-muted-foreground">{t("app.name")}</p>
            </div>
          </div>
          <h2 className="text-2xl font-semibold">{t("login.title")}</h2>
          <p className="mt-2 text-sm text-muted-foreground lg:hidden">{t("login.subtitle")}</p>

          {errorMsg && (
            <p role="alert" className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {errorMsg}
              {(error === "database" || error === "config" || error === "Configuration") && (
                <> <a href="/setup-check" className="font-medium underline">{t("login.checkSetup")}</a></>
              )}
            </p>
          )}

          <form action={login} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login">{t("login.username")}</Label>
              <Input id="login" name="login" required autoComplete="username" autoCapitalize="none" spellCheck={false} dir="ltr" className="num" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("login.password")}</Label>
              <Input id="password" name="password" type="password" required autoComplete="current-password" dir="ltr" />
            </div>
            <Button type="submit" size="lg" className="w-full">{t("login.submit")}</Button>
            <p className="text-center text-xs text-muted-foreground">{t("login.forgot")}</p>
          </form>
        </div>
      </section>
    </main>
  );
}
