import { describe, expect, it } from 'vitest';
import { ApiResponse, ErrorCode, PaginationParams, PaginationResult } from './index.js';

describe('@nova/shared-types exports', () => {
  it('ErrorCode 枚举值符合约定', () => {
    expect(ErrorCode.SUCCESS).toBe(0);
    expect(ErrorCode.BAD_REQUEST).toBe(400);
    expect(ErrorCode.UNAUTHORIZED).toBe(401);
    expect(ErrorCode.FORBIDDEN).toBe(403);
    expect(ErrorCode.NOT_FOUND).toBe(404);
    expect(ErrorCode.INTERNAL_ERROR).toBe(500);
  });

  it('ApiResponse 结构可用于泛型响应', () => {
    const response: ApiResponse<{ id: number }> = {
      code: ErrorCode.SUCCESS,
      message: 'ok',
      data: { id: 1 },
    };

    expect(response.code).toBe(0);
    expect(response.message).toBe('ok');
    expect(response.data).toEqual({ id: 1 });
  });

  it('PaginationParams 包含 page 与 pageSize', () => {
    const params: PaginationParams = { page: 1, pageSize: 20 };

    expect(params.page).toBe(1);
    expect(params.pageSize).toBe(20);
  });

  it('PaginationResult 包含分页列表与总数', () => {
    const result: PaginationResult<{ id: number }> = {
      list: [{ id: 1 }],
      total: 1,
      page: 1,
      pageSize: 20,
    };

    expect(result.list).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });
});
