import { useTranslations } from "next-intl";
import { Badge } from "./badge";

const VARIANT: Record<string, "success" | "warning" | "muted" | "default" | "destructive"> = {
  active: "success",
  paused: "warning",
  archived: "muted",
  planned: "default",
  ended: "muted",
};

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("status");
  return <Badge variant={VARIANT[status] ?? "muted"}>{t.has(status) ? t(status) : status}</Badge>;
}
