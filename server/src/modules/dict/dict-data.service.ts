import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { DictDataListItem, DictOption, PaginationResult } from '@nova/shared-types';
import { Repository, In } from 'typeorm';
import { SysDictDataEntity, SysDictTypeEntity } from '../../database/entities';
import { CreateDictDataDto } from './dto/create-dict-data.dto';
import { ListDictDataDto } from './dto/list-dict-data.dto';
import { UpdateDictDataDto } from './dto/update-dict-data.dto';
import { DictTypeService } from './dict-type.service';

@Injectable()
export class DictDataService {
  constructor(
    @InjectRepository(SysDictDataEntity)
    private readonly dataRepo: Repository<SysDictDataEntity>,
    @InjectRepository(SysDictTypeEntity)
    private readonly typeRepo: Repository<SysDictTypeEntity>,
    private readonly dictTypeService: DictTypeService,
  ) {}

  async list(query: ListDictDataDto): Promise<PaginationResult<DictDataListItem>> {
    const { page, pageSize, keyword, typeId, typeCode } = query;

    let resolvedTypeId = typeId;
    if (typeCode) {
      const type = await this.typeRepo.findOne({ where: { code: typeCode } });
      if (!type) {
        return { list: [], total: 0, page, pageSize };
      }
      resolvedTypeId = type.id;
    }

    const qb = this.dataRepo
      .createQueryBuilder('data')
      .orderBy('data.sort', 'ASC')
      .addOrderBy('data.id', 'ASC');

    if (resolvedTypeId) {
      qb.andWhere('data.typeId = :typeId', { typeId: resolvedTypeId });
    }

    if (keyword) {
      qb.andWhere('(data.label LIKE :keyword OR data.value LIKE :keyword)', {
        keyword: `%${keyword}%`,
      });
    }

    const [items, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const typeIds = [...new Set(items.map((item) => item.typeId))];
    const types = typeIds.length ? await this.typeRepo.find({ where: { id: In(typeIds) } }) : [];
    const typeCodeMap = new Map(types.map((type) => [type.id, type.code]));

    return {
      list: items.map((item) => this.toListItem(item, typeCodeMap.get(item.typeId))),
      total,
      page,
      pageSize,
    };
  }

  async create(dto: CreateDictDataDto): Promise<DictDataListItem> {
    await this.dictTypeService.findEntityById(dto.typeId);

    const existing = await this.dataRepo.findOne({
      where: { typeId: dto.typeId, value: dto.value },
    });
    if (existing) {
      throw new BadRequestException('Dict data value already exists for this type');
    }

    const entity = this.dataRepo.create({
      typeId: dto.typeId,
      label: dto.label,
      value: dto.value,
      sort: dto.sort ?? 0,
      status: dto.status ?? 1,
      remark: dto.remark ?? null,
    });
    const saved = await this.dataRepo.save(entity);
    const type = await this.typeRepo.findOne({ where: { id: saved.typeId } });
    return this.toListItem(saved, type?.code);
  }

  async update(id: string, dto: UpdateDictDataDto): Promise<DictDataListItem> {
    const entity = await this.findEntityById(id);

    if (dto.value !== undefined && dto.value !== entity.value) {
      const existing = await this.dataRepo.findOne({
        where: { typeId: entity.typeId, value: dto.value },
      });
      if (existing) {
        throw new BadRequestException('Dict data value already exists for this type');
      }
      entity.value = dto.value;
    }

    if (dto.label !== undefined) entity.label = dto.label;
    if (dto.sort !== undefined) entity.sort = dto.sort;
    if (dto.status !== undefined) entity.status = dto.status;
    if (dto.remark !== undefined) entity.remark = dto.remark ?? null;

    const saved = await this.dataRepo.save(entity);
    const type = await this.typeRepo.findOne({ where: { id: saved.typeId } });
    return this.toListItem(saved, type?.code);
  }

  async remove(id: string): Promise<{ success: true }> {
    const entity = await this.findEntityById(id);
    await this.dataRepo.remove(entity);
    return { success: true };
  }

  async findOptionsByTypeCode(code: string): Promise<DictOption[]> {
    const type = await this.dictTypeService.findEntityByCode(code);

    const items = await this.dataRepo.find({
      where: { typeId: String(type.id), status: 1 },
      order: { sort: 'ASC', id: 'ASC' },
    });

    return items.map((item) => ({
      label: item.label,
      value: item.value,
      sort: item.sort,
    }));
  }

  private async findEntityById(id: string): Promise<SysDictDataEntity> {
    const entity = await this.dataRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException('Dict data not found');
    }
    return entity;
  }

  private toListItem(entity: SysDictDataEntity, typeCode?: string): DictDataListItem {
    return {
      id: String(entity.id),
      typeId: String(entity.typeId),
      typeCode,
      label: entity.label,
      value: entity.value,
      sort: entity.sort,
      status: entity.status,
      remark: entity.remark,
    };
  }
}
