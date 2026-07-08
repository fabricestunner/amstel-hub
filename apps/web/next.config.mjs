/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // standalone for Docker; Vercel manages its own output format
  output: process.env.VERCEL ? undefined : 'standalone',
  // Tree-shake barrel imports from big icon/chart/date libs so each page only
  // ships the specific symbols it uses (smaller JS, faster TTI).
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },
  // Drop console.* (except warn/error) from production bundles.
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? { exclude: ['error', 'warn'] }
        : false,
  },
  // NOTE: experimental.typedRoutes is intentionally disabled. The dashboards
  // build Link hrefs from dynamic nav arrays (string), which typedRoutes
  // rejects at build time. Re-enable only if all hrefs are typed as `Route`.
};

export default nextConfig;
