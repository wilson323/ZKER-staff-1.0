<script setup lang="ts">
/**
 * M1-03 来源确认与执行快照面板：真实 API，表单 label↔id。
 */
import { computed, onMounted, ref } from "vue";
import {
  fetchClaimableTasks,
  type ClaimableHumanTaskRecord,
} from "./claim-api-client";
import {
  confirmFactBaseline,
  createContextPreview,
  createExecutionSnapshot,
  fetchTaskSources,
  registerTaskSource,
  revokeTaskSource,
  type ContextPreviewRecord,
  type ExecutionSnapshotRecord,
  type FactBaselineRecord,
  type TaskSourceRecord,
} from "./snapshot-api-client";
import type { WorkbenchSession } from "./workbench-api-client";

const DEMO_SESSION: WorkbenchSession = {
  tenantId: "tenant-alpha",
  personId: "demo_executor",
};

const error = ref<string | null>(null);
const busy = ref(false);
const tasks = ref<ClaimableHumanTaskRecord[]>([]);
const selectedId = ref<string | null>(null);
const selected = ref<ClaimableHumanTaskRecord | null>(null);
const sources = ref<TaskSourceRecord[]>([]);
const preview = ref<ContextPreviewRecord | null>(null);
const baseline = ref<FactBaselineRecord | null>(null);
const snapshot = ref<ExecutionSnapshotRecord | null>(null);
const sourceLabel = ref("合同正文");
const sourceRequired = ref(true);
const saveMsg = ref<string | null>(null);

const taskCount = computed(() => tasks.value.length);

/**
 * 刷新已领取任务。
 */
async function refreshTasks(): Promise<void> {
  error.value = null;
  const list = await fetchClaimableTasks(DEMO_SESSION);
  tasks.value = list.items.filter((item) => item.state === "CLAIMED");
}

/**
 * 选中任务并载入人员可见来源。
 */
async function selectTask(id: string): Promise<void> {
  error.value = null;
  saveMsg.value = null;
  preview.value = null;
  baseline.value = null;
  snapshot.value = null;
  selectedId.value = id;
  selected.value = tasks.value.find((item) => item.id === id) ?? null;
  if (!selected.value) {
    sources.value = [];
    return;
  }
  const list = await fetchTaskSources(DEMO_SESSION, id);
  sources.value = list.items;
}

/**
 * 登记人员可见必需来源。
 */
