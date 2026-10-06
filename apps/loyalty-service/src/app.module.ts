import { Module, Controller, Injectable } from '@nestjs/common';
import { MongooseModule, Prop, Schema, SchemaFactory, InjectModel } from '@nestjs/mongoose';
import { EventPattern, Payload } from '@nestjs/microservices';
import { Model } from 'mongoose';
import { TOPICS } from '@poc/contracts';

@Schema({ collection: 'loyalty_points' })
export class LoyaltyAccount {
  @Prop({ unique: true }) customerId!: string;
  @Prop({ default: 0 }) points!: number;
  @Prop({ default: Date.now }) updatedAt!: Date;
}
export const LoyaltyAccountSchema = SchemaFactory.createForClass(LoyaltyAccount);

@Injectable()
export class LoyaltyService {
  constructor(@InjectModel(LoyaltyAccount.name) private readonly model: Model<LoyaltyAccount>) {}

  async handleActivationCompleted(event: any) {
    if (!event?.customerId) return;
    const customerId = event.customerId;
    const pointsToAdd = 100;
    
    await this.model.findOneAndUpdate(
      { customerId },
      { $inc: { points: pointsToAdd }, $set: { updatedAt: new Date() } },
      { upsert: true, new: true }
    );
    
    // eslint-disable-next-line no-console
    console.log(`[loyalty-service] Replayed/Processed event for ${customerId}: +${pointsToAdd} loyalty points.`);
  }
}

@Controller()
export class LoyaltyConsumer {
  constructor(private readonly svc: LoyaltyService) {}

  @EventPattern(TOPICS.ACTIVATION_EVENTS)
  async onActivationEvent(@Payload() m: any) {
    const event = m?.value ?? m;
    if (event?.eventType === 'ActivationCompleted') {
      await this.svc.handleActivationCompleted(event);
    }
  }
}

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI ?? 'mongodb://localhost:27017/loyalty_db?replicaSet=rs0&directConnection=true'),
    MongooseModule.forFeature([{ name: LoyaltyAccount.name, schema: LoyaltyAccountSchema }]),
  ],
  controllers: [LoyaltyConsumer],
  providers: [LoyaltyService],
})
export class AppModule {}
