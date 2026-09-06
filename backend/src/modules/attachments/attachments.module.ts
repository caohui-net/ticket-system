import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { AttachmentsService } from './attachments.service';
import { AttachmentsController } from './attachments.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({
      dest: './uploads/attachments',
    }),
  ],
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
