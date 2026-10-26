import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { PaginationResult, SysMenuListItem } from '@nova/shared-types';
import { Repository } from 'typeorm';
import { SysMenuEntity } from '../../../database/entities';
import { toApiId } from '../../../common/utils/to-api-id';
import { CreateMenuDto } from './dto/create-menu.dto';
import { ListMenusDto } from './dto/list-menus.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(SysMenuEntity)
    private readonly menuRepo: Repository<SysMenuEntity>,
  ) {}

  async list(query: ListMenusDto): Promise<PaginationResult<SysMenuListItem>> {
    const { page = 1, pageSize = 10, keyword } = query;
    const qb = this.menuRepo.createQueryBuilder('m').orderBy('m.sort', 'ASC');

    if (keyword?.trim()) {
      qb.andWhere('(m.name LIKE :kw OR m.path LIKE :kw)', {
        kw: `%${keyword.trim()}%`,
      });
    }

    const [menus, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      list: menus.map((menu) => this.toListItem(menu)),
      total,
      page,
      pageSize,
    };
  }

  async create(dto: CreateMenuDto): Promise<SysMenuListItem> {
    const menu = this.menuRepo.create({
      parentId: dto.parentId ?? '0',
      name: dto.name,
      path: dto.path ?? null,
      component: dto.component ?? null,
      icon: dto.icon ?? null,
      type: dto.type,
      permissionCode: dto.permissionCode ?? null,
      sort: dto.sort ?? 0,
      visible: dto.visible ?? 1,
      status: dto.status ?? 1,
    });
    const saved = await this.menuRepo.save(menu);
    return this.toListItem(saved);
  }

  async update(id: string, dto: UpdateMenuDto): Promise<SysMenuListItem> {
    const menu = await this.findEntityById(id);

    if (dto.parentId !== undefined) menu.parentId = dto.parentId;
    if (dto.name !== undefined) menu.name = dto.name;
    if (dto.path !== undefined) menu.path = dto.path;
    if (dto.component !== undefined) menu.component = dto.component;
    if (dto.icon !== undefined) menu.icon = dto.icon;
    if (dto.type !== undefined) menu.type = dto.type;
    if (dto.permissionCode !== undefined) menu.permissionCode = dto.permissionCode;
    if (dto.sort !== undefined) menu.sort = dto.sort;
    if (dto.visible !== undefined) menu.visible = dto.visible;
    if (dto.status !== undefined) menu.status = dto.status;

    const saved = await this.menuRepo.save(menu);
    return this.toListItem(saved);
  }

  async remove(id: string): Promise<{ success: true }> {
    const menu = await this.findEntityById(id);

    const childCount = await this.menuRepo.count({
      where: { parentId: menu.id },
    });
    if (childCount > 0) {
      throw new BadRequestException('Cannot delete menu with children');
    }

    await this.menuRepo.remove(menu);
    return { success: true };
  }

  private async findEntityById(id: string): Promise<SysMenuEntity> {
    const menu = await this.menuRepo.findOne({ where: { id } });
    if (!menu) {
      throw new NotFoundException('Menu not found');
    }
    return menu;
  }

  private toListItem(menu: SysMenuEntity): SysMenuListItem {
    return {
      id: toApiId(menu.id),
      parentId: toApiId(menu.parentId),
      name: menu.name,
      path: menu.path ?? '',
      component: menu.component ?? '',
      icon: menu.icon ?? '',
      type: menu.type as SysMenuListItem['type'],
      permissionCode: menu.permissionCode ?? '',
      sort: menu.sort,
      visible: menu.visible as 0 | 1,
      status: menu.status as 0 | 1,
    };
  }
}
