import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./style.css";
import "./font-overrides.css";
import "./brand-picker.css";
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
