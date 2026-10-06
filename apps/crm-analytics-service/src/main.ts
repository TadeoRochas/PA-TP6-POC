import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.KAFKA,
    options: {
      client: { clientId: process.env.KAFKA_CLIENT_ID ?? 'crm-analytics-service', brokers },
      // RF-10: puede reprocesar desde el inicio -> auto.offset.reset=earliest se configura
      // en el consumer del microservicio; el grupo propio no molesta a los demas.
      consumer: { groupId: process.env.KAFKA_GROUP_ID ?? 'crm-analytics' },
    },
  });
  await app.listen();
  // eslint-disable-next-line no-console
  console.log(`crm-analytics-service group=crm-analytics brokers=${brokers}`);
}
bootstrap();
