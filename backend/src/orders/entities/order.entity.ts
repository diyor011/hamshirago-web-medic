import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Medic } from '../../medics/entities/medic.entity';
import { OrderLocation } from './order-location.entity';
import { OrderStatus } from './order-status.enum';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  clientId: string;

  @Column({ type: 'uuid', nullable: true })
  medicId: string | null;

  @Column({ type: 'varchar', length: 50 })
  serviceId: string;

  @Column({ type: 'varchar', length: 100 })
  serviceTitle: string;

  @Column({ type: 'int' })
  priceAmount: number;

  @Column({ type: 'int', default: 0 })
  discountAmount: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.CREATED,
  })
  status: OrderStatus;

  /** Rating left by client after order completion (1-5), null if not rated yet */
  @Column({ type: 'smallint', nullable: true, default: null })
  clientRating: number | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User, (u) => u.orders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client: User;

  @ManyToOne(() => Medic, (m) => m.orders, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'medicId' })
  medic: Medic | null;

  @OneToOne(() => OrderLocation, (loc) => loc.order, { cascade: true })
  location: OrderLocation;
}
