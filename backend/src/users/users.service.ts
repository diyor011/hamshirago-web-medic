import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async create(data: { phone: string; passwordHash: string; name: string | null }): Promise<User> {
    const user = this.userRepo.create(data);
    return this.userRepo.save(user);
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { phone } });
  }

  async savePushToken(id: string, token: string): Promise<void> {
    await this.userRepo.update(id, { pushToken: token });
  }

  async getPushToken(id: string): Promise<string | null> {
    const user = await this.userRepo.findOne({ where: { id }, select: ['pushToken'] });
    return user?.pushToken ?? null;
  }

  async blockUser(id: string, isBlocked: boolean): Promise<void> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    await this.userRepo.update(id, { isBlocked });
  }
}
