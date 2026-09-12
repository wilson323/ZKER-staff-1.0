<script setup lang="ts">
/**
 * M1-01 双实例工作台：同模板发起 A1/A2，待办与草稿真实读写。
 */
import { computed, onMounted, ref } from "vue";
import {
  createWorkbenchInstance,
  ensureWorkbenchTemplate,
  fetchWorkbenchInstance,
  fetchWorkbenchInstances,
  fetchWorkbenchTodos,
  saveWorkbenchDraft,
  type ProcessInstanceRecord,
  type WorkbenchSession,
  type WorkbenchTodoRecord,
} from "./workbench-api-client";

const DEMO_SESSION: WorkbenchSession = {
  tenantId: "tenant-alpha",
  personId: "demo_executor",
};
const OTHER_SESSION: WorkbenchSession = {
  tenantId: "tenant-beta",
  personId: "other_user",
};

const error = ref<string | null>(null);
const busy = ref(false);
const templateId = ref<string | null>(null);
const instances = ref<ProcessInstanceRecord[]>([]);
const todos = ref<WorkbenchTodoRecord[]>([]);
const otherTenantTotal = ref<number | null>(null);
const selectedId = ref<string | null>(null);
const selected = ref<ProcessInstanceRecord | null>(null);
const draftText = ref("");
const saveMsg = ref<string | null>(null);

const instanceCount = computed(() => instances.value.length);
const todoCount = computed(() => todos.value.length);

/**
 * 刷新本租户实例、待办与他租户对照计数。
 */
async function refresh(): Promise<void> {
  error.value = null;
  const [list, todoList, otherList] = await Promise.all([
    fetchWorkbenchInstances(DEMO_SESSION),
    fetchWorkbenchTodos(DEMO_SESSION),
    fetchWorkbenchInstances(OTHER_SESSION),
  ]);
  instances.value = list.items;
  todos.value = todoList.items;
  otherTenantTotal.value = otherList.total;
}

/**
 * 确保模板存在并连续发起 A1/A2（不同幂等键）。
 */
async function seedDualInstances(): Promise<void> {
  busy.value = true;
  saveMsg.value = null;
  error.value = null;
  try {
    const template = await ensureWorkbenchTemplate(DEMO_SESSION, {
      code: "biz-intake",
      title: "商务立项模板",
    });
    templateId.value = template.id;
    await createWorkbenchInstance(DEMO_SESSION, {
      templateId: template.id,
      title: "A1",
      idempotencyKey: "demo-idem-a1",
      intentKey: "demo-intent-a1",
    });
    await createWorkbenchInstance(DEMO_SESSION, {
      templateId: template.id,
      title: "A2",
      idempotencyKey: "demo-idem-a2",
      intentKey: "demo-intent-a2",
    });
    // 同幂等键应回放 A1，不新增第三笔
    await createWorkbenchInstance(DEMO_SESSION, {
      templateId: template.id,
      title: "A1-retry",
      idempotencyKey: "demo-idem-a1",
      intentKey: "demo-intent-a1-retry",
    });
    await refresh();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}

/**
 * 打开实例详情并载入私有草稿。
 *
 * Args:
 *   id: 实例 id。
 */
async function openInstance(id: string): Promise<void> {
  error.value = null;
  saveMsg.value = null;
  try {
    const detail = await fetchWorkbenchInstance(DEMO_SESSION, id);
    selectedId.value = detail.id;
    selected.value = detail;
    draftText.value = detail.draft;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : String(err);
  }
}

/**
 * 保存当前打开实例的草稿。
 */
async function onSaveDraft(): Promise<void> {
  if (!selectedId.value) {
    return;
  }
  busy.value = true;
  saveMsg.value = null;
  error.value = null;
  try {
    const updated = await saveWorkbenchDraft(
      DEMO_SESSION,
      selectedId.value,
      draftText.value,
    );
    selected.value = updated;
    saveMsg.value = "草稿已持久化";
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
  <section class="panel workbench">
    <h2>M1-01 双实例工作台</h2>
    <p class="hint">
      会话：{{ DEMO_SESSION.personId }} @ {{ DEMO_SESSION.tenantId }}；
      同模板 A1/A2、幂等回放、他租户不可见。禁 mock。
    </p>

    <div class="actions">
      <button type="button" :disabled="busy" @click="seedDualInstances">
        {{ busy ? "处理中…" : "确保模板并发起 A1/A2" }}
      </button>
      <button type="button" :disabled="busy" @click="refresh">刷新</button>
    </div>

    <p v-if="error" class="form-error">{{ error }}</p>

    <div class="stats">
      <span>本租户实例 = {{ instanceCount }}</span>
      <span>本人待办 = {{ todoCount }}</span>
      <span>他租户实例 = {{ otherTenantTotal ?? "…" }}</span>
      <span v-if="templateId">模板 id = {{ templateId }}</span>
    </div>

    <div class="columns">
      <div>
        <h3>实例列表</h3>
        <ul v-if="instances.length" class="item-list">
          <li v-for="item in instances" :key="item.id">
            <button
              type="button"
              class="linkish"
              @click="openInstance(item.id)"
            >
              <strong>{{ item.title }}</strong>
            </button>
            <span>{{ item.urlPath }}</span>
            <span>{{ item.idempotencyKey }}</span>
          </li>
        </ul>
        <p v-else>暂无实例（授权查询后的空列表）</p>
      </div>

      <div>
        <h3>本人待办</h3>
        <ul v-if="todos.length" class="item-list">
          <li v-for="todo in todos" :key="todo.id">
            <strong>{{ todo.title }}</strong>
            <span>{{ todo.instanceId }}</span>
          </li>
        </ul>
        <p v-else>暂无待办</p>
      </div>
    </div>

    <div v-if="selected" class="detail">
      <h3>打开：{{ selected.title }}</h3>
      <pre>{{
        {
          id: selected.id,
          urlPath: selected.urlPath,
          threadId: selected.threadId,
          configId: selected.configId,
          intentKey: selected.intentKey,
        }
      }}</pre>
      <label for="wb-draft">实例私有草稿</label>
      <textarea
        id="wb-draft"
        v-model="draftText"
        rows="3"
        :disabled="busy"
      />
      <button type="button" :disabled="busy" @click="onSaveDraft">
        保存草稿
      </button>
      <p v-if="saveMsg" class="ok">{{ saveMsg }}</p>
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
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
  color: var(--muted);
  font-size: 0.8rem;
}

.columns {
  display: grid;
  gap: 1rem;
}

@media (min-width: 720px) {
  .columns {
    grid-template-columns: 1fr 1fr;
  }
}

.columns h3,
.detail h3 {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
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
  word-break: break-all;
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
  word-break: break-word;
  font-size: 0.78rem;
  color: var(--muted);
}

.detail textarea {
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.25);
  color: var(--ink);
  padding: 0.5rem 0.65rem;
  font: inherit;
}

.ok {
  margin: 0;
  color: var(--accent);
  font-size: 0.8rem;
}
</style>
