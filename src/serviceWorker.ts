import { clientsClaim } from "workbox-core";
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { DBSingleton } from "./utils/database.ts";
import {
  handleFetch,
  handleGraphQLRequest,
  pollSyncData,
} from "./utils/offlineHandlers.ts";

// Ensure TypeScript understands the `self` variable in the Service Worker context
declare const self: ServiceWorkerGlobalScope;

interface SyncManager {
  getTags(): Promise<string[]>;
  register(tag: string): Promise<void>;
}

declare global {
  interface ServiceWorkerRegistration {
    readonly sync: SyncManager;
  }

  interface SyncEvent extends ExtendableEvent {
    readonly lastChance: boolean;
    readonly tag: string;
  }

  interface ServiceWorkerGlobalScopeEventMap {
    sync: SyncEvent;
  }
}

self.skipWaiting();
clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.addEventListener("activate", (event) => {
  console.log("Service Worker activating.");
  event.waitUntil(self.clients.claim()); // Allows an active Service Worker to set itself as the controller for all clients within its scope
});

// Your service-worker code here.
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      console.log("INSTALL EVENT");
      // Initialize the database
      await DBSingleton.getInstance();
      // Precache files
      const cache = await caches.open("app-cache");
      await cache.addAll(["/", "/index.html", "/styles.css", "/script.js"]);

      pollSyncData();
    })().then(() => {
      return self.skipWaiting(); // Forces the waiting Service Worker to become the active Service Worker
    })
  );
});

self.addEventListener("fetch", (event: FetchEvent) => {
  // Handle only POST requests for GraphQL queries
  if (
    event.request.method === "POST" &&
    event.request.url.includes("/graphql")
  ) {
    event.respondWith(handleGraphQLRequest(event.request));
  } else {
    event.respondWith(handleFetch(event.request));
  }
});

// self.addEventListener("sync", (event) => {
//   console.log("SYNC event received:", event);
//   if (event.tag === "sync-tag") {
//     event.waitUntil(
//       (async () => {
//         try {
//           await syncMutations();
//           await pollSyncData();
//         } catch (error) {
//           console.error("Error during sync:", error);
//         }
//       })()
//     );
//   }
// });
