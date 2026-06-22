"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { sendSignInLink } from "@/lib/auth/client";

function LoginInner() {
  const params = useSearchParams();
  const router = useRouter();
  const next = params.get("next") ?? "/";

  return (
    <LoginForm
      onSendLink={async (email) => {
        window.localStorage.setItem("plm:next", next);
        await sendSignInLink(email);
      }}
      onExploreWithoutAccount={() => router.push("/")}
    />
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm items-center px-1">
      <div className="w-full">
        <Suspense>
          <LoginInner />
        </Suspense>
      </div>
    </div>
  );
}
