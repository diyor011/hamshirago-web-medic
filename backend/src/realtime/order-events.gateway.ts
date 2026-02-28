import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export type OrderStatusPayload = { orderId: string; status: string };
export type MedicLocationPayload = {
  orderId: string;
  medicId: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
  source?: 'socket' | 'rest';
};

@WebSocketGateway({ cors: { origin: '*' } })
export class OrderEventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrderEventsGateway.name);
  private clientOrderRooms = new Map<string, Set<string>>(); // socketId -> Set of orderIds

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: any) {
    try {
      const token = client.handshake?.auth?.token ?? client.handshake?.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token, { secret: this.configService.get('JWT_SECRET') });
      (client as any).userId = payload.sub;
      (client as any).role = payload.role;
      // Medics join the feed room to receive new_order broadcasts
      if (payload.role === 'medic') {
        client.join('medics_feed');
      }
      this.logger.log(`Client connected: ${client.id} user=${payload.sub} role=${payload.role}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: any) {
    this.clientOrderRooms.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe_order')
  handleSubscribeOrder(client: any, orderId: string) {
    const room = `order:${orderId}`;
    client.join(room);
    let set = this.clientOrderRooms.get(client.id);
    if (!set) {
      set = new Set();
      this.clientOrderRooms.set(client.id, set);
    }
    set.add(orderId);
  }

  @SubscribeMessage('unsubscribe_order')
  handleUnsubscribeOrder(client: any, orderId: string) {
    client.leave(`order:${orderId}`);
    this.clientOrderRooms.get(client.id)?.delete(orderId);
  }

  /** Call this from OrdersService when status changes to notify clients */
  emitOrderStatus(orderId: string, status: string) {
    this.server.to(`order:${orderId}`).emit('order_status', { orderId, status });
    this.logger.log(`Emitted order_status orderId=${orderId} status=${status}`);
  }

  /** Broadcast a new order to all online medics */
  emitNewOrder(order: Record<string, unknown>) {
    this.server.to('medics_feed').emit('new_order', order);
    this.logger.log(`Emitted new_order id=${order['id']}`);
  }

  @SubscribeMessage('medic_location')
  handleMedicLocation(
    client: any,
    payload: { orderId: string; latitude: number; longitude: number },
  ) {
    if ((client as any).role !== 'medic') return;
    if (!payload?.orderId) return;
    if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) return;

    this.emitMedicLocation(
      payload.orderId,
      (client as any).userId,
      payload.latitude,
      payload.longitude,
      'socket',
    );
  }

  emitMedicLocation(
    orderId: string,
    medicId: string,
    latitude: number,
    longitude: number,
    source: 'socket' | 'rest' = 'socket',
  ) {
    const payload: MedicLocationPayload = {
      orderId,
      medicId,
      latitude,
      longitude,
      updatedAt: new Date().toISOString(),
      source,
    };
    this.server.to(`order:${orderId}`).emit('medic_location', payload);
  }
}
