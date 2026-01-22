/*! coi-serviceworker v0.1.7 - Guido Zuidhof, licensed under MIT */
let coep = "require-corp";
let coop = "same-origin";

if (typeof window === "undefined") {
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

  self.addEventListener("fetch", function (event) {
    if (event.request.cache === "only-if-cached" && event.request.mode !== "same-origin") {
      return;
    }

    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 0) {
            return response;
          }

          const newHeaders = new Headers(response.headers);
          newHeaders.set("Cross-Origin-Embedder-Policy", coep);
          newHeaders.set("Cross-Origin-Opener-Policy", coop);

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
  (() => {
    const re = new RegExp("coi-serviceworker.js", "i");
    if (navigator.serviceWorker && !navigator.serviceWorker.controller) {
      navigator.serviceWorker.register({
        scope: ".",
        currentScript: document.currentScript,
      }).then((registration) => {
        console.log("coi-serviceworker registered", registration);
        window.location.reload();
      }, (err) => {
        console.error("coi-serviceworker failed to register", err);
      });
    }
  })();
}