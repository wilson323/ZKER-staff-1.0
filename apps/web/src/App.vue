<script setup lang="ts">
/**
 * M0 工作台壳：展示真实 API 探测结果，不编造员工。
 */
import { onMounted, ref } from "vue";
import {
  fetchAiProbe,
  fetchDigitalEmployees,
  fetchHealth,
  type AiProbeResult,
  type DigitalEmployeeListResponse,
  type HealthStatus,
} from "./api-client";

const health = ref<HealthStatus | null>(null);
const employees = ref<DigitalEmployeeListResponse | null>(null);
const aiProbe = ref<AiProbeResult | null>(null);
const error = ref<string | null>(null);

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

onMounted(() => {
  void loadStatus();
});
</script>

<template>
  <main class="shell">
    <header class="hero">
      <p class="brand">ZKER Staff</p>
      <h1>OA 数字员工协作平台 · M0</h1>
      <p class="lead">工程门禁壳：只展示真实 API 回读，禁止 mock 员工。</p>
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
      <article class="panel">
        <h2>数字员工登记</h2>
        <p v-if="employees">total = {{ employees.total }}</p>
        <pre v-if="employees">{{ employees }}</pre>
        <p v-else>加载中…</p>
      </article>
      <article class="panel">
        <h2>AI 探测</h2>
        <pre v-if="aiProbe">{{ aiProbe }}</pre>
        <p v-else>加载中…</p>
      </article>
    </section>
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
  word-break: break-word;
  font-size: 0.8rem;
  color: var(--muted);
}

.panel.error {
  border-color: color-mix(in srgb, var(--danger) 50%, transparent);
}

button {
  margin-top: 0.75rem;
  background: var(--accent);
  color: #062018;
  border: 0;
  border-radius: 8px;
  padding: 0.45rem 0.9rem;
  cursor: pointer;
}
</style>
