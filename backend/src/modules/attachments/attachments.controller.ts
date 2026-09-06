import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Logger,
  Res,
  StreamableFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AttachmentsService } from './attachments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { multerConfig } from './config/multer.config';
import { UploadAttachmentDto } from './dto/upload-attachment.dto';

@ApiTags('工单附件')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class AttachmentsController {
  private readonly logger = new Logger(AttachmentsController.name);

  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('tickets/:ticketId/attachments')
  @ApiOperation({ summary: '上传附件' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: '上传文件',
    type: UploadAttachmentDto,
  })
  @ApiResponse({ status: 201, description: '上传成功' })
  @ApiResponse({ status: 400, description: '文件类型不支持或文件过大' })
  @ApiResponse({ status: 404, description: '工单不存在' })
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async upload(
    @Param('ticketId') ticketId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: any,
  ) {
    this.logger.log(`POST /api/v1/tickets/${ticketId}/attachments - User: ${currentUser.username}`);

    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    return this.attachmentsService.upload(ticketId, file, currentUser);
  }

  @Get('tickets/:ticketId/attachments')
  @ApiOperation({ summary: '查询工单的所有附件' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async findAll(@Param('ticketId') ticketId: string) {
    this.logger.log(`GET /api/v1/tickets/${ticketId}/attachments`);
    return this.attachmentsService.findAll(ticketId);
  }

  @Get('attachments/:id/download')
  @ApiOperation({ summary: '下载附件' })
  @ApiResponse({ status: 200, description: '下载成功' })
  @ApiResponse({ status: 404, description: '附件不存在' })
  async download(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    this.logger.log(`GET /api/v1/attachments/${id}/download`);

    const { stream, fileName, mimeType } = await this.attachmentsService.download(id);

    // 设置响应头
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
    });

    return new StreamableFile(stream);
  }

  @Delete('attachments/:id')
  @ApiOperation({ summary: '删除附件' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '附件不存在' })
  @ApiResponse({ status: 403, description: '无权限删除' })
  async remove(@Param('id') id: string, @CurrentUser() currentUser: any) {
    this.logger.log(`DELETE /api/v1/attachments/${id} - User: ${currentUser.username}`);
    return this.attachmentsService.remove(id, currentUser);
  }
}
