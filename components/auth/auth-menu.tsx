"use client";

import {
  LogIn,
  LogOut,
  User,
  KeyRound,
  Lock,
  UserRoundCog,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export interface AuthMenuProps {
  user: { email: string; name?: string; initials?: string } | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onAccount?: () => void;
  onChangePin?: () => void;
  /** Shared device: switch reader = full re-login (ADR-0013). */
  onSwitchReader?: () => void;
  /** Shared device: lock to the active reader (PIN to unlock). */
  onLock?: () => void;
}

/**
 * Header auth control. Unauthenticated → "Iniciar sesión" button.
 * Authenticated → avatar trigger + dropdown with account / PIN / sign-out.
 * Drop into <Header/> next to the theme toggle.
 */
export function AuthMenu({
  user,
  onSignIn,
  onSignOut,
  onAccount,
  onChangePin,
  onSwitchReader,
  onLock,
}: AuthMenuProps) {
  if (!user) {
    return (
      <Button size="sm" className="h-9 gap-1.5" onClick={onSignIn}>
        <LogIn aria-hidden="true" />
        Iniciar sesión
      </Button>
    );
  }

  const initials =
    user.initials ?? (user.name ?? user.email).slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Cuenta"
        >
          <Avatar className="size-9">
            <AvatarImage src="" alt="" />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5 normal-case">
          <span className="truncate text-sm font-semibold tracking-normal text-foreground">
            {user.name ?? "Lectora"}
          </span>
          <span className="truncate text-xs font-normal tracking-normal text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {onAccount && (
          <DropdownMenuItem onSelect={onAccount}>
            <User aria-hidden="true" />
            Mi cuenta
          </DropdownMenuItem>
        )}
        {onChangePin && (
          <DropdownMenuItem onSelect={onChangePin}>
            <KeyRound aria-hidden="true" />
            Cambiar PIN
          </DropdownMenuItem>
        )}
        {onLock && (
          <DropdownMenuItem onSelect={onLock}>
            <Lock aria-hidden="true" />
            Bloquear
          </DropdownMenuItem>
        )}
        {onSwitchReader && (
          <DropdownMenuItem onSelect={onSwitchReader}>
            <UserRoundCog aria-hidden="true" />
            Cambiar de lector
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onSignOut}>
          <LogOut aria-hidden="true" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
