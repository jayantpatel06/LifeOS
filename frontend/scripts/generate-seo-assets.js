const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const appDir = path.resolve(__dirname, "..");
const publicDir = path.join(appDir, "public");
const fallbackSiteUrl = "http://localhost:3000";
const privatePaths = [
  "/dashboard",
  "/tasks",
  "/notes",
  "/budget",
  "/focus",
  "/achievements",
  "/settings",
  "/api",
];
const publicPages = [
  {
    changefreq: "weekly",
    path: "/",
    priority: "1.0",
  },
];

const envFiles = [".env", ".env.local"];

envFiles.forEach((fileName) => {
  const filePath = path.join(appDir, fileName);

  if (fs.existsSync(filePath)) {
    dotenv.config({ path: filePath, override: true });
  }
});

const normalizeSiteUrl = (value) => {
  try {
    const url = new URL(value || fallbackSiteUrl);
    const pathname = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
    return `${url.origin}${pathname}`;
  } catch {
    return fallbackSiteUrl;
  }
};

const siteUrl = normalizeSiteUrl(process.env.REACT_APP_SITE_URL);
const siteBasePath = new URL(`${siteUrl}/`).pathname.replace(/\/$/, "");

const buildAbsoluteUrl = (routePath = "/") => {
  const baseUrl = `${siteUrl.replace(/\/+$/, "")}/`;
  const cleanPath = routePath === "/" ? "" : routePath.replace(/^\/+/, "");
  return new URL(cleanPath, baseUrl).toString();
};

const buildRelativePath = (routePath = "/") => {
  if (routePath === "/") {
    return siteBasePath ? `${siteBasePath}/` : "/";
  }

  const cleanPath = routePath.startsWith("/") ? routePath : `/${routePath}`;
  return `${siteBasePath}${cleanPath}`;
};

const robotsContent = [
  "User-agent: *",
  `Allow: ${buildRelativePath("/")}`,
  ...privatePaths.map((routePath) => `Disallow: ${buildRelativePath(routePath)}`),
  `Sitemap: ${buildAbsoluteUrl("/sitemap.xml")}`,
  "",
].join("\n");

const today = new Date().toISOString().split("T")[0];
const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${publicPages
  .map(
    ({ changefreq, path: routePath, priority }) => `  <url>
    <loc>${buildAbsoluteUrl(routePath)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

fs.writeFileSync(path.join(publicDir, "robots.txt"), robotsContent, "utf8");
fs.writeFileSync(path.join(publicDir, "sitemap.xml"), sitemapContent, "utf8");
