import { AlertCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function OnboardingError() {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="size-6 text-destructive" />
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="font-medium">This onboarding link is invalid or has expired.</p>
          <p className="text-sm text-muted-foreground">
            Please check the link you were given, or reach out to whoever sent it for a new one.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
