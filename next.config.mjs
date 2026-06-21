/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The app is rendered by a custom Express server (see server/index.ts) and
  // deployed as a single container to Cloud Run (ADR-0001, ADR-0003).
};

export default nextConfig;
