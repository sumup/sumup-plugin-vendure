import { Inject, Injectable } from "@nestjs/common"
import {
  Logger,
  Payment,
  PaymentService,
  RequestContext,
  RequestContextService,
  TransactionalConnection,
} from "@vendure/core"
import { SumUpApiClient } from "./client"
import { SUMUP_PLUGIN_OPTIONS } from "./constants"
import type {
  SumUpCheckoutResolution,
  SumUpClient,
  SumUpPaymentMetadata,
  SumUpPluginOptions,
  SumUpStoredMetadata,
} from "./types"
import {
  assertRequiredOptions,
  getTransactionId,
  mapCheckoutToPaymentState,
  mergeStoredMetadata,
  toMajorUnitNumber,
} from "./utils"

@Injectable()
export class SumUpService {
  private readonly client: SumUpClient

  constructor(
    @Inject(SUMUP_PLUGIN_OPTIONS) private readonly options: SumUpPluginOptions,
    private readonly connection: TransactionalConnection,
    private readonly requestContextService: RequestContextService,
    private readonly paymentService: PaymentService
  ) {
    assertRequiredOptions(options)
    this.client = options.client ?? new SumUpApiClient(options)
  }

  getClient(): SumUpClient {
    return this.client
  }

  async getWebhookUrl(baseUrl: string): Promise<string> {
    return new URL(
      "payments/sumup/webhook",
      `${baseUrl.replace(/\/$/, "")}/`
    ).toString()
  }

  async resolvePaymentByCheckoutId(
    checkoutId: string
  ): Promise<SumUpCheckoutResolution | undefined> {
    const payment = await this.connection.rawConnection
      .getRepository(Payment)
      .findOne({
        where: { transactionId: checkoutId },
        relations: {
          order: {
            channels: true,
          },
        },
      })

    if (!payment) {
      return
    }

    const metadata = (payment.metadata ?? {}) as SumUpPaymentMetadata
    if (
      metadata.checkout_id !== checkoutId ||
      payment.order.channels.length === 0
    ) {
      return
    }

    const ctx = await this.createAdminContext(payment.order.channels[0].token)

    return {
      payment,
      metadata: metadata as SumUpStoredMetadata,
      ctx,
    }
  }

  async syncPaymentFromCheckout(checkoutId: string): Promise<void> {
    const resolved = await this.resolvePaymentByCheckoutId(checkoutId)
    if (!resolved) {
      Logger.warn(
        `SumUp webhook ignored because no Vendure payment matched checkout ${checkoutId}`,
        "SumUpPlugin"
      )
      return
    }

    const checkout = await this.client.retrieveCheckout(checkoutId)
    const nextState = mapCheckoutToPaymentState(checkout)
    resolved.payment.metadata = mergeStoredMetadata(resolved.metadata, checkout)
    await this.connection.rawConnection
      .getRepository(Payment)
      .save(resolved.payment)

    if (nextState === resolved.payment.state) {
      return
    }

    const transition = await this.paymentService.transitionToState(
      resolved.ctx,
      resolved.payment.id,
      nextState
    )

    if ("message" in transition) {
      Logger.error(
        `Failed to transition SumUp payment ${String(resolved.payment.id)} to ${nextState}: ${transition.message}`,
        undefined,
        "SumUpPlugin"
      )
    }
  }

  async cancelCheckout(
    metadata: SumUpPaymentMetadata
  ): Promise<SumUpStoredMetadata | undefined> {
    const checkoutId = metadata.checkout_id
    if (!checkoutId) {
      return
    }

    const checkout = await this.client.retrieveCheckout(checkoutId)
    if (mapCheckoutToPaymentState(checkout) === "Settled") {
      return mergeStoredMetadata(metadata, checkout)
    }

    const deactivated = await this.client.deactivateCheckout(checkoutId)
    return mergeStoredMetadata(metadata, deactivated)
  }

  async refundPayment(
    metadata: SumUpStoredMetadata,
    amount?: number
  ): Promise<SumUpStoredMetadata> {
    const checkout = await this.client.retrieveCheckout(metadata.checkout_id)
    const nextMetadata = mergeStoredMetadata(metadata, checkout)
    const transactionId = getTransactionId(checkout)
    if (!transactionId) {
      throw new Error(
        "Cannot refund SumUp payment without a successful transaction id."
      )
    }

    await this.client.refundTransaction(
      nextMetadata.merchant_code || this.options.merchantCode,
      transactionId,
      amount === undefined ? undefined : toMajorUnitNumber(amount)
    )

    return nextMetadata
  }

  private async createAdminContext(
    channelToken: string
  ): Promise<RequestContext> {
    return this.requestContextService.create({
      apiType: "admin",
      channelOrToken: channelToken,
    })
  }
}
