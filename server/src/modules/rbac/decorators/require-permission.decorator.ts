import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';

/** 声明接口所需的权限码（如 system:role:list） */
export const RequirePermission = (permission: string) => SetMetadata(PERMISSION_KEY, permission);
