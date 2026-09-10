"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { Check, LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, getInitials } from "@/lib/utils";

type AccountUser = {
  id?: string;
  name?: string;
  full_name?: string;
  email: string;
  role?: string;
  avatar?: string;
  client_id?: string | { client_id?: string; full_name?: string; user_id?: string };
};

export function AccountSwitcher({ users }: { readonly users: ReadonlyArray<AccountUser> }) {
  const [isLoggingOut, startLogout] = useTransition();
  const router = useRouter();

  const normalizeUser = (user: AccountUser) => ({
    id: user.id ?? (typeof user.client_id === "object" ? user.client_id?.user_id : undefined) ?? user.email,
    name: user.full_name ?? user.name ?? "Guest User",
    email: user.email,
    role: user.role ?? "employee",
    avatar: user.avatar ?? "",
  });

  const normalizedUsers = users.map(normalizeUser);
  const [activeUser, setActiveUser] = useState(normalizedUsers[0]);

  const handleLogout = () => {
    startLogout(async () => {
      const response = await fetch("/api/auth/logout", { method: "POST" });

      if (!response.ok) return;

      router.replace("/auth/v2/login");
      router.refresh();
    });
  };
  if (!activeUser) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="size-8 rounded-lg">
          <AvatarImage src={activeUser.avatar || undefined} alt={activeUser.name} />
          <AvatarFallback>{getInitials(activeUser.name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56 space-y-1 rounded-lg" side="bottom" align="end" sideOffset={4}>
        {normalizedUsers.map((user) => (
          <DropdownMenuItem
            key={user.email}
            className={cn("p-0", user.id === activeUser.id && "bg-accent/50")}
            aria-current={user.id === activeUser.id ? "true" : undefined}
            onClick={() => setActiveUser(user)}
          >
            <div className="flex w-full items-center gap-2 px-1 py-1.5">
              <Avatar className="size-9 rounded-lg">
                <AvatarImage src={user.avatar || undefined} alt={user.name} />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs capitalize">{user.role}</span>
              </div>
              <span
                className={cn(
                  "mr-1 flex size-5 items-center justify-center rounded-full text-primary opacity-0",
                  user.id === activeUser.id && "opacity-100",
                )}
              >
                <Check aria-hidden="true" />
              </span>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />

        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={isLoggingOut} onClick={handleLogout}>
          <LogOut />
          {isLoggingOut ? "Logging out..." : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
