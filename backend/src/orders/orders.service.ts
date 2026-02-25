import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderStatus } from './entities/order-status.enum';
import { OrderLocation } from './entities/order-location.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderEventsGateway } from '../realtime/order-events.gateway';
import { PushNotificationsService } from '../realtime/push-notifications.service';
import { MedicsService } from '../medics/medics.service';
import { UsersService } from '../users/users.service';

const CLIENT_PUSH_MESSAGES: Partial<Record<string, { title: string; body: string }>> = {
  ASSIGNED:        { title: '👤 Медик назначен',      body: 'Медик принял ваш заказ и скоро выедет' },
  ACCEPTED:        { title: '✅ Медик подтвердил',     body: 'Медик подтвердил выезд к вам' },
  ON_THE_WAY:      { title: '🚗 Медик едет',           body: 'Медик едет к вам' },
  ARRIVED:         { title: '📍 Медик прибыл!',        body: 'Откройте дверь — медик у вашего дома' },
  SERVICE_STARTED: { title: '💉 Услуга начата',        body: 'Медик начал оказание услуги' },
  DONE:            { title: '✅ Заказ выполнен',       body: 'Спасибо, что выбрали HamshiraGo!' },
  CANCELED:        { title: '❌ Заказ отменён',        body: 'Ваш заказ был отменён' },
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(OrderLocation)
    private locationRepo: Repository<OrderLocation>,
    private orderEventsGateway: OrderEventsGateway,
    private pushService: PushNotificationsService,
    private medicsService: MedicsService,
    private usersService: UsersService,
  ) {}

  /** Send a push notification to the client of a given order */
  private async notifyClient(order: Order, status: string): Promise<void> {
    const msg = CLIENT_PUSH_MESSAGES[status];
    if (!msg || !order.clientId) return;
    const token = await this.usersService.getPushToken(order.clientId);
    if (!token) return;
    this.pushService.send([token], {
      title: msg.title,
      body: msg.body,
      sound: 'default',
      data: { orderId: order.id, status },
      channelId: 'order_updates',
      priority: 'high',
    });
  }

  async create(clientId: string, dto: CreateOrderDto): Promise<Order> {
    const order = this.orderRepo.create({
      clientId,
      serviceId: dto.serviceId,
      serviceTitle: dto.serviceTitle,
      priceAmount: dto.priceAmount,
      discountAmount: dto.discountAmount,
      status: OrderStatus.CREATED,
    });
    const saved = await this.orderRepo.save(order);
    const location = this.locationRepo.create({
      orderId: saved.id,
      latitude: dto.location.latitude,
      longitude: dto.location.longitude,
      house: dto.location.house,
      floor: dto.location.floor ?? null,
      apartment: dto.location.apartment ?? null,
      phone: dto.location.phone,
    });
    await this.locationRepo.save(location);
    const fullOrder = await this.findOne(saved.id);

    // WebSocket — for medics with the app open
    this.orderEventsGateway.emitNewOrder(fullOrder as unknown as Record<string, unknown>);

    // Push notifications — for medics with the app in background/closed
    this.medicsService.getOnlinePushTokens().then((tokens) => {
      if (!tokens.length) return;
      const price = (dto.priceAmount - (dto.discountAmount ?? 0)).toLocaleString('ru-RU');
      this.pushService.send(tokens, {
        title: '🚨 Новый заказ!',
        body: `${dto.serviceTitle} — ${price} UZS`,
        sound: 'default',
        data: { orderId: saved.id },
        channelId: 'new_orders',
        priority: 'high',
      });
    });

    return fullOrder;
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: { location: true, medic: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto): Promise<Order> {
    const order = await this.findOne(id);
    order.status = dto.status;
    await this.orderRepo.save(order);
    this.orderEventsGateway.emitOrderStatus(id, dto.status);
    return this.findOne(id);
  }

  async findByClient(clientId: string): Promise<Order[]> {
    return this.orderRepo.find({
      where: { clientId },
      relations: { location: true, medic: true },
      order: { created_at: 'DESC' },
    });
  }

  // ── Medic-facing ──────────────────────────────────────────────────────────

  /** All CREATED orders available for medics to pick up */
  async findAvailable(): Promise<Order[]> {
    return this.orderRepo.find({
      where: { status: OrderStatus.CREATED },
      relations: { location: true },
      order: { created_at: 'ASC' },
    });
  }

  /** Medic accepts a CREATED order → status becomes ASSIGNED */
  async acceptOrder(orderId: string, medicId: string): Promise<Order> {
    const order = await this.findOne(orderId);
    if (order.status !== OrderStatus.CREATED) {
      throw new Error(`Order is not available (status: ${order.status})`);
    }
    await this.orderRepo.update(orderId, {
      medicId,
      status: OrderStatus.ASSIGNED,
    });
    this.orderEventsGateway.emitOrderStatus(orderId, OrderStatus.ASSIGNED);
    const updated = await this.findOne(orderId);
    this.notifyClient(updated, OrderStatus.ASSIGNED);
    return updated;
  }

  /** Medic updates status of their own order */
  async updateStatusByMedic(
    orderId: string,
    medicId: string,
    status: OrderStatus,
  ): Promise<Order> {
    const order = await this.findOne(orderId);
    if (order.medicId !== medicId) {
      throw new Error('Order not assigned to you');
    }
    order.status = status;
    await this.orderRepo.save(order);
    this.orderEventsGateway.emitOrderStatus(orderId, status);
    const updated = await this.findOne(orderId);
    this.notifyClient(updated, status);
    return updated;
  }

  /** All orders assigned to a medic */
  async findByMedic(medicId: string): Promise<Order[]> {
    return this.orderRepo.find({
      where: { medicId },
      relations: { location: true },
      order: { created_at: 'DESC' },
    });
  }
}
