import { Injectable } from '@nestjs/common';
import { SubscribeMessage, WebSocketGateway, WebSocketServer, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

// Timeline en vivo (RF-08): cada cambio de la activacion se emite por WS.
// La UI se suscribe con: socket.emit('subscribe', activationId)
@WebSocketGateway({ cors: { origin: '*' } })
@Injectable()
export class ActivationsGateway {
  @WebSocketServer() server!: Server;

  emitUpdate(activationId: string, payload: any) {
    this.server?.to(activationId).emit('activation-updated', payload);
    this.server?.emit(`activation-updated:${activationId}`, payload);
  }

  broadcast(payload: any) {
    this.server?.emit('activation-updated', payload);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(@ConnectedSocket() client: Socket, @MessageBody() activationId: string) {
    if (typeof activationId === 'string') client.join(activationId);
  }
}
