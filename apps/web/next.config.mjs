/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // NOTE: experimental.typedRoutes is intentionally disabled. The dashboards
  // build Link hrefs from dynamic nav arrays (string), which typedRoutes
  // rejects at build time. Re-enable only if all hrefs are typed as `Route`.
};

export default nextConfig;
