import { describe, expect, it } from 'vitest';
import type { CreateRegionDto, RegionListItem, RegionTreeNode, UpdateRegionDto } from './region.js';

describe('region types', () => {
  it('RegionListItem 包含地区列表字段', () => {
    const item: RegionListItem = {
      id: '1',
      parentId: '0',
      name: '北京市',
      code: '11',
      level: 1,
      sort: 0,
      status: 1,
    };

    expect(item.code).toBe('11');
    expect(item.level).toBe(1);
  });

  it('RegionTreeNode 支持嵌套 children', () => {
    const node: RegionTreeNode = {
      id: '1',
      parentId: '0',
      name: '北京市',
      code: '11',
      level: 1,
      sort: 0,
      status: 1,
      children: [
        {
          id: '2',
          parentId: '1',
          name: '市辖区',
          code: '1101',
          level: 2,
          sort: 1,
          status: 1,
        },
      ],
    };

    expect(node.children).toHaveLength(1);
    expect(node.children?.[0].level).toBe(2);
  });

  it('CreateRegionDto 与 UpdateRegionDto 字段符合设计', () => {
    const create: CreateRegionDto = {
      parentId: '0',
      name: '测试省',
      code: '990000',
      level: 1,
      sort: 0,
      status: 1,
    };
    const update: UpdateRegionDto = { name: '测试省（新）', status: 0 };

    expect(create.parentId).toBe('0');
    expect(update.status).toBe(0);
    expect('code' in update).toBe(false);
  });
});
