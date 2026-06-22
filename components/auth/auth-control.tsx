"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { signOut } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Header auth control: avatar + menu when signed in, "Iniciar sesión" when not. */
export function AuthControl() {
  const { reader, loading, refresh } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (loading) return <Skeleton className="size-9 rounded-full" />;

  if (!reader) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link href={`/login?next=${encodeURIComponent(pathname)}`}>
          Iniciar sesión
        </Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar className="size-9">
          {reader.avatar ? <AvatarImage src={reader.avatar} alt="" /> : null}
          <AvatarFallback
            style={
              reader.displayColor
                ? { backgroundColor: reader.displayColor, color: "#fff" }
                : undefined
            }
          >
            {initials(reader.name)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{reader.name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await signOut();
            await refresh();
            router.refresh();
          }}
        >
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
