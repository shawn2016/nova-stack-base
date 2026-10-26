import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  EmailChannelDetail,
  EmailChannelListItem,
  PaginationResult,
} from '@nova/shared-types';
import { Repository } from 'typeorm';
import { SysEmailChannelEntity, SysEmailTemplateEntity } from '../../database/entities';
import { toApiId } from '../../common/utils/to-api-id';
import {
  CreateEmailChannelDto,
  ListEmailChannelsDto,
  UpdateEmailChannelDto,
} from './dto/email-channel.dto';
import { assertEmailProvider, parseEmailConfig } from './email.utils';

@Injectable()
export class EmailChannelService {
  constructor(
    @InjectRepository(SysEmailChannelEntity)
    private readonly channelRepo: Repository<SysEmailChannelEntity>,
    @InjectRepository(SysEmailTemplateEntity)
    private readonly templateRepo: Repository<SysEmailTemplateEntity>,
  ) {}

  async list(query: ListEmailChannelsDto): Promise<PaginationResult<EmailChannelListItem>> {
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

  async findById(id: string): Promise<EmailChannelDetail> {
    const channel = await this.findEntityById(id);
    return this.toListItem(channel);
  }

  async create(dto: CreateEmailChannelDto): Promise<EmailChannelDetail> {
    assertEmailProvider(dto.provider);
    parseEmailConfig(dto.config);

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

  async update(id: string, dto: UpdateEmailChannelDto): Promise<EmailChannelDetail> {
    const channel = await this.findEntityById(id);

    if (dto.provider !== undefined) {
      assertEmailProvider(dto.provider);
      channel.provider = dto.provider;
    }
    if (dto.config !== undefined) {
      parseEmailConfig(dto.config);
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

  async findEntityById(id: string): Promise<SysEmailChannelEntity> {
    const channel = await this.channelRepo.findOne({ where: { id } });
    if (!channel) {
      throw new NotFoundException('Email channel not found');
    }
    return channel;
  }

  private toListItem(row: SysEmailChannelEntity): EmailChannelListItem {
    return {
      id: toApiId(row.id),
      name: row.name,
      provider: row.provider as EmailChannelListItem['provider'],
      config: row.config,
      status: row.status as 0 | 1,
      remark: row.remark,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
