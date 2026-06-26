"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AuthCallback } from "@/components/auth/auth-callback";
import { completeSignInFromLink, exchangeForSession } from "@/lib/auth/client";

export default function CallbackPage() {
  const router = useRouter();
  const [state, setState] = React.useState<"loading" | "error">("loading");
  const ran = React.useRef(false);

  React.useEffect(() => {
    // The magic-link `oobCode` is single-use. React StrictMode invokes effects
    // twice in development, so without this guard `signInWithEmailLink` runs a
    // second time with an already-consumed code and fails — surfacing a spurious
    // "invalid link" even though the first run signed in. Run exactly once.
    if (ran.current) return;
    ran.current = true;
    (async () => {
      try {
        const idToken = await completeSignInFromLink();
        if (!idToken) {
          setState("error");
          return;
        }
        const res = await exchangeForSession(idToken);
        if (!res.ok) {
          setState("error");
          return;
        }
        const next = window.localStorage.getItem("plm:next") ?? "/";
        window.localStorage.removeItem("plm:next");
        // Full navigation so the AuthProvider re-reads the new server session.
        window.location.assign(next);
      } catch {
        setState("error");
      }
    })();
  }, []);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm items-center justify-center px-1">
      <AuthCallback state={state} onRetry={() => router.push("/login")} />
    </div>
  );
}
