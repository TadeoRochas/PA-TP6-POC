import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ProvisioningConsumer } from './consumer';
import { ProvisioningService } from './service';
import {
  ProvisioningOrder,
  ProvisioningOrderSchema,
  ProcessedEvent,
  ProcessedEventSchema,
} from './schemas';

const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI ?? 'mongodb://localhost:27017/provisioning_db?replicaSet=rs0&directConnection=true'),
    MongooseModule.forFeature([
      { name: ProvisioningOrder.name, schema: ProvisioningOrderSchema },
      { name: ProcessedEvent.name, schema: ProcessedEventSchema },
    ]),
    ClientsModule.register([
      {
        name: 'KAFKA_CLIENT',
        transport: Transport.KAFKA,
        options: {
          client: { clientId: 'provisioning-service-producer', brokers },
          consumer: { groupId: 'provisioning-svc-producer' },
        },
      },
    ]),
  ],
  controllers: [ProvisioningConsumer],
  providers: [ProvisioningService],
})
export class AppModule {}

