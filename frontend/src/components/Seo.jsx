import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const DEFAULT_SEO = {
  author: "LifeOS",
  description:
    "LifeOS is a gamified productivity workspace for managing tasks, notes, budgets, focus sessions, streaks, and achievements in one place.",
  image: "/image.png",
  imageAlt: "LifeOS productivity workspace preview",
  keywords:
    "LifeOS, productivity app, task manager, notes app, budget tracker, pomodoro timer, focus timer, habit tracker, streak tracker",
  robots: "index,follow",
  siteName: "LifeOS",
  themeColor: "#0f172a",
  title: "LifeOS | Tasks, Notes, Budget and Focus in One Workspace",
  type: "website",
};

const PRIVATE_ROBOTS = "noindex,nofollow";

const ROUTE_SEO = {
  "/": {
    description:
      "Organize tasks, rich notes, budgets, and focus sessions in one gamified productivity platform built to help you stay consistent.",
    title: "LifeOS | Organize Tasks, Notes, Budget and Focus in One App",
  },
  "/achievements": {
    description: "Private achievements and XP progress inside your LifeOS workspace.",
    robots: PRIVATE_ROBOTS,
    title: "Achievements | LifeOS",
  },
  "/budget": {
    description: "Private budget sheets, transaction tracking, and CSV tools inside LifeOS.",
    robots: PRIVATE_ROBOTS,
    title: "Budget | LifeOS",
  },
  "/dashboard": {
    description: "Private dashboard for your LifeOS productivity workspace.",
    robots: PRIVATE_ROBOTS,
    title: "Dashboard | LifeOS",
  },
  "/focus": {
    description: "Private focus timer, session history, and deep work tracking inside LifeOS.",
    robots: PRIVATE_ROBOTS,
    title: "Focus Timer | LifeOS",
  },
  "/notes": {
    description: "Private rich notes workspace with nested pages and media support in LifeOS.",
    robots: PRIVATE_ROBOTS,
    title: "Notes | LifeOS",
  },
  "/settings": {
    description: "Private profile, account, and activity settings inside LifeOS.",
    robots: PRIVATE_ROBOTS,
    title: "Settings | LifeOS",
  },
  "/tasks": {
    description: "Private task lists, priorities, and progress tracking inside LifeOS.",
    robots: PRIVATE_ROBOTS,
    title: "Tasks | LifeOS",
  },
};

const STRUCTURED_DATA_SELECTOR = "script[data-seo-jsonld]";

const ensureMetaTag = (selector, attribute, value) => {
  let tag = document.head.querySelector(selector);

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, value);
    document.head.appendChild(tag);
  }

  return tag;
};

const setMetaContent = (selector, attribute, value, content) => {
  const tag = ensureMetaTag(selector, attribute, value);
  tag.setAttribute("content", content);
};

const setCanonicalLink = (href) => {
  let link = document.head.querySelector('link[rel="canonical"]');

  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }

  link.setAttribute("href", href);
};

const clearStructuredData = () => {
  document.head.querySelectorAll(STRUCTURED_DATA_SELECTOR).forEach((script) => {
    script.remove();
  });
};

const setStructuredData = (documents) => {
  clearStructuredData();

  documents.forEach((documentData, index) => {
    const script = document.createElement("script");
    script.setAttribute("type", "application/ld+json");
    script.setAttribute("data-seo-jsonld", `${index}`);
    script.textContent = JSON.stringify(documentData);
    document.head.appendChild(script);
  });
};

const normalizeSiteUrl = (value) => {
  const fallbackOrigin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  try {
    const url = new URL(value || fallbackOrigin);
    const pathname = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
    return `${url.origin}${pathname}`;
  } catch {
    return fallbackOrigin;
  }
};

const toAbsoluteUrl = (path) => {
  if (/^https?:\/\//i.test(path || "")) {
    return path;
  }

  const siteUrl = normalizeSiteUrl(process.env.REACT_APP_SITE_URL);
  const baseUrl = `${siteUrl.replace(/\/+$/, "")}/`;
  const cleanPath = path === "/" ? "" : (path || "").replace(/^\/+/, "");

  return new URL(cleanPath, baseUrl).toString();
};

export const RouteSeo = () => {
  const location = useLocation();

  useEffect(() => {
    const seo = ROUTE_SEO[location.pathname] ?? DEFAULT_SEO;
    const title = seo.title ?? DEFAULT_SEO.title;
    const description = seo.description ?? DEFAULT_SEO.description;
    const robots = seo.robots ?? DEFAULT_SEO.robots;
    const keywords = seo.keywords ?? DEFAULT_SEO.keywords;
    const type = seo.type ?? DEFAULT_SEO.type;
    const image = toAbsoluteUrl(seo.image ?? DEFAULT_SEO.image);
    const imageAlt = seo.imageAlt ?? DEFAULT_SEO.imageAlt;
    const canonicalUrl = toAbsoluteUrl(location.pathname);
    const structuredData =
      location.pathname === "/"
        ? [
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              description,
              inLanguage: "en",
              name: DEFAULT_SEO.siteName,
              url: toAbsoluteUrl("/"),
            },
            {
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              applicationCategory: "ProductivityApplication",
              description,
              image,
              name: DEFAULT_SEO.siteName,
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              operatingSystem: "Web",
              url: toAbsoluteUrl("/"),
            },
          ]
        : [];

    document.title = title;

    setMetaContent('meta[name="description"]', "name", "description", description);
    setMetaContent('meta[name="keywords"]', "name", "keywords", keywords);
    setMetaContent('meta[name="author"]', "name", "author", DEFAULT_SEO.author);
    setMetaContent('meta[name="robots"]', "name", "robots", robots);
    setMetaContent('meta[name="googlebot"]', "name", "googlebot", robots);
    setMetaContent('meta[name="bingbot"]', "name", "bingbot", robots);
    setMetaContent('meta[name="theme-color"]', "name", "theme-color", DEFAULT_SEO.themeColor);
    setMetaContent(
      'meta[name="application-name"]',
      "name",
      "application-name",
      DEFAULT_SEO.siteName,
    );
    setMetaContent(
      'meta[name="apple-mobile-web-app-title"]',
      "name",
      "apple-mobile-web-app-title",
      DEFAULT_SEO.siteName,
    );
    setMetaContent('meta[property="og:type"]', "property", "og:type", type);
    setMetaContent('meta[property="og:locale"]', "property", "og:locale", "en_US");
    setMetaContent(
      'meta[property="og:site_name"]',
      "property",
      "og:site_name",
      DEFAULT_SEO.siteName,
    );
    setMetaContent('meta[property="og:title"]', "property", "og:title", title);
    setMetaContent(
      'meta[property="og:description"]',
      "property",
      "og:description",
      description,
    );
    setMetaContent('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    setMetaContent('meta[property="og:image"]', "property", "og:image", image);
    setMetaContent('meta[property="og:image:alt"]', "property", "og:image:alt", imageAlt);
    setMetaContent('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    setMetaContent('meta[name="twitter:title"]', "name", "twitter:title", title);
    setMetaContent('meta[name="twitter:description"]', "name", "twitter:description", description);
    setMetaContent('meta[name="twitter:url"]', "name", "twitter:url", canonicalUrl);
    setMetaContent('meta[name="twitter:image"]', "name", "twitter:image", image);
    setMetaContent('meta[name="twitter:image:alt"]', "name", "twitter:image:alt", imageAlt);
    setCanonicalLink(canonicalUrl);
    setStructuredData(structuredData);

    return () => {
      clearStructuredData();
    };
  }, [location.pathname]);

  return null;
};