async function onRegisterSource(): Promise<void> {
  if (!selectedId.value) {
    return;
  }
  busy.value = true;
  error.value = null;
  try {
    await registerTaskSource(DEMO_SESSION, selectedId.value, {
      label: sourceLabel.value.trim(),
      required: sourceRequired.value,
      visibility: "PERSON",
    });
    saveMsg.value = "来源已登记";
    await selectTask(selectedId.value);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}

/**
 * 确认基线。
 */
async function onConfirmBaseline(): Promise<void> {
  if (!selected.value) {
    return;
  }
  busy.value = true;
  error.value = null;
  try {
    baseline.value = await confirmFactBaseline(
      DEMO_SESSION,
      selected.value.id,
      sources.value.filter((item) => item.state === "ACTIVE").map((item) => item.id),
      selected.value.responsibilityEpoch,
    );
    saveMsg.value = `基线已确认 ${baseline.value.digest.slice(0, 18)}…`;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}

/**
 * 生成人员预览。
 */
async function onPreview(): Promise<void> {
  if (!selectedId.value) {
    return;
  }
  busy.value = true;
  error.value = null;
  try {
    preview.value = await createContextPreview(DEMO_SESSION, selectedId.value);
    saveMsg.value = "预览完成（不授权执行）";
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}

/**
 * 生成执行快照。
 */
async function onSnapshot(): Promise<void> {
  if (!selectedId.value) {
    return;
  }
  busy.value = true;
  error.value = null;
  try {
    snapshot.value = await createExecutionSnapshot(DEMO_SESSION, selectedId.value, {
      previewId: preview.value?.id ?? null,
    });
    saveMsg.value = `快照 ${snapshot.value.state}`;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}

/**
 * 撤销首个 ACTIVE 来源（负例演示）。
 */
async function onRevokeFirst(): Promise<void> {
  if (!selectedId.value) {
    return;
  }
  const first = sources.value.find((item) => item.state === "ACTIVE");
  if (!first) {
    return;
  }
  busy.value = true;
  error.value = null;
  try {
    await revokeTaskSource(DEMO_SESSION, selectedId.value, first.id);
    saveMsg.value = "已撤销来源，请重试快照";
    await selectTask(selectedId.value);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}

onMounted(() => {
  void refreshTasks();
});
</script>

<template>
  <section class="panel workflow snapshot-panel">
    <h2>M1-03 来源确认 / 执行快照</h2>
    <p class="hint">
      C16 基线 → C05 人员预览（不含后台私有）→ C06 重验快照；预览不授权执行。
      已领任务 {{ taskCount }}。
    </p>

    <p v-if="error" class="form-error">{{ error }}</p>
    <p v-if="saveMsg" class="ok">{{ saveMsg }}</p>

    <div class="row">
      <label for="ss-task">已领任务</label>
      <select
        id="ss-task"
        :value="selectedId ?? ''"
        :disabled="busy"
        @change="selectTask(($event.target as HTMLSelectElement).value)"
      >
        <option value="" disabled>选择任务</option>
        <option v-for="item in tasks" :key="item.id" :value="item.id">
          {{ item.title }} (epoch={{ item.responsibilityEpoch }})
        </option>
      </select>
      <button type="button" :disabled="busy" @click="refreshTasks">刷新</button>
    </div>

    <form class="create-form" @submit.prevent="onRegisterSource">
      <label for="ss-label">来源标签</label>
      <input
        id="ss-label"
        v-model="sourceLabel"
        type="text"
        maxlength="80"
        :disabled="busy || !selectedId"
      />
      <label for="ss-required">必需</label>
      <select
        id="ss-required"
        v-model="sourceRequired"
        :disabled="busy || !selectedId"
      >
        <option :value="true">是</option>
        <option :value="false">否</option>
      </select>
      <button type="submit" :disabled="busy || !selectedId">登记来源</button>
    </form>

    <ul v-if="sources.length" class="employee-list">
      <li v-for="item in sources" :key="item.id">
        <strong>{{ item.label }}</strong>
        <span>v{{ item.version }} / {{ item.state }}</span>
      </li>
    </ul>

    <div class="actions">
      <button type="button" :disabled="busy || !selectedId" @click="onConfirmBaseline">
        确认基线
      </button>
      <button type="button" :disabled="busy || !selectedId" @click="onPreview">
        人员预览
      </button>
      <button type="button" :disabled="busy || !selectedId" @click="onSnapshot">
        生成快照
      </button>
      <button type="button" :disabled="busy || !selectedId" @click="onRevokeFirst">
        撤销来源
      </button>
    </div>

    <pre v-if="preview">previewAuthorizedExecution={{ preview.previewAuthorizedExecution }}
backendOnlyActiveCount={{ preview.backendOnlyActiveCount }}
missing={{ preview.missingRequired.length }}
visible={{ preview.visibleSources.length }}</pre>
    <pre v-if="baseline">baseline digest={{ baseline.digest }}</pre>
    <pre v-if="snapshot">snapshot {{ snapshot.state }} manifest={{ snapshot.manifestId }}
block={{ snapshot.blockReason }}</pre>
  </section>
</template>

<style scoped>
.snapshot-panel .row,
.snapshot-panel .actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  margin: 0.75rem 0;
}

.snapshot-panel .ok {
  color: var(--accent);
}

.snapshot-panel select,
.snapshot-panel input {
  min-width: 12rem;
}
</style>
