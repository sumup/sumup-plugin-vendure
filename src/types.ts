import type {
  Checkout,
  CheckoutCreateRequest,
  CheckoutSuccess,
  Currency,
} from "@sumup/sdk"
import type { Payment, RequestContext } from "@vendure/core"

export type SumUpCheckoutMode = "hosted" | "widget"

/**
 * Plugin-level configuration for the SumUp Vendure integration.
 *
 * `returnUrl` is typically the publicly reachable Vendure callback route
 * exposed by this plugin at `/payments/sumup/webhook`.
 *
 * @category Plugin
 */
export type SumUpPluginOptions = {
  apiKey: string
  merchantCode: string
  defaultLanguageCode?: string
  /**
   * @default "hosted"
   */
  checkoutMode?: SumUpCheckoutMode
  returnUrl?: string
  redirectUrl?: string
  paymentDescription?: string
  timeout?: number
  maxRetries?: number
  supportedCurrencies?: readonly string[]
  client?: SumUpClient
}

/**
 * Per-payment-method overrides configured on a Vendure Payment Method.
 *
 * @category Plugin
 */
export type SumUpPaymentMethodArgs = {
  merchantCode?: string
  checkoutMode?: SumUpCheckoutMode
  returnUrl?: string
  redirectUrl?: string
  paymentDescription?: string
}

/**
 * Metadata accepted from storefront checkout flows and persisted on Vendure Payments.
 */
export type SumUpPaymentMetadata = {
  checkout_id?: string
  checkout_reference?: string
  checkout_mode?: SumUpCheckoutMode
  checkoutMode?: SumUpCheckoutMode
  hosted_checkout_url?: string
  transaction_id?: string
  transaction_code?: string
  merchant_code?: string
  merchantCode?: string
  redirect_url?: string
  redirectUrl?: string
  return_url?: string
  returnUrl?: string
  description?: string
  payment_description?: string
  order_code?: string
  orderCode?: string
  idempotency_key?: string
  language_code?: string
  [key: string]: unknown
}

/**
 * Normalized SumUp metadata stored on successful payment creation and sync operations.
 */
export type SumUpStoredMetadata = SumUpPaymentMetadata & {
  checkout_id: string
  checkout_reference: string
  checkout_mode: SumUpCheckoutMode
  merchant_code: string
  raw_checkout?: Checkout | CheckoutSuccess
}

/**
 * Minimal webhook payload shape used by the SumUp webhook controller.
 */
export type SumUpWebhookBody = {
  id?: string
  checkout_id?: string
  event_type?: string
  merchant_code?: string
}

/**
 * Internal abstraction over the SumUp SDK used by the plugin.
 */
export type SumUpClient = {
  createCheckout(
    payload: CheckoutCreateRequest,
    idempotencyKey?: string
  ): Promise<Checkout>
  retrieveCheckout(checkoutId: string): Promise<CheckoutSuccess>
  deactivateCheckout(checkoutId: string): Promise<Checkout>
  refundTransaction(
    merchantCode: string,
    transactionId: string,
    amount?: number
  ): Promise<void>
}

export type SumUpCheckoutResolution = {
  payment: Payment
  metadata: SumUpStoredMetadata
  ctx: RequestContext
}

export type SumUpCurrency = Currency
