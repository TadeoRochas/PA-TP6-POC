import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { BillingConsumer } from './consumer';
import { BillingService } from './service';
import {
  BillingAccount,
  BillingAccountSchema,
  ProcessedEvent,
  ProcessedEventSchema,
  Compensation,
  CompensationSchema,
} from './schemas';

const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI ?? 'mongodb://localhost:27017/billing_db?replicaSet=rs0&directConnection=true'),
    MongooseModule.forFeature([
      { name: BillingAccount.name, schema: BillingAccountSchema },
      { name: ProcessedEvent.name, schema: ProcessedEventSchema },
      { name: Compensation.name, schema: CompensationSchema },
    ]),
    ClientsModule.register([
      {
        name: 'KAFKA_CLIENT',
        transport: Transport.KAFKA,
        options: {
          client: { clientId: 'billing-service-producer', brokers },
          consumer: { groupId: 'billing-svc-producer' },
        },
      },
    ]),
  ],
  controllers: [BillingConsumer],
  providers: [BillingService],
})
export class AppModule {}

