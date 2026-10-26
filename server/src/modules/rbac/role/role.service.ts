import { PermissionCacheService } from '../../../common/jwt/permission-cache.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DATA_SCOPE_ALL,
  DATA_SCOPE_CUSTOM,
  type DataScope,
  type PaginationResult,
  type SysRoleDetail,
  type SysRoleListItem,
  type SysPermissionOption,
} from '@nova/shared-types';
import { In, Repository } from 'typeorm';
import {
  SysPermissionEntity,
  SysRoleEntity,
  SysRolePermissionEntity,
  SysRoleDeptEntity,
} from '../../../database/entities';
import { toApiId } from '../../../common/utils/to-api-id';
import { AssignRolePermissionsDto } from './dto/assign-role-permissions.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { ListRolesDto } from './dto/list-roles.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

const SUPER_ADMIN_ROLE_CODE = 'super_admin';

@Injectable()
export class RoleService {
  constructor(
    private readonly permissionCache: PermissionCacheService,
    @InjectRepository(SysRoleEntity)
    private readonly roleRepo: Repository<SysRoleEntity>,
    @InjectRepository(SysRolePermissionEntity)
    private readonly rolePermissionRepo: Repository<SysRolePermissionEntity>,
    @InjectRepository(SysPermissionEntity)
    private readonly permissionRepo: Repository<SysPermissionEntity>,
    @InjectRepository(SysRoleDeptEntity)
    private readonly roleDeptRepo: Repository<SysRoleDeptEntity>,
  ) {}

  async list(query: ListRolesDto): Promise<PaginationResult<SysRoleListItem>> {
    const { page = 1, pageSize = 10, keyword } = query;
    const qb = this.roleRepo.createQueryBuilder('r').orderBy('r.sort', 'ASC');

    if (keyword?.trim()) {
      qb.andWhere('(r.name LIKE :kw OR r.code LIKE :kw)', {
        kw: `%${keyword.trim()}%`,
      });
    }

    const [roles, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      list: roles.map((role) => this.toListItem(role)),
      total,
      page,
      pageSize,
    };
  }

  async findById(id: string): Promise<SysRoleDetail> {
    const role = await this.findEntityById(id);
    return this.toDetail(role);
  }

  async listPermissionOptions(): Promise<SysPermissionOption[]> {
    const permissions = await this.permissionRepo.find({
      order: { code: 'ASC' },
    });
    return permissions.map((item) => ({
      code: item.code,
      name: item.name,
    }));
  }

  async create(dto: CreateRoleDto): Promise<SysRoleDetail> {
    const existing = await this.roleRepo.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException('Role code already exists');
    }

    const dataScope =
      dto.customDeptIds?.length && dto.dataScope === undefined
        ? DATA_SCOPE_CUSTOM
        : (dto.dataScope ?? DATA_SCOPE_ALL);

