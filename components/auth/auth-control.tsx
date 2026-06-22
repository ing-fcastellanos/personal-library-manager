"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { signOut } from "@/lib/auth/client";
import { AuthMenu } from "@/components/auth/auth-menu";
import { buildNextParam } from "@/lib/auth/next-param";
import { Skeleton } from "@/components/ui/skeleton";

/** Header auth control: wires the design's AuthMenu to the real auth state. */
export function AuthControl() {
  const { reader, loading, refresh } = useAuth();
  const router = useRouter();

  if (loading) return <Skeleton className="size-9 rounded-full" />;

  const user = reader
    ? { email: reader.email ?? "", name: reader.name }
    : null;

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
    />
  );
}
