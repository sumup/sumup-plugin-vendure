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
})
// biome-ignore lint/complexity/noStaticOnlyClass: Vendure plugins expose configuration through a static init() API.
export class SumUpPlugin {
  static options: SumUpPluginOptions

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

export const sumUpPaymentHandler = createSumUpPaymentHandler()
