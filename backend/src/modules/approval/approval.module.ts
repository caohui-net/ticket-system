import { Module } from '@nestjs/common';
import { ApprovalService } from './approval.service';
import { ApprovalController } from './approval.controller';
import { TemplateService } from './template/template.service';
import { TemplateController } from './template/template.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [ApprovalController, TemplateController],
  providers: [ApprovalService, TemplateService],
  exports: [ApprovalService, TemplateService],
})
export class ApprovalModule {}
