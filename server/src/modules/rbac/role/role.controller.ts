import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { AssignRolePermissionsDto } from './dto/assign-role-permissions.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { ListRolesDto } from './dto/list-roles.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleService } from './role.service';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @RequirePermission('system:role:list')
  @ApiOperation({ summary: '角色列表' })
  list(@Query() query: ListRolesDto) {
    return this.roleService.list(query);
  }

  @Get('permission-options')
  @RequirePermission('system:role:list')
  @ApiOperation({ summary: '可分配权限列表' })
  listPermissionOptions() {
    return this.roleService.listPermissionOptions();
  }

  @Get(':id')
  @RequirePermission('system:role:list')
  @ApiOperation({ summary: '角色详情' })
  findOne(@Param('id') id: string) {
    return this.roleService.findById(id);
  }

  @Post()
  @RequirePermission('system:role:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建角色' })
  create(@Body() body: CreateRoleDto) {
    return this.roleService.create(body);
  }

  @Put(':id/permissions')
  @RequirePermission('system:role:update')
  @ApiOperation({ summary: '分配角色权限' })
  assignPermissions(@Param('id') id: string, @Body() body: AssignRolePermissionsDto) {
    return this.roleService.assignPermissions(id, body);
  }

  @Put(':id')
  @RequirePermission('system:role:update')
  @ApiOperation({ summary: '更新角色' })
  update(@Param('id') id: string, @Body() body: UpdateRoleDto) {
    return this.roleService.update(id, body);
  }

  @Delete(':id')
  @RequirePermission('system:role:delete')
  @ApiOperation({ summary: '删除角色' })
  remove(@Param('id') id: string) {
    return this.roleService.remove(id);
  }
}
