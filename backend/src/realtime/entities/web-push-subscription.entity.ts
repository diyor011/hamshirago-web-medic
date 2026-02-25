import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Stores a browser Web Push subscription for a user (client or medic).
 * One user can have multiple subscriptions (multiple browsers/devices).
 *
 * subscriberType: 'client' | 'medic'
 * subscriberId: the User.id or Medic.id
 */
@Entity('web_push_subscriptions')
@Index(['subscriberType', 'subscriberId'])
export class WebPushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 16 })
  subscriberType: string; // 'client' | 'medic'

  @Column({ type: 'uuid' })
  subscriberId: string;

  /** The unique push endpoint URL provided by the browser */
  @Column({ type: 'text', unique: true })
  endpoint: string;

  /** ECDH public key (base64url) */
  @Column({ type: 'text' })
  p256dh: string;

  /** Auth secret (base64url) */
  @Column({ type: 'text' })
  auth: string;

  /** Optional: browser/OS for display purposes */
  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  userAgent: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
