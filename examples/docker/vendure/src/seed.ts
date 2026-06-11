import "reflect-metadata"

import fs from "node:fs"

import {
  bootstrapWorker,
  ChannelService,
  CurrencyCode,
  LanguageCode,
  type InitialData,
  Populator,
  ProductService,
  ProductVariantService,
  RequestContextService,
} from "@vendure/core"

import { config } from "../vendure-config"

const demoCurrencyCode = (
  process.env.VENDURE_CURRENCY_CODE || "EUR"
) as CurrencyCode
const sharedConfigPath = process.env.SHARED_CONFIG_PATH || "/shared/config.json"

async function seed() {
  const worker = await bootstrapWorker(config)
  const app = worker.app
  const channelService = app.get(ChannelService)
  const populator = app.get(Populator)
  const productService = app.get(ProductService)
  const productVariantService = app.get(ProductVariantService)
  const requestContextService = app.get(RequestContextService)

  const initialData: InitialData = {
    defaultLanguage: LanguageCode.en,
    defaultZone: "Europe",
    countries: [
      {
        code: "DE",
        name: "Germany",
        zone: "Europe",
      },
    ],
    taxRates: [
      {
        name: "Standard Tax",
        percentage: 19,
      },
    ],
    shippingMethods: [
      {
        name: "Standard Shipping",
        price: 500,
        taxRate: 19,
      },
    ],
    paymentMethods: [
      {
        name: "SumUp",
        handler: {
          code: "sumup",
          arguments: [
            {
              name: "merchantCode",
              value: process.env.SUMUP_MERCHANT_CODE || "",
            },
            {
              name: "checkoutMode",
              value:
                process.env.SUMUP_CHECKOUT_MODE === "widget"
                  ? "widget"
                  : "hosted",
            },
            {
              name: "returnUrl",
              value: `${process.env.VENDURE_PUBLIC_URL || "http://localhost:3000"}/payments/sumup/webhook`,
            },
            {
              name: "redirectUrl",
              value: `${process.env.STOREFRONT_URL || "http://localhost:8080"}/return`,
            },
          ],
        },
      },
    ],
    collections: [],
  }

  await populator.populateInitialData(initialData)
  const ctx = await requestContextService.create({ apiType: "admin" })
  const defaultChannel = await channelService.getDefaultChannel(ctx)
  await channelService.update(ctx, {
    id: defaultChannel.id,
    defaultCurrencyCode: demoCurrencyCode,
    availableCurrencyCodes: [demoCurrencyCode],
  })
  const existingProduct = await productService.findOneBySlug(ctx, "sumup-demo-tshirt")

  let variantId: string | number | undefined

  if (!existingProduct) {
    const product = await productService.create(ctx, {
      enabled: true,
      translations: [
        {
          languageCode: LanguageCode.en,
          name: "SumUp Demo T-Shirt",
          slug: "sumup-demo-tshirt",
          description:
            "A demo product used to test the SumUp payment flow in Vendure.",
        },
      ],
    })

    const [variant] = await productVariantService.create(ctx, [
      {
        productId: product.id,
        sku: "SUMUP-DEMO-TSHIRT",
        stockOnHand: 100,
        prices: [
          {
            currencyCode: demoCurrencyCode,
            price: 2500,
          },
        ],
        translations: [
          {
            languageCode: LanguageCode.en,
            name: "Default",
          },
        ],
      },
    ])
    variantId = variant.id
  } else {
    const variants = await productVariantService.getVariantsByProductId(
      ctx,
      existingProduct.id
    )
    variantId = variants.items[0]?.id
  }

  fs.writeFileSync(
    sharedConfigPath,
    JSON.stringify(
      {
        backendUrl: process.env.VENDURE_PUBLIC_URL || "http://localhost:3000",
        productVariantId: variantId,
      },
      null,
      2
    )
  )

  await app.close()
}

seed().catch((error) => {
  console.error(error)
  process.exit(1)
})
