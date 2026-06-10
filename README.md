# @sumup/vendure-plugin

SumUp payment plugin for Vendure. It creates SumUp checkouts server-side and supports both Hosted Checkout and card-widget-oriented storefront flows without handling raw card data in your Vendure server.

Compatible with Vendure `^3.6.4`.

## Install

```bash
npm install @sumup/vendure-plugin @vendure/core @sumup/sdk
```

## Configure Vendure

```ts
import { VendureConfig } from "@vendure/core"

import { SumUpPlugin, sumUpPaymentHandler } from "@sumup/vendure-plugin"

export const config: VendureConfig = {
  // ...
  plugins: [
    SumUpPlugin.init({
      apiKey: process.env.SUMUP_API_KEY!,
      merchantCode: process.env.SUMUP_MERCHANT_CODE!,
      checkoutMode: "hosted",
      returnUrl: "https://your-vendure.example/payments/sumup/webhook",
      redirectUrl: "https://storefront.example/checkout/sumup/return",
    }),
  ],
  paymentOptions: {
    paymentMethodHandlers: [sumUpPaymentHandler],
  },
}
```

Then create a Payment Method in the Vendure Admin UI using the `sumup` handler.

## Payment Method Configuration

Create a Payment Method in the Vendure Admin UI with:

- `Code`: `sumup`
- `Handler`: `sumup`
- optional handler arguments for `merchantCode`, `checkoutMode`, `returnUrl`, `redirectUrl`, and `paymentDescription`

You can keep global defaults in `SumUpPlugin.init()` and override them per Payment Method when needed.

## Storefront metadata

Pass the metadata you need through `addPaymentToOrder`, for example:

```graphql
mutation AddPaymentToOrder {
  addPaymentToOrder(
    input: {
      method: "sumup"
      metadata: {
        checkout_mode: "hosted"
        checkout_reference: "ORDER-1001"
      }
    }
  ) {
    ... on Order {
      id
      payments {
        metadata
      }
    }
  }
}
```

For hosted checkout, read `payments[].metadata.public.hostedCheckoutUrl` from the Shop API response and redirect the customer there.

For widget-based flows, create the payment with `checkout_mode: "widget"` and use `payments[].metadata.public.checkoutId` to mount SumUp's widget in your storefront. Treat the webhook or a follow-up checkout lookup as the source of truth for settlement.

## Webhook Behavior

The plugin exposes a webhook endpoint at:

```text
/payments/sumup/webhook
```

SumUp webhook calls are treated as notifications only. The plugin re-fetches the checkout from SumUp and then updates the matching Vendure payment using the stored `checkout_id`.

## Options

| Option | Required | Description |
| --- | --- | --- |
| `apiKey` | Yes | SumUp API key or access token. Keep it server-side. |
| `merchantCode` | Yes | SumUp merchant code that receives the payment. |
| `checkoutMode` | No | Default checkout mode: `hosted` or `widget`. Defaults to `hosted`. |
| `returnUrl` | No | SumUp webhook/callback URL. |
| `redirectUrl` | No | Storefront URL shown by Hosted Checkout or used after redirect/SCA flows. |
| `paymentDescription` | No | Default SumUp checkout description. |
| `timeout` | No | SumUp SDK request timeout. |
| `maxRetries` | No | SumUp SDK retry count. |

## Publishing Notes

- The plugin declares Vendure compatibility in the plugin metadata and as a peer dependency.
- The published npm package includes `dist/`, `README.md`, `CHANGELOG.md`, and `LICENSE`.
- Public package entrypoints are exposed via the package `exports` field.

## Local Docker Example

A local Docker setup for testing the plugin against a real Vendure app is included in [`examples/docker`](examples/docker).

## Development

```bash
npm install
npm run format
npm run lint
npm run typecheck
npm run build
```
