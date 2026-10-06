import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.KAFKA,
    options: {
      client: { clientId: process.env.KAFKA_CLIENT_ID ?? 'notification-service', brokers },
      consumer: { groupId: process.env.KAFKA_GROUP_ID ?? 'notification-svc' },
    },
  });
  await app.listen();
  // eslint-disable-next-line no-console
  console.log(`notification-service group=notification-svc brokers=${brokers}`);
}
bootstrap();
