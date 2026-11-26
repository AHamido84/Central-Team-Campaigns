import { signOut } from "@/auth";

/** Ends the session of someone who was removed from the Users tab, then shows the sign in page. */
export async function GET() {
  await signOut({ redirectTo: "/login?error=AccessDenied" });
}
