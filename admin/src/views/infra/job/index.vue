<template>
  <div class="art-full-height">
    <ArtListPanel
      title="定时任务"
      v-model:columns="columnChecks"
      :loading="loading"
      @refresh="refreshData"
    >
      <template #head-actions>
        <ElButton
          v-permission="'infra:job:create'"
          type="primary"
          @click="openDialog('add')"
          v-ripple
        >
          新增任务
        </ElButton>
      </template>

      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ArtListPanel>

    <JobDialog
      v-model:visible="dialogVisible"
      :dialog-type="dialogType"
      :job-data="currentJob"
      :handlers="handlers"
      @success="refreshData"
    />

    <JobLogDrawer v-model:visible="logVisible" :job-id="logJobId" />
  </div>
</template>

<script setup lang="ts">
  import ArtTableActions from '@/components/core/tables/art-table-actions/index.vue'
  import type { TableActionItem } from '@/components/core/tables/art-table-actions/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import { deleteJob, fetchJobHandlers, fetchJobList, runJob, updateJobStatus } from '@/api/job'
  import type { JobHandlerInfo, JobListItem } from '@nova/shared-types'
  import { ElMessageBox, ElTag } from 'element-plus'
  import JobDialog from './modules/job-dialog.vue'
  import JobLogDrawer from './modules/job-log-drawer.vue'

  defineOptions({ name: 'InfraJob' })

  const handlers = ref<JobHandlerInfo[]>([])
  const dialogVisible = ref(false)
  const dialogType = ref<'add' | 'edit'>('add')
  const currentJob = ref<JobListItem | undefined>(undefined)
  const logVisible = ref(false)
  const logJobId = ref('')

  const statusTag: Record<0 | 1, { type: 'info' | 'success'; label: string }> = {
    0: { type: 'info', label: '暂停' },
    1: { type: 'success', label: '运行中' }
  }

  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
    handleSizeChange,
    handleCurrentChange,
    refreshData
  } = useTable({
    core: {
      apiFn: fetchJobList,
      apiParams: { current: 1, size: 20 },
      columnsFactory: () => [
        { prop: 'name', label: '任务名称', minWidth: 140 },
        { prop: 'jobGroup', label: '分组', width: 100 },
        { prop: 'invokeTarget', label: 'Handler', minWidth: 140 },
        { prop: 'cronExpression', label: 'Cron', minWidth: 120 },
        {
          prop: 'status',
          label: '状态',
          width: 100,
          formatter: (row: JobListItem) => {
            const tag = statusTag[row.status]
            return h(ElTag, { type: tag.type }, () => tag.label)
          }
        },
        {
          prop: 'operation',
          label: '操作',
          width: 200,
          fixed: 'right',
          formatter: (row: JobListItem) => {
            const items: TableActionItem[] = [
              {
                key: 'edit',
                label: '编辑',
                auth: 'infra:job:update',
                onClick: () => handleAction('edit', row)
              },
              {
                key: 'toggle',
                label: row.status === 1 ? '暂停' : '启用',
                auth: 'infra:job:update',
                onClick: () => handleAction('toggle', row)
              },
              {
                key: 'run',
                label: '执行一次',
                auth: 'infra:job:run',
                onClick: () => handleAction('run', row)
              },
              {
                key: 'logs',
                label: '日志',
                auth: 'infra:job:log:list',
                onClick: () => handleAction('logs', row)
              },
              {
                key: 'delete',
                label: '删除',
                danger: true,
                auth: 'infra:job:delete',
                onClick: () => handleAction('delete', row)
              }
            ]
            return h(ArtTableActions, { items })
          }
        }
      ]
    }
  })

  onMounted(async () => {
    handlers.value = await fetchJobHandlers()
  })

  function openDialog(type: 'add' | 'edit', row?: JobListItem) {
    dialogType.value = type
    currentJob.value = row
    dialogVisible.value = true
  }

  async function handleAction(key: string | undefined, row: JobListItem) {
    switch (key) {
      case 'edit':
        openDialog('edit', row)
        break
      case 'toggle':
        await updateJobStatus(row.id, { status: row.status === 1 ? 0 : 1 })
        ElMessage.success('状态已更新')
        refreshData()
        break
      case 'run':
        await runJob(row.id)
        ElMessage.success('任务已排队，请在执行日志查看结果')
        break
      case 'logs':
        logJobId.value = row.id
        logVisible.value = true
        break
      case 'delete':
        await ElMessageBox.confirm(`确定删除任务「${row.name}」吗？`, '删除确认', {
          type: 'warning'
        })
        await deleteJob(row.id)
        ElMessage.success('删除成功')
        refreshData()
        break
    }
  }
</script>
