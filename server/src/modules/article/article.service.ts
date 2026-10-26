import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { PaginationResult } from '@nova/shared-types';
import { Repository } from 'typeorm';
import { ArticleEntity } from '../../database/entities';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { toArticle, toArticleListItem } from './article.mapper';

@Injectable()
export class ArticleService {
  constructor(
    @InjectRepository(ArticleEntity)
    private readonly articleRepo: Repository<ArticleEntity>,
  ) {}

  async list(params: {
    page: number;
    pageSize: number;
    status?: 0 | 1;
  }): Promise<PaginationResult<ReturnType<typeof toArticleListItem>>> {
    const { page, pageSize, status } = params;
    const qb = this.articleRepo.createQueryBuilder('article').orderBy('article.createdAt', 'DESC');

    if (status !== undefined) {
      qb.andWhere('article.status = :status', { status });
    }

    const [items, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      list: items.map(toArticleListItem),
      total,
      page,
      pageSize,
    };
  }

  async findById(id: string) {
    const article = await this.findEntityById(id);
    return toArticle(article);
  }

  async create(dto: CreateArticleDto, authorId: string) {
    const article = this.articleRepo.create({
      title: dto.title,
      summary: dto.summary ?? '',
      content: dto.content,
      coverUrl: dto.coverUrl ?? null,
      status: 0,
      authorId,
      publishedAt: null,
    });
    const saved = await this.articleRepo.save(article);
    return toArticle(saved);
  }

  async update(id: string, dto: UpdateArticleDto) {
    const article = await this.findEntityById(id);

    if (dto.title !== undefined) article.title = dto.title;
    if (dto.summary !== undefined) article.summary = dto.summary;
    if (dto.content !== undefined) article.content = dto.content;
    if (dto.coverUrl !== undefined) article.coverUrl = dto.coverUrl;

    const saved = await this.articleRepo.save(article);
    return toArticle(saved);
  }

  async remove(id: string) {
    const article = await this.findEntityById(id);
    await this.articleRepo.remove(article);
    return { success: true as const };
  }

  async publish(id: string) {
    const article = await this.findEntityById(id);
    article.status = 1;
    article.publishedAt = new Date();
    const saved = await this.articleRepo.save(article);
    return toArticle(saved);
  }

  async listPublishedForMember(params: {
    page: number;
    pageSize: number;
  }): Promise<PaginationResult<ReturnType<typeof toArticleListItem>>> {
    const { page, pageSize } = params;
    const [items, total] = await this.articleRepo.findAndCount({
      where: { status: 1 },
      order: { publishedAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      list: items.map(toArticleListItem),
      total,
      page,
      pageSize,
    };
  }

  async findPublishedByIdForMember(id: string) {
    const article = await this.articleRepo.findOne({
      where: { id, status: 1 },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    return toArticle(article);
  }

  private async findEntityById(id: string): Promise<ArticleEntity> {
    const article = await this.articleRepo.findOne({ where: { id } });
    if (!article) {
      throw new NotFoundException('Article not found');
    }
    return article;
  }
}
