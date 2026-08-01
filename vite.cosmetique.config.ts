import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  root: "cosmetique",
  base: "/lens.github.io/cosmetique/",
  plugins: [react()],
  build: { outDir: "../dist-cosmetique", emptyOutDir: true }
});
