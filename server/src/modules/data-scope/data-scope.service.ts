import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DATA_SCOPE_ALL,
  DATA_SCOPE_CUSTOM,
  DATA_SCOPE_DEPT,
  DATA_SCOPE_DEPT_AND_CHILD,
  DATA_SCOPE_SELF,
  type DataScopeFilter,
} from '@nova/shared-types';
import { In, ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import {
  SysConfigEntity,
  SysDeptEntity,
  SysRoleDeptEntity,
  SysRoleEntity,
  SysUserEntity,
  SysUserRoleEntity,
} from '../../database/entities';
import { toApiId } from '../../common/utils/to-api-id';
import { DeptService } from '../dept/dept.service';

const MODULE_ENABLED_KEY = 'data_scope.module.enabled';
const SUPER_ADMIN_ROLE_CODE = 'super_admin';

@Injectable()
export class DataScopeService {
  constructor(
    @InjectRepository(SysUserEntity)
    private readonly userRepo: Repository<SysUserEntity>,
    @InjectRepository(SysUserRoleEntity)
    private readonly userRoleRepo: Repository<SysUserRoleEntity>,
    @InjectRepository(SysRoleEntity)
    private readonly roleRepo: Repository<SysRoleEntity>,
    @InjectRepository(SysRoleDeptEntity)
    private readonly roleDeptRepo: Repository<SysRoleDeptEntity>,
    @InjectRepository(SysConfigEntity)
    private readonly configRepo: Repository<SysConfigEntity>,
    @Inject(forwardRef(() => DeptService))
    private readonly deptService: DeptService,
  ) {}

  async resolveForUser(userId: string): Promise<DataScopeFilter> {
    if (!(await this.isModuleEnabled())) {
      return { type: 'all' };
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      return { type: 'none' };
    }

    const links = await this.userRoleRepo.find({ where: { userId } });
    if (!links.length) {
      return { type: 'self', userId: toApiId(userId) };
    }

    const roleIds = links.map((link) => link.roleId);
    const roles = await this.roleRepo.find({
      where: { id: In(roleIds), status: 1 },
    });

    if (roles.some((role) => role.code === SUPER_ADMIN_ROLE_CODE)) {
      return { type: 'all' };
    }

    const deptIdSet = new Set<string>();
    let includeSelf = false;

    for (const role of roles) {
      const scope = role.dataScope ?? DATA_SCOPE_ALL;
      if (scope === DATA_SCOPE_ALL) {
        return { type: 'all' };
      }
      if (scope === DATA_SCOPE_SELF) {
        includeSelf = true;
        continue;
      }
      if (scope === DATA_SCOPE_DEPT) {
        if (user.deptId) {
          deptIdSet.add(toApiId(user.deptId));
        }
        continue;
      }
      if (scope === DATA_SCOPE_DEPT_AND_CHILD) {
        if (user.deptId) {
          const ids = await this.deptService.collectDescendantIds(user.deptId);
          ids.forEach((id) => deptIdSet.add(id));
        }
        continue;
      }
      if (scope === DATA_SCOPE_CUSTOM) {
        const roleDepts = await this.roleDeptRepo.find({
          where: { roleId: role.id },
        });
        roleDepts.forEach((item) => deptIdSet.add(toApiId(item.deptId)));
      }
    }

    if (deptIdSet.size > 0) {
      return { type: 'depts', deptIds: [...deptIdSet] };
    }
    if (includeSelf) {
      return { type: 'self', userId: toApiId(userId) };
    }
    return { type: 'none' };
  }

  applyUserFilter(
    qb: SelectQueryBuilder<SysUserEntity>,
    alias: string,
    filter: DataScopeFilter,
  ): void {
    if (filter.type === 'all') {
      return;
    }
    if (filter.type === 'none') {
      qb.andWhere('1 = 0');
      return;
    }
    if (filter.type === 'self') {
      qb.andWhere(`${alias}.id = :scopeUserId`, { scopeUserId: filter.userId });
      return;
    }
    if (filter.deptIds.length === 0) {
      qb.andWhere('1 = 0');
      return;
    }
    qb.andWhere(`${alias}.dept_id IN (:...scopeDeptIds)`, {
      scopeDeptIds: filter.deptIds,
    });
  }

  /** Returns null when all depts are visible; otherwise allowed dept id list. */
  resolveDeptIdsForDeptApi(filter: DataScopeFilter, userDeptId: string | null): string[] | null {
    if (filter.type === 'all') {
      return null;
    }
    if (filter.type === 'none') {
      return [];
    }
    if (filter.type === 'self') {
      return userDeptId ? [userDeptId] : [];
    }
    return filter.deptIds;
  }

  expandDeptIdsWithAncestors(
    deptIds: string[],
    depts: Pick<SysDeptEntity, 'id' | 'parentId'>[],
  ): string[] {
    if (!deptIds.length) {
      return [];
    }
    const parentById = new Map(depts.map((dept) => [toApiId(dept.id), toApiId(dept.parentId)]));
    const expanded = new Set(deptIds);
    for (const deptId of deptIds) {
      let current = deptId;
      while (current && current !== '0') {
        const parentId = parentById.get(current);
        if (!parentId || parentId === '0') {
          break;
        }
        expanded.add(parentId);
        current = parentId;
      }
    }
    return [...expanded];
  }

  applyDeptFilter(
    qb: SelectQueryBuilder<SysDeptEntity>,
    alias: string,
    filter: DataScopeFilter,
    userDeptId: string | null,
  ): void {
    if (filter.type === 'all') {
      return;
    }
    if (filter.type === 'none') {
      qb.andWhere('1 = 0');
      return;
    }
    if (filter.type === 'self') {
      if (!userDeptId) {
        qb.andWhere('1 = 0');
        return;
      }
      qb.andWhere(`${alias}.id = :scopeDeptId`, { scopeDeptId: userDeptId });
      return;
    }
    if (filter.deptIds.length === 0) {
      qb.andWhere('1 = 0');
      return;
    }
    qb.andWhere(`${alias}.id IN (:...scopeDeptIds)`, {
      scopeDeptIds: filter.deptIds,
    });
  }

  applyAuditLogFilter(
    qb: SelectQueryBuilder<ObjectLiteral>,
    alias: string,
    filter: DataScopeFilter,
    context: { userId: string; username: string },
  ): void {
    if (filter.type === 'all') {
      return;
    }
    if (filter.type === 'none') {
      qb.andWhere('1 = 0');
      return;
    }
    if (filter.type === 'self') {
      qb.andWhere(
        `(${alias}.user_id = :scopeUserId OR (${alias}.user_id IS NULL AND ${alias}.username = :scopeUsername))`,
        { scopeUserId: context.userId, scopeUsername: context.username },
      );
      return;
    }
    if (filter.deptIds.length === 0) {
      qb.andWhere('1 = 0');
      return;
    }
    qb.andWhere(
      `EXISTS (SELECT 1 FROM sys_user u WHERE u.id = ${alias}.user_id AND u.dept_id IN (:...scopeDeptIds))`,
      { scopeDeptIds: filter.deptIds },
    );
  }

  async filterSessionsByScope<T extends { userId: string }>(
    sessions: T[],
    filter: DataScopeFilter,
  ): Promise<T[]> {
    if (filter.type === 'all') {
      return sessions;
    }
    if (filter.type === 'none') {
      return [];
    }
    if (filter.type === 'self') {
      return sessions.filter((session) => session.userId === filter.userId);
    }
    if (filter.deptIds.length === 0) {
      return [];
    }
    const userIds = [...new Set(sessions.map((session) => session.userId))];
    if (!userIds.length) {
      return [];
    }
    const users = await this.userRepo.find({
      where: { id: In(userIds) },
      select: ['id', 'deptId'],
    });
    const allowedDeptIds = new Set(filter.deptIds);
    const allowedUserIds = new Set(
      users
        .filter((user) => user.deptId && allowedDeptIds.has(toApiId(user.deptId)))
        .map((user) => toApiId(user.id)),
    );
    return sessions.filter((session) => allowedUserIds.has(session.userId));
  }

  private async isModuleEnabled(): Promise<boolean> {
    const config = await this.configRepo.findOne({
      where: { configKey: MODULE_ENABLED_KEY },
    });
    return config?.configValue !== 'false';
  }
}

export { MODULE_ENABLED_KEY, SUPER_ADMIN_ROLE_CODE as DATA_SCOPE_SUPER_ADMIN_CODE };
