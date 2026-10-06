import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { TOPICS } from '@poc/contracts';
import { BillingService } from './service';

@Controller()
export class BillingConsumer {
  constructor(private readonly svc: BillingService) {}

  @EventPattern(TOPICS.ACTIVATION_REQUESTED)
  async onRequested(@Payload() message: any) {
    await this.svc.handleActivationRequested(message?.value ?? message);
  }

  @EventPattern(TOPICS.ACTIVATION_EVENTS)
  async onActivationEvents(@Payload() message: any) {
    const event = message?.value ?? message;
    if (event?.eventType === 'ActivationFailed') {
      await this.svc.handleActivationFailed(event);
    }
  }
}
