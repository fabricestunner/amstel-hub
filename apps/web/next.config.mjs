/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // standalone for Docker; Vercel manages its own output format
  output: process.env.VERCEL ? undefined : 'standalone',
  // NOTE: experimental.typedRoutes is intentionally disabled. The dashboards
  // build Link hrefs from dynamic nav arrays (string), which typedRoutes
  // rejects at build time. Re-enable only if all hrefs are typed as `Route`.
};

export default nextConfig;
