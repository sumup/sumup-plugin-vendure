# Local Docker Example

A local playground for `@sumup/vendure-plugin`. It runs:

- `postgres` for Vendure
- a Vendure server with Admin UI
- a minimal storefront that creates a real SumUp checkout through the Shop API

The Vendure app builds this plugin from the local source tree and links it into the example app without publishing to npm.

## Quick Start

```bash
cd examples/docker
cp example.env .env
# edit .env and set SUMUP_API_KEY and SUMUP_MERCHANT_CODE
docker compose up --build
```

When ready:

- Storefront: <http://localhost:8080>
- Vendure Shop API for the storefront: <http://127.0.0.1:3000>
- Vendure Admin API: <http://localhost:3000/admin-api>
- Vendure Admin UI: <http://localhost:3000/admin>
- Superadmin login: `superadmin` / `supersecret` by default

If you change credentials, ports, currency, or public URLs after the first boot, reset the example before starting again:

```bash
docker compose down -v
```

## What Gets Seeded

On first boot the example app seeds:

- a `sumup` Payment Method backed by the plugin
- a default shipping method
- a demo product variant
- a small shared `config.json` consumed by the storefront

The example also syncs the default Vendure channel currency to `VENDURE_CURRENCY_CODE`
on first boot. This must match the currency accepted by your SumUp merchant account.

## Hosted Checkout Flow

The storefront:

1. creates an active order
2. adds the seeded demo variant
3. sets customer + address details
4. selects the seeded shipping method
5. transitions the order to `ArrangingPayment` when required
6. calls `addPaymentToOrder` with the `sumup` payment method
7. redirects to `payments[].metadata.public.hostedCheckoutUrl`

## Widget Mode

Set `SUMUP_CHECKOUT_MODE=widget` in `.env` and rebuild. The storefront will show the `checkoutId` returned by the plugin instead of a hosted redirect URL.

## Webhooks

The plugin expects SumUp to call:

```text
http://localhost:3000/payments/sumup/webhook
```

That URL is not publicly reachable from SumUp. To test webhook delivery, expose the backend with a tunnel and set `VENDURE_PUBLIC_URL` in `.env` to the public URL before rebuilding.

## Notes

- Keep `VENDURE_PUBLIC_URL` on `127.0.0.1` if you want the storefront and Admin UI to use separate auth cookies in the browser.
- If port `8080` is already in use, change `STOREFRONT_PORT` and `STOREFRONT_URL` together.
