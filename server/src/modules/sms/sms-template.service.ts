import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { PaginationResult, SmsTemplateDetail, SmsTemplateListItem } from '@nova/shared-types';
import { Repository } from 'typeorm';
import { SysSmsTemplateEntity } from '../../database/entities';
import { toApiId } from '../../common/utils/to-api-id';
import {
  CreateSmsTemplateDto,
  ListSmsTemplatesDto,
  UpdateSmsTemplateDto,
} from './dto/sms-template.dto';
import { SmsChannelService } from './sms-channel.service';

@Injectable()
export class SmsTemplateService {
  constructor(
    @InjectRepository(SysSmsTemplateEntity)
    private readonly templateRepo: Repository<SysSmsTemplateEntity>,
    private readonly channelService: SmsChannelService,
  ) {}

  async list(query: ListSmsTemplatesDto): Promise<PaginationResult<SmsTemplateListItem>> {
    const { page = 1, pageSize = 10, keyword } = query;
    const qb = this.templateRepo.createQueryBuilder('t').orderBy('t.id', 'DESC');

    if (keyword?.trim()) {
      qb.andWhere('(t.name LIKE :kw OR t.code LIKE :kw)', {
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

  async findById(id: string): Promise<SmsTemplateDetail> {
    const template = await this.findEntityById(id);
    return this.toListItem(template);
  }

  async findByCode(code: string): Promise<SysSmsTemplateEntity> {
    const template = await this.templateRepo.findOne({ where: { code } });
    if (!template) {
      throw new NotFoundException('SMS template not found');
    }
    return template;
  }

  async create(dto: CreateSmsTemplateDto): Promise<SmsTemplateDetail> {
    await this.channelService.findEntityById(dto.channelId);
    await this.assertCodeUnique(dto.code);

    const saved = await this.templateRepo.save(
      this.templateRepo.create({
        code: dto.code,
        name: dto.name,
        content: dto.content,
        channelId: dto.channelId,
        status: dto.status ?? 1,
        remark: dto.remark ?? null,
      }),
    );
    return this.toListItem(saved);
  }

  async update(id: string, dto: UpdateSmsTemplateDto): Promise<SmsTemplateDetail> {
    const template = await this.findEntityById(id);

    if (dto.channelId !== undefined) {
      await this.channelService.findEntityById(dto.channelId);
      template.channelId = dto.channelId;
    }
    if (dto.code !== undefined && dto.code !== template.code) {
      await this.assertCodeUnique(dto.code);
      template.code = dto.code;
    }
    if (dto.name !== undefined) template.name = dto.name;
    if (dto.content !== undefined) template.content = dto.content;
    if (dto.status !== undefined) template.status = dto.status;
    if (dto.remark !== undefined) template.remark = dto.remark;

    const saved = await this.templateRepo.save(template);
    return this.toListItem(saved);
  }

  async remove(id: string): Promise<{ success: true }> {
    await this.findEntityById(id);
    await this.templateRepo.delete(id);
    return { success: true };
  }

  async findEntityById(id: string): Promise<SysSmsTemplateEntity> {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('SMS template not found');
    }
    return template;
  }

  private async assertCodeUnique(code: string): Promise<void> {
    const existing = await this.templateRepo.findOne({ where: { code } });
    if (existing) {
      throw new BadRequestException('Template code already exists');
    }
  }

  private toListItem(row: SysSmsTemplateEntity): SmsTemplateListItem {
    return {
      id: toApiId(row.id),
      code: row.code,
      name: row.name,
      content: row.content,
      channelId: toApiId(row.channelId),
      status: row.status as 0 | 1,
      remark: row.remark,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
