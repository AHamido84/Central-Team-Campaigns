import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { getTranslations } from "next-intl/server";
import { auth, devLoginEnabled, googleConfigured, signIn } from "@/auth";
import { LocaleToggle } from "@/components/layout/locale-toggle";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  );
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth();
  if (session?.user) redirect("/");
  const { error } = await searchParams;
  const t = await getTranslations();

  async function google() {
    "use server";
    await signIn("google", { redirectTo: "/" });
  }
  async function dev(formData: FormData) {
    "use server";
    try {
      await signIn("dev", { email: String(formData.get("email") ?? ""), redirectTo: "/" });
    } catch (e) {
      if (e instanceof AuthError) redirect(`/login?error=${e.type === "CredentialsSignin" ? "AccessDenied" : e.type}`);
      throw e;
    }
  }

  const errorMsg = error ? (error === "AccessDenied" ? t("login.denied") : t("login.error")) : null;

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

          {errorMsg && <p role="alert" className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{errorMsg}</p>}

          <div className="mt-8 space-y-6">
            {googleConfigured && (
              <form action={google}>
                <Button type="submit" variant="outline" size="lg" className="w-full">
                  <GoogleIcon />
                  {t("login.google")}
                </Button>
              </form>
            )}

            {devLoginEnabled && (
              <Card className="border-dashed shadow-none">
                <CardContent className="space-y-3 pt-5">
                  <p className="text-sm font-medium">{t("login.devTitle")}</p>
                  <p className="text-xs text-muted-foreground">{t("login.devHint")}</p>
                  <form action={dev} className="space-y-3">
                    <Label htmlFor="email">{t("login.email")}</Label>
                    <Input id="email" name="email" type="email" required dir="ltr" className="num" placeholder="name@qaswarah.com" />
                    <Button type="submit" className="w-full">{t("login.continue")}</Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {!googleConfigured && !devLoginEnabled && <p className="rounded-lg bg-warning/10 p-3 text-sm text-warning">{t("login.noProvider")}</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
