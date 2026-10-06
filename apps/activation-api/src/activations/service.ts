import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientKafka } from '@nestjs/microservices';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import {
  TOPICS,
  buildEvent,
  kafkaKeyFor,
  type ActivationRequestedPayload,
} from '@poc/contracts';
import { Activation, ActivationDocument } from './schemas';
import { ActivationsGateway } from './gateway';

@Injectable()
export class ActivationsService implements OnModuleInit {
  constructor(
    @InjectModel(Activation.name) private readonly model: Model<ActivationDocument>,
    @Inject('KAFKA_CLIENT') private readonly kafka: ClientKafka,
    private readonly gateway: ActivationsGateway,
  ) {}

  async onModuleInit() {
    await this.kafka.connect();
  }

  // RF-02/RF-03: 202 sin esperar a los demas servicios + publica ActivationRequested
  async create(customerId: string, planId: string, simulateFailure = 'none') {
    const activationId = `act-${randomUUID().slice(0, 8)}`;
    const now = new Date();
    const doc = await this.model.create({
      _id: activationId,
      customerId,
      planId,
      status: 'PENDING',
      simulateFailure,
      steps: {},
      history: [{ eventType: 'ActivationRequested', at: now }],
    });

    const event = buildEvent<ActivationRequestedPayload>({
      eventType: 'ActivationRequested',
      correlationId: activationId,
      customerId,
      source: 'activation-api',
      payload: { planId, channel: 'web', simulateFailure: simulateFailure as any },
    });

    // Fase 1-3: publicacion directa despues de guardar (riesgo documentado).
    // Fase 4: outbox transaccional (guardar evento en outbox en la misma tx).
    this.kafka.emit(TOPICS.ACTIVATION_REQUESTED, {
      key: kafkaKeyFor(customerId),
      value: event,
    } as any);

    const payload = { activationId, status: 'PENDING', event };
    this.gateway.broadcast({ ...payload, customerId });
    return { activationId, status: 'PENDING' as const };
  }

  async findById(id: string) {
    const doc = await this.model.findById(id).lean();
    if (!doc) return null;
    return {
      activationId: (doc as any)._id,
      customerId: (doc as any).customerId,
      planId: (doc as any).planId,
      status: (doc as any).status,
      steps: (doc as any).steps ?? {},
      history: (doc as any).history ?? [],
    };
  }

  // Agregador de la saga (seccion 06): junta billing + provisioning.
  // 2x OK -> ACTIVE + ActivationCompleted. 1er fallo -> FAILED + ActivationFailed.
  async applyResult(
    kind: 'billing' | 'provisioning',
    event: { correlationId: string; customerId: string; eventType: string; payload?: any },
  ) {
    const activationId = event.correlationId;
    const doc = await this.model.findById(activationId);
    if (!doc) return;

    const alreadyRecorded = doc.history?.some((h) => h.eventType === event.eventType);

    if (doc.status === 'ACTIVE' || doc.status === 'FAILED') {
      if (!alreadyRecorded) {
        await this.model.updateOne(
          { _id: activationId },
          { $push: { history: { eventType: event.eventType, at: new Date() } } },
        );
        this.gateway.broadcast({ activationId, status: doc.status, eventType: event.eventType, customerId: doc.customerId });
        this.gateway.emitUpdate(activationId, { activationId, status: doc.status, eventType: event.eventType });
      }
      return;
    }

    const okTypes = ['BillingAccountCreated', 'ProvisioningCompleted'];
    const failTypes = ['BillingFailed', 'ProvisioningFailed'];
    const isOk = okTypes.includes(event.eventType);
    const isFail = failTypes.includes(event.eventType);

    if (!isOk && !isFail) {
      if (!alreadyRecorded) {
        await this.model.updateOne(
          { _id: activationId },
          { $push: { history: { eventType: event.eventType, at: new Date() } } },
        );
        this.gateway.broadcast({ activationId, status: doc.status, eventType: event.eventType, customerId: doc.customerId });
        this.gateway.emitUpdate(activationId, { activationId, status: doc.status, eventType: event.eventType });
      }
      return;
    }

    const at = new Date().toISOString();
    const steps: any = doc.steps ?? {};
    steps[kind] = { status: isOk ? 'OK' : 'FAIL', at, reason: event.payload?.reason };

    let nextStatus = 'IN_PROGRESS';
    const b = steps.billing?.status;
    const p = steps.provisioning?.status;
    if (b === 'FAIL' || p === 'FAIL') nextStatus = 'FAILED';
    else if (b === 'OK' && p === 'OK') nextStatus = 'ACTIVE';
    else nextStatus = doc.status === 'PENDING' ? 'IN_PROGRESS' : doc.status;

    await this.model.updateOne(
      { _id: activationId },
      {
        $set: { steps, status: nextStatus },
        $push: { history: { eventType: event.eventType, at: new Date() } },
      },
    );

    this.gateway.broadcast({ activationId, status: nextStatus, eventType: event.eventType, customerId: doc.customerId });
    this.gateway.emitUpdate(activationId, { activationId, status: nextStatus, eventType: event.eventType });

    if (nextStatus === 'ACTIVE') {
      const completed = buildEvent({
        eventType: 'ActivationCompleted' as const,
        correlationId: activationId,
        customerId: doc.customerId,
        source: 'activation-api',
        payload: { activationId, customerId: doc.customerId, planId: doc.planId },
      });
      this.kafka.emit(TOPICS.ACTIVATION_EVENTS, { key: kafkaKeyFor(doc.customerId), value: completed } as any);
      await this.model.updateOne(
        { _id: activationId },
        { $push: { history: { eventType: 'ActivationCompleted', at: new Date() } } },
      );
      this.gateway.broadcast({ activationId, status: 'ACTIVE', eventType: 'ActivationCompleted', customerId: doc.customerId });
    }

    if (nextStatus === 'FAILED') {
      const failed = buildEvent({
        eventType: 'ActivationFailed' as const,
        correlationId: activationId,
        customerId: doc.customerId,
        source: 'activation-api',
        payload: { activationId, customerId: doc.customerId, planId: doc.planId },
      });
      this.kafka.emit(TOPICS.ACTIVATION_EVENTS, { key: kafkaKeyFor(doc.customerId), value: failed } as any);
      await this.model.updateOne(
        { _id: activationId },
        { $push: { history: { eventType: 'ActivationFailed', at: new Date() } } },
      );
      this.gateway.broadcast({ activationId, status: 'FAILED', eventType: 'ActivationFailed', customerId: doc.customerId });
    }
  }
}
