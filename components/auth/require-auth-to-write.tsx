"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";

/**
 * Contextual write gating (ADR-0006): returns a function that allows the action
 * when a reader is signed in, otherwise routes to /login?next=<current path>.
 */
export function useRequireAuthToWrite(): () => boolean {
  const { reader } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  return function ensureAuthed(): boolean {
    if (reader) return true;
    router.push(`/login?next=${encodeURIComponent(pathname)}`);
    return false;
  };
}
