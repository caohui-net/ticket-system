import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),

    // 限流模块
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // 事件模块
    EventEmitterModule.forRoot(),

    // Prisma模块
    PrismaModule,

    // 业务模块
    // AuthModule,
    // UserModule,
    // TicketModule,
    // 其他模块待添加
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
