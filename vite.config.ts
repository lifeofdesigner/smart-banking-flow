import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Manually splitting vendor deps (react/radix/recharts) into separate
    // chunks broke chunk load ordering at runtime (blank-page crashes:
    // "Cannot access 'x' before initialization", "Cannot read properties of
    // undefined (reading 'forwardRef')"). Rollup's automatic chunking is
    // safe; just raise the warning threshold instead of fighting it.
    chunkSizeWarningLimit: 600,
  },
}));
