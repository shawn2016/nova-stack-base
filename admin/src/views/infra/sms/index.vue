<template>
  <div class="art-full-height">
    <ArtListPanel
      v-model:active-tab="activeTab"
      v-model:show-search-bar="showSearchBar"
      v-model:columns="columnChecks"
      :tabs="SMS_TABS"
      :loading="panelLoading"
      @refresh="handlePanelRefresh"
      @tab-change="handleTabChange"
    >
      <template #search>
        <ArtSearchBar
          :key="activeTab"
          v-model="searchForms[activeTab]"
          :items="currentSearchItems"
          :showExpand="false"
          embedded
          @reset="handleSearchReset"
          @search="handleSearch"
        />
      </template>
      <template #head-actions>
        <template v-if="activeTab === 'channels'">
          <ElButton
            v-permission="'infra:sms:channel:create'"
            type="primary"
            @click="openChannelDialog('add')"
            v-ripple
          >
            新增通道
          </ElButton>
        </template>
        <template v-else-if="activeTab === 'templates'">
          <ElButton
            v-permission="'infra:sms:template:create'"
            type="primary"
            @click="openTemplateDialog('add')"
            v-ripple
          >
            新增模板
          </ElButton>
          <ElButton v-permission="'infra:sms:send'" plain @click="sendVisible = true" v-ripple>
            测试发送
          </ElButton>
        </template>
      </template>

      <ArtTable
        :loading="panelLoading"
        :data="currentData"
        :columns="visibleColumns"
        :pagination="currentPagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ArtListPanel>

    <SmsChannelDialog
      v-model:visible="channelVisible"
      :dialog-type="channelMode"
      :channel-data="currentChannel"
      @success="refreshChannels"
    />

    <SmsTemplateDialog
      v-model:visible="templateVisible"
      :dialog-type="templateMode"
      :template-data="currentTemplate"
      :channels="channelList"
      @success="refreshTemplates"
    />

    <SmsSendDialog
      v-model:visible="sendVisible"
      :templates="templateList"
      @success="handleSendSuccess"
    />
  </div>
</template>

