/** 地区列表项（平铺） */
export interface RegionListItem {
  id: string;
  parentId: string;
  name: string;
  code: string;
  level: 1 | 2 | 3;
  sort: number;
  status: 0 | 1;
}

/** 地区树节点 */
export interface RegionTreeNode extends RegionListItem {
  children?: RegionTreeNode[];
}

/** 创建地区 */
export interface CreateRegionDto {
  parentId: string;
  name: string;
  code: string;
  level?: 1 | 2 | 3;
  sort?: number;
  status?: 0 | 1;
}

/** 更新地区 */
export interface UpdateRegionDto {
  parentId?: string;
  name?: string;
  code?: string;
  sort?: number;
  status?: 0 | 1;
}
