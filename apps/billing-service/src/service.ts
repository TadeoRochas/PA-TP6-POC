import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientKafka } from '@nestjs/microservices';
import { Model } from 'mongoose';
import { TOPICS, buildEvent, kafkaKeyFor } from '@poc/contracts';
import { BillingAccount, Compensation, ProcessedEvent } from './schemas';

@Injectable()
export class BillingService implements OnModuleInit {
  constructor(
    @InjectModel(BillingAccount.name) private readonly accounts: Model<BillingAccount>,
    @InjectModel(ProcessedEvent.name) private readonly processed: Model<ProcessedEvent>,
    @InjectModel(Compensation.name) private readonly compensations: Model<Compensation>,
    @Inject('KAFKA_CLIENT') private readonly kafka: ClientKafka,
  ) {}

  async onModuleInit() {
    await this.kafka.connect();
  }

  // Idempotencia: insert eventId unico; duplicado -> skip (RNF-03)
  private async markProcessed(eventId: string): Promise<boolean> {
    try {
      await this.processed.create({ eventId, at: new Date() });
      return true;
    } catch {
      return false;
    }
  }

  private emit(topic: string, key: string, value: unknown) {
    this.kafka.emit(topic, { key, value } as any);
  }

  // RF-04: procesa ActivationRequested en paralelo con provisioning
  async handleActivationRequested(event: any) {
    if (!event?.eventId || !event?.correlationId) return;
    if (!(await this.markProcessed(event.eventId))) return; // duplicado

    const activationId: string = event.correlationId;
    const customerId: string = event.customerId;
    const planId: string = event.payload?.planId ?? '';
    const simulateFailure: string = event.payload?.simulateFailure ?? 'none';

    // Fallo de negocio simulado -> BillingFailed (NO va a DLQ, seccion 08)
    if (simulateFailure === 'billing') {
      const failed = buildEvent({
        eventType: 'BillingFailed',
        correlationId: activationId,
        customerId,
        source: 'billing-service',
        payload: { activationId, reason: 'SIMULATED_BILLING_FAILURE' },
      });
      this.emit(TOPICS.BILLING_EVENTS, kafkaKeyFor(customerId), failed);
      return;
    }

    const account = await this.accounts.findOneAndUpdate(
      { activationId },
      { $setOnInsert: { activationId, customerId, planId, status: 'CREATED' } },
      { upsert: true, new: true },
    );

    // Caso borde seccion 06: ActivationFailed pudo llegar antes de crear la cuenta.
    // Si hay compensacion pendiente, anular inmediatamente.
    const pending = await this.compensations.findOne({ activationId });
    if (pending) {
      await this.accounts.updateOne({ activationId }, { $set: { status: 'CANCELLED' } });
      const cancelled = buildEvent({
        eventType: 'BillingAccountCancelled',
        correlationId: activationId,
        customerId,
        source: 'billing-service',
        payload: { activationId, reason: 'COMPENSATION_AFTER_CREATE' },
      });
      this.emit(TOPICS.BILLING_EVENTS, kafkaKeyFor(customerId), cancelled);
      return;
    }

    const created = buildEvent({
      eventType: 'BillingAccountCreated',
      correlationId: activationId,
      customerId,
      source: 'billing-service',
      payload: { activationId },
    });
    this.emit(TOPICS.BILLING_EVENTS, kafkaKeyFor(customerId), created);
  }

  // RF-06: compensacion al ver ActivationFailed (saga sin llamadas directas)
  async handleActivationFailed(event: any) {
    if (!event?.correlationId) return;
    const activationId: string = event.correlationId;
    const customerId: string = event.customerId;

    // Registrar compensacion para cubrir el caso borde (falla antes de crear)
    await this.compensations.findOneAndUpdate(
      { activationId },
      { $setOnInsert: { activationId, at: new Date() } },
      { upsert: true },
    );

    const account = await this.accounts.findOne({ activationId });
    if (!account || (account as any).status === 'CANCELLED') return;

    await this.accounts.updateOne({ activationId }, { $set: { status: 'CANCELLED' } });
    const cancelled = buildEvent({
      eventType: 'BillingAccountCancelled',
      correlationId: activationId,
      customerId,
      source: 'billing-service',
      payload: { activationId, reason: 'ACTIVATION_FAILED' },
    });
    this.emit(TOPICS.BILLING_EVENTS, kafkaKeyFor(customerId), cancelled);
  }
}
