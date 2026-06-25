"use client";

import * as React from "react";

/**
 * AI settings data + mutations (#19b). Talks to the `/api/ai/*` endpoints: loads
 * the effective config and per-engine status, and persists default-engine /
 * fallback changes. API keys never reach the client — only config and status.
 */

export type AIEngine = "openai" | "gemini";
export type EngineConnectionStatus =
  | "connected"
  | "not_configured"
  | "error"
  | "testing";

export interface EngineStatus {
  engine: AIEngine;
  status: EngineConnectionStatus;
}

export interface AISettingsConfig {
  defaultEngine: AIEngine;
  fallbackEnabled: boolean;
}

export interface AISettingsView {
  config: AISettingsConfig;
  engines: EngineStatus[];
}

export const ENGINE_LABELS: Record<AIEngine, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
};

/**
 * Pure status → badge display mapping (label + Badge variant + optional class
 * overrides). Matches the Claude Design handoff: connected = secondary, nokey /
 * testing = muted outline, error = soft destructive (never solid). Unit-tested.
 */
export function statusMeta(status: EngineConnectionStatus): {
  label: string;
  variant: "secondary" | "outline";
  className?: string;
} {
  switch (status) {
    case "connected":
      return { label: "Conectado", variant: "secondary" };
    case "not_configured":
      return {
        label: "Sin API key",
        variant: "outline",
        className: "text-muted-foreground",
      };
    case "testing":
      return {
        label: "Probando…",
        variant: "outline",
        className: "text-muted-foreground",
      };
    case "error":
      return {
        label: "Error de conexión",
        variant: "outline",
        className: "border-destructive/30 bg-destructive/10 text-destructive",
      };
  }
}

export function useAISettings() {
  const [view, setView] = React.useState<AISettingsView | null>(null);
  const [saving, setSaving] = React.useState(false);

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch("/api/ai/settings");
      if (!res.ok) throw new Error("load failed");
      setView((await res.json()) as AISettingsView);
    } catch {
      setView(null);
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const save = React.useCallback(
    async (patch: Partial<AISettingsConfig>): Promise<boolean> => {
      setSaving(true);
      try {
        const res = await fetch("/api/ai/settings", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error("save failed");
        const config = (await res.json()) as AISettingsConfig;
        setView((prev) => (prev ? { ...prev, config } : prev));
        return true;
      } catch {
        return false;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const test = React.useCallback(async (engine: AIEngine): Promise<void> => {
    const set = (status: EngineConnectionStatus) =>
      setView((prev) =>
        prev
          ? {
              ...prev,
              engines: prev.engines.map((e) =>
                e.engine === engine ? { ...e, status } : e,
              ),
            }
          : prev,
      );
    set("testing");
    try {
      const res = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ engine }),
      });
      if (!res.ok) throw new Error("test failed");
      const { status } = (await res.json()) as {
        status: EngineConnectionStatus;
      };
      set(status);
    } catch {
      set("error");
    }
  }, []);

  return { view, loading: view === null, saving, refresh, save, test };
}
