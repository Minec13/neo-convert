/*! coi-serviceworker v0.1.7 - Corrected Registration */

if (typeof window === "undefined") {
  // --- PARTIE SERVICE WORKER (Ne pas toucher) ---
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

  self.addEventListener("fetch", function (event) {
    if (event.request.cache === "only-if-cached" && event.request.mode !== "same-origin") {
      return;
    }

    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 0) return response;

          const newHeaders = new Headers(response.headers);
          // C'est ici que la magie opère pour activer SharedArrayBuffer
          newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");
          newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        })
        .catch((e) => console.error(e))
    );
  });

} else {
  // --- PARTIE ENREGISTREMENT (C'est ici qu'était l'erreur) ---
  // On s'assure que le navigateur supporte les Service Workers
  if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("coi-serviceworker.js")
      .then((registration) => {
          console.log("[Néo Security] Service Worker enregistré avec succès.", registration);
          
          // On recharge la page UNE SEULE FOIS pour activer les headers
          if (!navigator.serviceWorker.controller) {
              console.log("[Néo Security] Rechargement pour activation...");
              window.location.reload();
          }
      })
      .catch((err) => {
          console.error("[Néo Security] Erreur d'enregistrement du SW:", err);
      });
  }
}
