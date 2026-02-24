import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('order_locations')
export class OrderLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  orderId: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column({ type: 'varchar', length: 255 })
  house: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  floor: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  apartment: string | null;

  @Column({ type: 'varchar', length: 30 })
  phone: string;

  @OneToOne(() => Order, (order) => order.location, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;
}
