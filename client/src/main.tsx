import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { pwaManager } from "./utils/pwa";

// Initialize PWA manager and register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered successfully:', registration);
      
      // Initialize PWA manager after service worker registration
      pwaManager.init();
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });
} else {
  // Initialize PWA manager even if service workers aren't supported
  pwaManager.init();
}

createRoot(document.getElementById("root")!).render(<App />);
