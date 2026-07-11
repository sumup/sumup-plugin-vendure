import { CurrencyCode } from "@vendure/core"
import { describe, expect, it } from "vitest"

import {
  buildCheckoutPayload,
  mapCheckoutToPaymentState,
  toMajorUnitNumber,
} from "../src/utils"

const pluginOptions = {
  apiKey: "test-api-key",
  merchantCode: "test-merchant",
}

function checkoutWithStatus(
  status: string
): Parameters<typeof mapCheckoutToPaymentState>[0] {
  return { status } as Parameters<typeof mapCheckoutToPaymentState>[0]
}

describe("toMajorUnitNumber", () => {
  it("converts Vendure minor-unit money amounts to SumUp major-unit amounts", () => {
    expect(toMajorUnitNumber(595)).toBe(5.95)
    expect(toMajorUnitNumber("1000")).toBe(10)
  })

  it("rejects invalid money amounts", () => {
    expect(() => toMajorUnitNumber("not-a-number")).toThrow(
      "Invalid money amount: not-a-number"
    )
  })
})

describe("buildCheckoutPayload", () => {
  it("sends the checkout amount in major currency units", () => {
    expect(
      buildCheckoutPayload({
        amount: 595,
        currencyCode: CurrencyCode.EUR,
        orderCode: "ORDER-1",
        metadata: {},
        methodArgs: {},
        pluginOptions,
      })
    ).toMatchObject({
      amount: 5.95,
      currency: "EUR",
      merchant_code: "test-merchant",
    })
  })
})

describe("mapCheckoutToPaymentState", () => {
  it("keeps unpaid pending checkouts in Created state", () => {
    expect(mapCheckoutToPaymentState(checkoutWithStatus("PENDING"))).toBe(
      "Created"
    )
  })

  it("maps paid checkouts to Settled", () => {
    expect(mapCheckoutToPaymentState(checkoutWithStatus("PAID"))).toBe(
      "Settled"
    )
  })

  it("maps failed checkouts to Declined", () => {
    expect(mapCheckoutToPaymentState(checkoutWithStatus("FAILED"))).toBe(
      "Declined"
    )
  })

  it("maps expired checkouts to Cancelled", () => {
    expect(mapCheckoutToPaymentState(checkoutWithStatus("EXPIRED"))).toBe(
      "Cancelled"
    )
  })
})
