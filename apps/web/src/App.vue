<script setup lang="ts">
/**
 * M0+/工作流/M1 工作台：健康、员工、绑定、双实例、领取配置、AI 探测，禁止 mock。
 */
import { computed, onMounted, ref } from "vue";
import ClaimConfigPanel from "./ClaimConfigPanel.vue";
import DualInstanceWorkbench from "./DualInstanceWorkbench.vue";
import BoundedExecutionPanel from "./BoundedExecutionPanel.vue";
import ArtifactAudiencePanel from "./ArtifactAudiencePanel.vue";
import SourceSnapshotPanel from "./SourceSnapshotPanel.vue";
import WorkflowBindingPanel from "./WorkflowBindingPanel.vue";
import {
  createDigitalEmployee,
  fetchAiProbe,
  fetchDigitalEmployees,
  fetchHealth,
  type AiProbeResult,
  type DigitalEmployeeListResponse,
  type DigitalEmployeeRecord,
  type HealthStatus,
} from "./api-client";

const health = ref<HealthStatus | null>(null);
const employees = ref<DigitalEmployeeListResponse | null>(null);
const aiProbe = ref<AiProbeResult | null>(null);
const error = ref<string | null>(null);
const createName = ref("");
const creating = ref(false);
const createError = ref<string | null>(null);

const employeeItems = computed<DigitalEmployeeRecord[]>(
  () => employees.value?.items ?? [],
);

/**
 * 并行加载三项真实探测。
 */
async function loadStatus(): Promise<void> {
  error.value = null;
  try {
    const [h, e, a] = await Promise.all([
      fetchHealth(),
      fetchDigitalEmployees(),
      fetchAiProbe(),
    ]);
    health.value = h;
    employees.value = e;
    aiProbe.value = a;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : String(err);
  }
}

/**
 * 提交真实创建请求并刷新列表。
 */
async function onCreateEmployee(): Promise<void> {
  createError.value = null;
  const name = createName.value.trim();
  if (!name) {
    createError.value = "请输入数字员工名称";
    return;
  }
  creating.value = true;
  try {
    await createDigitalEmployee(name);
    createName.value = "";
    employees.value = await fetchDigitalEmployees();
  } catch (err: unknown) {
    createError.value = err instanceof Error ? err.message : String(err);
  } finally {
    creating.value = false;
  }
}

onMounted(() => {
  void loadStatus();
});
</script>

<template>
  <main class="shell">
    <header class="hero">
      <p class="brand">ZKER Staff</p>
      <h1>OA 数字员工协作平台</h1>
      <p class="lead">
        M1 双实例 + 领取配置 + 来源快照 + 有界执行 + 产物受众 + 工作流绑定：真实读写与持久化，禁止 mock。
      </p>
    </header>

    <section v-if="error" class="panel error">
      <h2>加载失败</h2>
      <p>{{ error }}</p>
      <button type="button" @click="loadStatus">重试</button>
    </section>

    <section class="grid">
      <article class="panel">
        <h2>健康检查</h2>
        <pre v-if="health">{{ health }}</pre>
        <p v-else>加载中…</p>
      </article>

      <article class="panel employees">
        <h2>数字员工登记</h2>
        <p v-if="employees">total = {{ employees.total }}</p>
        <ul v-if="employees && employees.items.length" class="employee-list">
          <li v-for="item in employees.items" :key="item.id">
            <strong>{{ item.name }}</strong>
            <span>{{ item.id }}</span>
            <time>{{ item.createdAt }}</time>
          </li>
        </ul>
        <p v-else-if="employees">暂无登记</p>
        <p v-else>加载中…</p>

        <form class="create-form" @submit.prevent="onCreateEmployee">
          <label for="de-name">新建数字员工</label>
          <input
            id="de-name"
            v-model="createName"
            type="text"
            maxlength="80"
            placeholder="例如 research-aide"
            :disabled="creating"
          />
          <button type="submit" :disabled="creating">
            {{ creating ? "创建中…" : "创建并持久化" }}
          </button>
          <p v-if="createError" class="form-error">{{ createError }}</p>
        </form>
      </article>

      <article class="panel">
        <h2>AI 探测</h2>
        <pre v-if="aiProbe">{{ aiProbe }}</pre>
        <p v-else>加载中…</p>
      </article>
    </section>

    <DualInstanceWorkbench class="workflow-slot" />
    <ClaimConfigPanel class="workflow-slot" :employees="employeeItems" />
    <SourceSnapshotPanel class="workflow-slot" />
    <BoundedExecutionPanel class="workflow-slot" />
    <ArtifactAudiencePanel class="workflow-slot" />
    <WorkflowBindingPanel class="workflow-slot" :employees="employeeItems" />
  </main>
</template>

<style>
:root {
  --bg0: #0f1c24;
  --bg1: #173041;
  --ink: #e8f1f4;
  --muted: #9db4c0;
  --accent: #3d9b8f;
  --danger: #c45c5c;
  --panel: rgba(255, 255, 255, 0.06);
  font-family: "IBM Plex Sans", "Source Han Sans SC", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  color: var(--ink);
  background:
    radial-gradient(1200px 600px at 10% -10%, #2a5a63 0%, transparent 55%),
    radial-gradient(900px 500px at 90% 0%, #1f3d55 0%, transparent 50%),
    linear-gradient(160deg, var(--bg0), var(--bg1));
}

.shell {
  max-width: 960px;
  margin: 0 auto;
  padding: 3rem 1.25rem 4rem;
}

.brand {
  margin: 0;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent);
  font-size: 0.85rem;
}

.hero h1 {
  margin: 0.4rem 0 0.6rem;
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  font-weight: 600;
}

.lead {
  margin: 0;
  color: var(--muted);
}

.grid {
  display: grid;
  gap: 1rem;
  margin-top: 2rem;
}

@media (min-width: 800px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.workflow-slot {
  margin-top: 1rem;
}

.workflow .hint {
  margin: 0 0 0.75rem;
  color: var(--muted);
  font-size: 0.85rem;
}

.panel {
  background: var(--panel);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 1rem 1.1rem;
}

.panel h2 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
}

.panel pre {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 0.8rem;
  color: var(--muted);
}

.panel.error {
  border-color: color-mix(in srgb, var(--danger) 50%, transparent);
}

.employee-list {
  list-style: none;
  margin: 0 0 1rem;
  padding: 0;
  display: grid;
  gap: 0.55rem;
}

.employee-list li {
  display: grid;
  gap: 0.15rem;
  padding: 0.55rem 0.65rem;
  background: rgba(0, 0, 0, 0.18);
  border-radius: 8px;
}

.employee-list span,
.employee-list time {
  color: var(--muted);
  font-size: 0.75rem;
  word-break: break-all;
}

.create-form {
  display: grid;
  gap: 0.45rem;
  margin-top: 0.75rem;
}

.create-form label {
  font-size: 0.85rem;
  color: var(--muted);
}

.create-form input {
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.25);
  color: var(--ink);
  padding: 0.5rem 0.65rem;
}

.create-form select {
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.25);
  color: var(--ink);
  padding: 0.5rem 0.65rem;
}

.form-error {
  margin: 0;
  color: var(--danger);
  font-size: 0.8rem;
}

button {
  margin-top: 0.25rem;
  background: var(--accent);
  color: #062018;
  border: 0;
  border-radius: 8px;
  padding: 0.45rem 0.9rem;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
