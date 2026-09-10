import { User } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getInitials } from "@/lib/utils";

interface WizardPersonaPanelProps {
  personaName: string;
  progress: number;
}

export function WizardPersonaPanel({ personaName, progress }: WizardPersonaPanelProps) {
  return (
    <>
      <div className="hidden flex-col gap-8 self-start rounded-xl bg-card p-7 shadow-sm ring-1 ring-foreground/10 md:flex">
        <Badge variant="secondary" className="w-fit">
          Persona
        </Badge>
        <Avatar size="lg" className="size-20 ring-4 ring-primary/10">
          <AvatarFallback className="text-xl">
            {personaName ? getInitials(personaName) : <User className="size-7" />}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1">
          <span className="font-medium text-lg">{personaName || "New client"}</span>
          <span className="text-muted-foreground text-sm">Client admin</span>
        </div>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground text-sm">Onboarding progress</span>
            <span className="font-semibold text-sm tabular-nums">{progress}%</span>
          </div>
          <Progress
            value={progress}
            className="motion-safe:[&>*]:duration-700 [&>[data-slot=progress-indicator]]:bg-teal-600"
          />
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-3 rounded-xl bg-card p-4 shadow-sm ring-1 ring-foreground/10 md:hidden">
        <Avatar size="default" className="ring-2 ring-primary/10">
          <AvatarFallback>{personaName ? getInitials(personaName) : <User className="size-4" />}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate font-medium text-sm">{personaName || "New client"}</span>
          <div className="flex items-center gap-2">
            <Progress
              value={progress}
              className="flex-1 motion-safe:[&>*]:duration-700 [&>[data-slot=progress-indicator]]:bg-teal-600"
            />
            <span className="shrink-0 font-semibold text-muted-foreground text-xs tabular-nums">{progress}%</span>
          </div>
        </div>
      </div>
    </>
  );
}
