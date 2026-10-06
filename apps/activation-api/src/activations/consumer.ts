import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { TOPICS } from '@poc/contracts';
import { ActivationsService } from './service';

// Agregador: consume billing.events y provisioning.events (mismo grupo activation-api-svc)
@Controller()
export class ResultsConsumer {
  constructor(private readonly svc: ActivationsService) {}

  @EventPattern(TOPICS.BILLING_EVENTS)
  async onBilling(@Payload() message: any) {
    const event = message?.value ?? message;
    if (!event?.correlationId) return;
    // En fase 3 se agrega chequeo de idempotencia por eventId aqui
    await this.svc.applyResult('billing', event);
  }

  @EventPattern(TOPICS.PROVISIONING_EVENTS)
  async onProvisioning(@Payload() message: any) {
    const event = message?.value ?? message;
    if (!event?.correlationId) return;
    await this.svc.applyResult('provisioning', event);
  }
}
