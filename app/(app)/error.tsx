"use client";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="حدث خطأ غير متوقع · Something went wrong"
      body={error.message}
      action={<Button onClick={reset}>إعادة المحاولة · Try again</Button>}
    />
  );
}
