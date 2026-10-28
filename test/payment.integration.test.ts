import {
  CurrencyCode,
  LanguageCode,
  mergeConfig,
  Order,
  OrderService,
  PaymentMethodService,
  PaymentService,
  RequestContext,
  RequestContextService,
  TransactionalConnection,
} from "@vendure/core"
import { createTestEnvironment, testConfig } from "@vendure/testing"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

// Use the published build so Nest receives TypeScript's decorator metadata.
import { SumUpPlugin, sumUpPaymentHandler } from "../dist"

describe("SumUp payments with Vendure's payment process", () => {
  const fetch = globalThis.fetch
  const { server } = createTestEnvironment(
    mergeConfig(testConfig, {
      apiOptions: { port: 0 },
      dbConnectionOptions: { synchronize: true },
      plugins: [
        SumUpPlugin.init({
          apiKey: "test-api-key",
          merchantCode: "merchant-1",
          maxRetries: 0,
        }),
      ],
      paymentOptions: { paymentMethodHandlers: [sumUpPaymentHandler] },
    })
  )
  let ctx: RequestContext
  let connection: TransactionalConnection
  let orders: OrderService

  beforeAll(async () => {
    await server.bootstrap()
    connection = server.app.get(TransactionalConnection)
    orders = server.app.get(OrderService)
    ctx = await server.app
      .get(RequestContextService)
      .create({ apiType: "admin" })
    await server.app.get(PaymentMethodService).create(ctx, {
      code: "sumup",
      enabled: true,
      translations: [{ languageCode: LanguageCode.en, name: "SumUp" }],
      handler: { code: "sumup", arguments: [] },
    })
  }, 60_000)

  afterAll(async () => {
    vi.unstubAllGlobals()
    await server.destroy()
  })

  it.each([
    ["PAID", "Settled", "PaymentSettled"],
    ["FAILED", "Declined", "ArrangingPayment"],
    ["EXPIRED", "Cancelled", "ArrangingPayment"],
  ])(
    "saves a pending checkout, then reconciles %s",
    async (status, paymentState, orderState) => {
      const orderCode = `ORDER-${status}`
      const checkoutId = `checkout-${status}`
      let checkoutStatus = "PENDING"
      const checkout = () => ({
        id: checkoutId,
        checkout_reference: orderCode,
        amount: 12.95,
        currency: "USD",
        merchant_code: "merchant-1",
        status: checkoutStatus,
        hosted_checkout_url: `https://checkout.sumup.com/${checkoutId}`,
      })
      const sumupFetch = vi.fn(async (url: string, init: RequestInit) => {
        expect(String(url)).toMatch(/^https:\/\/api.sumup.com\/v0.1\/checkouts/)
        if (init.method === "POST") {
          expect(JSON.parse(init.body as string)).toMatchObject({
            amount: 12.95,
            currency: "USD",
            checkout_reference: orderCode,
            merchant_code: "merchant-1",
          })
        }
        return new Response(JSON.stringify(checkout()), {
          headers: { "Content-Type": "application/json" },
        })
      })
      vi.stubGlobal("fetch", sumupFetch)

      // Seed the payment boundary; Vendure services, database and processes are real.
      const order = await connection.getRepository(ctx, Order).save(
        new Order({
          code: orderCode,
          state: "ArrangingPayment",
          active: true,
          currencyCode: CurrencyCode.USD,
          subTotal: 1295,
          subTotalWithTax: 1295,
          shipping: 0,
          shippingWithTax: 0,
          couponCodes: [],
          shippingAddress: {},
          billingAddress: {},
          channels: [ctx.channel],
        })
      )
      const result = await connection.withTransaction(ctx, (txCtx) =>
        orders.addPaymentToOrder(txCtx, order.id, {
          method: "sumup",
          metadata: {},
        })
      )
      expect(result).toMatchObject({ state: "ArrangingPayment" })
      expect(await orders.findOne(ctx, order.id, ["payments"])).toMatchObject({
        state: "ArrangingPayment",
        payments: [
          {
            state: "SumUpPending",
            amount: 1295,
            transactionId: checkoutId,
            metadata: {
              public: {
                checkoutId,
                hostedCheckoutUrl: checkout().hosted_checkout_url,
              },
            },
          },
        ],
      })

      const notify = async () => {
        const response = await fetch(
          `${await server.app.getUrl()}/payments/sumup/webhook`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: checkoutId }),
          }
        )
        expect(response.status).toBe(200)
      }
      const payments = await orders.getOrderPayments(ctx, order.id)
      expect(
        await server.app.get(PaymentService).settlePayment(ctx, payments[0].id)
      ).toMatchObject({
        state: "SumUpPending",
        errorMessage: "SumUp checkout has not been paid.",
      })
      await notify()
      expect(await orders.findOne(ctx, order.id, ["payments"])).toMatchObject({
        state: "ArrangingPayment",
        payments: [{ state: "SumUpPending" }],
      })

      checkoutStatus = status
      await notify()
      // Duplicate notifications must not repeat transitions or create payments.
      await notify()
      expect(await orders.findOne(ctx, order.id, ["payments"])).toMatchObject({
        state: orderState,
        payments: [{ state: paymentState, amount: 1295 }],
      })
      if (status === "PAID") {
        expect(await orders.getOrderPayments(ctx, order.id)).toMatchObject([
          { errorMessage: "" },
        ])
      }
    }
  )
})
