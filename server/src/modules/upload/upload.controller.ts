import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { ListFilesDto } from './dto/list-files.dto';
import { UpdateUploadSettingsDto } from './dto/update-upload-settings.dto';
import { UploadService } from './upload.service';

@ApiTags('files')
@Controller('files')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Get('settings')
  @RequirePermission('system:file:settings')
  @ApiBearerAuth()
  @ApiOperation({ summary: '文件存储配置' })
  getSettings() {
    return this.uploadService.getSettings();
  }

  @Put('settings')
  @RequirePermission('system:file:settings')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新文件存储配置' })
  updateSettings(@Body() dto: UpdateUploadSettingsDto) {
    return this.uploadService.updateSettings(dto);
  }

  @Get()
  @RequirePermission('system:file:list')
  @ApiBearerAuth()
  @ApiOperation({ summary: '文件资源列表' })
  list(@Query() query: ListFilesDto) {
    return this.uploadService.list(query);
  }

  @Post('upload')
  @RequirePermission('system:file:upload')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '上传文件（Admin）' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: parseInt(process.env.UPLOAD_MAX_SIZE ?? '5242880', 10) || 5 * 1024 * 1024,
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() user: AuthUser) {
    return this.uploadService.upload(file, user.userId);
  }

  @Delete(':id')
  @RequirePermission('system:file:delete')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除文件资源' })
  remove(@Param('id') id: string) {
    return this.uploadService.remove(id);
  }
}
