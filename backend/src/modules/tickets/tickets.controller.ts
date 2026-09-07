import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';
import { ReviewRepairDto } from './dto/review-repair.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TicketStatus } from '@prisma/client';
import { CurrentUser as CurrentUserType } from './interfaces/current-user.interface';

/**
 * 工单控制器
 * 提供工单管理的RESTful API
 */
@ApiTags('工单管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  /**
   * 创建工单
   */
  @Post()
  @ApiOperation({ summary: '创建工单' })
  @ApiResponse({ status: 201, description: '工单创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  create(@Body() createTicketDto: CreateTicketDto, @CurrentUser() currentUser: CurrentUserType) {
    return this.ticketsService.create(createTicketDto, currentUser);
  }

  /**
   * 查询工单列表
   */
  @Get()
  @ApiOperation({ summary: '查询工单列表' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  findAll(@Query() queryDto: QueryTicketsDto) {
    return this.ticketsService.findAll(queryDto);
  }

  /**
   * 查询单个工单详情
   */
  @Get(':id')
  @ApiOperation({ summary: '查询单个工单详情' })
  @ApiParam({ name: 'id', description: '工单ID', example: 1 })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '工单不存在' })
  @ApiResponse({ status: 401, description: '未授权' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.findOne(id);
  }

  /**
   * 更新工单
   */
  @Patch(':id')
  @ApiOperation({ summary: '更新工单' })
  @ApiParam({ name: 'id', description: '工单ID', example: 1 })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 400, description: '请求参数错误或工单已锁定' })
  @ApiResponse({ status: 404, description: '工单不存在' })
  @ApiResponse({ status: 401, description: '未授权' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateTicketDto: UpdateTicketDto) {
    return this.ticketsService.update(id, updateTicketDto);
  }

  /**
   * 删除工单（软删除）
   */
  @Delete(':id')
  @ApiOperation({ summary: '删除工单（软删除）' })
  @ApiParam({ name: 'id', description: '工单ID', example: 1 })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 400, description: '工单已锁定' })
  @ApiResponse({ status: 404, description: '工单不存在' })
  @ApiResponse({ status: 401, description: '未授权' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.remove(id);
  }

  /**
   * 分配工单
   */
  @Post(':id/assign')
  @ApiOperation({ summary: '分配工单给处理人' })
  @ApiParam({ name: 'id', description: '工单ID', example: 1 })
  @ApiResponse({ status: 200, description: '分配成功' })
  @ApiResponse({ status: 400, description: '工单已锁定' })
  @ApiResponse({ status: 404, description: '工单或用户不存在' })
  @ApiResponse({ status: 401, description: '未授权' })
  assign(
    @Param('id', ParseIntPipe) id: number,
    @Body('assigneeId', ParseIntPipe) assigneeId: number,
    @CurrentUser() currentUser: CurrentUserType,
  ) {
    return this.ticketsService.assign(id, assigneeId, currentUser);
  }

  /**
   * 变更工单状态
   */
  @Patch(':id/status')
  @ApiOperation({ summary: '变更工单状态' })
  @ApiParam({ name: 'id', description: '工单ID', example: 1 })
  @ApiResponse({ status: 200, description: '状态变更成功' })
  @ApiResponse({ status: 400, description: '工单已锁定或状态无效' })
  @ApiResponse({ status: 404, description: '工单不存在' })
  @ApiResponse({ status: 401, description: '未授权' })
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: TicketStatus,
    @CurrentUser() currentUser: CurrentUserType,
  ) {
    return this.ticketsService.changeStatus(id, status, currentUser);
  }

  /**
   * 副主任审核报修
   */
  @Post(':id/review')
  @ApiOperation({ summary: '副主任审核报修单' })
  @ApiParam({ name: 'id', description: '工单ID', example: 1 })
  @ApiResponse({ status: 200, description: '审核成功' })
  @ApiResponse({ status: 403, description: '无权限审核' })
  @ApiResponse({ status: 404, description: '工单不存在' })
  @ApiResponse({ status: 401, description: '未授权' })
  reviewRepair(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewRepairDto,
    @CurrentUser() currentUser: CurrentUserType,
  ) {
    return this.ticketsService.reviewRepair(id, dto, currentUser);
  }
}
