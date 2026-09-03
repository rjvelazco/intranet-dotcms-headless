import type { NextConfig } from "next";

// dotCMS serves binary fields (banner images, etc.) from its own host,
// so next/image needs it allow-listed. Derived from DOTCMS_HOST at build time.
const dotcmsHost = new URL(process.env.DOTCMS_HOST ?? "http://localhost:8080");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: dotcmsHost.protocol.replace(":", "") as "http" | "https",
        hostname: dotcmsHost.hostname,
        port: dotcmsHost.port,
      },
    ],
  },
};

export default nextConfig;
