import type { ReactNode } from "react";

// Minimal, public layout: no SidebarProvider/header from the authenticated dashboard shell, and
// no session/cookie checks — this route must stay reachable without a login. It still inherits
// the root layout's theme/font setup and Toaster, so dark mode and theme presets keep working.
export default function OnboardingLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="flex min-h-dvh justify-center bg-muted/40 p-4 md:p-12">
      <div className="w-full max-w-6xl">{children}</div>
    </main>
  );
}
