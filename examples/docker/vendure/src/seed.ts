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
  ShippingMethodService,
} from "@vendure/core"

import { config } from "../vendure-config"

const demoCurrencyCode = (
  process.env.VENDURE_CURRENCY_CODE || "EUR"
) as CurrencyCode
const sharedConfigPath = process.env.SHARED_CONFIG_PATH || "/shared/config.json"
const demoProductName = "SumUp Solo Lite"
const demoVariantPrice = 840
const demoDisplayPrice = 1000

async function seed() {
  const worker = await bootstrapWorker(config)
  const app = worker.app
  const channelService = app.get(ChannelService)
  const populator = app.get(Populator)
  const productService = app.get(ProductService)
  const productVariantService = app.get(ProductVariantService)
  const requestContextService = app.get(RequestContextService)
  const shippingMethodService = app.get(ShippingMethodService)

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
        price: 0,
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
          name: demoProductName,
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
            price: demoVariantPrice,
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

  if (variantId) {
    await productVariantService.createOrUpdateProductVariantPrice(
      ctx,
      variantId,
      demoVariantPrice,
      defaultChannel.id,
      demoCurrencyCode
    )
  }

  const shippingMethods = await shippingMethodService.findAll(ctx)
  await Promise.all(
    shippingMethods.items.map((method) =>
      shippingMethodService.update(ctx, {
        id: method.id,
        calculator: {
          code: "default-shipping-calculator",
          arguments: [
            { name: "rate", value: "0" },
            { name: "taxRate", value: "19" },
            { name: "includesTax", value: "auto" },
          ],
        },
        translations: [
          {
            languageCode: LanguageCode.en,
            name: method.name,
            description: method.description,
          },
        ],
      })
    )
  )

  fs.writeFileSync(
    sharedConfigPath,
    JSON.stringify(
      {
        backendUrl: process.env.VENDURE_PUBLIC_URL || "http://localhost:3000",
        currencyCode: demoCurrencyCode,
        productName: demoProductName,
        productPrice: demoDisplayPrice,
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
