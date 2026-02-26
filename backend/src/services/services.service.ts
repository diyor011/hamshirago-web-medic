import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './entities/service.entity';
import { CreateServiceDto } from './dto/create-service.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,
  ) {}

  /** Public list of active services, grouped info preserved via sortOrder */
  findAll(): Promise<Service[]> {
    return this.serviceRepo.find({
      where: { isActive: true },
      order: { category: 'ASC', sortOrder: 'ASC' },
    });
  }

  findOne(id: string): Promise<Service | null> {
    return this.serviceRepo.findOne({ where: { id } });
  }

  /** Validate that a service exists, is active, and return its price */
  async getActiveServiceOrThrow(id: string): Promise<Service> {
    const service = await this.serviceRepo.findOne({ where: { id, isActive: true } });
    if (!service) throw new NotFoundException('Service not found or not available');
    return service;
  }

  // ── Admin CRUD ────────────────────────────────────────────────────────────

  async create(dto: CreateServiceDto): Promise<Service> {
    return this.serviceRepo.save(this.serviceRepo.create(dto));
  }

  async update(id: string, dto: Partial<CreateServiceDto>): Promise<Service> {
    const service = await this.serviceRepo.findOne({ where: { id } });
    if (!service) throw new NotFoundException('Service not found');
    Object.assign(service, dto);
    return this.serviceRepo.save(service);
  }

  async remove(id: string): Promise<void> {
    await this.serviceRepo.update(id, { isActive: false });
  }
}
