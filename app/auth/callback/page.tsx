"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AuthCallback } from "@/components/auth/auth-callback";
import { completeSignInFromLink, exchangeForSession } from "@/lib/auth/client";

export default function CallbackPage() {
  const router = useRouter();
  const [state, setState] = React.useState<"loading" | "error">("loading");

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const idToken = await completeSignInFromLink();
        if (!idToken) {
          if (active) setState("error");
          return;
        }
        const res = await exchangeForSession(idToken);
        if (!res.ok) {
          if (active) setState("error");
          return;
        }
        const next = window.localStorage.getItem("plm:next") ?? "/";
        window.localStorage.removeItem("plm:next");
        // Full navigation so the AuthProvider re-reads the new server session.
        window.location.assign(next);
      } catch {
        if (active) setState("error");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm items-center justify-center px-1">
      <AuthCallback state={state} onRetry={() => router.push("/login")} />
    </div>
  );
}
