import { Controller, Post, Get, Param, Body, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { VisaService } from './visa.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SubmitVisaDto } from './dto/submit-visa.dto';
import { ReviewVisaDto } from './dto/review-visa.dto';

@ApiTags('visa')
@ApiBearerAuth('JWT-auth')
@Controller('visas')
@UseGuards(JwtAuthGuard)
export class VisaController {
  constructor(private readonly visaService: VisaService) {}

  @Post('ticket/:ticketId')
  @ApiOperation({
    summary: '提交签证',
    description: '为工单提交签证申请，记录工程变更、额外工作等'
  })
  @ApiParam({ name: 'ticketId', description: '工单ID', type: Number })
  @ApiResponse({
    status: 201,
    description: '签证提交成功',
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          ticketId: 123,
          reason: '施工过程中发现隐蔽管道需要更换',
          additionalWork: '更换老化管道50米',
          additionalAmount: 15000,
          status: 'PENDING',
          createdBy: 10,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        },
        message: '签证已提交'
      }
    }
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权，需要登录' })
  @ApiResponse({ status: 404, description: '工单不存在' })
  async submitVisa(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() dto: SubmitVisaDto,
    @CurrentUser() user: any,
  ) {
    const visa = await this.visaService.submitVisa(ticketId, dto, user.userId);
    return { success: true, data: visa, message: '签证已提交' };
  }

  @Post(':id/review')
  @ApiOperation({
    summary: '审核签证',
    description: '审批人对签证申请进行审核，批准或驳回'
  })
  @ApiParam({ name: 'id', description: '签证ID', type: Number })
  @ApiResponse({
    status: 200,
    description: '审核成功',
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          ticketId: 123,
          reason: '施工过程中发现隐蔽管道需要更换',
          additionalWork: '更换老化管道50米',
          additionalAmount: 15000,
          status: 'APPROVED',
          reviewedBy: 20,
          reviewedAt: '2024-01-02T00:00:00.000Z',
          reviewComment: '情况属实，同意签证',
          createdBy: 10,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z'
        },
        message: '签证已批准'
      }
    }
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权，需要登录' })
  @ApiResponse({ status: 403, description: '无权限审核' })
  @ApiResponse({ status: 404, description: '签证不存在' })
  async reviewVisa(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewVisaDto,
    @CurrentUser() user: any,
  ) {
    const visa = await this.visaService.reviewVisa(id, dto, user.userId);
    return {
      success: true,
      data: visa,
      message: dto.approved ? '签证已批准' : '签证已驳回'
    };
  }

  @Get('ticket/:ticketId')
  @ApiOperation({
    summary: '查询工单签证',
    description: '查询指定工单的所有签证记录'
  })
  @ApiParam({ name: 'ticketId', description: '工单ID', type: Number })
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
            reason: '施工过程中发现隐蔽管道需要更换',
            additionalWork: '更换老化管道50米',
            additionalAmount: 15000,
            status: 'APPROVED',
            reviewedBy: 20,
            reviewedAt: '2024-01-02T00:00:00.000Z',
            reviewComment: '情况属实，同意签证',
            createdBy: 10,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-02T00:00:00.000Z'
          }
        ]
      }
    }
  })
  @ApiResponse({ status: 401, description: '未授权，需要登录' })
  async getVisa(@Param('ticketId', ParseIntPipe) ticketId: number) {
    const visa = await this.visaService.getVisa(ticketId);
    return { success: true, data: visa };
  }

  @Get()
  @ApiOperation({
    summary: '查询签证列表',
    description: '查询签证列表，支持按状态和创建人筛选'
  })
  @ApiQuery({ name: 'status', required: false, description: '签证状态：PENDING, APPROVED, REJECTED', type: String })
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
            reason: '施工变更',
            additionalAmount: 15000,
            status: 'APPROVED',
            createdBy: 10,
            createdAt: '2024-01-01T00:00:00.000Z'
          },
          {
            id: 2,
            ticketId: 124,
            reason: '额外工作量',
            additionalAmount: 8000,
            status: 'PENDING',
            createdBy: 10,
            createdAt: '2024-01-02T00:00:00.000Z'
          }
        ]
      }
    }
  })
  @ApiResponse({ status: 401, description: '未授权，需要登录' })
  async getVisaList(
    @Query('status') status?: string,
    @Query('createdBy', new ParseIntPipe({ optional: true })) createdBy?: number,
  ) {
    const visas = await this.visaService.getVisaList({ status, createdBy });
    return { success: true, data: visas };
  }
}
