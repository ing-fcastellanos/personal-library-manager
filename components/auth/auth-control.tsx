"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { useLock } from "@/components/auth/lock-context";
import { signOut } from "@/lib/auth/client";
import { AuthMenu } from "@/components/auth/auth-menu";
import { buildNextParam } from "@/lib/auth/next-param";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

/** Header auth control: wires the design's AuthMenu to the real auth state. */
export function AuthControl() {
  const { reader, loading, refresh } = useAuth();
  const { lock } = useLock();
  const router = useRouter();
  const { toast } = useToast();

  if (loading) return <Skeleton className="size-9 rounded-full" />;

  const user = reader ? { email: reader.email ?? "", name: reader.name } : null;

  return (
    <AuthMenu
      user={user}
      onSignIn={() => router.push(`/login?next=${buildNextParam()}`)}
      onSignOut={async () => {
        await signOut();
        await refresh();
        router.refresh();
      }}
      onChangePin={() => router.push("/ajustes")}
      onSwitchReader={async () => {
        // Pure switch: sign out, then the next reader logs in fresh (ADR-0013).
        await signOut();
        await refresh();
        router.push("/login");
      }}
      onLock={() => {
        if (reader?.hasPin) {
          lock();
        } else {
          toast({
            title: "Configurá tu PIN primero",
            description: "Definí un PIN en Ajustes para poder bloquear.",
          });
          router.push("/ajustes");
        }
      }}
    />
  );
}
