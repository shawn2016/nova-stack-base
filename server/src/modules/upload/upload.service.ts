import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { FileListItem, PaginationResult, UploadResult } from '@nova/shared-types';
import { randomUUID } from 'crypto';
import { In, Repository } from 'typeorm';
import { SysFileEntity, SysUserEntity } from '../../database/entities';
import { toApiId } from '../../common/utils/to-api-id';
import { ListFilesDto } from './dto/list-files.dto';
import type { UpdateUploadSettingsDto } from './upload-settings.types';
import { UploadSettingsService } from './upload-settings.service';
import { UploadStorageAdapter } from './upload-storage.adapter';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

@Injectable()
export class UploadService {
  constructor(
    private readonly storageAdapter: UploadStorageAdapter,
    private readonly settingsService: UploadSettingsService,
    @InjectRepository(SysFileEntity)
    private readonly fileRepo: Repository<SysFileEntity>,
    @InjectRepository(SysUserEntity)
    private readonly userRepo: Repository<SysUserEntity>,
  ) {}

  getSettings() {
    return this.settingsService.getSettings();
  }

  updateSettings(dto: UpdateUploadSettingsDto) {
    return this.settingsService.updateSettings(dto);
  }

  async upload(file: Express.Multer.File | undefined, userId: string): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const runtime = await this.settingsService.getRuntimeConfig();

    if (file.size > runtime.maxSize) {
      throw new BadRequestException('File size exceeds limit');
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Unsupported file type');
    }

    const ext = MIME_TO_EXT[file.mimetype] ?? '';
    const key = `admin/${userId}/${randomUUID()}${ext}`;

    const { result, storage } = await this.storageAdapter.upload(file, key);

    const entity = this.fileRepo.create({
      url: result.url,
      objectKey: result.key,
      storage,
      mimeType: result.mimeType,
      size: result.size,
      originalName: file.originalname ?? null,
      uploaderId: userId,
    });
    await this.fileRepo.save(entity);

    return result;
  }

  async list(query: ListFilesDto): Promise<PaginationResult<FileListItem>> {
    const { page = 1, pageSize = 20, keyword, storage } = query;
    const qb = this.fileRepo.createQueryBuilder('f').orderBy('f.createdAt', 'DESC');

    if (keyword?.trim()) {
      qb.andWhere('(f.url LIKE :kw OR f.object_key LIKE :kw OR f.original_name LIKE :kw)', {
        kw: `%${keyword.trim()}%`,
      });
    }

    if (storage) {
      qb.andWhere('f.storage = :storage', { storage });
    }

    const [rows, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const uploaderIds = [...new Set(rows.map((row) => row.uploaderId))];
    const uploaders = uploaderIds.length
      ? await this.userRepo.find({ where: { id: In(uploaderIds) } })
      : [];
    const uploaderMap = new Map(uploaders.map((user) => [toApiId(user.id), user.username]));

    return {
      list: rows.map((row) => this.toListItem(row, uploaderMap)),
      total,
      page,
      pageSize,
    };
  }

  async remove(id: string): Promise<{ success: true }> {
    const file = await this.fileRepo.findOne({ where: { id } });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    await this.storageAdapter.delete(file.storage, file.objectKey);
    await this.fileRepo.remove(file);
    return { success: true };
  }

  private toListItem(file: SysFileEntity, uploaderMap: Map<string, string>): FileListItem {
    const uploaderId = toApiId(file.uploaderId);
    return {
      id: toApiId(file.id),
      url: file.url,
      objectKey: file.objectKey,
      storage: file.storage,
      mimeType: file.mimeType,
      size: file.size,
      originalName: file.originalName,
      uploaderId,
      uploaderName: uploaderMap.get(uploaderId) ?? null,
      createdAt: file.createdAt.toISOString(),
    };
  }
}
