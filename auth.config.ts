import type { NextAuthConfig } from "next-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { NAV } from "@/lib/nav";
import type { Role } from "@/types/entities";

/**
 * Edge-safe part of the Auth.js config (used by middleware). The providers and
 * the Users-tab lookup live in auth.ts, which runs on Node only.
 * Middleware blocks whole sections by role; pages and Server Actions check
 * again, including company access.
 */
export default {
  providers: [],
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  trustHost: true,
  callbacks: {
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.uid ?? "");
        session.user.role = (token.role as Role) ?? "Viewer";
        session.user.company_ids = (token.company_ids as string[]) ?? [];
      }
      return session;
    },
    authorized({ auth, request }) {
      if (!auth?.user?.email) return false;
      const path = request.nextUrl.pathname;
      const section = NAV.filter((n) => n.href !== "/").find((n) => path === n.href || path.startsWith(n.href + "/"));
      if (section && !hasPermission(auth.user, section.permission)) {
        return Response.redirect(new URL("/forbidden", request.nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
