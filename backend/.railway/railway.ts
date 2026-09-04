import { defineRailway, github, project, service } from "railway/iac";

// Infrastructure as Code for the Django API's Railway project. Config as
// Code (a railway.json file) was tried first and confirmed silently
// ignored - Railway no longer lets new services opt into it (see
// https://docs.railway.com/infrastructure-as-code). This file
// documents the intended configuration; the build/deploy settings below
// were actually applied via a direct serviceInstanceUpdate API call
// (this environment's `railway config apply` couldn't run - see
// scripts/railway-build.sh's sibling deploy notes) and verified live.
//
// The `source` (GitHub connection) below is now genuinely active - the
// owner granted Railway's GitHub App access to this repository
// (previously blocked: "User does not have access to the repo" from
// both `railway service source connect` and the raw serviceConnect
// API). Confirmed via `railway service list` reporting a real `source`
// object, and via a real auto-deploy that ran and succeeded from the
// DOMAIN-01 cutover PR's merge commit with no manual `railway up`.
export default defineRailway(() => {
  const backend = service("backend", {
    source: github("Shahriyar-Kh/shahriyarkhan-portfolio-v1", {
      branch: "main",
      rootDirectory: "backend",
    }),
    build: {
      buildCommand: "bash scripts/railway-build.sh",
    },
    deploy: {
      startCommand: "bash scripts/railway-start.sh",
      healthcheckPath: "/healthz",
      healthcheckTimeout: 100,
      // Railway Free's Serverless/App Sleeping - the service scales to
      // zero after a period of no inbound traffic, keeping usage inside
      // the $1/month free credit. The first request after a sleep incurs
      // a genuine cold start (verified separately, see the release
      // report's cold-start section).
      sleepApplication: true,
      restartPolicyType: "ON_FAILURE",
      restartPolicyMaxRetries: 3,
    },
  });

  return project("shahriyarkhan-portfolio-api", {
    resources: [backend],
  });
});
