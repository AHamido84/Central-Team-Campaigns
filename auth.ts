import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import authConfig from "./auth.config";
import { checkCredentials, resolveUser } from "@/lib/auth/users";

const REFRESH_MS = 5 * 60 * 1000; // re-check role and access every 5 minutes

class Locked extends CredentialsSignin {
  code = "locked";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: "password",
      name: "Password",
      credentials: { login: {}, password: {} },
      async authorize(creds) {
        const r = await checkCredentials(String(creds?.login ?? ""), String(creds?.password ?? ""));
        if ("error" in r) {
          if (r.error === "locked") throw new Locked();
          return null;
        }
        return { id: r.user.id, email: r.user.email, name: r.user.name };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
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
