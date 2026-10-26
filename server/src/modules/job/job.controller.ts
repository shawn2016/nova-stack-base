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
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { CreateJobDto, UpdateJobDto, UpdateJobStatusDto } from './dto/job.dto';
import { ListJobLogsDto, ListJobsDto } from './dto/list-jobs.dto';
import { JobLogService } from './job-log.service';
import { JobService } from './job.service';

@ApiTags('jobs')
@ApiBearerAuth()
@Controller('jobs')
export class JobController {
  constructor(
    private readonly jobService: JobService,
    private readonly jobLogService: JobLogService,
  ) {}

  @Get('handlers')
  @RequirePermission('infra:job:list')
  @ApiOperation({ summary: '可用任务 Handler 列表' })
  listHandlers() {
    return this.jobService.listHandlers();
  }

  @Get()
  @RequirePermission('infra:job:list')
  @ApiOperation({ summary: '定时任务列表' })
  list(@Query() query: ListJobsDto) {
    return this.jobService.list(query);
  }

  @Get('logs')
  @RequirePermission('infra:job:log:list')
  @ApiOperation({ summary: '任务执行日志' })
  listLogs(@Query() query: ListJobLogsDto) {
    return this.jobLogService.list(query);
  }

  @Get(':id')
  @RequirePermission('infra:job:list')
  @ApiOperation({ summary: '任务详情' })
  findById(@Param('id') id: string) {
    return this.jobService.findById(id);
  }

  @Post()
  @RequirePermission('infra:job:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建任务' })
  create(@Body() dto: CreateJobDto) {
    return this.jobService.create(dto);
  }

  @Put(':id')
  @RequirePermission('infra:job:update')
  @ApiOperation({ summary: '更新任务' })
  update(@Param('id') id: string, @Body() dto: UpdateJobDto) {
    return this.jobService.update(id, dto);
  }

  @Put(':id/status')
  @RequirePermission('infra:job:update')
  @ApiOperation({ summary: '启停任务' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateJobStatusDto) {
    return this.jobService.updateStatus(id, dto);
  }

  @Post(':id/run')
  @RequirePermission('infra:job:run')
  @ApiOperation({ summary: '排队执行一次，执行结果见任务日志' })
  runOnce(@Param('id') id: string) {
    return this.jobService.runOnce(id);
  }

  @Delete(':id')
  @RequirePermission('infra:job:delete')
  @ApiOperation({ summary: '删除任务' })
  remove(@Param('id') id: string) {
    return this.jobService.remove(id);
  }
}
