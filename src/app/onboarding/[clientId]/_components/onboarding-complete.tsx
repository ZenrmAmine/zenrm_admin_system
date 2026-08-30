import Link from "next/link";

import { CheckCircle2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function OnboardingComplete() {
  return (
    <Card className="mx-auto max-w-md">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <CheckCircle2 className="size-16 text-green-600 dark:text-green-500" />
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">You&apos;re all set!</h1>
          <p className="text-sm text-muted-foreground">Onboarding completed.</p>
        </div>
        <p className="text-sm text-muted-foreground">
          You can login to your dashboard by{" "}
          <Link href="/auth/v2/login" className="font-medium text-primary underline underline-offset-4">
            clicking here
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}
