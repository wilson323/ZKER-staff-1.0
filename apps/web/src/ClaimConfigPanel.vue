<script setup lang="ts">
/**
 * M1-02 领取与本人配置面板：真实 API，表单 label↔id。
 */
import { computed, onMounted, ref } from "vue";
import {
  claimHumanTask,
  fetchActivePersonConfig,
  fetchClaimableTasks,
  savePersonConfig,
  transferHumanTask,
  type ClaimableHumanTaskRecord,
  type PersonConfigMode,
  type PersonConfigRecord,
} from "./claim-api-client";
import type { DigitalEmployeeRecord } from "./api-client";
import type { WorkbenchSession } from "./workbench-api-client";

const props = defineProps<{
  employees: DigitalEmployeeRecord[];
}>();

const DEMO_SESSION: WorkbenchSession = {
  tenantId: "tenant-alpha",
  personId: "demo_executor",
};

const error = ref<string | null>(null);
const busy = ref(false);
const tasks = ref<ClaimableHumanTaskRecord[]>([]);
const selectedId = ref<string | null>(null);
const selected = ref<ClaimableHumanTaskRecord | null>(null);
const activeConfig = ref<PersonConfigRecord | null>(null);
const mode = ref<PersonConfigMode>("MANUAL");
const employeeId = ref("");
const preferenceNote = ref("");
const transferTo = ref("collab_bob");
const saveMsg = ref<string | null>(null);

const taskCount = computed(() => tasks.value.length);

/**
 * 刷新可领取任务列表。
 */
async function refresh(): Promise<void> {
  error.value = null;
  const list = await fetchClaimableTasks(DEMO_SESSION);
  tasks.value = list.items;
}

/**
 * 选中任务并尝试载入 ACTIVE 配置。
 */
async function selectTask(id: string): Promise<void> {
  error.value = null;
  saveMsg.value = null;
  activeConfig.value = null;
  const found = tasks.value.find((item) => item.id === id) ?? null;
  selectedId.value = id;
  selected.value = found;
  if (!found) {
    return;
  }
  try {
    activeConfig.value = await fetchActivePersonConfig(DEMO_SESSION, id);
    mode.value = activeConfig.value.mode;
    employeeId.value = activeConfig.value.digitalEmployeeId ?? "";
    preferenceNote.value = activeConfig.value.preferenceNote;
  } catch {
    // 无 ACTIVE 配置属正常
  }
}

/**
 * 领取当前选中任务。
 */
