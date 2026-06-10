# Contributing

This repository contains the source for `@sumup/vendure-plugin`.

`README.md` is for plugin users. Maintainer workflow, local development, and release notes belong here.

## Project layout

- `src/`: plugin source
- `dist/`: build output published to npm
- `examples/docker/`: local Vendure + storefront playground wired to the plugin from source
- `.github/workflows/`: CI and release automation

## Local development

Install dependencies:

```bash
npm install
```

Run the standard checks:

```bash
npm run format
npm run lint
npm run typecheck
npm run build
npm test
```

Run the full pre-publish verification:

```bash
npm run check
```

That command runs linting, type-checking, build, and `npm pack --dry-run`.

## Local integration testing

The Docker example is the fastest way to validate real Vendure behavior:

```bash
cd examples/docker
cp example.env .env
# set SUMUP_API_KEY and SUMUP_MERCHANT_CODE
docker compose up --build
```

The example app:

- builds the plugin from the local source tree
- seeds a `sumup` payment method
- exposes a minimal storefront for Hosted Checkout and widget-mode experiments

See [`examples/docker/README.md`](examples/docker/README.md) for the exact flow and webhook notes.

## Documentation rules

- Keep `README.md` focused on installation, configuration, storefront integration, and user-visible behavior.
- Put maintainer-only notes, test procedures, and release workflow here.
- When the public API changes, update both `README.md` and JSDoc comments in `src/`.

## Vendure publishing checklist

This package is intended to be publishable as a Vendure plugin and align with Vendure's published guidance.

Before release, verify:

- the plugin metadata still declares `compatibility` and that it matches supported Vendure versions
- `@vendure/core` remains a peer dependency rather than a runtime dependency
- `README.md` fully documents installation and usage
- exported public APIs keep useful JSDoc comments for Vendure Hub doc generation
- `CHANGELOG.md` is updated for the release
- `npm run check` passes
- `npm pack --dry-run` contains the expected publish artifacts only

Current publish artifacts are controlled by `package.json#files`:

- `dist`
- `README.md`
- `CHANGELOG.md`
- `LICENSE`

## Release flow

Release automation is configured with `release-please`:

- `release-please-config.json`
- `.release-please-manifest.json`
- `.github/workflows/release-pr.yml`
- `.github/workflows/release.yml`

When preparing a release:

1. Merge the release PR that updates the version and changelog.
2. Confirm CI passes on the release commit.
3. Let the release workflow publish the package.
4. Verify the published tarball metadata on npm.

## Notes on SumUp callback behavior

The plugin exposes a fixed callback endpoint at:

```text
/payments/sumup/webhook
```

`returnUrl` should normally point to that route on a publicly reachable Vendure server. The callback is treated as a notification signal only; the plugin always re-fetches the checkout from SumUp before changing Vendure payment state.
