"use client";

import { CheckCircle2, XCircle } from "lucide-react";

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, variant, ...props }) => (
        <Toast key={id} variant={variant} {...props}>
          {variant === "success" && (
            <CheckCircle2
              data-icon
              className="mt-0.5 size-5 shrink-0"
              aria-hidden
            />
          )}
          {variant === "destructive" && (
            <XCircle data-icon className="mt-0.5 size-5 shrink-0" aria-hidden />
          )}
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {action}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
