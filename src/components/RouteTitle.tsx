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

// Descrições únicas (50–160 chars) por rota, em PT.
const ROUTE_META: Record<string, { title: string; description: string }> = {
  index: {
    title: "JamMate — Encontra músicos para jam sessions perto de ti",
    description:
      "Descobre músicos locais num mapa estilo Airbnb e marca jam sessions em minutos. Sem custos, sem complicações.",
  },
  auth: {
    title: "Entrar ou criar conta",
    description:
      "Entra na tua conta JamMate ou cria uma nova para contactar músicos e marcar jam sessions na tua zona.",
  },
  onboarding: {
    title: "Configura o teu perfil de músico",
    description:
      "Diz-nos que instrumentos tocas, o teu nível e onde costumas ensaiar para começares a receber convites para jams.",
  },
  reset_password: {
    title: "Recuperar palavra-passe",
    description:
      "Define uma nova palavra-passe para a tua conta JamMate e volta a aceder ao mapa de músicos e às tuas marcações.",
  },
  map: {
    title: "Mapa de músicos e filtros avançados",
    description:
      "Explora músicos no mapa, filtra por instrumento, nível e distância, e encontra parceiros ideais para a tua próxima jam.",
  },
  profile: {
    title: "O meu perfil",
    description:
      "Edita o teu perfil JamMate: instrumentos, géneros, bio, fotos e preferências de parceiros de jam session.",
  },
  public_profile: {
    title: "Perfil de músico",
    description:
      "Vê o perfil público deste músico no JamMate: instrumentos, géneros, avaliações e disponibilidade para jam sessions.",
  },
  messages: {
    title: "Mensagens",
    description:
      "Conversa em tempo real com músicos com quem combinaste jam sessions, com indicadores de escrita e recibos de leitura.",
  },
  calendar: {
    title: "Calendário de jam sessions",
    description:
      "Vê e gere as tuas próximas jam sessions num calendário integrado: confirma, recusa ou marca como concluídas.",
  },
  ratings: {
    title: "Avaliações das jam sessions",
    description:
      "Avalia os teus parceiros depois de cada jam (local, respeito, pontualidade, diversão) e consulta as tuas avaliações.",
  },
  settings: {
    title: "Definições da conta",
    description:
      "Gere preferências, notificações, idioma, utilizadores bloqueados e privacidade da tua conta JamMate.",
  },
  gallery: {
    title: "Galeria das tuas jam sessions",
    description:
      "Arquiva fotos e vídeos das tuas jam sessions e partilha os melhores momentos no teu perfil público.",
  },
  favorites: {
    title: "Músicos favoritos",
    description:
      "Os músicos que guardaste como favoritos, prontos para reorganizar, filtrar e contactar para novas jam sessions.",
  },
  about: {
    title: "Sobre o JamMate — perguntas frequentes",
    description:
      "Conhece a missão do JamMate, vê as estatísticas da comunidade e responde às perguntas mais frequentes dos músicos.",
  },
  admin: {
    title: "Painel de administração",
    description:
      "Painel interno para moderação de conteúdos, gestão de utilizadores e estatísticas da plataforma JamMate.",
  },
  not_found: {
    title: "Página não encontrada",
    description:
      "A página que procuras não existe ou foi movida. Volta ao mapa para continuares a descobrir músicos perto de ti.",
  },
};

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

function upsertMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function RouteTitle() {
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const key = resolveKey(pathname);
    const meta = ROUTE_META[key] ?? ROUTE_META.not_found;
    const brand = t("pages.brand", { defaultValue: "JamMate" });

    // Prefer i18n title when available, fall back to local PT title.
    const i18nTitle = t(`pages.${key}.title`, { defaultValue: "" });
    const title = i18nTitle || meta.title;
    const fullTitle = title ? `${title} · ${brand}` : brand;

    document.title = fullTitle;
    upsertMeta("description", meta.description);
    upsertMeta("og:title", fullTitle, "property");
    upsertMeta("og:description", meta.description, "property");
    upsertMeta("og:url", pathname, "property");
    upsertCanonical(pathname);
  }, [pathname, t, i18n.language]);

  return null;
}
