"use client";

import { useEffect } from "react";

const legacyWorkerPaths = new Set(["/sw.js", "/service-worker.js"]);

export default function ClearLegacyPwaCache() {
  useEffect(() => {
    async function clearLegacyCache() {
      if (!("serviceWorker" in navigator)) return;

      const registrations = await navigator.serviceWorker.getRegistrations();
      const legacyRegistrations = registrations.filter((registration) =>
        [registration.active, registration.waiting, registration.installing]
          .filter((worker) => worker !== null)
          .some((worker) => {
            const workerUrl = new URL(worker.scriptURL);
            return (
              workerUrl.origin === window.location.origin &&
              legacyWorkerPaths.has(workerUrl.pathname)
            );
          }),
      );

      if (legacyRegistrations.length === 0) return;

      await Promise.all(
        legacyRegistrations.map((registration) => registration.unregister()),
      );

      if ("caches" in window) {
        const cacheNames = await window.caches.keys();
        await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
      }

      if (navigator.serviceWorker.controller) {
        window.location.reload();
      }
    }

    clearLegacyCache().catch((error: unknown) => {
      console.error("Could not clear the legacy PWA cache.", error);
    });
  }, []);

  return null;
}
