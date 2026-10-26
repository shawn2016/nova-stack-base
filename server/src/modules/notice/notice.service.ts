import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  NoticeListItem,
  NoticeMyListItem,
  PaginationResult,
  UnreadCountResult,
} from '@nova/shared-types';
import { Repository } from 'typeorm';
import { SysNoticeEntity, SysNoticeReadEntity } from '../../database/entities';
import { toApiId } from '../../common/utils/to-api-id';
import { CreateNoticeDto, UpdateNoticeDto } from './dto/create-notice.dto';
import { ListMyNoticesDto, ListNoticesDto } from './dto/list-notices.dto';

@Injectable()
export class NoticeService {
  constructor(
    @InjectRepository(SysNoticeEntity)
    private readonly noticeRepo: Repository<SysNoticeEntity>,
    @InjectRepository(SysNoticeReadEntity)
    private readonly readRepo: Repository<SysNoticeReadEntity>,
  ) {}

  async list(query: ListNoticesDto): Promise<PaginationResult<NoticeListItem>> {
    const { page = 1, pageSize = 10, keyword, status, type } = query;
    const qb = this.noticeRepo.createQueryBuilder('n').orderBy('n.createdAt', 'DESC');

    if (keyword?.trim()) {
      qb.andWhere('(n.title LIKE :kw OR n.content LIKE :kw)', {
        kw: `%${keyword.trim()}%`,
      });
    }
    if (status !== undefined) {
      qb.andWhere('n.status = :status', { status });
    }
    if (type !== undefined) {
      qb.andWhere('n.type = :type', { type });
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

  async listMy(
    userId: string,
    query: ListMyNoticesDto,
  ): Promise<PaginationResult<NoticeMyListItem>> {
    const { page = 1, pageSize = 10 } = query;
    const qb = this.noticeRepo
      .createQueryBuilder('n')
      .where('n.status = :status', { status: 1 })
      .orderBy('n.publishedAt', 'DESC');

    const [rows, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const readMap = await this.loadReadMap(
      userId,
      rows.map((r) => String(r.id)),
    );

    return {
      list: rows.map((r) => this.toMyListItem(r, readMap.get(String(r.id)))),
      total,
      page,
      pageSize,
    };
  }

  async unreadCount(userId: string): Promise<UnreadCountResult> {
    const published = await this.noticeRepo.find({
      where: { status: 1 },
      select: ['id'],
    });
    if (published.length === 0) {
      return { count: 0 };
    }

    const readCount = await this.readRepo
      .createQueryBuilder('r')
      .where('r.user_id = :userId', { userId })
      .andWhere('r.notice_id IN (:...ids)', {
        ids: published.map((n) => n.id),
      })
      .getCount();

    return { count: published.length - readCount };
  }

  async create(dto: CreateNoticeDto, publisherId: string): Promise<NoticeListItem> {
    const entity = this.noticeRepo.create({
      title: dto.title,
      content: dto.content,
      type: dto.type,
      status: 0,
      publisherId,
      publishedAt: null,
    });
    const saved = await this.noticeRepo.save(entity);
    return this.toListItem(saved);
  }

  async update(id: string, dto: UpdateNoticeDto): Promise<NoticeListItem> {
    const entity = await this.findEntityById(id);

    if (entity.status === 1) {
      if (dto.type !== undefined) {
        throw new BadRequestException('Cannot change type of published notice');
      }
      if (dto.title !== undefined) entity.title = dto.title;
      if (dto.content !== undefined) entity.content = dto.content;
    } else {
      if (dto.title !== undefined) entity.title = dto.title;
      if (dto.content !== undefined) entity.content = dto.content;
      if (dto.type !== undefined) entity.type = dto.type;
    }

    const saved = await this.noticeRepo.save(entity);
    return this.toListItem(saved);
  }

  async publish(id: string, publisherId: string): Promise<NoticeListItem> {
    const entity = await this.findEntityById(id);
    if (entity.status === 1) {
      throw new BadRequestException('Notice already published');
    }
    entity.status = 1;
    entity.publisherId = publisherId;
    entity.publishedAt = new Date();
    const saved = await this.noticeRepo.save(entity);
    return this.toListItem(saved);
  }

  async remove(id: string): Promise<{ success: true }> {
    const entity = await this.findEntityById(id);
    if (entity.status === 1) {
      throw new BadRequestException('Cannot delete published notice');
    }
    await this.noticeRepo.remove(entity);
    return { success: true };
  }

  async markRead(noticeId: string, userId: string): Promise<{ success: true }> {
    const entity = await this.findEntityById(noticeId);
    if (entity.status !== 1) {
      throw new BadRequestException('Notice is not published');
    }

    const existing = await this.readRepo.findOne({
      where: { noticeId: entity.id, userId },
    });
    if (!existing) {
      await this.readRepo.save(
        this.readRepo.create({
          noticeId: entity.id,
          userId,
          readAt: new Date(),
        }),
      );
    }
    return { success: true };
  }

  private async loadReadMap(
    userId: string,
    noticeIds: string[],
  ): Promise<Map<string, SysNoticeReadEntity>> {
    if (noticeIds.length === 0) {
      return new Map();
    }
    const reads = await this.readRepo
      .createQueryBuilder('r')
      .where('r.user_id = :userId', { userId })
      .andWhere('r.notice_id IN (:...ids)', { ids: noticeIds })
      .getMany();
    return new Map(reads.map((r) => [String(r.noticeId), r]));
  }

  private async findEntityById(id: string): Promise<SysNoticeEntity> {
    const entity = await this.noticeRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException('Notice not found');
    }
    return entity;
  }

  private toListItem(entity: SysNoticeEntity): NoticeListItem {
    return {
      id: toApiId(entity.id),
      title: entity.title,
      content: entity.content,
      type: entity.type as 1 | 2,
      status: entity.status as 0 | 1,
      publisherId: toApiId(entity.publisherId),
      publishedAt: entity.publishedAt?.toISOString() ?? null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  private toMyListItem(entity: SysNoticeEntity, read?: SysNoticeReadEntity): NoticeMyListItem {
    return {
      id: toApiId(entity.id),
      title: entity.title,
      content: entity.content,
      type: entity.type as 1 | 2,
      publisherId: toApiId(entity.publisherId),
      publishedAt: entity.publishedAt!.toISOString(),
      isRead: !!read,
      readAt: read?.readAt.toISOString() ?? null,
    };
  }
}
