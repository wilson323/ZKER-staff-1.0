<script setup lang="ts">
/**
 * M1-06 独立审核与交付面板：真实 API；label[for]↔id；禁 mock。
 */
import { computed, onMounted, ref } from "vue";
import {
  fetchClaimableTasks,
  type ClaimableHumanTaskRecord,
} from "./claim-api-client";
import {
  fetchArtifacts,
  fetchOutputReleases,
} from "./publish-api-client";
import { fetchFactBaseline } from "./snapshot-api-client";
import {
  checkCompletion,
  confirmOaDelivery,
  decideReview,
  fetchDeliveryView,
  fetchReviewReceipts,
  fetchReviews,
  requestReview,
  submitDelivery,
  type CompletionCheckRecord,
  type DeliveryCommitRecord,
  type DeliveryView,
  type ReviewReceiptRecord,
  type ReviewRequestRecord,
} from "./review-api-client";
import type { WorkbenchSession } from "./workbench-api-client";

const EXECUTOR: WorkbenchSession = {
  tenantId: "tenant-alpha",
  personId: "demo_executor",
};
const REVIEWER: WorkbenchSession = {
  tenantId: "tenant-alpha",
  personId: "demo_reviewer",
};

const error = ref<string | null>(null);
const busy = ref(false);
const tasks = ref<ClaimableHumanTaskRecord[]>([]);
const selectedId = ref<string | null>(null);
const reviews = ref<ReviewRequestRecord[]>([]);
const receipts = ref<ReviewReceiptRecord[]>([]);
const check = ref<CompletionCheckRecord | null>(null);
const delivery = ref<DeliveryCommitRecord | null>(null);
const view = ref<DeliveryView | null>(null);
const reviewerId = ref("demo_reviewer");
const reason = ref("材料齐全，同意交付");
const provenance = ref("人工上传与核对");
const saveMsg = ref<string | null>(null);

const selected = computed(() =>
  tasks.value.find((item) => item.id === selectedId.value) ?? null,
);

/**
 * 刷新已领取任务。
 */
async function refreshTasks(): Promise<void> {
  error.value = null;
  const list = await fetchClaimableTasks(EXECUTOR);
  tasks.value = list.items.filter((item) => item.state === "CLAIMED");
}

/**
 * 选中任务并载入审核/交付状态。
 */
async function selectTask(id: string): Promise<void> {
  error.value = null;
  saveMsg.value = null;
  selectedId.value = id;
  check.value = null;
  delivery.value = null;
  view.value = null;
  const [r, rc] = await Promise.all([
    fetchReviews(EXECUTOR, id),
    fetchReviewReceipts(EXECUTOR, id),
  ]);
  reviews.value = r.items;
  receipts.value = rc.items;
}

/**
 * 承担人送审：取最新 RELEASED 发布与基线。
 */
