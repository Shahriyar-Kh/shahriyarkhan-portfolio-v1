# web — Next.js frontend

The production frontend for Shahriyar Khan's portfolio, built against the
Django/DRF backend in `../backend/`. Deployed to Cloudflare Workers - see
the root [`README.md`](../README.md) for the overall architecture and
[`PROVENANCE.md`](../PROVENANCE.md) for this repository's release
history.

## Runtime requirement

**Node 22.22.2** (see `.nvmrc`, matched exactly in `.github/workflows/ci.yml`'s `web` job and in
`package.json`'s `engines.node`). This is a hard requirement, not a suggestion: `jsdom@30` (used by
the test suite) requires `^22.22.2 || ^24.15.0 || >=26.0.0`, and `undici@8.10` requires
`>=22.19.0`. Under an older Node, every test worker fails before running a single test, with
`TypeError: webidl.util.markAsUncloneable is not a function`.

If using `nvm`: `nvm use` (reads `.nvmrc`). If using `fnm`: `fnm use`.

## Local development

```bash
nvm use                      # or fnm use - see "Runtime requirement" above
npm ci
cp .env.example .env.local   # then edit if needed - the defaults already point at the real backend
npm run dev
```

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build locally |
| `npm run lint` | ESLint (includes jsx-a11y) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run typegen` | Generate `.next/types` ahead of a type check |
| `npm test` | Vitest (unit + component tests) |
| `npm run smoke` | Route smoke test against a running server (`SMOKE_BASE_URL=<url>`) |
| `npm run check-links` | Internal broken-link crawl against a running server (`SMOKE_BASE_URL=<url>`) |
| `npm run verify-review-ready` | Real-browser check: every dataset renders with real records, zero fallback messages (`SMOKE_BASE_URL=<url>`) |
| `npm run verify-header-responsive` | Real-browser check: header/mobile-nav breakpoint and geometry regression suite (`SMOKE_BASE_URL=<url>`) |

## Environment variables

See `.env.example` for the full list and what each one does. `NEXT_PUBLIC_API_BASE_URL` unset is a
supported, deliberate state (used by CI): every API call short-circuits to a typed
"not configured" result instead of failing the build.

## Deployment (Cloudflare Workers)

See the root [`README.md`](../README.md) and this repository's release
report for the exact Cloudflare build/deploy commands used for this
release.