async function onClaim(): Promise<void> {
  if (!selectedId.value) {
    return;
  }
  busy.value = true;
  error.value = null;
  saveMsg.value = null;
  try {
    const updated = await claimHumanTask(DEMO_SESSION, selectedId.value);
    selected.value = updated;
    saveMsg.value = "领取成功";
    await refresh();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}

/**
 * 保存本人配置（不启动）。
 */
async function onSaveConfig(): Promise<void> {
  if (!selected.value) {
    return;
  }
  busy.value = true;
  error.value = null;
  saveMsg.value = null;
  try {
    const config = await savePersonConfig(DEMO_SESSION, selected.value.id, {
      mode: mode.value,
      digitalEmployeeId: mode.value === "MANUAL" ? null : employeeId.value,
      preferenceNote: preferenceNote.value,
      expectedRevision: selected.value.revision,
      responsibilityEpoch: selected.value.responsibilityEpoch,
    });
    activeConfig.value = config;
    saveMsg.value = `配置已保存 v${config.revision}（未启动）`;
    await refresh();
    const latest = tasks.value.find((item) => item.id === selected.value?.id);
    if (latest) {
      selected.value = latest;
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}

/**
 * 转派给协作人。
 */
async function onTransfer(): Promise<void> {
  if (!selected.value) {
    return;
  }
  busy.value = true;
  error.value = null;
  saveMsg.value = null;
  try {
    const updated = await transferHumanTask(DEMO_SESSION, selected.value.id, {
      toPersonId: transferTo.value.trim(),
      expectedRevision: selected.value.revision,
      responsibilityEpoch: selected.value.responsibilityEpoch,
    });
    selected.value = updated;
    activeConfig.value = null;
    saveMsg.value = `已转派 epoch=${updated.responsibilityEpoch}`;
    await refresh();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}

onMounted(() => {
  void refresh().catch((err: unknown) => {
    error.value = err instanceof Error ? err.message : String(err);
  });
});
</script>

<template>
  <section class="panel claim">
    <h2>M1-02 领取与本人配置</h2>
    <p class="hint">
      会话：{{ DEMO_SESSION.personId }}；并发领取仅一人成功；配置保存不启动。禁
      mock。
    </p>

    <div class="actions">
      <button type="button" :disabled="busy" @click="refresh">刷新任务</button>
      <span class="muted">可领取任务 = {{ taskCount }}</span>
    </div>

    <p v-if="error" class="form-error">{{ error }}</p>
    <p v-if="saveMsg" class="ok">{{ saveMsg }}</p>

    <ul v-if="tasks.length" class="item-list">
      <li v-for="item in tasks" :key="item.id">
        <button type="button" class="linkish" @click="selectTask(item.id)">
          <strong>{{ item.title }}</strong>
        </button>
        <span>{{ item.state }} · epoch={{ item.responsibilityEpoch }} · rev={{
          item.revision
        }}</span>
        <span>{{ item.assigneePersonId ?? "未领取" }}</span>
      </li>
    </ul>
    <p v-else>暂无可领取任务（先在上方工作台发起实例）</p>

    <div v-if="selected" class="detail">
      <h3>选中：{{ selected.title }}</h3>
      <pre>{{
        {
          id: selected.id,
          state: selected.state,
          assignee: selected.assigneePersonId,
          epoch: selected.responsibilityEpoch,
          revision: selected.revision,
          requiredOutputs: selected.requiredOutputs,
          budgetTokens: selected.budgetTokens,
        }
      }}</pre>

      <button
        type="button"
        :disabled="busy || selected.state === 'CLAIMED'"
        @click="onClaim"
      >
        领取
      </button>

      <form class="config-form" @submit.prevent="onSaveConfig">
        <label for="claim-mode">执行模式</label>
        <select id="claim-mode" v-model="mode" :disabled="busy">
          <option value="MANUAL">MANUAL</option>
          <option value="ASSISTED">ASSISTED</option>
          <option value="AUTONOMOUS">AUTONOMOUS</option>
        </select>

        <label for="claim-employee">数字员工</label>
        <select
          id="claim-employee"
          v-model="employeeId"
          :disabled="busy || mode === 'MANUAL'"
        >
          <option value="">（无）</option>
          <option
            v-for="emp in props.employees"
            :key="emp.id"
            :value="emp.id"
          >
            {{ emp.name }}
          </option>
        </select>

        <label for="claim-pref">偏好备注（可覆盖字段）</label>
        <input
          id="claim-pref"
          v-model="preferenceNote"
          type="text"
          maxlength="120"
          :disabled="busy"
        />

        <button type="submit" :disabled="busy || selected.state !== 'CLAIMED'">
          保存配置（不启动）
        </button>
      </form>

      <form class="config-form" @submit.prevent="onTransfer">
        <label for="claim-transfer-to">转派给</label>
        <input
          id="claim-transfer-to"
          v-model="transferTo"
          type="text"
          maxlength="80"
          :disabled="busy"
        />
        <button type="submit" :disabled="busy || selected.state !== 'CLAIMED'">
          转派（抬升 epoch）
        </button>
      </form>

      <pre v-if="activeConfig">{{ activeConfig }}</pre>
    </div>
  </section>
</template>

<style scoped>
.hint {
  margin: 0 0 0.75rem;
  color: var(--muted);
  font-size: 0.85rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.75rem;
}

.muted {
  color: var(--muted);
  font-size: 0.8rem;
}

.item-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.45rem;
}

.item-list li {
  display: grid;
  gap: 0.1rem;
  padding: 0.5rem 0.6rem;
  background: rgba(0, 0, 0, 0.18);
  border-radius: 8px;
}

.item-list span {
  color: var(--muted);
  font-size: 0.72rem;
  overflow-wrap: anywhere;
}

.linkish {
  margin: 0;
  padding: 0;
  background: transparent;
  color: var(--ink);
  text-align: left;
}

.detail {
  margin-top: 1rem;
  display: grid;
  gap: 0.45rem;
}

.detail pre {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 0.78rem;
  color: var(--muted);
}

.config-form {
  display: grid;
  gap: 0.4rem;
  margin-top: 0.35rem;
}

.config-form label {
  font-size: 0.85rem;
  color: var(--muted);
}

.config-form input,
.config-form select {
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.25);
  color: var(--ink);
  padding: 0.5rem 0.65rem;
}

.ok {
  margin: 0;
  color: var(--accent);
  font-size: 0.8rem;
}

.form-error {
  margin: 0;
  color: var(--danger);
  font-size: 0.8rem;
}
</style>
