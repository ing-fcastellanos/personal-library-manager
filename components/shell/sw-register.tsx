"use client";

import { useEffect } from "react";

/**
 * Registers the offline-cache service worker (#41) on mount, without
 * blocking render — a no-op in browsers without service worker support.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js");
  }, []);

  return null;
}