async function onRequestReview(): Promise<void> {
  if (!selected.value) {
    return;
  }
  busy.value = true;
  error.value = null;
  try {
    const task = selected.value;
    const [releases, baseline] = await Promise.all([
      fetchOutputReleases(EXECUTOR, task.id),
      fetchFactBaseline(EXECUTOR, task.id),
    ]);
    const candidate =
      [...releases.items].reverse().find((item) => item.state === "RELEASED") ??
      null;
    if (!candidate) {
      throw new Error("需要先有 RELEASED OutputRelease");
    }
    if (!baseline?.id) {
      throw new Error("需要先确认事实基线");
    }
    const req = await requestReview(EXECUTOR, task.id, {
      candidateReleaseId: candidate.id,
      baselineId: baseline.id,
      reviewerMemberId: reviewerId.value.trim(),
      expectedRevision: task.revision,
      responsibilityEpoch: task.responsibilityEpoch,
    });
    saveMsg.value = `已送审 ${req.id.slice(0, 8)}…`;
    await selectTask(task.id);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}

/**
 * 独立审核人批准最新 PENDING 请求。
 */
async function onApprove(): Promise<void> {
  if (!selectedId.value) {
    return;
  }
  busy.value = true;
  error.value = null;
  try {
    const pending = [...reviews.value]
      .reverse()
      .find((item) => item.state === "PENDING");
    if (!pending) {
      throw new Error("无待审请求");
    }
    const receipt = await decideReview(REVIEWER, pending.id, {
      decision: "APPROVE",
      reason: reason.value.trim(),
      candidateDigest: pending.candidateDigest,
      expectedRevision: pending.revision,
    });
    saveMsg.value = `已批准 ${receipt.id.slice(0, 8)}…`;
    await selectTask(selectedId.value);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}

/**
 * 预检→提交→查看 PENDING；可选 OA 确认。
 */
async function onDeliver(confirmOa: boolean): Promise<void> {
  if (!selected.value) {
    return;
  }
  busy.value = true;
  error.value = null;
  try {
    const task = selected.value;
    const [arts, baseline, rc] = await Promise.all([
      fetchArtifacts(EXECUTOR, task.id),
      fetchFactBaseline(EXECUTOR, task.id),
      fetchReviewReceipts(EXECUTOR, task.id),
    ]);
    if (!baseline?.id) {
      throw new Error("缺少基线");
    }
    const art = arts.items[arts.items.length - 1];
    if (!art) {
      throw new Error("缺少产物");
    }
    const approval = [...rc.items]
      .reverse()
      .find((item) => item.state === "ACTIVE" && item.decision === "APPROVE");
    if (!approval) {
      throw new Error("缺少有效批准回执");
    }
    const pre = await checkCompletion(EXECUTOR, task.id, {
      artifactVersionIds: [art.id],
      baselineId: baseline.id,
      approvalReceiptIds: [approval.id],
      expectedRevision: task.revision,
      responsibilityEpoch: task.responsibilityEpoch,
    });
    check.value = pre;
    const commit = await submitDelivery(EXECUTOR, task.id, {
      completionCheckId: pre.id,
      artifactVersionIds: [art.id],
      baselineId: baseline.id,
      approvalReceiptIds: [approval.id],
      provenanceNote: provenance.value.trim(),
      expectedRevision: task.revision,
      responsibilityEpoch: task.responsibilityEpoch,
    });
    delivery.value = commit;
    view.value = await fetchDeliveryView(EXECUTOR, commit.id);
    if (confirmOa) {
      delivery.value = await confirmOaDelivery(EXECUTOR, commit.id);
      view.value = await fetchDeliveryView(EXECUTOR, commit.id);
    }
    saveMsg.value = view.value.delivered
      ? "已交付（OA 已确认）"
      : "交付受理中（PENDING_COMMIT，未显示已交付）";
    await refreshTasks();
    if (selectedId.value) {
      await selectTask(selectedId.value);
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}

onMounted(async () => {
  try {
    await refreshTasks();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : String(err);
  }
});
</script>

<template>
  <section class="panel review-panel">
    <h2>M1-06 独立审核与交付</h2>
    <p class="hint">C10/C11 真实读写；禁止自批；无 OA 确认不显示已交付。</p>
    <p v-if="error" class="form-error">{{ error }}</p>
    <p v-if="saveMsg" class="ok">{{ saveMsg }}</p>

    <div class="row">
      <button type="button" :disabled="busy" @click="refreshTasks">刷新任务</button>
    </div>
    <ul class="task-list">
      <li v-for="task in tasks" :key="task.id">
        <button type="button" @click="selectTask(task.id)">
          {{ task.title }} · epoch={{ task.responsibilityEpoch }} · rev={{
            task.revision
          }}
        </button>
      </li>
    </ul>

    <form v-if="selected" class="form" @submit.prevent="onRequestReview">
      <label for="rd-reviewer">审核人 memberId</label>
      <input id="rd-reviewer" v-model="reviewerId" type="text" />
      <button type="submit" :disabled="busy">送审</button>
    </form>

    <form v-if="selected" class="form" @submit.prevent="onApprove">
      <label for="rd-reason">批准理由</label>
      <input id="rd-reason" v-model="reason" type="text" />
      <button type="submit" :disabled="busy">以审核人批准</button>
    </form>

    <form
      v-if="selected"
      class="form"
      @submit.prevent="onDeliver(false)"
    >
      <label for="rd-prov">人工来源说明</label>
      <input id="rd-prov" v-model="provenance" type="text" />
      <div class="row">
        <button type="submit" :disabled="busy">预检并提交（保持 PENDING）</button>
        <button type="button" :disabled="busy" @click="onDeliver(true)">
          提交并 OA 确认
        </button>
      </div>
    </form>

    <pre v-if="view">{{ view }}</pre>
    <pre v-else-if="check">预检 {{ check.id }} 过期于 {{ check.expiresAt }}</pre>
  </section>
</template>

<style scoped>
.review-panel {
  margin-top: 1.5rem;
}
.hint {
  color: var(--muted);
  font-size: 0.95rem;
}
.form-error {
  color: var(--danger);
}
.ok {
  color: var(--accent);
}
.form {
  display: grid;
  gap: 0.5rem;
  margin: 1rem 0;
}
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.task-list {
  list-style: none;
  padding: 0;
}
.task-list button {
  width: 100%;
  text-align: left;
}
label {
  font-size: 0.9rem;
  color: var(--muted);
}
input {
  padding: 0.45rem 0.6rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.2);
  color: var(--ink);
}
</style>
