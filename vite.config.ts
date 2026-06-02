import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { execSync } from "node:child_process";

// Plugin: audita chaves i18n do mapa antes do build de produção.
// Falha o build se houver chaves em falta em PT/EN/ES/FR.
function mapI18nAuditPlugin() {
  return {
    name: "map-i18n-audit",
    apply: "build" as const,
    buildStart() {
      try {
        execSync("node scripts/audit-map-i18n.mjs", { stdio: "inherit" });
      } catch {
        throw new Error(
          "Auditoria i18n do mapa falhou: existem chaves em falta em PT/EN/ES/FR. Veja o output acima."
        );
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mapI18nAuditPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
