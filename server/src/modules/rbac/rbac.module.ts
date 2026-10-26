import { JwtModule } from '../../common/jwt/jwt.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  SysMenuEntity,
  SysPermissionEntity,
  SysRoleEntity,
  SysRolePermissionEntity,
  SysRoleDeptEntity,
  SysUserEntity,
  SysUserRoleEntity,
} from '../../database/entities';
import { AuthModule } from '../auth/auth.module';
import { DataScopeModule } from '../data-scope/data-scope.module';
import { DeptModule } from '../dept/dept.module';
import { MenuController } from './menu/menu.controller';
import { MenuService } from './menu/menu.service';
import { RoleController } from './role/role.controller';
import { RoleService } from './role/role.service';
import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';

@Module({
  imports: [
    JwtModule,
    AuthModule,
    DeptModule,
    DataScopeModule,
    TypeOrmModule.forFeature([
      SysUserEntity,
      SysUserRoleEntity,
      SysRoleEntity,
      SysRolePermissionEntity,
      SysPermissionEntity,
      SysMenuEntity,
      SysRoleDeptEntity,
    ]),
  ],
  controllers: [UserController, RoleController, MenuController],
  providers: [UserService, RoleService, MenuService],
})
export class RbacModule {}
