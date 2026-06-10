import SumUp, {
  type Checkout,
  type CheckoutCreateRequest,
  type CheckoutSuccess,
} from "@sumup/sdk"

import type { SumUpClient, SumUpPluginOptions } from "./types"

export class SumUpApiClient implements SumUpClient {
  private readonly client: SumUp

  constructor(options: SumUpPluginOptions) {
    this.client = new SumUp({
      apiKey: options.apiKey,
      timeout: options.timeout,
      maxRetries: options.maxRetries,
    })
  }

  createCheckout(
    payload: CheckoutCreateRequest,
    idempotencyKey?: string
  ): Promise<Checkout> {
    return this.client.checkouts.create(payload, {
      headers: idempotencyKey
        ? {
            "Idempotency-Key": idempotencyKey,
          }
        : undefined,
    })
  }

  retrieveCheckout(checkoutId: string): Promise<CheckoutSuccess> {
    return this.client.checkouts.get(checkoutId)
  }

  deactivateCheckout(checkoutId: string): Promise<Checkout> {
    return this.client.checkouts.deactivate(checkoutId)
  }

  async refundTransaction(
    merchantCode: string,
    transactionId: string,
    amount?: number
  ): Promise<void> {
    await this.client.transactions.refund(
      merchantCode,
      transactionId,
      amount === undefined ? undefined : { amount }
    )
  }
}
