import { CurrencyCode } from "@vendure/core"
import { describe, expect, it } from "vitest"

import { buildCheckoutPayload, toMajorUnitNumber } from "../src/utils"

const pluginOptions = {
  apiKey: "test-api-key",
  merchantCode: "test-merchant",
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
