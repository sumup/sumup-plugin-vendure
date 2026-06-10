import { PluginCommonModule, VendurePlugin } from "@vendure/core"

import { SUMUP_PLUGIN_OPTIONS } from "./constants"
import {
  createSumUpPaymentHandler,
  setActiveSumUpOptions,
} from "./payment-handler"
import { SumUpController } from "./sumup.controller"
import { SumUpService } from "./sumup.service"
import type { SumUpPluginOptions } from "./types"
import { assertRequiredOptions } from "./utils"

/**
 * SumUp payment integration for Vendure.
 *
 * Register the plugin with `SumUpPlugin.init(...)` and add the exported
 * `sumUpPaymentHandler` to `paymentOptions.paymentMethodHandlers`.
 *
 * @category Plugin
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  controllers: [SumUpController],
  providers: [
    SumUpService,
    {
      provide: SUMUP_PLUGIN_OPTIONS,
      useFactory: () => SumUpPlugin.options,
    },
  ],
  configuration: (config) => config,
  compatibility: "^3.6.4",
})
// biome-ignore lint/complexity/noStaticOnlyClass: Vendure plugins expose configuration through a static init() API.
export class SumUpPlugin {
  /** @internal */
  static options: SumUpPluginOptions

  /**
   * Configures the SumUp plugin for a Vendure server.
   *
   * @example
   * ```ts
   * plugins: [
   *   SumUpPlugin.init({
   *     apiKey: process.env.SUMUP_API_KEY!,
   *     merchantCode: process.env.SUMUP_MERCHANT_CODE!,
   *     checkoutMode: "hosted",
   *     // Public callback URL for SumUp checkout status updates
   *     returnUrl: "https://your-vendure.example/payments/sumup/webhook",
   *     redirectUrl: "https://storefront.example/checkout/sumup/return",
   *   }),
   * ]
   * ```
   */
  static init(options: SumUpPluginOptions) {
    assertRequiredOptions(options)
    SumUpPlugin.options = {
      checkoutMode: "hosted",
      ...options,
    }
    setActiveSumUpOptions(SumUpPlugin.options)
    return SumUpPlugin
  }
}

/**
 * The payment method handler to register in `paymentOptions.paymentMethodHandlers`.
 */
export const sumUpPaymentHandler = createSumUpPaymentHandler()
