<script setup lang="ts">
/**
 * M1-05 产物与受众发布面板：真实 API；label[for]↔id；禁 mock。
 */
import { computed, onMounted, ref } from "vue";
import {
  fetchClaimableTasks,
  type ClaimableHumanTaskRecord,
} from "./claim-api-client";
import {
  completeArtifactUpload,
  createOutputRelease,
  fetchArtifacts,
  fetchOutputReleaseView,
  prepareArtifactUpload,
  putUploadBytes,
  type ArtifactVersionRecord,
  type OutputReleaseRecord,
  type OutputReleaseView,
} from "./publish-api-client";
import type { WorkbenchSession } from "./workbench-api-client";

const DEMO_SESSION: WorkbenchSession = {
  tenantId: "tenant-alpha",
  personId: "demo_executor",
};

const error = ref<string | null>(null);
const busy = ref(false);
const tasks = ref<ClaimableHumanTaskRecord[]>([]);
const selectedId = ref<string | null>(null);
const artifacts = ref<ArtifactVersionRecord[]>([]);
const current = ref<ArtifactVersionRecord | null>(null);
const release = ref<OutputReleaseRecord | null>(null);
const view = ref<OutputReleaseView | null>(null);
const fileName = ref("交付说明.md");
const mediaType = ref("text/markdown");
const content = ref("真实交付正文 v1");
const sourceNote = ref("来源基线 v1");
const audience = ref<"ASSIGNEE" | "REVIEWER" | "TENANT">("ASSIGNEE");
const doRelease = ref(true);
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
 * 选中任务并载入产物。
 */
async function selectTask(id: string): Promise<void> {
  error.value = null;
  saveMsg.value = null;
  selectedId.value = id;
  current.value = null;
  release.value = null;
  view.value = null;
  const list = await fetchArtifacts(DEMO_SESSION, id);
  artifacts.value = list.items;
  current.value = list.items[list.items.length - 1] ?? null;
}

/**
 * prepare→字节→complete。
 */
async function onUpload(): Promise<void> {
  if (!selectedId.value) {
    return;
  }
  busy.value = true;
  error.value = null;
  try {
    const bytes = new TextEncoder().encode(content.value);
    const ticket = await prepareArtifactUpload(DEMO_SESSION, selectedId.value, {
      fileName: fileName.value.trim(),
      mediaType: mediaType.value.trim(),
      sizeBytes: bytes.byteLength,
    });
    await putUploadBytes(DEMO_SESSION, ticket.id, bytes);
    const art = await completeArtifactUpload(DEMO_SESSION, ticket.id);
    current.value = art;
    saveMsg.value = `版本 ${art.version} digest=${art.digest.slice(0, 18)}…`;
    await selectTask(selectedId.value);
    current.value = art;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}

/**
 * 创建受众发布并读取门控视图。
 */
async function onPublish(): Promise<void> {
  if (!selectedId.value || !current.value) {
    return;
  }
  busy.value = true;
  error.value = null;
  try {
    const rec = await createOutputRelease(DEMO_SESSION, selectedId.value, {
      artifactVersionId: current.value.id,
      audience: audience.value,
      sourceVersionNote: sourceNote.value.trim(),
      release: doRelease.value,
    });
    release.value = rec;
    view.value = await fetchOutputReleaseView(DEMO_SESSION, rec.id);
    saveMsg.value = view.value.allowed
      ? "获准视图可读"
      : `未获准：${view.value.denyReason}`;
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
  <section class="panel workflow">
    <h2>M1-05 产物与受众发布</h2>
    <p class="hint">
      prepare→隔离字节→服务端 digest；候选/获准 OutputRelease；无公开 URL。CLAIMED={{
        taskCount
      }}
    </p>
    <p v-if="error" class="form-error">{{ error }}</p>
    <p v-if="saveMsg">{{ saveMsg }}</p>

    <ul class="employee-list">
      <li v-for="task in tasks" :key="task.id">
        <button type="button" :disabled="busy" @click="selectTask(task.id)">
          选择 {{ task.title }}
        </button>
        <span>{{ task.id }}</span>
      </li>
    </ul>

    <form class="create-form" @submit.prevent="onUpload">
      <label for="pub-file-name">文件名</label>
      <input id="pub-file-name" v-model="fileName" type="text" :disabled="busy" />

      <label for="pub-media-type">MIME</label>
      <select id="pub-media-type" v-model="mediaType" :disabled="busy">
        <option value="text/markdown">text/markdown</option>
        <option value="text/plain">text/plain</option>
        <option value="application/octet-stream">application/octet-stream</option>
      </select>

      <label for="pub-content">正文</label>
      <textarea id="pub-content" v-model="content" rows="3" :disabled="busy" />

      <button type="submit" :disabled="busy || !selectedId">
        {{ busy ? "上传中…" : "上传并 complete" }}
      </button>
    </form>

    <form class="create-form" @submit.prevent="onPublish">
      <label for="pub-source-note">来源版本说明</label>
      <input
        id="pub-source-note"
        v-model="sourceNote"
        type="text"
        :disabled="busy"
      />

      <label for="pub-audience">受众</label>
      <select id="pub-audience" v-model="audience" :disabled="busy">
        <option value="ASSIGNEE">ASSIGNEE</option>
        <option value="REVIEWER">REVIEWER</option>
        <option value="TENANT">TENANT</option>
      </select>

      <label for="pub-release-flag">立即获准发布</label>
      <input
        id="pub-release-flag"
        v-model="doRelease"
        type="checkbox"
        :disabled="busy"
      />

      <button type="submit" :disabled="busy || !current">创建 OutputRelease</button>
    </form>

    <pre v-if="current">{{ current }}</pre>
    <pre v-if="view">{{ view }}</pre>
  </section>
</template>
