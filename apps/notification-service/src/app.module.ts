import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import nodemailer from 'nodemailer';
import { TOPICS } from '@poc/contracts';

@Schema({ collection: 'notifications' })
export class Notification {
  @Prop() activationId!: string;
  @Prop() eventType!: string;
  @Prop() to!: string;
  @Prop() subject!: string;
  @Prop() at!: Date;
}
export const NotificationSchema = SchemaFactory.createForClass(Notification);

@Schema({ collection: 'processed_events' })
export class ProcessedEvent {
  @Prop({ unique: true }) eventId!: string;
  @Prop() at!: Date;
}
export const ProcessedEventSchema = SchemaFactory.createForClass(ProcessedEvent);

@Injectable()
export class NotificationService {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'localhost',
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: false,
    ignoreTLS: true,
  } as any);

  constructor(@InjectModel(Notification.name) private readonly model: Model<Notification>,
    @InjectModel(ProcessedEvent.name) private readonly processed: Model<ProcessedEvent>) {}

  async handle(event: any) {
    if (!event?.eventId || !event?.correlationId) return;
    try {
      await this.processed.create({ eventId: event.eventId, at: new Date() });
    } catch {
      return; // idempotente: email no se duplica (RF-07 + RNF-03)
    }
    const activationId: string = event.correlationId;
    const isOk = event.eventType === 'ActivationCompleted';
    const subject = isOk ? `Bienvenido! Activacion ${activationId} ACTIVE` : `Tu activacion ${activationId} fallo`;
    const text = isOk
      ? `Hola ${event.customerId}: tu plan ${(event.payload as any)?.planId ?? ''} esta ACTIVO.`
      : `Hola ${event.customerId}: tu activacion fallo. Intenta de nuevo.`;

    try {
      await this.transporter.sendMail({
        from: 'no-reply@demo.local',
        to: `${event.customerId}@demo.local`,
        subject,
        text,
      });
    } catch (e) {
      // Mailhog caido (escenario 3): se registra igual; el offset ya avanzo con retry en fase 3.
      // eslint-disable-next-line no-console
      console.log(`[notification] mailhog no disponible, registro igual: ${subject}`);
    }
    await this.model.create({ activationId, eventType: event.eventType, to: `${event.customerId}@demo.local`, subject, at: new Date() });
    // eslint-disable-next-line no-console
    console.log(`[notification] ${event.eventType} -> ${activationId}`);
  }
}

@Controller()
export class NotificationConsumer {
  constructor(private readonly svc: NotificationService) {}

  @EventPattern(TOPICS.ACTIVATION_EVENTS)
  async onEvents(@Payload() message: any) {
    await this.svc.handle(message?.value ?? message);
  }
}

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI ?? 'mongodb://localhost:27017/notification_db?replicaSet=rs0&directConnection=true'),
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: ProcessedEvent.name, schema: ProcessedEventSchema },
    ]),
  ],
  controllers: [NotificationConsumer],
  providers: [NotificationService],
})
export class AppModule {}
