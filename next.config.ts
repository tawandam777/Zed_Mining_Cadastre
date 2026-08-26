import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // lib/data/shapefileLoader.ts reads Admin_Bounds/*.shp via fs.readFileSync at a
  // dynamically-resolved path, which Turbopack's file tracer can't statically follow —
  // it falls back to tracing the whole project into every API route's serverless bundle.
  // Every /api/** route imports the shared getProvider() (lib/data/index.ts), which
  // transitively pulls in the shapefile loader even for routes that don't touch
  // boundaries directly, so this applies to the whole /api/** tree rather than just the
  // boundary-serving route.
  outputFileTracingIncludes: {
    "/api/**": ["./Admin_Bounds/**/*", "./lib/data/licences.generated.json"],
  },
};

// Safe with no Sentry project configured at all: source-map upload (which needs
// SENTRY_ORG/SENTRY_PROJECT/SENTRY_AUTH_TOKEN) is skipped with a warning, not a build
// failure, when those aren't set — same as NEXT_PUBLIC_SENTRY_DSN being unset just makes
// the SDK itself a no-op at runtime.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
});
