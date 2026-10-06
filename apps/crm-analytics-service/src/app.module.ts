import { Module, Controller, Injectable } from '@nestjs/common';
import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { EventPattern, Payload } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TOPICS } from '@poc/contracts';

@Schema({ collection: 'event_log' })
export class EventLog {
  @Prop({ unique: true }) eventId!: string;
  @Prop() eventType!: string;
  @Prop({ index: true }) correlationId!: string;
  @Prop() customerId!: string;
  @Prop() source!: string;
  @Prop({ type: Object }) payload!: any;
  @Prop() occurredAt!: Date;
}
export const EventLogSchema = SchemaFactory.createForClass(EventLog);

@Injectable()
export class CrmService {
  constructor(@InjectModel(EventLog.name) private readonly log: Model<EventLog>) {}

  async record(event: any) {
    if (!event?.eventId) return;
    try {
      await this.log.create({
        eventId: event.eventId,
        eventType: event.eventType,
        correlationId: event.correlationId,
        customerId: event.customerId,
        source: event.source,
        payload: event.payload,
        occurredAt: event.occurredAt ? new Date(event.occurredAt) : new Date(),
      });
    } catch {
      // duplicado -> idempotente
    }
  }
}

// RF-10: consume TODOS los topics y no publica nada.
// Demuestra que se puede sumar un consumidor sin tocar a los demas.
@Controller()
export class CrmConsumer {
  constructor(private readonly svc: CrmService) {}

  @EventPattern(TOPICS.ACTIVATION_REQUESTED)
  async onReq(@Payload() m: any) { await this.svc.record(m?.value ?? m); }

  @EventPattern(TOPICS.BILLING_EVENTS)
  async onBilling(@Payload() m: any) { await this.svc.record(m?.value ?? m); }

  @EventPattern(TOPICS.PROVISIONING_EVENTS)
  async onProv(@Payload() m: any) { await this.svc.record(m?.value ?? m); }

  @EventPattern(TOPICS.ACTIVATION_EVENTS)
  async onAct(@Payload() m: any) { await this.svc.record(m?.value ?? m); }
}

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI ?? 'mongodb://localhost:27017/crm_db?replicaSet=rs0&directConnection=true'),
    MongooseModule.forFeature([{ name: EventLog.name, schema: EventLogSchema }]),
  ],
  controllers: [CrmConsumer],
  providers: [CrmService],
})
export class AppModule {}
