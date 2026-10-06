import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { TOPICS } from '@poc/contracts';
import { ProvisioningService } from './service';

@Controller()
export class ProvisioningConsumer {
  constructor(private readonly svc: ProvisioningService) {}

  @EventPattern(TOPICS.ACTIVATION_REQUESTED)
  async onRequested(@Payload() message: any) {
    await this.svc.handleRequested(message?.value ?? message);
  }
}
