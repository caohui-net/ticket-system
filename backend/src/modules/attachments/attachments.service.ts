import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { createReadStream, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 上传附件
   * @param ticketId 工单ID
   * @param file 上传的文件
   * @param currentUser 当前用户
   */
  async upload(ticketId: string, file: Express.Multer.File, currentUser: any) {
    this.logger.log(`Uploading attachment for ticket ${ticketId} by user ${currentUser.username}`);

    // 验证工单是否存在
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: BigInt(ticketId) },
    });

    if (!ticket) {
      // 删除已上传的文件
      if (existsSync(file.path)) {
        unlinkSync(file.path);
      }
      throw new NotFoundException('工单不存在');
    }

    // 获取相对路径（相对于项目根目录）
    const relativePath = file.path.replace(process.cwd() + '/', '');

    // 保存附件信息到数据库
    const attachment = await this.prisma.ticketAttachment.create({
      data: {
        ticketId: BigInt(ticketId),
        fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
        fileSize: BigInt(file.size),
        mimeType: file.mimetype,
        filePath: relativePath,
        uploaderSnapshot: {
          id: currentUser.userId,
          username: currentUser.username,
          realName: currentUser.realName || currentUser.username,
        },
      },
    });

    this.logger.log(`Attachment uploaded successfully: ${attachment.id}`);

    return {
      id: attachment.id.toString(),
      ticketId: attachment.ticketId.toString(),
      fileName: attachment.fileName,
      fileSize: attachment.fileSize.toString(),
      mimeType: attachment.mimeType,
      uploaderSnapshot: attachment.uploaderSnapshot,
      uploadedAt: attachment.uploadedAt,
    };
  }

  /**
   * 查询工单的所有附件
   * @param ticketId 工单ID
   */
  async findAll(ticketId: string) {
    this.logger.log(`Finding all attachments for ticket ${ticketId}`);

    const attachments = await this.prisma.ticketAttachment.findMany({
      where: { ticketId: BigInt(ticketId) },
      orderBy: { uploadedAt: 'desc' },
    });

    return attachments.map((attachment) => ({
      id: attachment.id.toString(),
      ticketId: attachment.ticketId.toString(),
      fileName: attachment.fileName,
      fileSize: attachment.fileSize.toString(),
      mimeType: attachment.mimeType,
      uploaderSnapshot: attachment.uploaderSnapshot,
      uploadedAt: attachment.uploadedAt,
    }));
  }

  /**
   * 下载附件
   * @param attachmentId 附件ID
   */
  async download(attachmentId: string) {
    this.logger.log(`Downloading attachment ${attachmentId}`);

    const attachment = await this.prisma.ticketAttachment.findUnique({
      where: { id: BigInt(attachmentId) },
    });

    if (!attachment) {
      throw new NotFoundException('附件不存在');
    }

    // 获取文件完整路径
    const filePath = join(process.cwd(), attachment.filePath);

    // 检查文件是否存在
    if (!existsSync(filePath)) {
      this.logger.error(`File not found: ${filePath}`);
      throw new NotFoundException('文件不存在');
    }

    return {
      stream: createReadStream(filePath),
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
    };
  }

  /**
   * 删除附件
   * @param attachmentId 附件ID
   * @param currentUser 当前用户
   */
  async remove(attachmentId: string, currentUser: any) {
    this.logger.log(`Removing attachment ${attachmentId} by user ${currentUser.username}`);

    const attachment = await this.prisma.ticketAttachment.findUnique({
      where: { id: BigInt(attachmentId) },
    });

    if (!attachment) {
      throw new NotFoundException('附件不存在');
    }

    // 检查权限（只能删除自己上传的，或管理员）
    const uploader = attachment.uploaderSnapshot as any;
    if (uploader.id !== currentUser.userId && currentUser.role !== 'admin') {
      throw new ForbiddenException('您只能删除自己上传的附件');
    }

    // 获取文件完整路径
    const filePath = join(process.cwd(), attachment.filePath);

    // 删除数据库记录
    await this.prisma.ticketAttachment.delete({
      where: { id: BigInt(attachmentId) },
    });

    // 删除物理文件
    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
        this.logger.log(`File deleted: ${filePath}`);
      } else {
        this.logger.warn(`File not found for deletion: ${filePath}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete file: ${filePath}`, error);
      // 即使文件删除失败，也不抛出异常（数据库记录已删除）
    }

    this.logger.log(`Attachment removed successfully: ${attachmentId}`);

    return { message: '附件已删除' };
  }
}
