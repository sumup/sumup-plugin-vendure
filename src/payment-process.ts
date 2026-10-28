import type { PaymentProcess } from "@vendure/core"

declare module "@vendure/core" {
  interface PaymentStates {
    SumUpPending: never
  }
}

/**
 * Keeps a SumUp checkout unpaid while the shopper completes payment.
 * Registered automatically by SumUpPlugin.
 *
 * @category Plugin
 */
export const sumUpPaymentProcess: PaymentProcess<"SumUpPending"> = {
  transitions: {
    Created: { to: ["SumUpPending"] },
    SumUpPending: { to: ["Settled", "Declined", "Cancelled", "Error"] },
  },
}
