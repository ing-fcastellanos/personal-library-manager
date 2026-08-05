import { Plus, SquarePen, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { actionVerb, relativeTime } from "@/components/audit/format";
import type { AuditLogEntry } from "@/lib/types/audit-log";

const ACTION_ICON = {
  create: Plus,
  update: SquarePen,
  delete: Trash2,
} as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

/**
 * One audit entry (#40, Claude Design handoff "Actividad.dc.html"): a flat row
 * — no card border, hairline separator — deliberately distinct from the
 * bordered-card "Historial de lecturas" rows nearby, so the two read as
 * different kinds of information at a glance. Actor avatar with the action
 * badged on its corner; changed fields and relative time share one meta line.
 * "Borró" never gets destructive red — deleting is a normal household action,
 * not an incident; the verb already carries the meaning, the icon just helps
 * scanning. Shared by the book detail's "Actividad" section and the global
 * `/ajustes/actividad` feed.
 */
export function ActivityRow({
  entry,
  readerName,
}: {
  entry: AuditLogEntry;
  readerName: string;
}) {
  const Icon = ACTION_ICON[entry.action];
  const fields = entry.changedFields?.length
    ? entry.changedFields.join(", ")
    : null;
  const time = relativeTime(entry.createdAt);
  return (
    <li className="flex items-start gap-2.5 border-b border-border py-3 last:border-b-0">
      <span aria-hidden="true" className="relative shrink-0">
        <Avatar className="size-8">
          <AvatarFallback className="text-xs">
            {initials(readerName)}
          </AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full border border-border bg-card text-muted-foreground">
          <Icon className="size-2.5" />
        </span>
      </span>
      <p className="min-w-0 flex-1 text-sm leading-snug text-pretty">
        <span>
          {readerName} {actionVerb(entry.action)}{" "}
          <span className="font-semibold">«{entry.entityLabel}»</span>
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {fields && <span className="font-medium">{fields} · </span>}
          {time}
        </span>
      </p>
    </li>
  );
}
