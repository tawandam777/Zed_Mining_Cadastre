import type { NextConfig } from "next";

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

export default nextConfig;
