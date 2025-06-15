import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { pwaManager } from "./utils/pwa";

// Initialize PWA manager
pwaManager;

createRoot(document.getElementById("root")!).render(<App />);
