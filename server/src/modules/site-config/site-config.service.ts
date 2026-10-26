import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  PaginationResult,
  SiteConfigByKeyResult,
  SiteConfigListItem,
} from '@nova/shared-types';
import { Repository } from 'typeorm';
import { SysConfigEntity } from '../../database/entities';
import { CreateSiteConfigDto } from './dto/create-site-config.dto';
import { ListSiteConfigDto } from './dto/list-site-config.dto';
import { UpdateSiteConfigDto } from './dto/update-site-config.dto';

@Injectable()
export class SiteConfigService {
  constructor(
    @InjectRepository(SysConfigEntity)
    private readonly configRepo: Repository<SysConfigEntity>,
  ) {}

  async list(query: ListSiteConfigDto): Promise<PaginationResult<SiteConfigListItem>> {
    const { page, pageSize, keyword, group } = query;
    const qb = this.configRepo.createQueryBuilder('config').orderBy('config.createdAt', 'DESC');

    if (keyword) {
      qb.andWhere('(config.configKey LIKE :keyword OR config.configName LIKE :keyword)', {
        keyword: `%${keyword}%`,
      });
    }

    if (group) {
      qb.andWhere('config.configGroup = :group', { group });
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

  async create(dto: CreateSiteConfigDto): Promise<SiteConfigListItem> {
    const existing = await this.configRepo.findOne({
      where: { configKey: dto.configKey },
    });
    if (existing) {
      throw new BadRequestException('Config key already exists');
    }

    const entity = this.configRepo.create({
      configKey: dto.configKey,
      configName: dto.configName,
      configValue: dto.configValue,
      configGroup: dto.configGroup ?? null,
      remark: dto.remark ?? null,
    });
    const saved = await this.configRepo.save(entity);
    return this.toListItem(saved);
  }

  async update(id: string, dto: UpdateSiteConfigDto): Promise<SiteConfigListItem> {
    const entity = await this.findEntityById(id);

    if (dto.configName !== undefined) entity.configName = dto.configName;
    if (dto.configValue !== undefined) entity.configValue = dto.configValue;
    if (dto.configGroup !== undefined) {
      entity.configGroup = dto.configGroup ?? null;
    }
    if (dto.remark !== undefined) entity.remark = dto.remark ?? null;

    const saved = await this.configRepo.save(entity);
    return this.toListItem(saved);
  }

  async remove(id: string): Promise<{ success: true }> {
    const entity = await this.findEntityById(id);
    await this.configRepo.remove(entity);
    return { success: true };
  }

  async findByKey(key: string): Promise<SiteConfigByKeyResult> {
    const entity = await this.configRepo.findOne({
      where: { configKey: key },
    });
    if (!entity) {
      throw new NotFoundException('Config not found');
    }
    return this.toByKeyResult(entity);
  }

  private async findEntityById(id: string): Promise<SysConfigEntity> {
    const entity = await this.configRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException('Config not found');
    }
    return entity;
  }

  private toListItem(entity: SysConfigEntity): SiteConfigListItem {
    return {
      id: String(entity.id),
      configKey: entity.configKey,
      configName: entity.configName,
      configValue: entity.configValue,
      configGroup: entity.configGroup,
      remark: entity.remark,
      createdAt: entity.createdAt.toISOString(),
    };
  }

  private toByKeyResult(entity: SysConfigEntity): SiteConfigByKeyResult {
    return {
      configKey: entity.configKey,
      configName: entity.configName,
      configValue: entity.configValue,
      configGroup: entity.configGroup,
    };
  }
}
