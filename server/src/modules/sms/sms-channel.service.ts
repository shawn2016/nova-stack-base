import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { PaginationResult, SmsChannelDetail, SmsChannelListItem } from '@nova/shared-types';
import { Repository } from 'typeorm';
import { SysSmsChannelEntity, SysSmsTemplateEntity } from '../../database/entities';
import { toApiId } from '../../common/utils/to-api-id';
import {
  CreateSmsChannelDto,
  ListSmsChannelsDto,
  UpdateSmsChannelDto,
} from './dto/sms-channel.dto';
import { assertSmsProvider, parseSmsConfig } from './sms.utils';

@Injectable()
export class SmsChannelService {
  constructor(
    @InjectRepository(SysSmsChannelEntity)
    private readonly channelRepo: Repository<SysSmsChannelEntity>,
    @InjectRepository(SysSmsTemplateEntity)
    private readonly templateRepo: Repository<SysSmsTemplateEntity>,
  ) {}

  async list(query: ListSmsChannelsDto): Promise<PaginationResult<SmsChannelListItem>> {
    const { page = 1, pageSize = 10, keyword } = query;
    const qb = this.channelRepo.createQueryBuilder('c').orderBy('c.id', 'DESC');

    if (keyword?.trim()) {
      qb.andWhere('(c.name LIKE :kw OR c.provider LIKE :kw)', {
        kw: `%${keyword.trim()}%`,
      });
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

  async findById(id: string): Promise<SmsChannelDetail> {
    const channel = await this.findEntityById(id);
    return this.toListItem(channel);
  }

  async create(dto: CreateSmsChannelDto): Promise<SmsChannelDetail> {
    assertSmsProvider(dto.provider);
    parseSmsConfig(dto.config);

    const saved = await this.channelRepo.save(
      this.channelRepo.create({
        name: dto.name,
        provider: dto.provider,
        config: dto.config,
        status: dto.status ?? 1,
        remark: dto.remark ?? null,
      }),
    );
    return this.toListItem(saved);
  }

  async update(id: string, dto: UpdateSmsChannelDto): Promise<SmsChannelDetail> {
    const channel = await this.findEntityById(id);

    if (dto.provider !== undefined) {
      assertSmsProvider(dto.provider);
      channel.provider = dto.provider;
    }
    if (dto.config !== undefined) {
      parseSmsConfig(dto.config);
      channel.config = dto.config;
    }
    if (dto.name !== undefined) channel.name = dto.name;
    if (dto.status !== undefined) channel.status = dto.status;
    if (dto.remark !== undefined) channel.remark = dto.remark;

    const saved = await this.channelRepo.save(channel);
    return this.toListItem(saved);
  }

  async remove(id: string): Promise<{ success: true }> {
    await this.findEntityById(id);
    const templateCount = await this.templateRepo.count({ where: { channelId: id } });
    if (templateCount > 0) {
      throw new BadRequestException('Channel is referenced by templates');
    }
    await this.channelRepo.delete(id);
    return { success: true };
  }

  async findEntityById(id: string): Promise<SysSmsChannelEntity> {
    const channel = await this.channelRepo.findOne({ where: { id } });
    if (!channel) {
      throw new NotFoundException('SMS channel not found');
    }
    return channel;
  }

  private toListItem(row: SysSmsChannelEntity): SmsChannelListItem {
    return {
      id: toApiId(row.id),
      name: row.name,
      provider: row.provider as SmsChannelListItem['provider'],
      config: row.config,
      status: row.status as 0 | 1,
      remark: row.remark,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
