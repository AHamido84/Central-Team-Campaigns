import type { DefaultSession } from "next-auth";
import type { Role } from "./entities";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role; company_ids: string[] } & DefaultSession["user"];
  }
}
