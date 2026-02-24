import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MedicAuthGuard } from '../auth/guards/medic-auth.guard';
import { ClientId } from '../auth/decorators/client-id.decorator';
import { MedicId } from '../auth/decorators/medic-id.decorator';
import { OrderStatus } from './entities/order-status.enum';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ── Client endpoints ──────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@ClientId() clientId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(clientId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findByClient(@ClientId() clientId: string) {
    return this.ordersService.findByClient(clientId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }

  // ── Medic endpoints ───────────────────────────────────────────────────────

  /** List of CREATED orders available for medics to pick up */
  @Get('medic/available')
  @UseGuards(MedicAuthGuard)
  findAvailable() {
    return this.ordersService.findAvailable();
  }

  /** Medic's own order history */
  @Get('medic/my')
  @UseGuards(MedicAuthGuard)
  findMyOrders(@MedicId() medicId: string) {
    return this.ordersService.findByMedic(medicId);
  }

  /** Accept an available order */
  @Post(':id/accept')
  @UseGuards(MedicAuthGuard)
  @HttpCode(HttpStatus.OK)
  acceptOrder(@Param('id') id: string, @MedicId() medicId: string) {
    return this.ordersService.acceptOrder(id, medicId);
  }

  /** Update order status (ON_THE_WAY, ARRIVED, SERVICE_STARTED, DONE) */
  @Patch(':id/medic-status')
  @UseGuards(MedicAuthGuard)
  updateMedicStatus(
    @Param('id') id: string,
    @MedicId() medicId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatusByMedic(id, medicId, dto.status as OrderStatus);
  }
}
