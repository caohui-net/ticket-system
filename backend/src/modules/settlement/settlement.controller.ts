import { Controller, Post, Get, Param, Body, UseGuards, ParseIntPipe, Query, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { SettlementService } from './settlement.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SubmitSettlementDto } from './dto/submit-settlement.dto';
import { ReviewSettlementDto } from './dto/review-settlement.dto';

@ApiTags('settlement')
@ApiBearerAuth('JWT-auth')
@Controller('settlements')
@UseGuards(JwtAuthGuard)
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  @Post('ticket/:ticketId')
  @ApiOperation({
    summary: '提交结算',
    description: '为工单提交结算信息，包含实际费用、明细等'
  })
  @ApiParam({ name: 'ticketId', description: '工单ID', type: Number })
  @ApiResponse({
    status: 201,
    description: '结算提交成功',
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          ticketId: 123,
          actualAmount: 48000,
          items: [
            { name: '材料费', amount: 30000 },
            { name: '人工费', amount: 18000 }
          ],
          description: '维修结算',
          status: 'PENDING',
          isPaid: false,
          createdBy: 10,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        },
        message: '结算已提交'
      }
    }
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权，需要登录' })
  @ApiResponse({ status: 404, description: '工单不存在' })
  @ApiResponse({ status: 409, description: '结算已存在' })
  async submitSettlement(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() dto: SubmitSettlementDto,
    @CurrentUser() user: any,
  ) {
    const settlement = await this.settlementService.submitSettlement(ticketId, dto, user.userId);
    return { success: true, data: settlement, message: '结算已提交' };
  }

  @Post(':id/review')
  @ApiOperation({
    summary: '审核结算',
    description: '财务人员对结算进行审核，批准或驳回'
  })
  @ApiParam({ name: 'id', description: '结算ID', type: Number })
  @ApiResponse({
    status: 200,
    description: '审核成功',
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          ticketId: 123,
          actualAmount: 48000,
          items: [
            { name: '材料费', amount: 30000 },
            { name: '人工费', amount: 18000 }
          ],
          description: '维修结算',
          status: 'APPROVED',
          isPaid: false,
          reviewedBy: 20,
          reviewedAt: '2024-01-02T00:00:00.000Z',
          reviewComment: '审核通过',
          createdBy: 10,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z'
        },
        message: '结算已批准'
      }
    }
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权，需要登录' })
  @ApiResponse({ status: 403, description: '无权限审核' })
  @ApiResponse({ status: 404, description: '结算不存在' })
  async reviewSettlement(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewSettlementDto,
    @CurrentUser() user: any,
  ) {
    const settlement = await this.settlementService.reviewSettlement(id, dto, user.userId);
    return {
      success: true,
      data: settlement,
      message: dto.approved ? '结算已批准' : '结算已驳回'
    };
  }

  @Patch(':id/paid')
  @ApiOperation({
    summary: '标记为已支付',
    description: '财务人员确认结算款项已支付'
  })
  @ApiParam({ name: 'id', description: '结算ID', type: Number })
  @ApiResponse({
    status: 200,
    description: '标记成功',
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          ticketId: 123,
          actualAmount: 48000,
          status: 'APPROVED',
          isPaid: true,
          paidBy: 20,
          paidAt: '2024-01-03T00:00:00.000Z',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-03T00:00:00.000Z'
        },
        message: '已标记为已支付'
      }
    }
  })
  @ApiResponse({ status: 400, description: '结算未审批或已支付' })
  @ApiResponse({ status: 401, description: '未授权，需要登录' })
  @ApiResponse({ status: 403, description: '无权限操作' })
  @ApiResponse({ status: 404, description: '结算不存在' })
  async markAsPaid(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    const settlement = await this.settlementService.markAsPaid(id, user.userId);
    return { success: true, data: settlement, message: '已标记为已支付' };
  }

  @Get('ticket/:ticketId')
  @ApiOperation({
    summary: '查询工单结算',
    description: '查询指定工单的结算信息'
  })
  @ApiParam({ name: 'ticketId', description: '工单ID', type: Number })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          ticketId: 123,
          actualAmount: 48000,
          items: [
            { name: '材料费', amount: 30000 },
            { name: '人工费', amount: 18000 }
          ],
          description: '维修结算',
          status: 'APPROVED',
          isPaid: true,
          paidBy: 20,
          paidAt: '2024-01-03T00:00:00.000Z',
          createdBy: 10,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-03T00:00:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: '未授权，需要登录' })
  @ApiResponse({ status: 404, description: '结算不存在' })
  async getSettlement(@Param('ticketId', ParseIntPipe) ticketId: number) {
    const settlement = await this.settlementService.getSettlement(ticketId);
    return { success: true, data: settlement };
  }

  @Get()
  @ApiOperation({
    summary: '查询结算列表',
    description: '查询结算列表，支持按状态和创建人筛选'
  })
  @ApiQuery({ name: 'status', required: false, description: '结算状态：PENDING, APPROVED, REJECTED', type: String })
  @ApiQuery({ name: 'createdBy', required: false, description: '创建人ID', type: Number })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 1,
            ticketId: 123,
            actualAmount: 48000,
            status: 'APPROVED',
            isPaid: true,
            createdBy: 10,
            createdAt: '2024-01-01T00:00:00.000Z'
          },
          {
            id: 2,
            ticketId: 124,
            actualAmount: 35000,
            status: 'PENDING',
            isPaid: false,
            createdBy: 10,
            createdAt: '2024-01-02T00:00:00.000Z'
          }
        ]
      }
    }
  })
  @ApiResponse({ status: 401, description: '未授权，需要登录' })
  async getSettlementList(
    @Query('status') status?: string,
    @Query('createdBy', new ParseIntPipe({ optional: true })) createdBy?: number,
  ) {
    const settlements = await this.settlementService.getSettlementList({ status, createdBy });
    return { success: true, data: settlements };
  }
}
