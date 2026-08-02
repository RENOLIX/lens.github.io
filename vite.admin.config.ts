import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  root: "admin",
  base: "/lens.github.io/admin/",
  plugins: [react()],
  build: { outDir: "../dist-admin", emptyOutDir: true }
});
