import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');
  const groupId = process.env.KAFKA_GROUP_ID ?? 'loyalty-svc';

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: process.env.KAFKA_CLIENT_ID ?? 'loyalty-service',
        brokers,
      },
      consumer: {
        groupId,
      },
      subscribe: {
        fromBeginning: true, // auto.offset.reset = earliest (Escenario 5)
      },
    },
  });

  await app.listen();
  // eslint-disable-next-line no-console
  console.log(`loyalty-service listening on Kafka (${groupId}) with fromBeginning=true`);
}

bootstrap();
