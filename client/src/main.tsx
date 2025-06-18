import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { pwaManager } from "./utils/pwa";

// Unregister service workers in development to prevent continuous reloading
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    // Only register in production
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully:', registration);
        pwaManager.init();
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    });
  } else {
    // Unregister all service workers in development
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for(let registration of registrations) {
        registration.unregister();
        console.log('Service Worker unregistered in development:', registration);
      }
    });
    console.log('Service Workers disabled in development mode');
  }
}

createRoot(document.getElementById("root")!).render(<App />);
