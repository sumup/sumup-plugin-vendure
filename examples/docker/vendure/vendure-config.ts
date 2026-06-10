import path from "node:path"
import { LanguageCode, type VendureConfig } from "@vendure/core"
import { AdminUiPlugin } from "@vendure/admin-ui-plugin"

import { SumUpPlugin, sumUpPaymentHandler } from "@sumup/vendure-plugin"

const serverPort = Number(process.env.VENDURE_SERVER_PORT || 3000)
const adminPort = Number(process.env.VENDURE_ADMIN_PORT || 3002)

export const config: VendureConfig = {
  apiOptions: {
    port: serverPort,
    adminApiPath: "admin-api",
    shopApiPath: "shop-api",
    cors: {
      origin: [
        process.env.STOREFRONT_URL || "http://localhost:8080",
        process.env.VENDURE_ADMIN_URL || "http://localhost:3002",
      ],
      credentials: true,
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
      returnUrl: `${process.env.VENDURE_PUBLIC_URL || "http://localhost:3000"}/payments/sumup/webhook`,
      redirectUrl: `${process.env.STOREFRONT_URL || "http://localhost:8080"}/return`,
      defaultLanguageCode: LanguageCode.en,
    }),
    AdminUiPlugin.init({
      route: "admin",
      port: adminPort,
      adminUiConfig: {
        apiPort: serverPort,
      },
      app: {
        path: path.join(__dirname, ".vendure/admin-ui"),
      },
    }),
  ],
}
