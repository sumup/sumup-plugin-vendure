import type {
  Checkout,
  CheckoutCreateRequest,
  CheckoutSuccess,
} from "@sumup/sdk"
import { CurrencyCode } from "@vendure/core"

import type {
  SumUpCheckoutMode,
  SumUpCurrency,
  SumUpPaymentMetadata,
  SumUpPaymentMethodArgs,
  SumUpPluginOptions,
  SumUpStoredMetadata,
} from "./types"

const DEFAULT_SUPPORTED_CURRENCIES = [
  "BGN",
  "BRL",
  "CHF",
  "CLP",
  "COP",
  "CZK",
  "DKK",
  "EUR",
  "GBP",
  "HRK",
  "HUF",
  "NOK",
  "PLN",
  "RON",
  "SEK",
  "USD",
] as const

type SumUpArgsRecord = Record<string, string | undefined>

export function assertRequiredOptions(options: SumUpPluginOptions): void {
  if (!options.apiKey) {
    throw new Error("Required option `apiKey` is missing for SumUpPlugin.")
  }
  if (!options.merchantCode) {
    throw new Error(
      "Required option `merchantCode` is missing for SumUpPlugin."
    )
  }
}

export function resolveCheckoutMode(
  pluginOptions: SumUpPluginOptions,
  methodArgs: SumUpPaymentMethodArgs,
  metadata: SumUpPaymentMetadata
): SumUpCheckoutMode {
  const mode =
    metadata.checkout_mode ??
    metadata.checkoutMode ??
    methodArgs.checkoutMode ??
    pluginOptions.checkoutMode

  return mode === "widget" ? "widget" : "hosted"
}

export function resolveMerchantCode(
  pluginOptions: SumUpPluginOptions,
  methodArgs: SumUpPaymentMethodArgs,
  metadata: SumUpPaymentMetadata
): string {
  return (
    methodArgs.merchantCode ??
    (metadata.merchant_code as string | undefined) ??
    (metadata.merchantCode as string | undefined) ??
    pluginOptions.merchantCode
  )
}

export function normalizeCurrency(
  currencyCode: CurrencyCode | string,
  pluginOptions: SumUpPluginOptions
): SumUpCurrency {
  const supported = new Set(
    pluginOptions.supportedCurrencies ?? DEFAULT_SUPPORTED_CURRENCIES
  )
  const normalized = currencyCode.toUpperCase()
  if (!supported.has(normalized)) {
    throw new Error(`Currency ${currencyCode} is not supported by SumUp.`)
  }
  return normalized as SumUpCurrency
}

export function resolveDescription(
  pluginOptions: SumUpPluginOptions,
  methodArgs: SumUpPaymentMethodArgs,
  metadata: SumUpPaymentMetadata
): string {
  return (
    metadata.description ??
    metadata.payment_description ??
    methodArgs.paymentDescription ??
    pluginOptions.paymentDescription ??
    "Vendure order payment"
  )
}

export function createCheckoutReference(
  orderCode: string,
  metadata: SumUpPaymentMetadata
): string {
  const explicit =
    typeof metadata.checkout_reference === "string"
      ? metadata.checkout_reference
      : typeof metadata.order_code === "string"
        ? metadata.order_code
        : typeof metadata.orderCode === "string"
          ? metadata.orderCode
          : orderCode

  return explicit.slice(0, 90)
}

export function buildCheckoutPayload(input: {
  amount: number
  currencyCode: CurrencyCode | string
  orderCode: string
  metadata: SumUpPaymentMetadata
  methodArgs: SumUpPaymentMethodArgs
  pluginOptions: SumUpPluginOptions
}): CheckoutCreateRequest {
  const {
    amount,
    currencyCode,
    orderCode,
    metadata,
    methodArgs,
    pluginOptions,
  } = input
  const checkoutMode = resolveCheckoutMode(pluginOptions, methodArgs, metadata)

  return {
    checkout_reference: createCheckoutReference(orderCode, metadata),
    amount: toMajorUnitNumber(amount),
    currency: normalizeCurrency(currencyCode, pluginOptions),
    merchant_code: resolveMerchantCode(pluginOptions, methodArgs, metadata),
    description: resolveDescription(pluginOptions, methodArgs, metadata),
    return_url:
      methodArgs.returnUrl ??
      (metadata.return_url as string | undefined) ??
      (metadata.returnUrl as string | undefined) ??
      pluginOptions.returnUrl,
    redirect_url:
      methodArgs.redirectUrl ??
      (metadata.redirect_url as string | undefined) ??
      (metadata.redirectUrl as string | undefined) ??
      pluginOptions.redirectUrl,
    hosted_checkout:
      checkoutMode === "hosted"
        ? {
            enabled: true,
          }
        : undefined,
    purpose: "CHECKOUT",
  }
}

