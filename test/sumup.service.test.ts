import { describe, expect, it, vi } from "vitest"

import { SumUpService } from "../src/sumup.service"
import type { SumUpClient } from "../src/types"

function createService(input: {
  checkout: unknown
  paymentState?: string
  transitionToState?: ReturnType<typeof vi.fn>
}) {
  const payment = {
    id: "payment-1",
    state: input.paymentState ?? "Created",
    transactionId: "checkout-1",
    metadata: {
      checkout_id: "checkout-1",
      checkout_reference: "order-1",
      checkout_mode: "hosted",
      merchant_code: "merchant-1",
    },
    order: {
      channels: [{ token: "default-channel" }],
    },
  }
  const transitionToState =
    input.transitionToState ?? vi.fn().mockResolvedValue(payment)
  const repository = {
    findOne: vi.fn().mockResolvedValue(payment),
    save: vi.fn().mockResolvedValue(payment),
  }
  const connection = {
    rawConnection: {
      getRepository: vi.fn().mockReturnValue(repository),
    },
  }
  const client: SumUpClient = {
    createCheckout: vi.fn(),
    retrieveCheckout: vi.fn().mockResolvedValue(input.checkout),
    deactivateCheckout: vi.fn(),
    refundTransaction: vi.fn(),
  }
  const requestContextService = {
    create: vi.fn().mockResolvedValue({ channel: { token: "default-channel" } }),
  }
  const paymentService = {
    transitionToState,
  }

  return {
    service: new SumUpService(
      {
        apiKey: "test-api-key",
        merchantCode: "merchant-1",
        client,
      },
      connection as never,
      requestContextService as never,
      paymentService as never
    ),
    client,
    payment,
    repository,
    transitionToState,
  }
}

describe("SumUpService", () => {
  it("does not authorize Vendure payments for pending SumUp checkouts", async () => {
    const { service, payment, repository, transitionToState } = createService({
      checkout: {
        id: "checkout-1",
        checkout_reference: "order-1",
        status: "PENDING",
        merchant_code: "merchant-1",
      },
    })

    await service.syncPaymentFromCheckout("checkout-1")

    expect(repository.save).toHaveBeenCalledWith(payment)
    expect(payment.metadata).toMatchObject({
      checkout_id: "checkout-1",
      raw_checkout: expect.objectContaining({ status: "PENDING" }),
    })
    expect(transitionToState).not.toHaveBeenCalled()
  })

  it("transitions a pending Vendure payment to Declined after SumUp failure", async () => {
    const { service, transitionToState } = createService({
      checkout: {
        id: "checkout-1",
        checkout_reference: "order-1",
        status: "FAILED",
        merchant_code: "merchant-1",
      },
    })

    await service.syncPaymentFromCheckout("checkout-1")

    expect(transitionToState).toHaveBeenCalledWith(
      expect.objectContaining({ channel: { token: "default-channel" } }),
      "payment-1",
      "Declined"
    )
  })

  it("transitions a pending Vendure payment to Settled after SumUp payment", async () => {
    const { service, transitionToState } = createService({
      checkout: {
        id: "checkout-1",
        checkout_reference: "order-1",
        status: "PAID",
        merchant_code: "merchant-1",
      },
    })

    await service.syncPaymentFromCheckout("checkout-1")

    expect(transitionToState).toHaveBeenCalledWith(
      expect.objectContaining({ channel: { token: "default-channel" } }),
      "payment-1",
      "Settled"
    )
  })
})
