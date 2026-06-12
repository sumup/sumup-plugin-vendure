<div align="center">

# @sumup/vendure-plugin

[![NPM Version](https://img.shields.io/npm/v/%40sumup%2Fvendure-plugin.svg)](https://www.npmjs.org/package/@sumup/vendure-plugin)
[![CI](https://github.com/sumup/sumup-plugin-vendure/actions/workflows/ci.yml/badge.svg)](https://github.com/sumup/sumup-plugin-vendure/actions/workflows/ci.yml)
[![Downloads](https://img.shields.io/npm/dm/%40sumup%2Fvendure-plugin.svg)](https://www.npmjs.com/package/@sumup/vendure-plugin)
[![License](https://img.shields.io/npm/l/%40sumup%2Fvendure-plugin.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Vendure](https://img.shields.io/badge/Vendure-%5E3.6.4-2F6FED)](https://www.npmjs.com/package/@vendure/core)

</div>

SumUp payment plugin for [Vendure](https://vendure.io/).

It creates SumUp checkouts from Vendure's `PaymentMethodHandler` flow and supports both:

- SumUp Hosted Checkout redirects
- widget-oriented storefront integrations that use a returned `checkoutId`

The plugin never handles raw card data inside your Vendure server.

Compatible with Vendure `^3.6.4`.

## What it provides

- a Vendure plugin: `SumUpPlugin`
- a payment handler: `sumUpPaymentHandler`
- a webhook/callback controller at `POST /payments/sumup/webhook`

The webhook endpoint is notification-only. When SumUp calls it, the plugin re-fetches the checkout from SumUp and updates the matching Vendure payment from the checkout state.

## Installation

```bash
npm install @sumup/vendure-plugin
```

## Vendure configuration

Register the plugin and payment handler in your Vendure config:

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

`returnUrl` should be a publicly reachable URL that SumUp can call with checkout status updates. In most setups that should be your Vendure server's `/payments/sumup/webhook` route.

## Create the Payment Method

Create a Payment Method in the Vendure Admin UI:

- `Code`: `sumup`
- `Handler`: `sumup`

Optional handler arguments:

- `merchantCode`
- `checkoutMode`
- `returnUrl`
- `redirectUrl`
- `paymentDescription`

Global defaults can be defined in `SumUpPlugin.init()` and overridden per payment method when needed.

## Usage

### Storefront flow

Once the order is in `ArrangingPayment`, call `addPaymentToOrder` with `method: "sumup"` and any SumUp-specific metadata you need.

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
      state
      payments {
        transactionId
        metadata
      }
    }
    ... on ErrorResult {
      errorCode
      message
    }
  }
}
```

The plugin stores SumUp data on the Vendure payment and exposes a safe subset through `payments[].metadata.public`.

### Hosted Checkout

Use `checkout_mode: "hosted"` or set `checkoutMode: "hosted"` in plugin/payment-method config.

After `addPaymentToOrder`, redirect the shopper to:

```text
payments[].metadata.public.hostedCheckoutUrl
```

### Widget-oriented flow

Use `checkout_mode: "widget"` if your storefront will mount SumUp's checkout UI itself.

After `addPaymentToOrder`, read:

```text
payments[].metadata.public.checkoutId
```

Use that `checkoutId` in your storefront's SumUp client integration. The plugin still treats the webhook callback or a later checkout lookup as the source of truth for final payment state.

## Public payment metadata

The plugin exposes these fields in `payments[].metadata.public`:

| Field | Description |
| --- | --- |
| `checkoutId` | SumUp checkout id |
| `checkoutReference` | Merchant checkout reference sent to SumUp |
| `checkoutMode` | `hosted` or `widget` |
| `hostedCheckoutUrl` | Hosted Checkout URL when SumUp returns one |
| `redirectUrl` | Redirect URL associated with the checkout |

## Configuration options

| Option | Required | Description |
| --- | --- | --- |
| `apiKey` | Yes | SumUp API key or access token. Keep it server-side. |
| `merchantCode` | Yes | SumUp merchant code that receives the payment. |
| `defaultLanguageCode` | No | Language used for the handler description shown in Vendure. |
| `checkoutMode` | No | Default checkout mode: `hosted` or `widget`. Defaults to `hosted`. |
| `returnUrl` | No | Backend callback URL used by SumUp for checkout status updates. |
| `redirectUrl` | No | URL the shopper is sent to after redirect-based payment flows. |
| `paymentDescription` | No | Default SumUp checkout description. |
| `timeout` | No | SumUp SDK request timeout in milliseconds. |
| `maxRetries` | No | SumUp SDK retry count. |
| `supportedCurrencies` | No | Override the built-in supported currency allowlist. |
| `client` | No | Inject a custom SumUp client implementation. Useful for tests. |

## Payment state mapping

The plugin maps SumUp checkout state to Vendure payment state like this:

- successful transaction or `PAID` checkout -> `Settled`
- `PENDING` -> `Authorized`
- `FAILED` -> `Declined`
- `EXPIRED` -> `Cancelled`
- anything else -> `Created`

## Integration notes

- The plugin does not add Admin UI extensions.
- The plugin does not extend Vendure's GraphQL schema. It uses the standard `addPaymentToOrder` payment metadata flow described in Vendure's payment docs.

## Notes

- For local end-to-end testing, see [`examples/docker`](examples/docker).
- For contributor workflow, release checks, and publishing notes, see [`CONTRIBUTING.md`](./CONTRIBUTING.md).