export function toMajorUnitNumber(amount: number | string): number {
  return typeof amount === "number" ? amount : Number(amount)
}

export function getSuccessfulTransaction(
  checkout?: Checkout | CheckoutSuccess
) {
  return checkout?.transactions?.find(
    (transaction) => transaction.status === "SUCCESSFUL"
  )
}

export function getTransactionId(
  checkout?: Checkout | CheckoutSuccess
): string | undefined {
  return (
    (checkout as CheckoutSuccess | undefined)?.transaction_id ??
    getSuccessfulTransaction(checkout)?.id
  )
}

export function getTransactionCode(
  checkout?: Checkout | CheckoutSuccess
): string | undefined {
  return (
    (checkout as CheckoutSuccess | undefined)?.transaction_code ??
    getSuccessfulTransaction(checkout)?.transaction_code
  )
}

export function toPublicMetadata(metadata: SumUpStoredMetadata) {
  return {
    checkoutId: metadata.checkout_id,
    checkoutReference: metadata.checkout_reference,
    checkoutMode: metadata.checkout_mode,
    hostedCheckoutUrl: metadata.hosted_checkout_url,
    redirectUrl: metadata.redirect_url ?? metadata.redirectUrl,
  }
}

export function toStoredMetadata(input: {
  checkout: Checkout | CheckoutSuccess
  checkoutMode: SumUpCheckoutMode
  extraMetadata: SumUpPaymentMetadata
}): SumUpStoredMetadata {
  const { checkout, checkoutMode, extraMetadata } = input
  if (!checkout.id || !checkout.checkout_reference) {
    throw new Error(
      "SumUp checkout response is missing id or checkout_reference."
    )
  }

  return {
    ...extraMetadata,
    checkout_id: checkout.id,
    checkout_reference: checkout.checkout_reference,
    checkout_mode: checkoutMode,
    hosted_checkout_url: checkout.hosted_checkout_url,
    transaction_id: getTransactionId(checkout),
    transaction_code: getTransactionCode(checkout),
    merchant_code: checkout.merchant_code ?? "",
    raw_checkout: checkout,
  }
}

export function mergeStoredMetadata(
  current: SumUpPaymentMetadata,
  checkout: Checkout | CheckoutSuccess
): SumUpStoredMetadata {
  const mode = current.checkout_mode === "widget" ? "widget" : "hosted"
  return toStoredMetadata({
    checkout,
    checkoutMode: mode,
    extraMetadata: current,
  })
}

export function mapCheckoutToPaymentState(
  checkout: Checkout | CheckoutSuccess
): "Created" | "Authorized" | "Settled" | "Declined" | "Cancelled" {
  if (getSuccessfulTransaction(checkout) || checkout.status === "PAID") {
    return "Settled"
  }
  switch (checkout.status) {
    case "PENDING":
      return "Authorized"
    case "FAILED":
      return "Declined"
    case "EXPIRED":
      return "Cancelled"
    default:
      return "Created"
  }
}

export function normalizeMethodArgs(
  args: SumUpArgsRecord
): SumUpPaymentMethodArgs {
  return {
    merchantCode: args.merchantCode,
    checkoutMode:
      args.checkoutMode === "widget" || args.checkoutMode === "hosted"
        ? args.checkoutMode
        : undefined,
    returnUrl: args.returnUrl,
    redirectUrl: args.redirectUrl,
    paymentDescription: args.paymentDescription,
  }
}
