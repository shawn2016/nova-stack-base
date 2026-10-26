import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { CreateIpBlacklistBodyDto } from './dto/create-ip-blacklist.dto';
import { ListIpBlacklistDto } from './dto/list-ip-blacklist.dto';
import { UpdateIpBlacklistStatusBodyDto } from './dto/update-ip-blacklist-status.dto';
import { IpBlacklistService } from './ip-blacklist.service';

@ApiTags('security')
@ApiBearerAuth()
@Controller('security/ip-blacklist')
export class IpBlacklistController {
  constructor(private readonly ipBlacklistService: IpBlacklistService) {}

  @Get()
  @RequirePermission('security:ip-blacklist:list')
  @ApiOperation({ summary: 'IP 黑名单分页列表' })
  list(@Query() query: ListIpBlacklistDto) {
    return this.ipBlacklistService.list(query);
  }

  @Post()
  @RequirePermission('security:ip-blacklist:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '手动添加 IP 黑名单' })
  create(@Body() body: CreateIpBlacklistBodyDto, @CurrentUser() user: AuthUser) {
    return this.ipBlacklistService.createManual(body, user.userId);
  }

  @Delete(':id')
  @RequirePermission('security:ip-blacklist:delete')
  @ApiOperation({ summary: '删除/解除 IP 黑名单' })
  remove(@Param('id') id: string) {
    return this.ipBlacklistService.remove(id);
  }

  @Put(':id/status')
  @RequirePermission('security:ip-blacklist:update')
  @ApiOperation({ summary: '启停 IP 黑名单' })
  updateStatus(@Param('id') id: string, @Body() body: UpdateIpBlacklistStatusBodyDto) {
    return this.ipBlacklistService.updateStatus(id, body.status);
  }
}
