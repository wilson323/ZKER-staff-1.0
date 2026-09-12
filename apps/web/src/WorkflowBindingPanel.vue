<script setup lang="ts">
/**
 * 最小工作流绑定面板：创建工作项→人任务→绑定，调用真实 API。
 */
import { onMounted, ref, watch } from "vue";
import {
  createHumanTask,
  createTaskBinding,
  createWorkItem,
  fetchHumanTasks,
  fetchTaskBindings,
  fetchWorkItems,
  type BindingMode,
  type DigitalEmployeeRecord,
  type HumanTaskRecord,
  type ListResponse,
  type TaskBindingRecord,
  type WorkItemRecord,
} from "./api-client";

const props = defineProps<{
  employees: DigitalEmployeeRecord[];
}>();

const workItems = ref<ListResponse<WorkItemRecord> | null>(null);
const humanTasks = ref<ListResponse<HumanTaskRecord> | null>(null);
const bindings = ref<ListResponse<TaskBindingRecord> | null>(null);
const error = ref<string | null>(null);
const busy = ref(false);

const workTitle = ref("");
const taskTitle = ref("");
const personId = ref("person-alice");
const selectedWorkId = ref("");
const selectedTaskId = ref("");
const selectedEmployeeId = ref("");
const mode = ref<BindingMode>("ASSISTED");

/**
 * 刷新三类列表。
 */
async function reload(): Promise<void> {
  error.value = null;
  try {
    const [works, tasks, binds] = await Promise.all([
      fetchWorkItems(),
      fetchHumanTasks(),
      fetchTaskBindings(),
    ]);
    workItems.value = works;
    humanTasks.value = tasks;
    bindings.value = binds;
    if (!selectedWorkId.value && works.items[0]) {
      selectedWorkId.value = works.items[0].id;
    }
    if (!selectedTaskId.value && tasks.items[0]) {
      selectedTaskId.value = tasks.items[0].id;
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : String(err);
  }
}

/**
 * 创建工作项。
 */
async function onCreateWork(): Promise<void> {
  busy.value = true;
  error.value = null;
  try {
    const created = await createWorkItem(workTitle.value);
    workTitle.value = "";
    selectedWorkId.value = created.id;
    await reload();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}

/**
 * 创建人任务。
 */
async function onCreateTask(): Promise<void> {
  busy.value = true;
  error.value = null;
  try {
    const created = await createHumanTask({
      workId: selectedWorkId.value,
      assigneePersonId: personId.value,
      title: taskTitle.value,
    });
    taskTitle.value = "";
    selectedTaskId.value = created.id;
    await reload();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}

/**
 * 创建任务绑定。
 */
async function onCreateBinding(): Promise<void> {
  busy.value = true;
  error.value = null;
  try {
    await createTaskBinding({
      workId: selectedWorkId.value,
      humanTaskId: selectedTaskId.value,
      configuredBy: personId.value,
      mode: mode.value,
      digitalEmployeeId:
        mode.value === "MANUAL" ? null : selectedEmployeeId.value,
    });
    await reload();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}

watch(
  () => props.employees,
  (items) => {
    if (!selectedEmployeeId.value && items[0]) {
      selectedEmployeeId.value = items[0].id;
    }
  },
  { immediate: true },
);

onMounted(() => {
  void reload();
});
</script>

<template>
  <section class="panel workflow">
    <h2>工作流绑定闭环</h2>
    <p class="hint">人 → 任务 → 数字员工；真实读写，禁 mock。</p>
    <p v-if="error" class="form-error">{{ error }}</p>

    <form class="create-form" @submit.prevent="onCreateWork">
      <label for="work-title">1. 新建工作项</label>
      <input id="work-title" v-model="workTitle" type="text" maxlength="120" />
      <button type="submit" :disabled="busy">创建工作项</button>
    </form>

    <form class="create-form" @submit.prevent="onCreateTask">
      <label for="person-id">2. 承担人</label>
      <input id="person-id" v-model="personId" type="text" maxlength="64" />
      <label for="task-work-id">所属工作项</label>
      <select id="task-work-id" v-model="selectedWorkId">
        <option disabled value="">选择工作项</option>
        <option v-for="w in workItems?.items ?? []" :key="w.id" :value="w.id">
          {{ w.title }}
        </option>
      </select>
      <label for="task-title">人任务标题</label>
      <input
        id="task-title"
        v-model="taskTitle"
        type="text"
        maxlength="120"
        placeholder="人任务标题"
      />
      <button type="submit" :disabled="busy">创建人任务</button>
    </form>

    <form class="create-form" @submit.prevent="onCreateBinding">
      <label for="bind-task-id">3. 保存绑定 — 人任务</label>
      <select id="bind-task-id" v-model="selectedTaskId">
        <option disabled value="">选择人任务</option>
        <option v-for="t in humanTasks?.items ?? []" :key="t.id" :value="t.id">
          {{ t.title }}
        </option>
      </select>
      <label for="bind-mode">绑定模式</label>
      <select id="bind-mode" v-model="mode">
        <option value="MANUAL">MANUAL</option>
        <option value="ASSISTED">ASSISTED</option>
        <option value="AUTONOMOUS">AUTONOMOUS</option>
      </select>
      <label v-if="mode !== 'MANUAL'" for="bind-employee-id">数字员工</label>
      <select
        v-if="mode !== 'MANUAL'"
        id="bind-employee-id"
        v-model="selectedEmployeeId"
      >
        <option disabled value="">选择数字员工</option>
        <option v-for="e in employees" :key="e.id" :value="e.id">
          {{ e.name }}
        </option>
      </select>
      <button type="submit" :disabled="busy">创建绑定</button>
    </form>

    <p>bindings total = {{ bindings?.total ?? "…" }}</p>
    <ul v-if="bindings?.items.length" class="employee-list">
      <li v-for="b in bindings.items" :key="b.id">
        <strong>{{ b.mode }} / {{ b.state }}</strong>
        <span>person={{ b.configuredBy }}</span>
        <span>task={{ b.humanTaskId }}</span>
        <span>employee={{ b.digitalEmployeeId ?? "(none)" }}</span>
      </li>
    </ul>
    <p v-else-if="bindings">暂无绑定</p>
  </section>
</template>
