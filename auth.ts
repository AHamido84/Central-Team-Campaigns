import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import authConfig from "./auth.config";
import { resolveUser } from "@/lib/auth/users";

export const googleConfigured = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
/** Email-only sign in for local testing. Never available in production. */
export const devLoginEnabled = process.env.NODE_ENV !== "production" && process.env.AUTH_DEV_LOGIN === "true";

const REFRESH_MS = 5 * 60 * 1000; // re-check role and access every 5 minutes

const providers: NextAuthConfig["providers"] = [];
if (googleConfigured) providers.push(Google);
if (devLoginEnabled) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Dev login",
      credentials: { email: { label: "Email", type: "email" } },
      async authorize(creds) {
        const user = await resolveUser(String(creds?.email ?? ""));
        return user ? { id: user.id, email: user.email, name: user.name } : null;
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      // Allow list: only emails in the Users tab (or ADMIN_EMAILS) get in.
      return (await resolveUser(user.email)) !== null;
    },
    async jwt({ token, user }) {
      const stale = !token.checkedAt || Date.now() - Number(token.checkedAt) > REFRESH_MS;
      if (user || stale) {
        const u = await resolveUser(token.email);
        if (!u) return null; // removed from Users -> signed out
        token.uid = u.id;
        token.role = u.role;
        token.company_ids = u.company_ids;
        token.name = u.name;
        token.checkedAt = Date.now();
      }
      return token;
    },
  },
});
