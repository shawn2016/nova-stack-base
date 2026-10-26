import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { DictTypeListItem, PaginationResult } from '@nova/shared-types';
import { Repository } from 'typeorm';
import { SysDictDataEntity, SysDictTypeEntity } from '../../database/entities';
import { CreateDictTypeDto } from './dto/create-dict-type.dto';
import { ListDictTypesDto } from './dto/list-dict-types.dto';
import { UpdateDictTypeDto } from './dto/update-dict-type.dto';

@Injectable()
export class DictTypeService {
  constructor(
    @InjectRepository(SysDictTypeEntity)
    private readonly typeRepo: Repository<SysDictTypeEntity>,
    @InjectRepository(SysDictDataEntity)
    private readonly dataRepo: Repository<SysDictDataEntity>,
  ) {}

  async list(query: ListDictTypesDto): Promise<PaginationResult<DictTypeListItem>> {
    const { page, pageSize, keyword } = query;
    const qb = this.typeRepo.createQueryBuilder('type').orderBy('type.createdAt', 'DESC');

    if (keyword) {
      qb.andWhere('(type.name LIKE :keyword OR type.code LIKE :keyword)', {
        keyword: `%${keyword}%`,
      });
    }

    const [items, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      list: items.map((item) => this.toListItem(item)),
      total,
      page,
      pageSize,
    };
  }

  async create(dto: CreateDictTypeDto): Promise<DictTypeListItem> {
    const existing = await this.typeRepo.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new BadRequestException('Dict type code already exists');
    }

    const entity = this.typeRepo.create({
      name: dto.name,
      code: dto.code,
      status: dto.status ?? 1,
      remark: dto.remark ?? null,
    });
    const saved = await this.typeRepo.save(entity);
    return this.toListItem(saved);
  }

  async update(id: string, dto: UpdateDictTypeDto): Promise<DictTypeListItem> {
    const entity = await this.findEntityById(id);

    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.status !== undefined) entity.status = dto.status;
    if (dto.remark !== undefined) entity.remark = dto.remark ?? null;

    const saved = await this.typeRepo.save(entity);
    return this.toListItem(saved);
  }

  async remove(id: string): Promise<{ success: true }> {
    const entity = await this.findEntityById(id);

    const dataCount = await this.dataRepo.count({
      where: { typeId: String(entity.id) },
    });
    if (dataCount > 0) {
      throw new BadRequestException('Dict type has data items');
    }

    await this.typeRepo.remove(entity);
    return { success: true };
  }

  async findEntityById(id: string): Promise<SysDictTypeEntity> {
    const entity = await this.typeRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException('Dict type not found');
    }
    return entity;
  }

  async findEntityByCode(code: string): Promise<SysDictTypeEntity> {
    const entity = await this.typeRepo.findOne({ where: { code } });
    if (!entity) {
      throw new NotFoundException('Dict type not found');
    }
    return entity;
  }

  private toListItem(entity: SysDictTypeEntity): DictTypeListItem {
    return {
      id: String(entity.id),
      name: entity.name,
      code: entity.code,
      status: entity.status,
      remark: entity.remark,
      createdAt: entity.createdAt.toISOString(),
    };
  }
}
