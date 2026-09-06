import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { LogsModule } from './modules/logs/logs.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { NotificationModule } from './modules/notification/notification.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    TicketsModule,
    LogsModule,
    AttachmentsModule,
    StatisticsModule,
    PermissionsModule,
    NotificationModule,
  ],
})
export class AppModule {}
