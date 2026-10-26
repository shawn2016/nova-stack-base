import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  DeptListItem,
  DeptSettings,
  DeptTreeNode,
  PaginationResult,
  UpdateDeptSettingsDto,
} from '@nova/shared-types';
import { In, Repository } from 'typeorm';
import { SysConfigEntity, SysDeptEntity, SysUserEntity } from '../../database/entities';
import { toApiId } from '../../common/utils/to-api-id';
import { DataScopeService } from '../data-scope/data-scope.service';
import { CreateDeptDto } from './dto/create-dept.dto';
import { ListDeptsDto } from './dto/list-depts.dto';
import { UpdateDeptDto } from './dto/update-dept.dto';

const MODULE_ENABLED_KEY = 'dept.module.enabled';
const USER_BINDING_ENABLED_KEY = 'dept.user_binding.enabled';
const DEPT_CONFIG_GROUP = 'dept';

const DEFAULT_DEPT_SETTINGS: DeptSettings = {
  moduleEnabled: true,
  userBindingEnabled: true,
};

@Injectable()
export class DeptService {
  constructor(
    @InjectRepository(SysDeptEntity)
    private readonly deptRepo: Repository<SysDeptEntity>,
    @InjectRepository(SysConfigEntity)
    private readonly configRepo: Repository<SysConfigEntity>,
    @InjectRepository(SysUserEntity)
    private readonly userRepo: Repository<SysUserEntity>,
    @Inject(forwardRef(() => DataScopeService))
    private readonly dataScopeService: DataScopeService,
  ) {}

  async tree(enabledOnly = true, currentUserId?: string): Promise<DeptTreeNode[]> {
    const where = enabledOnly ? { status: 1 } : {};
    const depts = await this.deptRepo.find({
      where,
      order: { sort: 'ASC', id: 'ASC' },
    });

    if (!currentUserId) {
      return this.buildTree(depts.map((dept) => this.toListItem(dept)));
    }

    const filter = await this.dataScopeService.resolveForUser(currentUserId);
    const user = await this.userRepo.findOne({ where: { id: currentUserId } });
    const userDeptId = user?.deptId ? toApiId(user.deptId) : null;
    const allowedDeptIds = this.dataScopeService.resolveDeptIdsForDeptApi(filter, userDeptId);

    if (allowedDeptIds === null) {
      return this.buildTree(depts.map((dept) => this.toListItem(dept)));
    }

    const expandedIds = new Set(
      this.dataScopeService.expandDeptIdsWithAncestors(allowedDeptIds, depts),
    );
    const scoped = depts.filter((dept) => expandedIds.has(toApiId(dept.id)));
    return this.buildTree(scoped.map((dept) => this.toListItem(dept)));
  }

  async list(query: ListDeptsDto, currentUserId?: string): Promise<PaginationResult<DeptListItem>> {
    const { page = 1, pageSize = 10, keyword, status, parentId } = query;
    const qb = this.deptRepo
      .createQueryBuilder('d')
      .orderBy('d.sort', 'ASC')
      .addOrderBy('d.id', 'ASC');

    if (keyword?.trim()) {
      qb.andWhere('(d.name LIKE :kw OR d.leader LIKE :kw)', {
        kw: `%${keyword.trim()}%`,
      });
    }
    if (status !== undefined) {
      qb.andWhere('d.status = :status', { status });
    }
    if (parentId !== undefined) {
      qb.andWhere('d.parent_id = :parentId', { parentId });
    }

    if (currentUserId) {
      const filter = await this.dataScopeService.resolveForUser(currentUserId);
      const user = await this.userRepo.findOne({ where: { id: currentUserId } });
      const userDeptId = user?.deptId ? toApiId(user.deptId) : null;
      this.dataScopeService.applyDeptFilter(qb, 'd', filter, userDeptId);
    }

    const [rows, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      list: rows.map((row) => this.toListItem(row)),
      total,
      page,
      pageSize,
    };
  }

  async findById(id: string): Promise<DeptListItem> {
    return this.toListItem(await this.findEntityById(id));
  }

  async create(dto: CreateDeptDto): Promise<DeptListItem> {
    await this.assertModuleEnabled();
    await this.resolveParent(dto.parentId);

    const dept = this.deptRepo.create({
      parentId: dto.parentId,
      name: dto.name,
      sort: dto.sort ?? 0,
      leader: dto.leader ?? null,
      phone: dto.phone ?? null,
      status: dto.status ?? 1,
    });
    const saved = await this.deptRepo.save(dept);
    return this.toListItem(saved);
  }

  async update(id: string, dto: UpdateDeptDto): Promise<DeptListItem> {
    await this.assertModuleEnabled();
    const dept = await this.findEntityById(id);

    if (dto.parentId !== undefined && dto.parentId !== dept.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('Department cannot be its own parent');
      }
      await this.resolveParent(dto.parentId);
      dept.parentId = dto.parentId;
    }
    if (dto.name !== undefined) dept.name = dto.name;
    if (dto.sort !== undefined) dept.sort = dto.sort;
    if (dto.leader !== undefined) dept.leader = dto.leader ?? null;
    if (dto.phone !== undefined) dept.phone = dto.phone ?? null;
    if (dto.status !== undefined) dept.status = dto.status;

