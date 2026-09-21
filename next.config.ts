import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {};

// Safe with no Sentry project configured at all: source-map upload (which needs
// SENTRY_ORG/SENTRY_PROJECT/SENTRY_AUTH_TOKEN) is skipped with a warning, not a build
// failure, when those aren't set — same as NEXT_PUBLIC_SENTRY_DSN being unset just makes
// the SDK itself a no-op at runtime.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
});
