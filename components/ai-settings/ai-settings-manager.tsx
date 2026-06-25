"use client";

import * as React from "react";
import { Sparkles, Plug } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  useAISettings,
  statusMeta,
  ENGINE_LABELS,
  type AIEngine,
} from "./use-ai-settings";

/**
 * AI engine settings (#19b). Lets a reader pick the default engine, toggle
 * automatic fallback, and test each engine's connection. Renders over the
 * existing `ui` primitives; API keys are never shown or entered here (they live
 * in Secret Manager, server-side).
 */
export function AISettingsManager() {
  const { view, loading, saving, save, test } = useAISettings();
  const { toast } = useToast();

  if (loading) {
    return (
      <Card>
        <CardContent className="space-y-4 p-4">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const { config, engines } = view!;

  async function changeEngine(engine: AIEngine) {
    const ok = await save({ defaultEngine: engine });
    if (!ok) toast({ title: "No se pudo guardar", variant: "destructive" });
  }

  async function toggleFallback() {
    const ok = await save({ fallbackEnabled: !config.fallbackEnabled });
    if (!ok) toast({ title: "No se pudo guardar", variant: "destructive" });
  }

  return (
    <Card>
      <CardContent className="space-y-5 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="ai-default-engine">Motor por defecto</Label>
          <Select
            value={config.defaultEngine}
            onValueChange={(v) => changeEngine(v as AIEngine)}
            disabled={saving}
          >
            <SelectTrigger id="ai-default-engine" className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">{ENGINE_LABELS.openai}</SelectItem>
              <SelectItem value="gemini">{ENGINE_LABELS.gemini}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            El motor que se usa primero para identificar libros desde fotos.
          </p>
        </div>

        <div className="flex items-start justify-between gap-3 border-t pt-4">
          <div className="space-y-0.5">
            <p className="font-medium">Fallback automático</p>
            <p className="text-sm text-muted-foreground">
              Si el motor por defecto falla, reintentar con el otro.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={config.fallbackEnabled}
            aria-label="Fallback automático"
            disabled={saving}
            onClick={toggleFallback}
            className={[
              "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "disabled:cursor-not-allowed disabled:opacity-50",
              config.fallbackEnabled ? "bg-primary" : "bg-input",
            ].join(" ")}
          >
            <span
              className={[
                "inline-block size-5 transform rounded-full bg-background shadow transition-transform",
                config.fallbackEnabled ? "translate-x-5" : "translate-x-0.5",
              ].join(" ")}
            />
          </button>
        </div>

        <div className="space-y-2 border-t pt-4">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Sparkles
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            Estado de los motores
          </p>
          {engines.map((e) => {
            const meta = statusMeta(e.status);
            return (
              <div
                key={e.engine}
                className="flex items-center justify-between gap-3 rounded-xl border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {ENGINE_LABELS[e.engine]}
                    {config.defaultEngine === e.engine && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        por defecto
                      </span>
                    )}
                  </p>
                  <Badge variant={meta.variant} className="mt-1">
                    {meta.label}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  loading={e.status === "testing"}
                  onClick={() => test(e.engine)}
                >
                  <Plug className="size-4" />
                  Probar
                </Button>
              </div>
            );
          })}
          <p className="text-sm text-muted-foreground">
            Las API keys se configuran en el servidor (Secret Manager), no desde
            la app.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
