# sumup-plugin-vendure

SumUp payment plugin for Vendure. The plugin creates SumUp checkouts server-side and supports both Hosted Checkout and the SumUp card widget flow.

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

## Development

```bash
npm install
npm run format
npm run lint
npm run typecheck
npm run build
```
