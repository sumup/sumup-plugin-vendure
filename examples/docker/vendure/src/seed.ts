import "reflect-metadata"
import fs from "node:fs"

import {
  bootstrapWorker,
  CurrencyCode,
  LanguageCode,
  type InitialData,
  PaymentMethodService,
  Populator,
  ProductService,
  ProductVariantService,
  RequestContextService,
} from "@vendure/core"

import { config } from "../vendure-config"

async function seed() {
  const worker = await bootstrapWorker(config)
  const app = worker.app
  const requestContextService = app.get(RequestContextService)
  const populator = app.get(Populator)
  const paymentMethodService = app.get(PaymentMethodService)
  const productService = app.get(ProductService)
  const productVariantService = app.get(ProductVariantService)
  const ctx = await requestContextService.create({
    apiType: "admin",
  })

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

  const paymentMethods = await paymentMethodService.findAll(ctx)
  const existingProduct = await productService.findOneBySlug(
    ctx,
    "sumup-demo-tshirt"
  )

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
            currencyCode: CurrencyCode.EUR,
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

  const sharedConfigPath = process.env.SHARED_CONFIG_PATH || "/shared/config.json"
  fs.writeFileSync(
    sharedConfigPath,
    JSON.stringify(
      {
        backendUrl: process.env.VENDURE_PUBLIC_URL || "http://localhost:3000",
        adminUrl: process.env.VENDURE_ADMIN_URL || "http://localhost:3002/admin",
        productVariantId: variantId,
        paymentMethodCode: paymentMethods.items.find(
          (item) => item.code === "sumup"
        )?.code,
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
