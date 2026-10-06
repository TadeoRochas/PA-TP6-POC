import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { Activation, ActivationSchema } from './schemas';
import { ActivationsController } from './controller';
import { ActivationsService } from './service';
import { ResultsConsumer } from './consumer';
import { ActivationsGateway } from './gateway';

const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Activation.name, schema: ActivationSchema }]),
    ClientsModule.register([
      {
        name: 'KAFKA_CLIENT',
        transport: Transport.KAFKA,
        options: {
          client: { clientId: `${process.env.KAFKA_CLIENT_ID ?? 'activation-api'}-producer`, brokers },
          consumer: { groupId: `${process.env.KAFKA_GROUP_ID ?? 'activation-api-svc'}-producer` },
        },
      },
    ]),
  ],
  controllers: [ActivationsController, ResultsConsumer],
  providers: [ActivationsService, ActivationsGateway],
})
export class ActivationsModule {}

