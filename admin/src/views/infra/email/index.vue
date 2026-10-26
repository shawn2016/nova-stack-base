<template>
  <div class="art-full-height">
    <ArtListPanel
      v-model:active-tab="activeTab"
      v-model:show-search-bar="showSearchBar"
      v-model:columns="columnChecks"
      :tabs="EMAIL_TABS"
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
            v-permission="'infra:email:channel:create'"
            type="primary"
            @click="openChannelDialog('add')"
            v-ripple
          >
            新增通道
          </ElButton>
        </template>
        <template v-else-if="activeTab === 'templates'">
          <ElButton
            v-permission="'infra:email:template:create'"
            type="primary"
            @click="openTemplateDialog('add')"
            v-ripple
          >
            新增模板
          </ElButton>
          <ElButton v-permission="'infra:email:send'" plain @click="sendVisible = true" v-ripple>
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

    <EmailChannelDialog
      v-model:visible="channelVisible"
      :dialog-type="channelMode"
      :channel-data="currentChannel"
      @success="refreshChannels"
    />

    <EmailTemplateDialog
      v-model:visible="templateVisible"
      :dialog-type="templateMode"
      :template-data="currentTemplate"
      :channels="channelList"
      @success="refreshTemplates"
    />

    <EmailSendDialog
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
    deleteEmailChannel,
    deleteEmailTemplate,
    fetchEmailChannelList,
    fetchEmailLogList,
    fetchEmailTemplateList
  } from '@/api/email'
  import type {
    EmailChannelListItem,
    EmailLogListItem,
    EmailTemplateListItem
  } from '@nova/shared-types'
  import { ElMessageBox, ElTag } from 'element-plus'
  import EmailChannelDialog from './modules/email-channel-dialog.vue'
  import EmailTemplateDialog from './modules/email-template-dialog.vue'
  import EmailSendDialog from './modules/email-send-dialog.vue'

  defineOptions({ name: 'InfraEmail' })

  type EmailTab = 'channels' | 'templates' | 'logs'

  const EMAIL_TABS = [
    { name: 'channels', label: '通道' },
    { name: 'templates', label: '模板' },
    { name: 'logs', label: '日志' }
  ]

  const activeTab = ref<EmailTab>('channels')
  const showSearchBar = ref(true)

  const searchForms = reactive({
    channels: { keyword: '' },
    templates: { keyword: '' },
    logs: { to: '', templateCode: '' }
  })

  const channelVisible = ref(false)
  const channelMode = ref<'add' | 'edit'>('add')
  const currentChannel = ref<EmailChannelListItem | undefined>(undefined)

  const templateVisible = ref(false)
  const templateMode = ref<'add' | 'edit'>('add')
  const currentTemplate = ref<EmailTemplateListItem | undefined>(undefined)

  const sendVisible = ref(false)

  const channelTable = useTable({
    core: {
      apiFn: fetchEmailChannelList,
      apiParams: { current: 1, size: 20 },
      columnsFactory: () => [
        { prop: 'name', label: '名称', minWidth: 120 },
        { prop: 'provider', label: 'Provider', width: 100 },
        {
          prop: 'status',
          label: '状态',
          width: 90,
          formatter: (row: EmailChannelListItem) =>
            h(ElTag, { type: row.status === 1 ? 'success' : 'info' }, () =>
              row.status === 1 ? '启用' : '禁用'
            )
        },
        {
          prop: 'operation',
          label: '操作',
          width: 160,
          fixed: 'right',
          formatter: (row: EmailChannelListItem) =>
            h(ArtTableActions, { items: channelActions(row) })
        }
      ]
    }
  })

  const templateTable = useTable({
    core: {
      apiFn: fetchEmailTemplateList,
      apiParams: { current: 1, size: 20 },
      columnsFactory: () => [
        { prop: 'code', label: 'Code', width: 120 },
        { prop: 'name', label: '名称', minWidth: 120 },
        { prop: 'subject', label: '主题', minWidth: 160, showOverflowTooltip: true },
        { prop: 'content', label: '内容', minWidth: 200, showOverflowTooltip: true },
        {
          prop: 'status',
          label: '状态',
          width: 90,
          formatter: (row: EmailTemplateListItem) =>
            h(ElTag, { type: row.status === 1 ? 'success' : 'info' }, () =>
              row.status === 1 ? '启用' : '禁用'
            )
        },
        {
          prop: 'operation',
          label: '操作',
          width: 160,
          fixed: 'right',
          formatter: (row: EmailTemplateListItem) =>
            h(ArtTableActions, { items: templateActions(row) })
        }
      ]
    }
  })

  const logTable = useTable({
    core: {
      apiFn: fetchEmailLogList,
      apiParams: { current: 1, size: 20 },
      immediate: false,
      columnsFactory: () => [
        { prop: 'to', label: '收件人', width: 180 },
        { prop: 'templateCode', label: '模板', width: 120 },
        { prop: 'subject', label: '主题', minWidth: 160, showOverflowTooltip: true },
        { prop: 'content', label: '内容', minWidth: 180, showOverflowTooltip: true },
        {
          prop: 'status',
          label: '状态',
          width: 80,
          formatter: (row: EmailLogListItem) =>
            h(ElTag, { type: row.status === 1 ? 'success' : 'danger' }, () =>
              row.status === 1 ? '成功' : '失败'
            )
        },
        {
          prop: 'sentAt',
          label: '发送时间',
          minWidth: 160,
          formatter: (row: EmailLogListItem) => new Date(row.sentAt).toLocaleString('zh-CN')
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
          label: '收件人',
          key: 'to',
          type: 'input',
          props: { clearable: true, placeholder: '请输入邮箱' }
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
        to: searchForms.logs.to || undefined,
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
      searchForms.logs.to = ''
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

  function channelActions(row: EmailChannelListItem): TableActionItem[] {
    return [
      {
        key: 'edit',
        label: '编辑',
        auth: 'infra:email:channel:update',
        onClick: () => openChannelDialog('edit', row)
      },
      {
        key: 'delete',
        label: '删除',
        danger: true,
        auth: 'infra:email:channel:delete',
        onClick: () => removeChannel(row)
      }
    ]
  }

  function templateActions(row: EmailTemplateListItem): TableActionItem[] {
    return [
      {
        key: 'edit',
        label: '编辑',
        auth: 'infra:email:template:update',
        onClick: () => openTemplateDialog('edit', row)
      },
      {
        key: 'delete',
        label: '删除',
        danger: true,
        auth: 'infra:email:template:delete',
        onClick: () => removeTemplate(row)
      }
    ]
  }

  function openChannelDialog(mode: 'add' | 'edit', row?: EmailChannelListItem) {
    channelMode.value = mode
    currentChannel.value = row
    channelVisible.value = true
  }

  function openTemplateDialog(mode: 'add' | 'edit', row?: EmailTemplateListItem) {
    templateMode.value = mode
    currentTemplate.value = row
    templateVisible.value = true
  }

  async function removeChannel(row: EmailChannelListItem) {
    await ElMessageBox.confirm(`确定删除通道「${row.name}」吗？`, '删除确认', { type: 'warning' })
    await deleteEmailChannel(row.id)
    ElMessage.success('删除成功')
    channelTable.refreshData()
  }

  async function removeTemplate(row: EmailTemplateListItem) {
    await ElMessageBox.confirm(`确定删除模板「${row.code}」吗？`, '删除确认', { type: 'warning' })
    await deleteEmailTemplate(row.id)
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
