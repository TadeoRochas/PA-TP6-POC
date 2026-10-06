import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientKafka } from '@nestjs/microservices';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { TOPICS, buildEvent, kafkaKeyFor } from '@poc/contracts';
import { ProcessedEvent, ProvisioningOrder } from './schemas';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class ProvisioningService implements OnModuleInit {
  constructor(
    @InjectModel(ProvisioningOrder.name) private readonly orders: Model<ProvisioningOrder>,
    @InjectModel(ProcessedEvent.name) private readonly processed: Model<ProcessedEvent>,
    @Inject('KAFKA_CLIENT') private readonly kafka: ClientKafka,
  ) {}

  async onModuleInit() {
    await this.kafka.connect();
  }

  async handleRequested(event: any) {
    if (!event?.eventId || !event?.correlationId) return;
    try {
      await this.processed.create({ eventId: event.eventId, at: new Date() });
    } catch {
      return; // duplicado -> idempotente (RNF-03)
    }

    const activationId: string = event.correlationId;
    const customerId: string = event.customerId;
    const planId: string = event.payload?.planId ?? '';
    const simulateFailure: string = event.payload?.simulateFailure ?? 'none';

    // Simula aprovisionamiento real: retardo 1-3s (seccion 04)
    await sleep(1000 + Math.floor(Math.random() * 2000));

    if (simulateFailure === 'provisioning') {
      const failed = buildEvent({
        eventType: 'ProvisioningFailed',
        correlationId: activationId,
        customerId,
        source: 'provisioning-service',
        payload: { activationId, reason: 'SIMULATED_PROVISIONING_FAILURE' },
      });
      this.kafka.emit(TOPICS.PROVISIONING_EVENTS, { key: kafkaKeyFor(customerId), value: failed } as any);
      return;
    }

    await this.orders.findOneAndUpdate(
      { activationId },
      { $setOnInsert: { activationId, customerId, planId, status: 'COMPLETED' } },
      { upsert: true },
    );

    const completed = buildEvent({
      eventType: 'ProvisioningCompleted',
      correlationId: activationId,
      customerId,
      source: 'provisioning-service',
      payload: { activationId, orderId: `ord-${randomUUID().slice(0, 6)}` },
    });
    this.kafka.emit(TOPICS.PROVISIONING_EVENTS, { key: kafkaKeyFor(customerId), value: completed } as any);
  }
}
