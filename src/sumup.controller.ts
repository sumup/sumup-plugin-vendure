import { Body, Controller, HttpCode, Post } from "@nestjs/common"
import { SumUpService } from "./sumup.service"
import type { SumUpWebhookBody } from "./types"

@Controller("payments/sumup")
export class SumUpController {
  constructor(private readonly sumUpService: SumUpService) {}

  @Post("webhook")
  @HttpCode(200)
  async webhook(@Body() body: SumUpWebhookBody): Promise<{ received: true }> {
    const checkoutId = body.id ?? body.checkout_id
    if (checkoutId) {
      await this.sumUpService.syncPaymentFromCheckout(checkoutId)
    }
    return { received: true }
  }
}
