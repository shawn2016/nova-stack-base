import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { PaginationResult, RegionListItem, RegionTreeNode } from '@nova/shared-types';
import { Repository } from 'typeorm';
import { SysRegionEntity } from '../../database/entities';
import { toApiId } from '../../common/utils/to-api-id';
import { CreateRegionDto } from './dto/create-region.dto';
import { ListRegionsDto } from './dto/list-regions.dto';
import { UpdateRegionDto } from './dto/update-region.dto';

@Injectable()
export class RegionService {
  constructor(
    @InjectRepository(SysRegionEntity)
    private readonly regionRepo: Repository<SysRegionEntity>,
  ) {}

  async tree(): Promise<RegionTreeNode[]> {
    const regions = await this.regionRepo.find({
      where: { status: 1 },
      order: { sort: 'ASC', id: 'ASC' },
    });
    return this.buildTree(regions.map((r) => this.toListItem(r)));
  }

  async list(query: ListRegionsDto): Promise<PaginationResult<RegionListItem>> {
    const { page = 1, pageSize = 10, keyword, level, parentId } = query;
    const qb = this.regionRepo
      .createQueryBuilder('r')
      .orderBy('r.level', 'ASC')
      .addOrderBy('r.sort', 'ASC')
      .addOrderBy('r.id', 'ASC');

    if (keyword?.trim()) {
      qb.andWhere('(r.name LIKE :kw OR r.code LIKE :kw)', {
        kw: `%${keyword.trim()}%`,
      });
    }
    if (level !== undefined) {
      qb.andWhere('r.level = :level', { level });
    }
    if (parentId !== undefined) {
      qb.andWhere('r.parent_id = :parentId', { parentId });
    }

    const [rows, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      list: rows.map((r) => this.toListItem(r)),
      total,
      page,
      pageSize,
    };
  }

  async findById(id: string): Promise<RegionListItem> {
    return this.toListItem(await this.findEntityById(id));
  }

  async create(dto: CreateRegionDto): Promise<RegionListItem> {
    await this.ensureCodeUnique(dto.code);
    const parent = await this.resolveParent(dto.parentId);
    const level = dto.level ?? (parent ? parent.level + 1 : 1);
    if (level < 1 || level > 3) {
      throw new BadRequestException('Invalid region level');
    }
    if (parent && parent.level + 1 !== level) {
      throw new BadRequestException('Region level does not match parent');
    }

    const region = this.regionRepo.create({
      parentId: dto.parentId,
      name: dto.name,
      code: dto.code,
      level,
      sort: dto.sort ?? 0,
      status: dto.status ?? 1,
    });
    const saved = await this.regionRepo.save(region);
    return this.toListItem(saved);
  }

  async update(id: string, dto: UpdateRegionDto): Promise<RegionListItem> {
    const region = await this.findEntityById(id);

    if (dto.code !== undefined && dto.code !== region.code) {
      await this.ensureCodeUnique(dto.code, id);
      region.code = dto.code;
    }
    if (dto.parentId !== undefined && dto.parentId !== region.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('Region cannot be its own parent');
      }
      await this.resolveParent(dto.parentId);
      region.parentId = dto.parentId;
    }
    if (dto.name !== undefined) region.name = dto.name;
    if (dto.sort !== undefined) region.sort = dto.sort;
    if (dto.status !== undefined) region.status = dto.status;

    const saved = await this.regionRepo.save(region);
    return this.toListItem(saved);
  }

  async remove(id: string): Promise<{ success: true }> {
    const region = await this.findEntityById(id);
    const childCount = await this.regionRepo.count({
      where: { parentId: region.id },
    });
    if (childCount > 0) {
      throw new BadRequestException('Cannot delete region with children');
    }
    await this.regionRepo.remove(region);
    return { success: true };
  }

  private buildTree(items: RegionListItem[]): RegionTreeNode[] {
    const map = new Map<string, RegionTreeNode>();
    const roots: RegionTreeNode[] = [];

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

    const stripEmpty = (nodes: RegionTreeNode[]): RegionTreeNode[] =>
      nodes.map(({ children, ...rest }) => ({
        ...rest,
        ...(children?.length ? { children: stripEmpty(children) } : {}),
      }));

    return stripEmpty(roots);
  }

  private async ensureCodeUnique(code: string, excludeId?: string) {
    const existing = await this.regionRepo.findOne({ where: { code } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('Region code already exists');
    }
  }

  private async resolveParent(parentId: string): Promise<SysRegionEntity | null> {
    if (parentId === '0') return null;
    return this.findEntityById(parentId);
  }

  private async findEntityById(id: string): Promise<SysRegionEntity> {
    const region = await this.regionRepo.findOne({ where: { id } });
    if (!region) {
      throw new NotFoundException('Region not found');
    }
    return region;
  }

  private toListItem(region: SysRegionEntity): RegionListItem {
    return {
      id: toApiId(region.id),
      parentId: toApiId(region.parentId),
      name: region.name,
      code: region.code,
      level: region.level as 1 | 2 | 3,
      sort: region.sort,
      status: region.status as 0 | 1,
    };
  }
}
