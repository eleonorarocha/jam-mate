import { useEffect } from "react";
import { useLocation, matchPath } from "react-router-dom";
import { useTranslation } from "react-i18next";

// Mapeia padrões de rota para chaves i18n em `pages.<key>.title`.
// Ordem importa: padrões mais específicos primeiro.
const ROUTE_TITLE_MAP: Array<{ pattern: string; key: string }> = [
  { pattern: "/profile/:id", key: "public_profile" },
  { pattern: "/", key: "index" },
  { pattern: "/auth", key: "auth" },
  { pattern: "/onboarding", key: "onboarding" },
  { pattern: "/reset-password", key: "reset_password" },
  { pattern: "/map", key: "map" },
  { pattern: "/profile", key: "profile" },
  { pattern: "/messages", key: "messages" },
  { pattern: "/calendar", key: "calendar" },
  { pattern: "/ratings", key: "ratings" },
  { pattern: "/settings", key: "settings" },
  { pattern: "/gallery", key: "gallery" },
  { pattern: "/favorites", key: "favorites" },
  { pattern: "/about", key: "about" },
  { pattern: "/admin", key: "admin" },
];

// Lista de chaves usadas — exportada para a auditoria i18n.
export const ROUTE_TITLE_KEYS = [
  ...ROUTE_TITLE_MAP.map((r) => `pages.${r.key}.title`),
  "pages.not_found.title",
  "pages.brand",
];

function resolveKey(pathname: string): string {
  for (const r of ROUTE_TITLE_MAP) {
    if (matchPath({ path: r.pattern, end: true }, pathname)) return r.key;
  }
  return "not_found";
}

export function RouteTitle() {
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const key = resolveKey(pathname);
    const title = t(`pages.${key}.title`);
    const brand = t("pages.brand");
    document.title = title ? `${title} · ${brand}` : brand;
  }, [pathname, t, i18n.language]);

  return null;
}
