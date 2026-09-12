<script setup lang="ts">
/**
 * M1-04 有界执行面板：真实 API；label[for]↔id；无 pause/resume。
 */
import { computed, onMounted, ref } from "vue";
import {
  advanceAttempt,
  cancelAttempt,
  fetchAttempts,
  reconcileAttempt,
  startAttempt,
  type AttemptRecord,
} from "./attempt-api-client";
import {
  fetchClaimableTasks,
  type ClaimableHumanTaskRecord,
} from "./claim-api-client";
import type { WorkbenchSession } from "./workbench-api-client";

const DEMO_SESSION: WorkbenchSession = {
  tenantId: "tenant-alpha",
  personId: "demo_executor",
};

const error = ref<string | null>(null);
const busy = ref(false);
const tasks = ref<ClaimableHumanTaskRecord[]>([]);
const selectedId = ref<string | null>(null);
const attempts = ref<AttemptRecord[]>([]);
const current = ref<AttemptRecord | null>(null);
const idemKey = ref(`idem-${Date.now()}`);
const acknowledge = ref(false);
const cancelReason = ref("需求变更");
const reconcileEvidence = ref("对端确认写入成功");
const saveMsg = ref<string | null>(null);

const taskCount = computed(() => tasks.value.length);
/** 本切片永不展示暂停/恢复。 */
const showPause = computed(() => false);

/**
 * 刷新已领取任务。
 */
async function refreshTasks(): Promise<void> {
  error.value = null;
  const list = await fetchClaimableTasks(DEMO_SESSION);
  tasks.value = list.items.filter((item) => item.state === "CLAIMED");
}

/**
 * 选中任务并载入 Attempt。
 */
async function selectTask(id: string): Promise<void> {
  error.value = null;
  saveMsg.value = null;
  selectedId.value = id;
  current.value = null;
  const list = await fetchAttempts(DEMO_SESSION, id);
  attempts.value = list.items;
  current.value = list.items[list.items.length - 1] ?? null;
}

/**
 * C06 启动（202/QUEUED）。
 */
async function onStart(): Promise<void> {
  if (!selectedId.value) {
    return;
  }
  busy.value = true;
  error.value = null;
  try {
    const record = await startAttempt(DEMO_SESSION, selectedId.value, {
      idempotencyKey: idemKey.value.trim(),
      acknowledgeNewAttempt: acknowledge.value,
    });
    current.value = record;
    saveMsg.value =
      record.state === "QUEUED"
        ? "已受理 QUEUED（非执行成功）"
        : `状态 ${record.state}`;
    if (record.newAttemptNotice) {
      saveMsg.value = record.newAttemptNotice;
    }
    await selectTask(selectedId.value);
    current.value = record;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}

/**
 * 推进一步真实状态。
 */
async function onAdvance(): Promise<void> {
  if (!current.value) {
    return;
  }
  busy.value = true;
  error.value = null;
  try {
    current.value = await advanceAttempt(DEMO_SESSION, current.value.id);
    saveMsg.value = `阶段：${current.value.stage}`;
    if (selectedId.value) {
      await selectTask(selectedId.value);
      current.value =
        attempts.value.find((item) => item.id === current.value?.id) ??
        current.value;
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}

/**
 * 取消当前 Attempt。
 */
async function onCancel(): Promise<void> {
  if (!current.value) {
    return;
  }
  busy.value = true;
  error.value = null;
  try {
    current.value = await cancelAttempt(
      DEMO_SESSION,
      current.value.id,
      cancelReason.value.trim(),
    );
    saveMsg.value = "已取消；新建须确认 acknowledgeNewAttempt";
    acknowledge.value = true;
    idemKey.value = `idem-${Date.now()}`;
    if (selectedId.value) {
      await selectTask(selectedId.value);
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}

/**
 * C14 查证落定。
 */
async function onReconcile(): Promise<void> {
  if (!current.value) {
    return;
  }
  busy.value = true;
  error.value = null;
  try {
    current.value = await reconcileAttempt(
      DEMO_SESSION,
      current.value.id,
      "SUCCEEDED",
      reconcileEvidence.value.trim(),
    );
    saveMsg.value = "C14 查证完成";
    if (selectedId.value) {
      await selectTask(selectedId.value);
    }
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
  <section class="panel workflow" aria-labelledby="bounded-exec-title">
    <h2 id="bounded-exec-title">M1-04 有界执行</h2>
    <p class="hint">
      C06 受理为 QUEUED；阶段由 advance 推进。无暂停/恢复。取消后新建须确认。
    </p>
    <p>已领取任务：{{ taskCount }}</p>
    <button type="button" :disabled="busy" @click="refreshTasks">刷新任务</button>

    <ul v-if="tasks.length" class="employee-list">
      <li v-for="task in tasks" :key="task.id">
        <button type="button" :disabled="busy" @click="selectTask(task.id)">
          {{ task.title }} · epoch {{ task.responsibilityEpoch }}
        </button>
      </li>
    </ul>
    <p v-else>请先在领取配置中领取任务并完成来源快照</p>

    <form class="create-form" @submit.prevent="onStart">
      <label for="attempt-idem">幂等键</label>
      <input id="attempt-idem" v-model="idemKey" type="text" :disabled="busy" />

      <label for="attempt-ack">
        <input
          id="attempt-ack"
          v-model="acknowledge"
          type="checkbox"
          :disabled="busy"
        />
        确认新建 Attempt（非续跑）
      </label>

      <button type="submit" :disabled="busy || !selectedId">启动执行</button>
    </form>

    <form class="create-form" @submit.prevent="onCancel">
      <label for="attempt-cancel-reason">取消原因</label>
      <input
        id="attempt-cancel-reason"
        v-model="cancelReason"
        type="text"
        :disabled="busy"
      />
      <button type="submit" :disabled="busy || !current">取消 Attempt</button>
    </form>

    <div class="create-form">
      <button type="button" :disabled="busy || !current" @click="onAdvance">
        推进一步
      </button>
      <button
        v-if="current?.state === 'RESULT_UNKNOWN'"
        type="button"
        :disabled="busy"
        @click="onReconcile"
      >
        C14 查证为成功
      </button>
      <p v-if="showPause" class="form-error">不应显示暂停（SDK 不支持）</p>
    </div>

    <form
      v-if="current?.state === 'RESULT_UNKNOWN'"
      class="create-form"
      @submit.prevent="onReconcile"
    >
      <label for="attempt-reconcile">查证证据</label>
      <input
        id="attempt-reconcile"
        v-model="reconcileEvidence"
        type="text"
        :disabled="busy"
      />
    </form>

    <p v-if="saveMsg" class="hint">{{ saveMsg }}</p>
    <p v-if="error" class="form-error">{{ error }}</p>

    <pre v-if="current">{{ current }}</pre>
    <ul v-if="attempts.length" class="employee-list">
      <li v-for="item in attempts" :key="item.id">
        #{{ item.attemptNumber }} {{ item.state }} fence={{ item.fence }}
        model={{ item.modelInvoked }}
      </li>
    </ul>
  </section>
</template>
