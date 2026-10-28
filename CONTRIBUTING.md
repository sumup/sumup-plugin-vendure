# Contributing

This repository contains the source for `@sumup/vendure-plugin`. Keep setup and storefront guidance in [README.md](./README.md). Development and implementation notes belong here.

## Project Layout

- `src/`: plugin source
- `test/`: unit and integration tests
- `dist/`: generated JavaScript and types published with the package
- `examples/docker/`: a Vendure server and storefront that use the local plugin
- `.github/workflows/`: CI and release workflows

Edit files in `src/` and rebuild to update `dist/`. Do not edit generated files.

## Development

Install the locked dependencies:

```bash
npm ci
```

Run tests and package checks before committing:

```bash
npm test
npm run check
```

`npm test` builds the plugin and runs all tests. `npm run check` runs lint, typecheck, build, and `npm pack --dry-run`. Use `npm run format` to format the code.

## Tests

Unit tests cover amount conversion, checkout payloads, status mapping, and payment updates.

The integration suite starts a local Vendure server with an in-memory SQL.js database. It uses the built plugin because Nest needs the decorator metadata emitted by TypeScript. Vendure's services and state machines run normally; only SumUp HTTP responses are stubbed.

The suite covers pending checkout creation, the amount sent to SumUp, rejection of settlement before payment, and paid, failed, expired, and repeated callbacks. It calls `OrderService.addPaymentToOrder` directly and sends callbacks to the plugin's HTTP endpoint. It does not run a browser checkout or contact SumUp.

To test with a real SumUp account, use the [Docker example](./examples/docker/README.md):

```bash
cd examples/docker
cp example.env .env
# Set SUMUP_API_KEY and SUMUP_MERCHANT_CODE in .env.
docker compose up --build
```

The example builds the local plugin, creates a payment method and demo product, and serves a small storefront. Expose the backend through a public URL to receive SumUp callbacks. See the example README for the settings.

## Payment Flow

The payment handler creates a SumUp checkout when Vendure calls `addPaymentToOrder`. It converts Vendure's minor units to SumUp's major units: an amount of `1295` becomes `12.95`.

Vendure saves each new payment as `Created`, then transitions it to the state returned by the handler. Returning `Created` would require a `Created → Created` transition, which Vendure's default process does not allow.

The plugin appends `sumUpPaymentProcess` to the configured payment processes. It adds `Created → SumUpPending` and allows `SumUpPending` to transition to `Settled`, `Declined`, `Cancelled`, or `Error`. Existing payment processes remain configured. Pending payments do not count as authorized or settled, so the order stays in `ArrangingPayment`.

Checkout states map to payment states as follows:

| SumUp checkout state               | Vendure payment state |
| ---------------------------------- | --------------------- |
| `PAID` or a successful transaction | `Settled`             |
| `FAILED`                           | `Declined`            |
| `EXPIRED`                          | `Cancelled`           |
| `PENDING` or an unknown state      | `SumUpPending`        |

The settlement handler fetches the checkout from SumUp and confirms payment before allowing settlement.

### Callbacks

The plugin receives callbacks at `POST /payments/sumup/webhook`. It uses the checkout ID to find the stored payment, fetches the checkout from SumUp, and applies the current status. The callback body is a notification, not proof of payment. Repeated callbacks for the same status do not repeat the payment transition.

The payment stores the checkout ID, reference, merchant code, and checkout response. The Shop API exposes only the fields under `metadata.public`; see the README for those fields.

### Custom API Clients

`SumUpPlugin.init()` accepts an optional `client` that implements the exported `SumUpClient` type. Use it to replace the SumUp API client in tests or other server integrations. The interface is defined in [src/types.ts](./src/types.ts).

### Recovery Limits

Creating a SumUp checkout and saving a Vendure payment are separate operations. If the checkout succeeds but the database write fails, the plugin does not recover the orphaned checkout automatically. Reusing its reference can cause a duplicate checkout error. Check the existing checkout before starting a replacement, and give the replacement a new reference.

## Documentation

- Keep the README focused on installation, configuration, storefront usage, and payment outcomes.
- Put implementation details, test instructions, and release steps here.
- Update public API comments and user documentation when behavior changes.

## Releases

Release Please prepares the version and changelog through `release-please-config.json`, `.release-please-manifest.json`, and `.github/workflows/release-pr.yml`. Publishing a GitHub release starts `.github/workflows/release.yml`.

Before merging a release:
1. Run `npm test` and `npm run check`.
2. Check that the declared Vendure compatibility matches the peer dependency.
3. Check that `package.json` points to `sumup/sumup-plugin-vendure`. npm provenance requires the repository URL to match the publishing repository.
4. Review the package contents from `npm pack --dry-run`. They should contain the build output, README, changelog, license, and package metadata.

After publishing, confirm the release workflow succeeded and verify the version and tarball on npm. A GitHub release alone does not mean the package was published. The workflow publishes to GitHub Packages after npm succeeds.
