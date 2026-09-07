import { Controller, Post, Get, Param, Body, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { BudgetService } from './budget.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SubmitBudgetDto } from './dto/submit-budget.dto';
import { ReviewBudgetDto } from './dto/review-budget.dto';

@ApiTags('budget')
@ApiBearerAuth('JWT-auth')
@Controller('budgets')
@UseGuards(JwtAuthGuard)
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Post('ticket/:ticketId')
  @ApiOperation({
    summary: '提交预算',
    description: '为指定工单提交预算信息，包含金额、明细等'
  })
  @ApiParam({ name: 'ticketId', description: '工单ID', type: Number })
  @ApiResponse({
    status: 201,
    description: '预算提交成功',
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          ticketId: 123,
          amount: 50000,
          description: '设备维修预算',
          status: 'PENDING',
          createdBy: 10,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        },
        message: '预算已提交'
      }
    }
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权，需要登录' })
  @ApiResponse({ status: 404, description: '工单不存在' })
  async submitBudget(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() dto: SubmitBudgetDto,
    @CurrentUser() user: any,
  ) {
    const budget = await this.budgetService.submitBudget(ticketId, dto, user.userId);
    return { success: true, data: budget, message: '预算已提交' };
  }

  @Post(':id/review')
  @ApiOperation({
    summary: '审核预算',
    description: '审批人对预算进行批准或驳回操作'
  })
  @ApiParam({ name: 'id', description: '预算ID', type: Number })
  @ApiResponse({
    status: 200,
    description: '预算审核成功',
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          ticketId: 123,
          amount: 50000,
          description: '设备维修预算',
          status: 'APPROVED',
          reviewedBy: 20,
          reviewedAt: '2024-01-01T12:00:00.000Z',
          reviewComment: '预算合理，批准',
          createdBy: 10,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T12:00:00.000Z'
        },
        message: '预算已批准'
      }
    }
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权，需要登录' })
  @ApiResponse({ status: 403, description: '无权限审核' })
  @ApiResponse({ status: 404, description: '预算不存在' })
  async reviewBudget(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewBudgetDto,
    @CurrentUser() user: any,
  ) {
    const budget = await this.budgetService.reviewBudget(id, dto, user.userId);
    return {
      success: true,
      data: budget,
      message: dto.approved ? '预算已批准' : '预算已驳回'
    };
  }

  @Get('ticket/:ticketId')
  @ApiOperation({
    summary: '查询工单预算',
    description: '查询指定工单的预算信息'
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
          amount: 50000,
          description: '设备维修预算',
          status: 'APPROVED',
          reviewedBy: 20,
          reviewedAt: '2024-01-01T12:00:00.000Z',
          reviewComment: '预算合理，批准',
          createdBy: 10,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T12:00:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: '未授权，需要登录' })
  @ApiResponse({ status: 404, description: '预算不存在' })
  async getBudget(@Param('ticketId', ParseIntPipe) ticketId: number) {
    const budget = await this.budgetService.getBudget(ticketId);
    if (!budget) {
      throw new NotFoundException('预算不存在');
    }
    return { success: true, data: budget };
  }
}
