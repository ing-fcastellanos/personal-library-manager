"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { SignInPrompt } from "@/components/auth/sign-in-prompt";
import { buildNextParam } from "@/lib/auth/next-param";
import { useToast } from "@/components/ui/use-toast";

/**
 * Write entry point with contextual gating (ADR-0006): signed-out readers get the
 * SignInPrompt (→ /login); the real action lands in a later milestone.
 */
export function WriteCta({
  label,
  action,
}: {
  label: string;
  action?: string;
}) {
  const { reader } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [promptOpen, setPromptOpen] = React.useState(false);

  return (
    <>
      <Button
        onClick={() => {
          if (reader) {
            toast({
              title: "Próximamente",
              description:
                "Esta acción se construye en un milestone siguiente.",
            });
          } else {
            setPromptOpen(true);
          }
        }}
      >
        {label}
      </Button>
      <SignInPrompt
        open={promptOpen}
        onOpenChange={setPromptOpen}
        onSignIn={() => router.push(`/login?next=${buildNextParam()}`)}
        action={action}
      />
    </>
  );
}
