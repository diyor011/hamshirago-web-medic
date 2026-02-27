import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { RateOrderDto } from './dto/rate-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MedicAuthGuard } from '../auth/guards/medic-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
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
  findByClient(
    @ClientId() clientId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.findByClient(
      clientId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  /** Client cancels their own order (only CREATED or ASSIGNED) */
  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  cancelOrder(@Param('id') id: string, @ClientId() clientId: string) {
    return this.ordersService.cancelOrder(id, clientId);
  }

  /** Client rates the medic after order is DONE */
  @Post(':id/rate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  rateOrder(
    @Param('id') id: string,
    @ClientId() clientId: string,
    @Body() dto: RateOrderDto,
  ) {
    return this.ordersService.rateOrder(id, clientId, dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }

  // ── Medic endpoints ───────────────────────────────────────────────────────

  /** List of CREATED orders available for medics to pick up (filtered by 10km radius) */
  @Get('medic/available')
  @UseGuards(MedicAuthGuard)
  findAvailable(@MedicId() medicId: string) {
    return this.ordersService.findAvailable(medicId);
  }

  /** Medic's own order history */
  @Get('medic/my')
  @UseGuards(MedicAuthGuard)
  findMyOrders(
    @MedicId() medicId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.findByMedic(
      medicId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
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

  // ── Admin endpoints ───────────────────────────────────────────────────────

  /**
   * GET /orders/admin/all?page=1&limit=20&status=CREATED
   * Returns all orders with pagination and optional status filter.
   * Requires X-Admin-Secret header.
   */
  @Get('admin/all')
  @UseGuards(AdminGuard)
  findAllAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.ordersService.findAllAdmin(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status as OrderStatus | undefined,
    );
  }

  /**
   * PATCH /orders/admin/:id/cancel
   * Force-cancel any order. Requires X-Admin-Secret header.
   */
  @Patch('admin/:id/cancel')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  adminCancelOrder(@Param('id') id: string) {
    return this.ordersService.adminCancelOrder(id);
  }
}