    const role = this.roleRepo.create({
      name: dto.name,
      code: dto.code,
      status: dto.status ?? 1,
      sort: dto.sort ?? 0,
      dataScope,
    });
    const saved = await this.roleRepo.save(role);
    if (dto.customDeptIds !== undefined) {
      await this.saveCustomDepts(saved, dto.customDeptIds);
    }
    return this.toDetail(saved);
  }

  async update(id: string, dto: UpdateRoleDto): Promise<SysRoleDetail> {
    return this.permissionCache.mutate(async () => {
      const role = await this.findEntityById(id);

      if (dto.code !== undefined && dto.code !== role.code) {
        const existing = await this.roleRepo.findOne({ where: { code: dto.code } });
        if (existing) {
          throw new ConflictException('Role code already exists');
        }
        role.code = dto.code;
      }

      if (dto.name !== undefined) role.name = dto.name;
      if (dto.status !== undefined) role.status = dto.status;
      if (dto.sort !== undefined) role.sort = dto.sort;

      if (dto.dataScope !== undefined || dto.customDeptIds !== undefined) {
        this.assertDataScopeEditable(role);
        if (dto.dataScope !== undefined) {
          role.dataScope = dto.dataScope;
        }
        if (dto.customDeptIds !== undefined) {
          await this.saveCustomDepts(role, dto.customDeptIds);
        } else if (dto.dataScope !== undefined && dto.dataScope !== DATA_SCOPE_CUSTOM) {
          await this.roleDeptRepo.delete({ roleId: role.id });
        }
      }

      const saved = await this.roleRepo.save(role);
      return this.toDetail(saved);
    });
  }

  async assignPermissions(id: string, dto: AssignRolePermissionsDto): Promise<SysRoleDetail> {
    return this.permissionCache.mutate(async () => {
      const role = await this.findEntityById(id);

      const permissions = await this.permissionRepo.find({
        where: { code: In(dto.permissionCodes) },
      });

      if (permissions.length !== dto.permissionCodes.length) {
        throw new BadRequestException('One or more permissions not found');
      }

      await this.rolePermissionRepo.delete({ roleId: role.id });

      for (const permission of permissions) {
        await this.rolePermissionRepo.save(
          this.rolePermissionRepo.create({
            roleId: role.id,
            permissionId: permission.id,
          }),
        );
      }

      return this.toDetail(role);
    });
  }

  async remove(id: string): Promise<{ success: true }> {
    return this.permissionCache.mutate(async () => {
      const role = await this.findEntityById(id);

      if (role.code === SUPER_ADMIN_ROLE_CODE) {
        throw new BadRequestException('Cannot delete super_admin role');
      }

      await this.rolePermissionRepo.delete({ roleId: role.id });
      await this.roleDeptRepo.delete({ roleId: role.id });
      await this.roleRepo.remove(role);
      return { success: true };
    });
  }

  private async findEntityById(id: string): Promise<SysRoleEntity> {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  private toListItem(role: SysRoleEntity): SysRoleListItem {
    return {
      id: toApiId(role.id),
      name: role.name,
      code: role.code,
      status: role.status as 0 | 1,
      sort: role.sort,
      dataScope: (role.dataScope ?? DATA_SCOPE_ALL) as DataScope,
    };
  }

  private async loadCustomDeptIds(roleId: string): Promise<string[]> {
    const links = await this.roleDeptRepo.find({ where: { roleId } });
    return links.map((link) => toApiId(link.deptId));
  }

  private async loadPermissionCodes(roleId: string): Promise<string[]> {
    const links = await this.rolePermissionRepo.find({ where: { roleId } });
    if (!links.length) {
      return [];
    }

    const permissionIds = links.map((link) => link.permissionId);
    const permissions = await this.permissionRepo.find({
      where: { id: In(permissionIds) },
    });
    return permissions.map((p) => p.code);
  }

  private assertDataScopeEditable(role: SysRoleEntity): void {
    if (role.code === SUPER_ADMIN_ROLE_CODE) {
      throw new BadRequestException('Cannot change data scope for super_admin');
    }
  }

  private async saveCustomDepts(role: SysRoleEntity, deptIds: string[]): Promise<void> {
    if (role.dataScope !== DATA_SCOPE_CUSTOM && deptIds.length > 0) {
      throw new BadRequestException('customDeptIds requires dataScope CUSTOM');
    }
    await this.roleDeptRepo.delete({ roleId: role.id });
    for (const deptId of deptIds) {
      await this.roleDeptRepo.save(this.roleDeptRepo.create({ roleId: role.id, deptId }));
    }
  }

  private async toDetail(role: SysRoleEntity): Promise<SysRoleDetail> {
    const permissionCodes = await this.loadPermissionCodes(role.id);
    const customDeptIds = await this.loadCustomDeptIds(role.id);
    return {
      ...this.toListItem(role),
      permissionCodes,
      customDeptIds,
    };
  }
}