<script setup lang="ts">
  import type { ColumnOption } from '@/types/component'
  import ArtTableActions from '@/components/core/tables/art-table-actions/index.vue'
  import type { TableActionItem } from '@/components/core/tables/art-table-actions/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import {
    deleteSmsChannel,
    deleteSmsTemplate,
    fetchSmsChannelList,
    fetchSmsLogList,
    fetchSmsTemplateList
  } from '@/api/sms'
  import type { SmsChannelListItem, SmsLogListItem, SmsTemplateListItem } from '@nova/shared-types'
  import { ElMessageBox, ElTag } from 'element-plus'
  import SmsChannelDialog from './modules/sms-channel-dialog.vue'
  import SmsTemplateDialog from './modules/sms-template-dialog.vue'
  import SmsSendDialog from './modules/sms-send-dialog.vue'

  defineOptions({ name: 'InfraSms' })

  type SmsTab = 'channels' | 'templates' | 'logs'

  const SMS_TABS = [
    { name: 'channels', label: '通道' },
    { name: 'templates', label: '模板' },
    { name: 'logs', label: '日志' }
  ]

  const activeTab = ref<SmsTab>('channels')
  const showSearchBar = ref(true)

  const searchForms = reactive({
    channels: { keyword: '' },
    templates: { keyword: '' },
    logs: { phone: '', templateCode: '' }
  })

  const channelVisible = ref(false)
  const channelMode = ref<'add' | 'edit'>('add')
  const currentChannel = ref<SmsChannelListItem | undefined>(undefined)

  const templateVisible = ref(false)
  const templateMode = ref<'add' | 'edit'>('add')
  const currentTemplate = ref<SmsTemplateListItem | undefined>(undefined)

  const sendVisible = ref(false)

  const channelTable = useTable({
    core: {
      apiFn: fetchSmsChannelList,
      apiParams: { current: 1, size: 20 },
      columnsFactory: () => [
        { prop: 'name', label: '名称', minWidth: 120 },
        { prop: 'provider', label: 'Provider', width: 100 },
        {
          prop: 'status',
          label: '状态',
          width: 90,
          formatter: (row: SmsChannelListItem) =>
            h(ElTag, { type: row.status === 1 ? 'success' : 'info' }, () =>
              row.status === 1 ? '启用' : '禁用'
            )
        },
        {
          prop: 'operation',
          label: '操作',
          width: 160,
          fixed: 'right',
          formatter: (row: SmsChannelListItem) => h(ArtTableActions, { items: channelActions(row) })
        }
      ]
    }
  })

  const templateTable = useTable({
    core: {
      apiFn: fetchSmsTemplateList,
      apiParams: { current: 1, size: 20 },
      columnsFactory: () => [
        { prop: 'code', label: 'Code', width: 120 },
        { prop: 'name', label: '名称', minWidth: 120 },
        { prop: 'content', label: '内容', minWidth: 200, showOverflowTooltip: true },
        {
          prop: 'status',
          label: '状态',
          width: 90,
          formatter: (row: SmsTemplateListItem) =>
            h(ElTag, { type: row.status === 1 ? 'success' : 'info' }, () =>
              row.status === 1 ? '启用' : '禁用'
            )
        },
        {
          prop: 'operation',
          label: '操作',
          width: 160,
          fixed: 'right',
          formatter: (row: SmsTemplateListItem) =>
            h(ArtTableActions, { items: templateActions(row) })
        }
      ]
    }
  })

  const logTable = useTable({
    core: {
      apiFn: fetchSmsLogList,
      apiParams: { current: 1, size: 20 },
      immediate: false,
      columnsFactory: () => [
        { prop: 'phone', label: '手机号', width: 120 },
        { prop: 'templateCode', label: '模板', width: 120 },
        { prop: 'content', label: '内容', minWidth: 180, showOverflowTooltip: true },
        {
          prop: 'status',
          label: '状态',
          width: 80,
          formatter: (row: SmsLogListItem) =>
            h(ElTag, { type: row.status === 1 ? 'success' : 'danger' }, () =>
              row.status === 1 ? '成功' : '失败'
            )
        },
        {
          prop: 'sentAt',
          label: '发送时间',
          minWidth: 160,
          formatter: (row: SmsLogListItem) => new Date(row.sentAt).toLocaleString('zh-CN')
        }
      ]
    }
  })

  const channelList = computed(() => channelTable.data.value)
  const templateList = computed(() => templateTable.data.value)

  const columnChecks = computed<ColumnOption[]>({
    get: () => {
      if (activeTab.value === 'channels') return channelTable.columnChecks.value
      if (activeTab.value === 'templates') return templateTable.columnChecks.value
      return logTable.columnChecks.value
    },
    set: (value) => {
      if (activeTab.value === 'channels') channelTable.columnChecks.value = value
      else if (activeTab.value === 'templates') templateTable.columnChecks.value = value
      else logTable.columnChecks.value = value
    }
  })

  const currentData = computed(() => {
    if (activeTab.value === 'channels') return channelTable.data.value
    if (activeTab.value === 'templates') return templateTable.data.value
    return logTable.data.value
  })

  const panelLoading = computed(() => {
    if (activeTab.value === 'channels') return channelTable.loading.value
    if (activeTab.value === 'templates') return templateTable.loading.value
    return logTable.loading.value
  })

  const currentPagination = computed(() => {
    if (activeTab.value === 'channels') return channelTable.pagination
    if (activeTab.value === 'templates') return templateTable.pagination
    return logTable.pagination
  })

  const visibleColumns = computed(() =>
    columnChecks.value.filter((col) => col.checked !== false && col.visible !== false)
  )

  const currentSearchItems = computed(() => {
    if (activeTab.value === 'logs') {
      return [
        {
          label: '手机号',
          key: 'phone',
          type: 'input',
          props: { clearable: true, placeholder: '请输入手机号' }
        },
        {
          label: '模板',
          key: 'templateCode',
          type: 'input',
          props: { clearable: true, placeholder: '模板 Code' }
        }
      ]
    }
    return [
      {
        label: '关键词',
        key: 'keyword',
        type: 'input',
        props: {
          clearable: true,
          placeholder: activeTab.value === 'channels' ? '通道名称' : '模板名称或 Code'
        }
      }
    ]
  })

  function getActiveTable() {
    if (activeTab.value === 'channels') return channelTable
    if (activeTab.value === 'templates') return templateTable
    return logTable
  }

  function handlePanelRefresh() {
    getActiveTable().refreshData()
  }

  function handleTabChange() {
    if (activeTab.value === 'logs') {
      logTable.getData()
    }
  }

  function handleSearch() {
    const table = getActiveTable()
    if (activeTab.value === 'logs') {
      table.replaceSearchParams({
        phone: searchForms.logs.phone || undefined,
        templateCode: searchForms.logs.templateCode || undefined,
        current: 1,
        size: table.pagination.size
      })
    } else {
      table.replaceSearchParams({
        keyword: searchForms[activeTab.value].keyword || undefined,
        current: 1,
        size: table.pagination.size
      })
    }
    table.getData()
  }

  function handleSearchReset() {
    if (activeTab.value === 'logs') {
      searchForms.logs.phone = ''
      searchForms.logs.templateCode = ''
    } else {
      searchForms[activeTab.value].keyword = ''
    }
    handleSearch()
  }

  function handleSizeChange(size: number) {
    getActiveTable().handleSizeChange(size)
  }

  function handleCurrentChange(current: number) {
    getActiveTable().handleCurrentChange(current)
  }

  function channelActions(row: SmsChannelListItem): TableActionItem[] {
    return [
      {
        key: 'edit',
        label: '编辑',
        auth: 'infra:sms:channel:update',
        onClick: () => openChannelDialog('edit', row)
      },
      {
        key: 'delete',
        label: '删除',
        danger: true,
        auth: 'infra:sms:channel:delete',
        onClick: () => removeChannel(row)
      }
    ]
  }

  function templateActions(row: SmsTemplateListItem): TableActionItem[] {
    return [
      {
        key: 'edit',
        label: '编辑',
        auth: 'infra:sms:template:update',
        onClick: () => openTemplateDialog('edit', row)
      },
      {
        key: 'delete',
        label: '删除',
        danger: true,
        auth: 'infra:sms:template:delete',
        onClick: () => removeTemplate(row)
      }
    ]
  }

  function openChannelDialog(mode: 'add' | 'edit', row?: SmsChannelListItem) {
    channelMode.value = mode
    currentChannel.value = row
    channelVisible.value = true
  }

  function openTemplateDialog(mode: 'add' | 'edit', row?: SmsTemplateListItem) {
    templateMode.value = mode
    currentTemplate.value = row
    templateVisible.value = true
  }

  async function removeChannel(row: SmsChannelListItem) {
    await ElMessageBox.confirm(`确定删除通道「${row.name}」吗？`, '删除确认', { type: 'warning' })
    await deleteSmsChannel(row.id)
    ElMessage.success('删除成功')
    channelTable.refreshData()
  }

  async function removeTemplate(row: SmsTemplateListItem) {
    await ElMessageBox.confirm(`确定删除模板「${row.code}」吗？`, '删除确认', { type: 'warning' })
    await deleteSmsTemplate(row.id)
    ElMessage.success('删除成功')
    templateTable.refreshData()
  }

  function refreshChannels() {
    channelTable.refreshData()
  }

  function refreshTemplates() {
    templateTable.refreshData()
  }

  function handleSendSuccess() {
    if (activeTab.value === 'logs') {
      logTable.refreshData()
    }
  }
</script>
