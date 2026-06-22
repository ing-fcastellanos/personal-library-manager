"use client";

import { Button } from "@/components/ui/button";
import { useRequireAuthToWrite } from "@/components/auth/require-auth-to-write";
import { useToast } from "@/components/ui/use-toast";

/**
 * Placeholder write entry point that demonstrates contextual gating: signed-out
 * users are sent to login; the real action lands in a later milestone.
 */
export function WriteCta({ label }: { label: string }) {
  const ensureAuthed = useRequireAuthToWrite();
  const { toast } = useToast();
  return (
    <Button
      onClick={() => {
        if (ensureAuthed()) {
          toast({
            title: "Próximamente",
            description: "Esta acción se construye en un milestone siguiente.",
          });
        }
      }}
    >
      {label}
    </Button>
  );
}
