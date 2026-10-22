import { dirname, join } from "path";
import { fileURLToPath } from "url";

const backend = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // the Docker image runs the self-contained server; `npm start` keeps using `next start`
  ...(process.env.STANDALONE === "1" && { output: "standalone" }),
  outputFileTracingRoot: join(dirname(fileURLToPath(import.meta.url)), ".."),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backend}/api/:path*` },
      { source: "/health", destination: `${backend}/health` },
    ];
  },
};

export default nextConfig;
