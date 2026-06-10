import {
  type CancelPaymentResult,
  type CreatePaymentResult,
  type CreateRefundResult,
  Injector,
  LanguageCode,
  PaymentMethodHandler,
  type SettlePaymentResult,
} from "@vendure/core"

import { SumUpService } from "./sumup.service"
import type { SumUpPluginOptions, SumUpStoredMetadata } from "./types"
import {
  buildCheckoutPayload,
  mapCheckoutToPaymentState,
  mergeStoredMetadata,
  normalizeMethodArgs,
  resolveCheckoutMode,
  toPublicMetadata,
} from "./utils"

let sumUpService: SumUpService
let activeOptions: SumUpPluginOptions = {
  apiKey: "",
  merchantCode: "",
}

export function setActiveSumUpOptions(options: SumUpPluginOptions) {
  activeOptions = options
}

function getActiveOptions(): SumUpPluginOptions {
  return activeOptions
}

export function createSumUpPaymentHandler() {
  return new PaymentMethodHandler({
    code: "sumup",
    description: [
      {
        languageCode: getActiveOptions().defaultLanguageCode
          ? (getActiveOptions().defaultLanguageCode as LanguageCode)
          : LanguageCode.en,
        value: "SumUp",
      },
    ],
    init(injector: Injector) {
      sumUpService = injector.get(SumUpService)
    },
    args: {
      merchantCode: { type: "string", required: false },
      checkoutMode: { type: "string", required: false },
      returnUrl: { type: "string", required: false },
      redirectUrl: { type: "string", required: false },
      paymentDescription: { type: "string", required: false },
    },
    createPayment: async (
      _ctx,
      order,
      amount,
      args,
      metadata
    ): Promise<CreatePaymentResult> => {
      const pluginOptions = getActiveOptions()
      const methodArgs = normalizeMethodArgs(args)
      const checkoutMode = resolveCheckoutMode(
        pluginOptions,
        methodArgs,
        metadata
      )
      const checkout = await sumUpService.getClient().createCheckout(
        buildCheckoutPayload({
          amount,
          currencyCode: order.currencyCode,
          orderCode: order.code,
          metadata,
          methodArgs,
          pluginOptions,
        }),
        typeof metadata.idempotency_key === "string"
          ? metadata.idempotency_key
          : undefined
      )

      const storedMetadata = mergeStoredMetadata(
        {
          ...metadata,
          order_code: order.code,
          checkout_mode: checkoutMode,
        },
        checkout
      )

      return {
        amount,
        state: mapCheckoutToPaymentState(checkout),
        transactionId: storedMetadata.checkout_id,
        metadata: {
          ...storedMetadata,
          public: toPublicMetadata(storedMetadata),
        },
      }
    },
    settlePayment: async (): Promise<SettlePaymentResult> => {
      return { success: true }
    },
    cancelPayment: async (
      _ctx,
      _order,
      payment
    ): Promise<CancelPaymentResult> => {
      const nextMetadata = await sumUpService.cancelCheckout(
        payment.metadata ?? {}
      )
      return {
        success: true,
        metadata: nextMetadata
          ? {
              ...nextMetadata,
              public: toPublicMetadata(nextMetadata),
            }
          : payment.metadata,
      }
    },
    createRefund: async (
      _ctx,
      _input,
      amount,
      _order,
      payment
    ): Promise<CreateRefundResult> => {
      const nextMetadata = await sumUpService.refundPayment(
        payment.metadata as SumUpStoredMetadata,
        amount
      )
      return {
        state: "Settled",
        transactionId: nextMetadata.transaction_id ?? payment.transactionId,
        metadata: nextMetadata,
      }
    },
  })
}
