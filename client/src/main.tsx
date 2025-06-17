import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Simplified initialization to fix blank screen issue
createRoot(document.getElementById("root")!).render(<App />);

// Initialize PWA features after app renders
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered successfully:', registration);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });
}
