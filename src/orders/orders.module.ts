import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { envs, PRODUCTS_SERVICE } from '../config';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
  // Registering a microservice client
  imports: [
    ClientsModule.register([
      {
        name: PRODUCTS_SERVICE, // Name of the microservice client
        transport: Transport.TCP, // Using TCP transport, the communication channel between the gateway and the microservice will be TCP
        options: {
          host: envs.productsMicroservice.host, // Host where the microservice is running
          port: envs.productsMicroservice.port, // Port on which the microservice is listening
        },
      },
    ]),
  ],
})
export class OrdersModule {}
