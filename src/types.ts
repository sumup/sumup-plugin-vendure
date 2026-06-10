import type {
  Checkout,
  CheckoutCreateRequest,
  CheckoutSuccess,
  Currency,
} from "@sumup/sdk"
import type { Payment, RequestContext } from "@vendure/core"

export type SumUpCheckoutMode = "hosted" | "widget"

export type SumUpPluginOptions = {
  apiKey: string
  merchantCode: string
  defaultLanguageCode?: string
  checkoutMode?: SumUpCheckoutMode
  returnUrl?: string
  redirectUrl?: string
  paymentDescription?: string
  timeout?: number
  maxRetries?: number
  supportedCurrencies?: readonly string[]
  client?: SumUpClient
}

export type SumUpPaymentMethodArgs = {
  merchantCode?: string
  checkoutMode?: SumUpCheckoutMode
  returnUrl?: string
  redirectUrl?: string
  paymentDescription?: string
}

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

export type SumUpStoredMetadata = SumUpPaymentMetadata & {
  checkout_id: string
  checkout_reference: string
  checkout_mode: SumUpCheckoutMode
  merchant_code: string
  raw_checkout?: Checkout | CheckoutSuccess
}

export type SumUpWebhookBody = {
  id?: string
  checkout_id?: string
  event_type?: string
  merchant_code?: string
}

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
