import { defineRailway, github, project, service } from "railway/iac";

// Infrastructure as Code for the Django API's Railway project. Config as
// Code (railway.json, kept alongside this file for reference/other
// tooling) is deprecated and was silently ignored on this service - see
// https://docs.railway.com/infrastructure-as-code. This is the file
// that actually configures the deployed service; apply changes with
// `railway config plan` then `railway config apply` from backend/.
export default defineRailway(() => {
  const backend = service("backend", {
    // GitHub-connected (not a one-off local upload) so every push to
    // main auto-deploys, matching how the frontend's own CI/CD works.
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
