"use client";

import * as React from "react";
import {
  Check,
  AlertTriangle,
  Loader2,
  FlaskConical,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
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
  type EngineConnectionStatus,
} from "./use-ai-settings";

/**
 * AI engine settings (#19b, Claude Design handoff "AI Engine Settings"). A
 * Settings section to pick the default engine, toggle automatic fallback, and
 * test each engine's connection. Recreated from the design prototype over the
 * existing `ui` primitives. API keys are never shown or entered here — they live
 * in Secret Manager, server-side.
 */
export function AISettingsManager() {
  const { view, loading, saving, save, test } = useAISettings();
  const { toast } = useToast();

  if (loading) return <LoadingState />;

  const { config, engines } = view!;
  const dim = saving ? "opacity-60" : "";

  async function changeEngine(engine: AIEngine) {
    const ok = await save({ defaultEngine: engine });
    if (!ok) toast({ title: "No se pudo guardar", variant: "destructive" });
  }

  async function toggleFallback() {
    if (saving) return;
    const ok = await save({ fallbackEnabled: !config.fallbackEnabled });
    if (!ok) toast({ title: "No se pudo guardar", variant: "destructive" });
  }

  return (
    <div className="space-y-3.5">
      <div>
        {saving && (
          <span
            aria-live="polite"
            className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
          >
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            Guardando…
          </span>
        )}
        <p className="text-sm text-muted-foreground">
          Motor de identificación de libros desde fotos.
        </p>
      </div>

      {/* Default engine */}
      <Card
        className={cn("rounded-2xl p-4 shadow-none transition-opacity", dim)}
      >
        <Label htmlFor="ai-default-engine" className="text-sm font-semibold">
          Motor por defecto
        </Label>
        <Select
          value={config.defaultEngine}
          onValueChange={(v) => changeEngine(v as AIEngine)}
          disabled={saving}
        >
          <SelectTrigger id="ai-default-engine" className="mt-2 h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="openai">{ENGINE_LABELS.openai}</SelectItem>
            <SelectItem value="gemini">{ENGINE_LABELS.gemini}</SelectItem>
          </SelectContent>
        </Select>
        <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
          El motor que se usa primero para identificar libros desde fotos.
        </p>
      </Card>

      {/* Fallback toggle */}
      <Card
        className={cn(
          "flex items-center gap-3.5 rounded-2xl p-4 shadow-none transition-opacity",
          dim,
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Fallback automático</p>
          <p
            id="ai-fallback-desc"
            className="mt-0.5 text-xs leading-relaxed text-muted-foreground"
          >
            Si el motor por defecto falla, reintentar con el otro.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={config.fallbackEnabled}
          aria-label="Fallback automático"
          aria-describedby="ai-fallback-desc"
          disabled={saving}
          onClick={toggleFallback}
          className={cn(
            "relative h-[30px] w-[50px] shrink-0 rounded-full transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:cursor-not-allowed",
            config.fallbackEnabled ? "bg-primary" : "bg-border",
          )}
        >
          <span
            className={cn(
              "absolute left-[3px] top-[3px] size-6 rounded-full bg-white shadow transition-transform",
              config.fallbackEnabled ? "translate-x-5" : "translate-x-0",
            )}
          />
        </button>
      </Card>

      {/* Engine status */}
      <Card
        className={cn("rounded-2xl p-4 shadow-none transition-opacity", dim)}
      >
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Estado de los motores
        </p>
        <div className="flex flex-col">
          {engines.map((e, i) => {
            const meta = statusMeta(e.status);
            const testing = e.status === "testing";
            return (
              <div
                key={e.engine}
                className={cn(
                  "flex flex-wrap items-center gap-x-2.5 gap-y-2 py-3",
                  i > 0
                    ? "border-t border-border"
                    : "border-t border-transparent",
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="font-semibold">
                    {ENGINE_LABELS[e.engine]}
                  </span>
                  {config.defaultEngine === e.engine && (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-semibold text-muted-foreground">
                      por defecto
                    </span>
                  )}
                </div>
                <Badge variant={meta.variant} className={meta.className}>
                  <StatusIcon status={e.status} />
                  {meta.label}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-9 shrink-0 gap-1.5"
                  disabled={testing || saving}
                  aria-label={`Probar conexión de ${ENGINE_LABELS[e.engine]}`}
                  onClick={() => test(e.engine)}
                >
                  {testing ? (
                    <Loader2
                      className="size-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <FlaskConical className="size-3.5" aria-hidden="true" />
                  )}
                  {testing ? "Probando…" : "Probar"}
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="mt-4 flex items-start gap-2 px-0.5">
        <Lock
          className="mt-px size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Las API keys se configuran en el servidor (Secret Manager), no desde
          la app.
        </p>
      </div>
    </div>
  );
}

/** Status badge icon — distinct per status, never color-only (a11y). */
function StatusIcon({ status }: { status: EngineConnectionStatus }) {
  if (status === "connected")
    return <Check aria-hidden="true" strokeWidth={2.5} />;
  if (status === "error")
    return <AlertTriangle aria-hidden="true" strokeWidth={2.3} />;
  if (status === "testing")
    return <Loader2 className="animate-spin" aria-hidden="true" />;
  return (
    <span className="size-1.5 shrink-0 rounded-full bg-current opacity-70" />
  );
}

function LoadingState() {
  return (
    <div className="space-y-3.5">
      <Card className="rounded-2xl p-4 shadow-none">
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="mt-2.5 h-11 w-full rounded-lg" />
        <Skeleton className="mt-2.5 h-2.5 w-3/4" />
      </Card>
      <Card className="flex items-center gap-3.5 rounded-2xl p-4 shadow-none">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-2.5 w-4/5" />
        </div>
        <Skeleton className="h-[30px] w-[50px] rounded-full" />
      </Card>
      <Card className="rounded-2xl p-4 shadow-none">
        <Skeleton className="mb-3 h-3 w-1/2" />
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-2.5 py-2">
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-5 w-[70px] rounded-full" />
            <Skeleton className="h-8 w-[62px] rounded-lg" />
          </div>
        ))}
      </Card>
    </div>
  );
}
