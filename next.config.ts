import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // googleapis must stay on the server and is never bundled for the browser.
  serverExternalPackages: ["@googleapis/sheets", "google-auth-library", "puppeteer-core", "@sparticuz/chromium"],
  // Import files are parsed in the browser and the mapped rows are sent to a Server Action.
  experimental: { serverActions: { bodySizeLimit: "8mb" } },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "drive.google.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
