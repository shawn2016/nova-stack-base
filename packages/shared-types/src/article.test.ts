import { describe, expect, it } from 'vitest';
import { Article, ArticleListItem, CreateArticleDto, UpdateArticleDto } from './index.js';

describe('article types', () => {
  it('Article 包含完整文章字段', () => {
    const article: Article = {
      id: '1',
      title: '测试文章',
      summary: '摘要',
      content: '正文内容',
      coverUrl: 'https://example.com/cover.png',
      status: 1,
      authorId: '100',
      publishedAt: '2026-09-02T00:00:00.000Z',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-02T00:00:00.000Z',
    };

    expect(article.id).toBe('1');
    expect(article.title).toBe('测试文章');
    expect(article.status).toBe(1);
    expect(article.authorId).toBe('100');
    expect(article.publishedAt).toBe('2026-09-02T00:00:00.000Z');
  });

  it('Article 允许省略 coverUrl 与 publishedAt', () => {
    const draft: Article = {
      id: '2',
      title: '草稿',
      summary: '',
      content: '内容',
      status: 0,
      authorId: '100',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };

    expect(draft.status).toBe(0);
    expect(draft.coverUrl).toBeUndefined();
    expect(draft.publishedAt).toBeUndefined();
  });

  it('ArticleListItem 包含列表展示字段', () => {
    const item: ArticleListItem = {
      id: '1',
      title: '列表标题',
      summary: '列表摘要',
      coverUrl: 'https://example.com/cover.png',
      status: 1,
      publishedAt: '2026-09-02T00:00:00.000Z',
    };

    expect(item.id).toBe('1');
    expect(item.title).toBe('列表标题');
    expect(item.summary).toBe('列表摘要');
    expect(item.status).toBe(1);
  });

  it('ArticleListItem 允许省略 coverUrl 与 publishedAt', () => {
    const item: ArticleListItem = {
      id: '2',
      title: '无封面',
      summary: '摘要',
      status: 0,
    };

    expect(item.coverUrl).toBeUndefined();
    expect(item.publishedAt).toBeUndefined();
  });

  it('CreateArticleDto 包含 title 与 content，summary 与 coverUrl 可选', () => {
    const full: CreateArticleDto = {
      title: '新文章',
      summary: '摘要',
      content: '正文',
      coverUrl: 'https://example.com/cover.png',
    };
    const minimal: CreateArticleDto = {
      title: '新文章',
      content: '正文',
    };

    expect(full.title).toBe('新文章');
    expect(full.summary).toBe('摘要');
    expect(minimal.summary).toBeUndefined();
    expect(minimal.coverUrl).toBeUndefined();
  });

  it('UpdateArticleDto 全部字段可选', () => {
    const partial: UpdateArticleDto = {
      title: '更新标题',
      summary: '新摘要',
    };
    const empty: UpdateArticleDto = {};

    expect(partial.title).toBe('更新标题');
    expect(partial.summary).toBe('新摘要');
    expect(empty.title).toBeUndefined();
  });
});
