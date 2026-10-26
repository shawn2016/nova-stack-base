import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SysConfigEntity, SysDeptEntity, SysUserEntity } from '../../database/entities';
import { DataScopeModule } from '../data-scope/data-scope.module';
import { DeptController } from './dept.controller';
import { DeptService } from './dept.service';

@Module({
  imports: [
    forwardRef(() => DataScopeModule),
    TypeOrmModule.forFeature([SysDeptEntity, SysConfigEntity, SysUserEntity]),
  ],
  controllers: [DeptController],
  providers: [DeptService],
  exports: [DeptService],
})
export class DeptModule {}
