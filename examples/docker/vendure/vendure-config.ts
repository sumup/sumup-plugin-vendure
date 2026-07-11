import { LanguageCode, type VendureConfig } from "@vendure/core"
import { AdminUiPlugin } from "@vendure/admin-ui-plugin"

import { SumUpPlugin, sumUpPaymentHandler } from "@sumup/vendure-plugin"

const serverPort = Number(process.env.VENDURE_SERVER_PORT || 3000)
const storefrontUrl = process.env.STOREFRONT_URL || "http://localhost:8080"
const vendurePublicUrl = process.env.VENDURE_PUBLIC_URL || "http://localhost:3000"
const vendureAdminUrl = `http://localhost:${serverPort}/admin`

export const config: VendureConfig = {
  apiOptions: {
    port: serverPort,
    adminApiPath: "admin-api",
    shopApiPath: "shop-api",
    cors: {
      origin: [storefrontUrl, vendureAdminUrl],
      credentials: true,
      exposedHeaders: ["vendure-auth-token"],
    },
  },
  authOptions: {
    tokenMethod: ["bearer", "cookie"],
    superadminCredentials: {
      identifier: process.env.SUPERADMIN_USERNAME || "superadmin",
      password: process.env.SUPERADMIN_PASSWORD || "supersecret",
    },
    cookieOptions: {
      secret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  dbConnectionOptions: {
    type: "postgres",
    synchronize: true,
    host: process.env.DATABASE_HOST || "localhost",
    port: Number(process.env.DATABASE_PORT || 5432),
    username: process.env.POSTGRES_USER || "vendure",
    password: process.env.POSTGRES_PASSWORD || "vendure",
    database: process.env.POSTGRES_DB || "vendure",
  },
  paymentOptions: {
    paymentMethodHandlers: [sumUpPaymentHandler],
  },
  plugins: [
    SumUpPlugin.init({
      apiKey: process.env.SUMUP_API_KEY || "",
      merchantCode: process.env.SUMUP_MERCHANT_CODE || "",
      checkoutMode:
        process.env.SUMUP_CHECKOUT_MODE === "widget" ? "widget" : "hosted",
      returnUrl: `${vendurePublicUrl}/payments/sumup/webhook`,
      redirectUrl: `${storefrontUrl}/return`,
      defaultLanguageCode: LanguageCode.en,
    }),
    AdminUiPlugin.init({
      route: "admin",
      port: 3002,
      adminUiConfig: {
        apiPort: serverPort,
      },
    }),
  ],
}
