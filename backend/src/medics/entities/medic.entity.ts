import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';

@Entity('medics')
export class Medic {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  phone: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  /** Rating 1-5, nullable until first rating */
  @Column({ type: 'decimal', precision: 3, scale: 2, default: null })
  rating: number | null;

  @Column({ type: 'int', default: 0 })
  reviewCount: number;

  @Column({ type: 'int', default: 0 })
  experienceYears: number;

  @Column({ type: 'boolean', default: false })
  isOnline: boolean;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance: number;

  /** Expo push token for background notifications */
  @Column({ type: 'varchar', nullable: true, default: null })
  pushToken: string | null;

  /** Last known lat/lng for dispatch */
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Order, (order) => order.medic)
  orders: Order[];
}
