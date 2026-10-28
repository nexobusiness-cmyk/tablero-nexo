// Tablero Nexo · avisos con la pestaña cerrada.
// Este archivo va en GitHub junto a index.html. No hay que tocarlo.
const CFG = "nexo-cfg";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

async function leerCfg() {
  try {
    const c = await caches.open(CFG);
    const r = await c.match("cfg");
    return r ? await r.json() : null;
  } catch (e) { return null; }
}

self.addEventListener("push", (e) => {
  e.waitUntil((async () => {
    const conf = await leerCfg();
    const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const enUso = ventanas.some((w) => w.visibilityState === "visible" && w.focused);
    let nuevos = [];
    if (conf && conf.token) {
      try {
        const r = await fetch(conf.servidor, { method: "POST", body: JSON.stringify({ token: conf.token, accion: "pendientesPush", p: {} }) });
        const j = await r.json();
        nuevos = (j && j.extra && j.extra.nuevos) || [];
      } catch (err) { /* sin conexión: mostramos un aviso genérico */ }
    }
    if (enUso) { ventanas.forEach((w) => w.postMessage({ tipo: "recargar" })); return; }
    if (!nuevos.length) {
      return self.registration.showNotification("Tablero Nexo", { body: "Tienes avisos nuevos. Toca para verlos.", tag: "nexo" });
    }
    for (const a of nuevos) {
      await self.registration.showNotification(a.por ? a.por + " · Tablero Nexo" : "Tablero Nexo", {
        body: a.texto,
        tag: "nexo-" + a.id,
        data: { tarea: a.tarea || "" },
        requireInteraction: /URGENTE|🔴|🔔|⏰/.test(a.texto),
      });
    }
  })());
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const tarea = (e.notification.data && e.notification.data.tarea) || "";
  e.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of ventanas) {
      if ("focus" in w) { await w.focus(); w.postMessage({ tipo: "abrir", tarea }); return; }
    }
    await self.clients.openWindow("./" + (tarea ? "?tarea=" + encodeURIComponent(tarea) : ""));
  })());
});
