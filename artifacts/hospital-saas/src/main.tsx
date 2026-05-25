import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";
import { HelmetProvider } from "react-helmet-async";

setBaseUrl(import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080");

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
