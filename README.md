<div align="center">

# @sumup/vendure-plugin

[![Vendure Plugin Registry](https://img.shields.io/badge/Vendure-plugin%20registry-2F6FED)](https://docs.vendure.io/plugins/sumup)
[![NPM Version](https://img.shields.io/npm/v/%40sumup%2Fvendure-plugin.svg)](https://www.npmjs.org/package/@sumup/vendure-plugin)
[![CI](https://github.com/sumup/sumup-plugin-vendure/actions/workflows/ci.yml/badge.svg)](https://github.com/sumup/sumup-plugin-vendure/actions/workflows/ci.yml)
[![Downloads](https://img.shields.io/npm/dm/%40sumup%2Fvendure-plugin.svg)](https://www.npmjs.com/package/@sumup/vendure-plugin)
[![License](https://img.shields.io/npm/l/%40sumup%2Fvendure-plugin.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

</div>

Accept payments in [Vendure](https://vendure.io/) with SumUp Hosted Checkout or the SumUp Payment Widget.

Requires Node.js 20 or later and Vendure `^3.6.4`. Keep your SumUp API key on the server. SumUp collects the shopper's payment details.

## Installation

```bash
npm install @sumup/vendure-plugin
```

## Vendure Configuration

Register the plugin and payment handler:

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

Set `returnUrl` to your Vendure server's public `/payments/sumup/webhook` URL so SumUp can send payment updates. Set `redirectUrl` to the storefront page the shopper should return to after checkout.

## Create the Payment Method

Create and enable a payment method in the Vendure Admin UI:
- `Code`: `sumup`
- `Handler`: `sumup`

You can override `merchantCode`, `checkoutMode`, `returnUrl`, `redirectUrl`, and `paymentDescription` in the payment method's handler arguments. Otherwise, the values from `SumUpPlugin.init()` apply.

## Create a Checkout

Once the order is in `ArrangingPayment`, call `addPaymentToOrder` with `method: "sumup"`:

```graphql
mutation AddPaymentToOrder {
  addPaymentToOrder(
    input: { method: "sumup", metadata: { checkout_mode: "hosted" } }
  ) {
    ... on Order {
      id
      state
      payments {
        state
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

The response includes the checkout details in `payments[].metadata.public`.

You can pass an empty `metadata` object to use the configured checkout mode. To supply your own checkout reference, set `metadata.checkout_reference`; otherwise, the plugin uses the order code. Use a new reference when creating a replacement checkout.

### Hosted Checkout

Hosted Checkout is the default. You can also select it with `metadata.checkout_mode: "hosted"`.

After `addPaymentToOrder`, redirect the shopper to:

```text
payments[].metadata.public.hostedCheckoutUrl
```

### Payment Widget

Set `checkoutMode: "widget"` in your configuration or pass `metadata.checkout_mode: "widget"` when creating the payment.

After `addPaymentToOrder`, read:

```text
payments[].metadata.public.checkoutId
```

Use that `checkoutId` to mount the SumUp Payment Widget in your storefront.

## Payment Status

Creating a checkout leaves the payment in `SumUpPending` and the order in `ArrangingPayment`. The order stays unpaid while the shopper completes checkout.

When SumUp sends an update, the plugin checks the checkout status with SumUp and updates the payment:

| Checkout result  | Vendure payment state |
| ---------------- | --------------------- |
| Paid             | `Settled`             |
| Failed           | `Declined`            |
| Expired          | `Cancelled`           |
| Awaiting payment | `SumUpPending`        |

A fully paid order moves to `PaymentSettled`. Confirm the order's payment status before fulfilling it. Returning to `redirectUrl` or receiving a widget success event alone does not confirm payment.

## Public Payment Metadata

The plugin exposes these fields in `payments[].metadata.public`:

| Field               | Description                                |
| ------------------- | ------------------------------------------ |
| `checkoutId`        | SumUp checkout id                          |
| `checkoutReference` | Merchant checkout reference sent to SumUp  |
| `checkoutMode`      | `hosted` or `widget`                       |
| `hostedCheckoutUrl` | Hosted Checkout URL when SumUp returns one |
| `redirectUrl`       | Redirect URL associated with the checkout  |

## Configuration Options

| Option                | Required | Description                                                                                                   |
| --------------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `apiKey`              | Yes      | SumUp API key or access token. Keep it server-side.                                                           |
| `merchantCode`        | Yes      | SumUp merchant code that receives the payment.                                                                |
| `defaultLanguageCode` | No       | Language used for the handler description shown in Vendure.                                                   |
| `checkoutMode`        | No       | Default checkout mode: `hosted` or `widget`. Defaults to `hosted`.                                            |
| `returnUrl`           | No       | Backend callback URL used by SumUp for checkout status updates.                                               |
| `redirectUrl`         | No       | URL the shopper is sent to after redirect-based payment flows.                                                |
| `paymentDescription`  | No       | Default SumUp checkout description.                                                                           |
| `timeout`             | No       | SumUp SDK request timeout in milliseconds.                                                                    |
| `maxRetries`          | No       | SumUp SDK retry count.                                                                                        |
| `supportedCurrencies` | No       | Override the list of accepted currencies. The currency must also be supported by your SumUp merchant account. |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for local development, tests, custom API clients, and releases.
