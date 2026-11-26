"use client";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="حدث خطأ غير متوقع · Something went wrong"
      body={error.message || "إذا تكرر الخطأ، افتح فحص الإعداد · If it keeps happening, open the setup check"}
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={reset}>إعادة المحاولة · Try again</Button>
          <Button variant="outline" asChild><a href="/setup-check">فحص الإعداد · Setup check</a></Button>
        </div>
      }
    />
  );
}
