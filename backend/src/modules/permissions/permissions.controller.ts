import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import {
  UpdateRolePermissionsDto,
  AddRolePermissionDto,
} from './dto/update-role-permissions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RequirePermissions } from './decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('权限管理')
@ApiBearerAuth()
@Controller('api/v1/permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  @RequirePermissions('*:*')
  @ApiOperation({ summary: '创建权限（仅超级管理员）' })
  @ApiResponse({ status: 201, description: '权限创建成功' })
  @ApiResponse({ status: 409, description: '权限已存在' })
  create(@Body() createPermissionDto: CreatePermissionDto) {
    return this.permissionsService.create(createPermissionDto);
  }

  @Get()
  @RequirePermissions('role:manage')
  @ApiOperation({ summary: '获取所有权限列表' })
  @ApiResponse({ status: 200, description: '返回权限列表' })
  findAll() {
    return this.permissionsService.findAll();
  }

  @Get(':id')
  @RequirePermissions('role:manage')
  @ApiOperation({ summary: '获取权限详情' })
  @ApiParam({ name: 'id', description: '权限ID' })
  @ApiResponse({ status: 200, description: '返回权限详情' })
  @ApiResponse({ status: 404, description: '权限不存在' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.permissionsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('*:*')
  @ApiOperation({ summary: '更新权限（仅超级管理员）' })
  @ApiParam({ name: 'id', description: '权限ID' })
  @ApiResponse({ status: 200, description: '权限更新成功' })
  @ApiResponse({ status: 404, description: '权限不存在' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePermissionDto: Partial<CreatePermissionDto>,
  ) {
    return this.permissionsService.update(id, updatePermissionDto);
  }

  @Delete(':id')
  @RequirePermissions('*:*')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除权限（仅超级管理员）' })
  @ApiParam({ name: 'id', description: '权限ID' })
  @ApiResponse({ status: 204, description: '权限删除成功' })
  @ApiResponse({ status: 404, description: '权限不存在' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.permissionsService.remove(id);
  }
}

@ApiTags('角色权限管理')
@ApiBearerAuth()
@Controller('api/v1/roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolePermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get(':id/permissions')
  @RequirePermissions('role:manage')
  @ApiOperation({ summary: '获取角色的权限列表' })
  @ApiParam({ name: 'id', description: '角色ID' })
  @ApiResponse({ status: 200, description: '返回角色权限列表' })
  @ApiResponse({ status: 404, description: '角色不存在' })
  getRolePermissions(@Param('id', ParseIntPipe) id: number) {
    return this.permissionsService.getRolePermissions(id);
  }

  @Post(':id/permissions')
  @RequirePermissions('role:manage')
  @ApiOperation({ summary: '给角色添加权限' })
  @ApiParam({ name: 'id', description: '角色ID' })
  @ApiResponse({ status: 201, description: '权限添加成功' })
  @ApiResponse({ status: 404, description: '角色或权限不存在' })
  @ApiResponse({ status: 409, description: '权限已存在' })
  addRolePermission(
    @Param('id', ParseIntPipe) id: number,
    @Body() addRolePermissionDto: AddRolePermissionDto,
  ) {
    return this.permissionsService.addRolePermission(
      id,
      addRolePermissionDto.permissionId,
    );
  }

  @Delete(':id/permissions/:permissionId')
  @RequirePermissions('role:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '移除角色权限' })
  @ApiParam({ name: 'id', description: '角色ID' })
  @ApiParam({ name: 'permissionId', description: '权限ID' })
  @ApiResponse({ status: 204, description: '权限移除成功' })
  @ApiResponse({ status: 404, description: '角色或权限不存在' })
  removeRolePermission(
    @Param('id', ParseIntPipe) id: number,
    @Param('permissionId', ParseIntPipe) permissionId: number,
  ) {
    return this.permissionsService.removeRolePermission(id, permissionId);
  }

  @Patch(':id/permissions')
  @RequirePermissions('role:manage')
  @ApiOperation({ summary: '批量更新角色权限' })
  @ApiParam({ name: 'id', description: '角色ID' })
  @ApiResponse({ status: 200, description: '角色权限更新成功' })
  @ApiResponse({ status: 400, description: '部分权限ID不存在' })
  @ApiResponse({ status: 404, description: '角色不存在' })
  updateRolePermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRolePermissionsDto: UpdateRolePermissionsDto,
  ) {
    return this.permissionsService.updateRolePermissions(
      id,
      updateRolePermissionsDto.permissionIds,
    );
  }
}

@ApiTags('用户权限查询')
@ApiBearerAuth()
@Controller('api/v1/users')
@UseGuards(JwtAuthGuard)
export class UserPermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('me/permissions')
  @ApiOperation({ summary: '获取当前用户的所有权限' })
  @ApiResponse({ status: 200, description: '返回用户权限列表' })
  getMyPermissions(@CurrentUser() user: any) {
    // userId从JWT token的user对象中获取
    return this.permissionsService.getUserPermissions(parseInt(user.userId));
  }

  @Get(':id/permissions')
  @RequirePermissions('user:manage')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: '获取指定用户的所有权限（需要用户管理权限）' })
  @ApiParam({ name: 'id', description: '用户ID' })
  @ApiResponse({ status: 200, description: '返回用户权限列表' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  getUserPermissions(@Param('id', ParseIntPipe) id: number) {
    return this.permissionsService.getUserPermissions(id);
  }
}