    const saved = await this.deptRepo.save(dept);
    return this.toListItem(saved);
  }

  async updateStatus(id: string, status: 0 | 1): Promise<DeptListItem> {
    await this.assertModuleEnabled();
    const dept = await this.findEntityById(id);
    dept.status = status;
    const saved = await this.deptRepo.save(dept);
    return this.toListItem(saved);
  }

  async remove(id: string): Promise<{ success: true }> {
    await this.assertModuleEnabled();
    const dept = await this.findEntityById(id);

    const childCount = await this.deptRepo.count({
      where: { parentId: dept.id },
    });
    if (childCount > 0) {
      throw new BadRequestException('Cannot delete department with children');
    }

    const userCount = await this.userRepo.count({ where: { deptId: dept.id } });
    if (userCount > 0) {
      throw new BadRequestException('Cannot delete department with users');
    }

    await this.deptRepo.remove(dept);
    return { success: true };
  }

  async getSettings(): Promise<DeptSettings> {
    return this.readSettings();
  }

  async updateSettings(dto: UpdateDeptSettingsDto): Promise<DeptSettings> {
    if (dto.moduleEnabled !== undefined) {
      await this.upsertConfig(
        MODULE_ENABLED_KEY,
        '部门模块总开关',
        dto.moduleEnabled ? 'true' : 'false',
      );
    }
    if (dto.userBindingEnabled !== undefined) {
      await this.upsertConfig(
        USER_BINDING_ENABLED_KEY,
        '用户部门绑定开关',
        dto.userBindingEnabled ? 'true' : 'false',
      );
    }
    return this.readSettings();
  }

  async assertUserDeptBindingAllowed(): Promise<void> {
    const settings = await this.readSettings();
    if (!settings.userBindingEnabled) {
      throw new BadRequestException('User department binding is disabled');
    }
  }

  async resolveActiveDeptId(deptId: string | null | undefined): Promise<string | null> {
    if (deptId === undefined || deptId === null || deptId === '') {
      return null;
    }

    await this.assertUserDeptBindingAllowed();
    const dept = await this.findEntityById(deptId);
    if (dept.status !== 1) {
      throw new BadRequestException('Department is disabled');
    }
    return dept.id;
  }

  async getDeptNameMap(ids: string[]): Promise<Map<string, string>> {
    if (!ids.length) return new Map();
    const depts = await this.deptRepo.find({ where: { id: In(ids) } });
    return new Map(depts.map((dept) => [toApiId(dept.id), dept.name]));
  }

  async collectDescendantIds(rootId: string): Promise<string[]> {
    const depts = await this.deptRepo.find({ where: { status: 1 } });
    const ids = new Set<string>([rootId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const dept of depts) {
        if (ids.has(dept.parentId) && !ids.has(dept.id)) {
          ids.add(dept.id);
          changed = true;
        }
      }
    }
    return [...ids].map((id) => toApiId(id));
  }

  private async assertModuleEnabled(): Promise<void> {
    const settings = await this.readSettings();
    if (!settings.moduleEnabled) {
      throw new ForbiddenException('Department module is disabled');
    }
  }

  private async readSettings(): Promise<DeptSettings> {
    const configs = await this.configRepo.find({
      where: [{ configKey: MODULE_ENABLED_KEY }, { configKey: USER_BINDING_ENABLED_KEY }],
    });
    const map = new Map(configs.map((item) => [item.configKey, item.configValue]));

    return {
      moduleEnabled: map.get(MODULE_ENABLED_KEY) !== 'false',
      userBindingEnabled: map.get(USER_BINDING_ENABLED_KEY) !== 'false',
    };
  }

  private async upsertConfig(
    configKey: string,
    configName: string,
    configValue: string,
  ): Promise<void> {
    let config = await this.configRepo.findOne({ where: { configKey } });
    if (!config) {
      config = this.configRepo.create({
        configKey,
        configName,
        configValue,
        configGroup: DEPT_CONFIG_GROUP,
        remark: null,
      });
    } else {
      config.configName = configName;
      config.configValue = configValue;
      config.configGroup = DEPT_CONFIG_GROUP;
    }
    await this.configRepo.save(config);
  }

  private buildTree(items: DeptListItem[]): DeptTreeNode[] {
    const map = new Map<string, DeptTreeNode>();
    const roots: DeptTreeNode[] = [];

    for (const item of items) {
      map.set(item.id, { ...item, children: [] });
    }

    for (const node of map.values()) {
      const parentId = node.parentId;
      if (!parentId || parentId === '0') {
        roots.push(node);
        continue;
      }
      const parent = map.get(parentId);
      if (parent) {
        parent.children!.push(node);
      } else {
        roots.push(node);
      }
    }

    const stripEmpty = (nodes: DeptTreeNode[]): DeptTreeNode[] =>
      nodes.map(({ children, ...rest }) => ({
        ...rest,
        ...(children?.length ? { children: stripEmpty(children) } : {}),
      }));

    return stripEmpty(roots);
  }

  private async resolveParent(parentId: string): Promise<SysDeptEntity | null> {
    if (parentId === '0') return null;
    return this.findEntityById(parentId);
  }

  private async findEntityById(id: string): Promise<SysDeptEntity> {
    const dept = await this.deptRepo.findOne({ where: { id } });
    if (!dept) {
      throw new NotFoundException('Department not found');
    }
    return dept;
  }

  private toListItem(dept: SysDeptEntity): DeptListItem {
    return {
      id: toApiId(dept.id),
      parentId: toApiId(dept.parentId),
      name: dept.name,
      sort: dept.sort,
      leader: dept.leader,
      phone: dept.phone,
      status: dept.status as 0 | 1,
      createdAt: dept.createdAt.toISOString(),
    };
  }
}

export { DEFAULT_DEPT_SETTINGS, MODULE_ENABLED_KEY, USER_BINDING_ENABLED_KEY };
