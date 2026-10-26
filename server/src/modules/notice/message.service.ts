import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { MessageListItem, PaginationResult, UnreadCountResult } from '@nova/shared-types';
import { Repository } from 'typeorm';
import { SysMessageEntity, SysUserEntity } from '../../database/entities';
import { toApiId } from '../../common/utils/to-api-id';
import { CreateMessageDto, ListMessagesDto } from './dto/message.dto';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(SysMessageEntity)
    private readonly messageRepo: Repository<SysMessageEntity>,
    @InjectRepository(SysUserEntity)
    private readonly userRepo: Repository<SysUserEntity>,
  ) {}

  async inbox(userId: string, query: ListMessagesDto): Promise<PaginationResult<MessageListItem>> {
    return this.listForUser(userId, 'receiver', query);
  }

  async sent(userId: string, query: ListMessagesDto): Promise<PaginationResult<MessageListItem>> {
    return this.listForUser(userId, 'sender', query);
  }

  async send(senderId: string, dto: CreateMessageDto): Promise<MessageListItem> {
    const receiver = await this.userRepo.findOne({
      where: { id: dto.receiverId },
    });
    if (!receiver) {
      throw new NotFoundException('Receiver not found');
    }
    if (toApiId(dto.receiverId) === toApiId(senderId)) {
      throw new ForbiddenException('Cannot send message to yourself');
    }

    const entity = this.messageRepo.create({
      senderId,
      receiverId: dto.receiverId,
      title: dto.title,
      content: dto.content,
      isRead: 0,
      readAt: null,
    });
    const saved = await this.messageRepo.save(entity);
    return this.toListItem(saved);
  }

  async markRead(id: string, userId: string): Promise<MessageListItem> {
    const entity = await this.findEntityById(id);
    if (entity.receiverId !== userId) {
      throw new ForbiddenException('Only receiver can mark message as read');
    }
    if (entity.isRead === 0) {
      entity.isRead = 1;
      entity.readAt = new Date();
      await this.messageRepo.save(entity);
    }
    return this.toListItem(entity);
  }

  async remove(id: string, userId: string): Promise<{ success: true }> {
    const entity = await this.findEntityById(id);
    if (entity.senderId !== userId && entity.receiverId !== userId) {
      throw new ForbiddenException('Cannot delete this message');
    }
    await this.messageRepo.remove(entity);
    return { success: true };
  }

  async unreadCount(userId: string): Promise<UnreadCountResult> {
    const count = await this.messageRepo.count({
      where: { receiverId: userId, isRead: 0 },
    });
    return { count };
  }

  private async listForUser(
    userId: string,
    role: 'sender' | 'receiver',
    query: ListMessagesDto,
  ): Promise<PaginationResult<MessageListItem>> {
    const { page = 1, pageSize = 10, keyword } = query;
    const column = role === 'sender' ? 'sender_id' : 'receiver_id';
    const qb = this.messageRepo
      .createQueryBuilder('m')
      .where(`m.${column} = :userId`, { userId })
      .orderBy('m.createdAt', 'DESC');

    if (keyword?.trim()) {
      qb.andWhere('(m.title LIKE :kw OR m.content LIKE :kw)', {
        kw: `%${keyword.trim()}%`,
      });
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

  private async findEntityById(id: string): Promise<SysMessageEntity> {
    const entity = await this.messageRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException('Message not found');
    }
    return entity;
  }

  private toListItem(entity: SysMessageEntity): MessageListItem {
    return {
      id: toApiId(entity.id),
      senderId: toApiId(entity.senderId),
      receiverId: toApiId(entity.receiverId),
      title: entity.title,
      content: entity.content,
      isRead: entity.isRead as 0 | 1,
      readAt: entity.readAt?.toISOString() ?? null,
      createdAt: entity.createdAt.toISOString(),
    };
  }
}
