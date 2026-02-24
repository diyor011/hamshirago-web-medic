import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderStatus } from './entities/order-status.enum';
import { OrderLocation } from './entities/order-location.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderEventsGateway } from '../realtime/order-events.gateway';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(OrderLocation)
    private locationRepo: Repository<OrderLocation>,
    private orderEventsGateway: OrderEventsGateway,
  ) {}

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
    return this.findOne(saved.id);
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
    return this.findOne(orderId);
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
    return this.findOne(orderId);
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
