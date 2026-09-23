import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // In production, vercel.json routes /api/* to the backend service. In plain
  // `npm run dev` there is no such router, so proxy to a local uvicorn instead.
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    const target = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";
    return [{ source: "/api/:path*", destination: `${target}/api/:path*` }];
  },
};

export default nextConfig;
