import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import {
  PermissionsController,
  RolePermissionsController,
  UserPermissionsController,
} from './permissions.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PermissionsGuard } from './guards/permissions.guard';

@Module({
  imports: [PrismaModule],
  controllers: [
    PermissionsController,
    RolePermissionsController,
    UserPermissionsController,
  ],
  providers: [PermissionsService, PermissionsGuard],
  exports: [PermissionsService, PermissionsGuard],
})
export class PermissionsModule {}
