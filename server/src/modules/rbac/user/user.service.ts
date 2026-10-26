import { JwtService } from '../../../common/jwt/jwt.service';
import { PermissionCacheService } from '../../../common/jwt/permission-cache.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { PaginationResult, SysUserDetail, SysUserListItem } from '@nova/shared-types';
import * as bcrypt from 'bcrypt';
import { In, Repository } from 'typeorm';
import { SysRoleEntity, SysUserEntity, SysUserRoleEntity } from '../../../database/entities';
import { toApiId } from '../../../common/utils/to-api-id';
import { DeptService } from '../../dept/dept.service';
import { DataScopeService } from '../../data-scope/data-scope.service';
import { AssignUserRolesDto } from './dto/assign-user-roles.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly permissionCache: PermissionCacheService,
    @InjectRepository(SysUserEntity)
    private readonly userRepo: Repository<SysUserEntity>,
    @InjectRepository(SysUserRoleEntity)
    private readonly userRoleRepo: Repository<SysUserRoleEntity>,
    @InjectRepository(SysRoleEntity)
    private readonly roleRepo: Repository<SysRoleEntity>,
    private readonly deptService: DeptService,
    private readonly dataScopeService: DataScopeService,
  ) {}

  async list(
    query: ListUsersDto,
    currentUserId: string,
  ): Promise<PaginationResult<SysUserListItem>> {
    const { page = 1, pageSize = 10, keyword } = query;
    const qb = this.userRepo.createQueryBuilder('u').orderBy('u.id', 'ASC');

    if (keyword?.trim()) {
      qb.andWhere('(u.username LIKE :kw OR u.nickname LIKE :kw)', {
        kw: `%${keyword.trim()}%`,
      });
    }

    const filter = await this.dataScopeService.resolveForUser(currentUserId);
    this.dataScopeService.applyUserFilter(qb, 'u', filter);

    const [users, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    const list = await Promise.all(users.map((user) => this.toListItem(user)));

    return { list, total, page, pageSize };
  }

  async findById(id: string): Promise<SysUserDetail> {
    const user = await this.findEntityById(id);
    return this.toDetail(user);
  }

  async create(dto: CreateUserDto): Promise<SysUserDetail> {
    const existing = await this.userRepo.findOne({
      where: { username: dto.username },
    });
    if (existing) {
      throw new ConflictException('Username already exists');
    }

    const user = this.userRepo.create({
      username: dto.username,
      passwordHash: await bcrypt.hash(dto.password, 10),
      nickname: dto.nickname ?? dto.username,
      avatar: null,
      status: dto.status ?? 1,
      deptId:
        dto.deptId !== undefined ? await this.deptService.resolveActiveDeptId(dto.deptId) : null,
    });
    const saved = await this.userRepo.save(user);
    return this.toDetail(saved);
  }

  async update(id: string, dto: UpdateUserDto): Promise<SysUserDetail> {
    return this.permissionCache.mutate(async () => {
      const user = await this.findEntityById(id);

      if (dto.nickname !== undefined) user.nickname = dto.nickname;
      if (dto.status !== undefined) user.status = dto.status;
      if (dto.deptId !== undefined) {
        user.deptId = await this.deptService.resolveActiveDeptId(dto.deptId);
      }

      const saved = await this.userRepo.save(user);
      if (saved.status !== 1) await this.jwtService.revokeAccountSessions('admin', String(id));
      return this.toDetail(saved);
    });
  }

  async assignRoles(id: string, dto: AssignUserRolesDto): Promise<SysUserDetail> {
    return this.permissionCache.mutate(async () => {
      await this.findEntityById(id);

      const roleIds = dto.roleIds.map(String);
      if (roleIds.length > 0) {
        const roles = await this.roleRepo.find({ where: { id: In(roleIds) } });
        if (roles.length !== roleIds.length) {
          throw new BadRequestException('One or more roles not found');
        }
      }

      await this.userRoleRepo.delete({ userId: id });

      for (const roleId of roleIds) {
        await this.userRoleRepo.save(this.userRoleRepo.create({ userId: id, roleId }));
      }

      const user = await this.findEntityById(id);
      return this.toDetail(user);
    });
  }

  async remove(id: string, currentUserId: string): Promise<{ success: true }> {
    return this.permissionCache.mutate(async () => {
      if (String(id) === String(currentUserId)) {
        throw new BadRequestException('Cannot delete current login user');
      }

      const user = await this.findEntityById(id);
      await this.userRoleRepo.delete({ userId: id });
      await this.jwtService.revokeAccountSessions('admin', String(id));
      await this.userRepo.remove(user);
      return { success: true };
    });
  }

  private async findEntityById(id: string): Promise<SysUserEntity> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private async loadRoleInfo(userId: string): Promise<{
    roleIds: string[];
    roleCodes: string[];
  }> {
    const links = await this.userRoleRepo.find({ where: { userId } });
    if (!links.length) {
      return { roleIds: [], roleCodes: [] };
    }

    const roleIds = links.map((link) => link.roleId);
    const roles = await this.roleRepo.find({ where: { id: In(roleIds) } });
    return {
      roleIds: roles.map((role) => toApiId(role.id)),
      roleCodes: roles.map((role) => role.code),
    };
  }

  private async toListItem(user: SysUserEntity): Promise<SysUserListItem> {
    const { roleIds, roleCodes } = await this.loadRoleInfo(user.id);
    const deptNameMap = user.deptId
      ? await this.deptService.getDeptNameMap([user.deptId])
      : new Map<string, string>();
    return {
      id: toApiId(user.id),
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar ?? '',
      status: user.status as 0 | 1,
      deptId: user.deptId ? toApiId(user.deptId) : null,
      deptName: user.deptId ? (deptNameMap.get(toApiId(user.deptId)) ?? null) : null,
      roleIds,
      roleCodes,
    };
  }

  private async toDetail(user: SysUserEntity): Promise<SysUserDetail> {
    const listItem = await this.toListItem(user);
    return {
      ...listItem,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
