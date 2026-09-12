-- DESIGN CANDIDATE ONLY. Never run before M0 adoption and isolated MySQL validation.
-- Contains extension tables only. No DROP, DELETE, seed credentials or framework SQL.
-- MySQL DDL implicitly commits. Review 49 and 51 before any migration.

CREATE TABLE `oa_work_item` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `scope` VARCHAR(16) NOT NULL,
  `process_instance_id` VARCHAR(64) NULL,
  `engine_node_ref` VARCHAR(64) NULL,
  `source_intent_id` VARCHAR(64) NULL,
  `objective` VARCHAR(2000) NOT NULL,
  `output_contract_json` JSON NOT NULL,
  `state` VARCHAR(32) NOT NULL,
  `readiness` VARCHAR(32) NOT NULL,
  `responsibility_epoch` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`),
  KEY `ix_work_item_0` (`tenant_id`, `process_instance_id`, `id`),
  KEY `ix_work_item_1` (`tenant_id`, `state`, `updated_at`, `id`),
  CONSTRAINT `ck_work_item_0` CHECK (scope IN ('PROCESS','AD_HOC')),
  CONSTRAINT `ck_work_item_1` CHECK ((scope='PROCESS' AND process_instance_id IS NOT NULL AND engine_node_ref IS NOT NULL AND source_intent_id IS NULL) OR (scope='AD_HOC' AND source_intent_id IS NOT NULL AND process_instance_id IS NULL AND engine_node_ref IS NULL)),
  CONSTRAINT `ck_work_item_2` CHECK (state IN ('READY','IN_PROGRESS','AWAITING_REVIEW','READY_TO_COMMIT','COMMITTED','CANCELLED')),
  CONSTRAINT `ck_work_item_3` CHECK (readiness IN ('READY','BLOCKED','NEEDS_RECHECK'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_human_task` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `work_id` VARCHAR(64) NOT NULL,
  `engine_task_ref` VARCHAR(64) NOT NULL,
  `kind` VARCHAR(24) NOT NULL,
  `assignee_member_id` VARCHAR(64) NULL,
  `candidate_policy_json` JSON NOT NULL,
  `responsibility_epoch` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `state` VARCHAR(24) NOT NULL,
  `due_at` DATETIME(6) NULL,
  `engine_revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`),
  UNIQUE KEY `uq_human_task_0` (`tenant_id`, `engine_task_ref`),
  KEY `ix_human_task_0` (`tenant_id`, `assignee_member_id`, `state`, `due_at`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_binding` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `work_id` VARCHAR(64) NOT NULL,
  `human_task_id` VARCHAR(64) NOT NULL,
  `configured_by` VARCHAR(64) NOT NULL,
  `responsibility_epoch` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `mode` VARCHAR(16) NOT NULL,
  `config_version` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `state` VARCHAR(20) NOT NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`),
  UNIQUE KEY `uq_binding_0` (`tenant_id`, `human_task_id`, `responsibility_epoch`),
  CONSTRAINT `ck_binding_0` CHECK (mode IN ('MANUAL','ASSISTED','AUTONOMOUS'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_binding_version` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `binding_id` VARCHAR(64) NOT NULL,
  `version` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `config_json` JSON NOT NULL,
  `digest` VARCHAR(71) NOT NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`),
  UNIQUE KEY `uq_binding_version_0` (`tenant_id`, `binding_id`, `version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_baseline` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `work_id` VARCHAR(64) NOT NULL,
  `version` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `facts_json` JSON NOT NULL,
  `confirmed_by` VARCHAR(64) NOT NULL,
  `confirmed_at` DATETIME(6) NOT NULL,
  `digest` VARCHAR(71) NOT NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`),
  UNIQUE KEY `uq_baseline_0` (`tenant_id`, `work_id`, `version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_context_manifest` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `work_id` VARCHAR(64) NOT NULL,
  `baseline_id` VARCHAR(64) NOT NULL,
  `target_subject_id` VARCHAR(64) NOT NULL,
  `purpose` VARCHAR(200) NOT NULL,
  `source_refs_json` JSON NOT NULL,
  `policy_revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `expires_at` DATETIME(6) NOT NULL,
  `digest` VARCHAR(71) NOT NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_execution_snapshot` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `work_id` VARCHAR(64) NOT NULL,
  `binding_id` VARCHAR(64) NOT NULL,
  `binding_version` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `manifest_id` VARCHAR(64) NOT NULL,
  `responsibility_epoch` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `authz_epoch` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `policy_revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `expires_at` DATETIME(6) NOT NULL,
  `digest` VARCHAR(71) NOT NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_execution_grant` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `base_grant_id` VARCHAR(64) NOT NULL,
  `work_id` VARCHAR(64) NOT NULL,
  `execution_subject_id` VARCHAR(64) NOT NULL,
  `granted_by` VARCHAR(64) NOT NULL,
  `policy_json` JSON NOT NULL,
  `expires_at` DATETIME(6) NOT NULL,
  `authz_epoch` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_attempt` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `work_id` VARCHAR(64) NOT NULL,
  `binding_id` VARCHAR(64) NOT NULL,
  `snapshot_id` VARCHAR(64) NOT NULL,
  `attempt_number` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `fence` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `state` VARCHAR(24) NOT NULL,
  `operation_id` VARCHAR(64) NOT NULL,
  `sdk_run_ref` VARCHAR(64) NULL,
  `checkpoint_ref` VARCHAR(255) NULL,
  `started_at` DATETIME(6) NULL,
  `ended_at` DATETIME(6) NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`),
  UNIQUE KEY `uq_attempt_0` (`tenant_id`, `work_id`, `attempt_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_artifact_version` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `artifact_id` VARCHAR(64) NOT NULL,
  `version` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `work_id` VARCHAR(64) NOT NULL,
  `source_attempt_id` VARCHAR(64) NULL,
  `storage_ref` VARCHAR(512) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `media_type` VARCHAR(100) NOT NULL,
  `size_bytes` BIGINT UNSIGNED NOT NULL,
  `digest` VARCHAR(71) NOT NULL,
  `created_by` VARCHAR(64) NOT NULL,
  `scan_state` VARCHAR(20) NOT NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`),
  UNIQUE KEY `uq_artifact_version_0` (`tenant_id`, `artifact_id`, `version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_collaboration` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `parent_work_id` VARCHAR(64) NOT NULL,
  `child_work_id` VARCHAR(64) NULL,
  `recipient_member_id` VARCHAR(64) NOT NULL,
  `output_contract_json` JSON NOT NULL,
  `state` VARCHAR(20) NOT NULL,
  `due_at` DATETIME(6) NOT NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`),
  UNIQUE KEY `uq_collaboration_0` (`tenant_id`, `child_work_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_contribution_version` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `collaboration_id` VARCHAR(64) NOT NULL,
  `version` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `submission_json` JSON NOT NULL,
  `submitted_by` VARCHAR(64) NOT NULL,
  `digest` VARCHAR(71) NOT NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`),
  UNIQUE KEY `uq_contribution_version_0` (`tenant_id`, `collaboration_id`, `version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_review` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `work_id` VARCHAR(64) NOT NULL,
  `reviewer_member_id` VARCHAR(64) NOT NULL,
  `requested_by` VARCHAR(64) NOT NULL,
  `candidate_digest` VARCHAR(71) NOT NULL,
  `baseline_id` VARCHAR(64) NOT NULL,
  `state` VARCHAR(20) NOT NULL,
  `receipt_json` JSON NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`),
  CONSTRAINT `ck_review_0` CHECK (reviewer_member_id <> requested_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_completion_check` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `work_id` VARCHAR(64) NOT NULL,
  `responsibility_epoch` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `work_revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `candidate_digest` VARCHAR(71) NOT NULL,
  `baseline_digest` VARCHAR(71) NOT NULL,
  `result_json` JSON NOT NULL,
  `expires_at` DATETIME(6) NOT NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_delivery` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `work_id` VARCHAR(64) NOT NULL,
  `responsibility_epoch` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `completion_check_id` VARCHAR(64) NOT NULL,
  `submission_json` JSON NOT NULL,
  `confirmed_by` VARCHAR(64) NOT NULL,
  `confirmed_at` DATETIME(6) NOT NULL,
  `state` VARCHAR(24) NOT NULL,
  `digest` VARCHAR(71) NOT NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`),
  UNIQUE KEY `uq_delivery_0` (`tenant_id`, `work_id`, `responsibility_epoch`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_handoff` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `delivery_id` VARCHAR(64) NOT NULL,
  `recipient_work_id` VARCHAR(64) NOT NULL,
  `version` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `state` VARCHAR(20) NOT NULL,
  `required_refs_json` JSON NOT NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`),
  UNIQUE KEY `uq_handoff_0` (`tenant_id`, `delivery_id`, `recipient_work_id`, `version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_handoff_receipt` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `handoff_id` VARCHAR(64) NOT NULL,
  `package_version` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `accepted_by` VARCHAR(64) NOT NULL,
  `accepted_at` DATETIME(6) NOT NULL,
  `receipt_json` JSON NOT NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`),
  UNIQUE KEY `uq_handoff_receipt_0` (`tenant_id`, `handoff_id`, `package_version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_operation` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `actor_id` VARCHAR(64) NOT NULL,
  `command` VARCHAR(64) NOT NULL,
  `idempotency_key` VARCHAR(128) NOT NULL,
  `request_digest` VARCHAR(71) NOT NULL,
  `state` VARCHAR(24) NOT NULL,
  `response_json` JSON NOT NULL,
  `expires_at` DATETIME(6) NOT NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`),
  UNIQUE KEY `uq_operation_0` (`tenant_id`, `actor_id`, `command`, `idempotency_key`),
  KEY `ix_operation_0` (`tenant_id`, `state`, `updated_at`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_invocation` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `attempt_id` VARCHAR(64) NOT NULL,
  `operation_id` VARCHAR(64) NOT NULL,
  `provider_id` VARCHAR(64) NOT NULL,
  `action` VARCHAR(80) NOT NULL,
  `effect_key` VARCHAR(128) NOT NULL,
  `state` VARCHAR(24) NOT NULL,
  `provider_receipt_ref` VARCHAR(255) NULL,
  `input_digest` VARCHAR(71) NOT NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`),
  UNIQUE KEY `uq_invocation_0` (`tenant_id`, `provider_id`, `action`, `effect_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_outbox` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `aggregate_id` VARCHAR(64) NOT NULL,
  `aggregate_kind` VARCHAR(32) NOT NULL,
  `aggregate_sequence` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `event_json` JSON NOT NULL,
  `state` VARCHAR(16) NOT NULL,
  `available_at` DATETIME(6) NOT NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`),
  UNIQUE KEY `uq_outbox_0` (`tenant_id`, `aggregate_kind`, `aggregate_id`, `aggregate_sequence`),
  KEY `ix_outbox_0` (`state`, `available_at`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_inbox` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `consumer_id` VARCHAR(64) NOT NULL,
  `source_id` VARCHAR(64) NOT NULL,
  `event_id` VARCHAR(64) NOT NULL,
  `payload_digest` VARCHAR(71) NOT NULL,
  `processed_at` DATETIME(6) NOT NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`),
  UNIQUE KEY `uq_inbox_0` (`tenant_id`, `consumer_id`, `source_id`, `event_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_output_release` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `work_id` VARCHAR(64) NOT NULL,
  `recipient_id` VARCHAR(64) NOT NULL,
  `source_ref_json` JSON NOT NULL,
  `policy_revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `authz_epoch` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `state` VARCHAR(16) NOT NULL,
  `expires_at` DATETIME(6) NOT NULL,
  `public_artifact_version_id` VARCHAR(64) NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_thread_entry` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `work_id` VARCHAR(64) NOT NULL,
  `actor_id` VARCHAR(64) NOT NULL,
  `kind` VARCHAR(24) NOT NULL,
  `release_id` VARCHAR(64) NOT NULL,
  `entry_json` JSON NOT NULL,
  `sequence` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`),
  UNIQUE KEY `uq_thread_entry_0` (`tenant_id`, `work_id`, `sequence`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_draft` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `work_id` VARCHAR(64) NOT NULL,
  `actor_id` VARCHAR(64) NOT NULL,
  `kind` VARCHAR(20) NOT NULL,
  `base_revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `body` VARCHAR(10000) NOT NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`),
  UNIQUE KEY `uq_draft_0` (`tenant_id`, `work_id`, `actor_id`, `kind`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_asset_revision` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `owner_member_id` VARCHAR(64) NOT NULL,
  `base_resource_id` VARCHAR(64) NOT NULL,
  `version` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `state` VARCHAR(32) NOT NULL,
  `payload_json` JSON NOT NULL,
  `digest` VARCHAR(71) NOT NULL,
  `expires_at` DATETIME(6) NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`),
  UNIQUE KEY `uq_asset_revision_0` (`tenant_id`, `base_resource_id`, `version`),
  KEY `ix_asset_revision_0` (`tenant_id`, `owner_member_id`, `state`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_market_adoption` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `owner_member_id` VARCHAR(64) NOT NULL,
  `base_resource_id` VARCHAR(64) NOT NULL,
  `version` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `state` VARCHAR(32) NOT NULL,
  `payload_json` JSON NOT NULL,
  `digest` VARCHAR(71) NOT NULL,
  `expires_at` DATETIME(6) NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`),
  UNIQUE KEY `uq_market_adoption_0` (`tenant_id`, `base_resource_id`, `version`),
  KEY `ix_market_adoption_0` (`tenant_id`, `owner_member_id`, `state`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_knowledge_job` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `owner_member_id` VARCHAR(64) NOT NULL,
  `base_resource_id` VARCHAR(64) NOT NULL,
  `version` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `state` VARCHAR(32) NOT NULL,
  `payload_json` JSON NOT NULL,
  `digest` VARCHAR(71) NOT NULL,
  `expires_at` DATETIME(6) NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`),
  UNIQUE KEY `uq_knowledge_job_0` (`tenant_id`, `base_resource_id`, `version`),
  KEY `ix_knowledge_job_0` (`tenant_id`, `owner_member_id`, `state`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_team_configuration` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `owner_member_id` VARCHAR(64) NOT NULL,
  `base_resource_id` VARCHAR(64) NOT NULL,
  `version` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `state` VARCHAR(32) NOT NULL,
  `payload_json` JSON NOT NULL,
  `digest` VARCHAR(71) NOT NULL,
  `expires_at` DATETIME(6) NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`),
  UNIQUE KEY `uq_team_configuration_0` (`tenant_id`, `base_resource_id`, `version`),
  KEY `ix_team_configuration_0` (`tenant_id`, `owner_member_id`, `state`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_automation_plan` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `owner_member_id` VARCHAR(64) NOT NULL,
  `base_resource_id` VARCHAR(64) NOT NULL,
  `version` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `state` VARCHAR(32) NOT NULL,
  `payload_json` JSON NOT NULL,
  `digest` VARCHAR(71) NOT NULL,
  `expires_at` DATETIME(6) NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`),
  UNIQUE KEY `uq_automation_plan_0` (`tenant_id`, `base_resource_id`, `version`),
  KEY `ix_automation_plan_0` (`tenant_id`, `owner_member_id`, `state`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_config_proposal` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `owner_member_id` VARCHAR(64) NOT NULL,
  `base_resource_id` VARCHAR(64) NOT NULL,
  `version` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `state` VARCHAR(32) NOT NULL,
  `payload_json` JSON NOT NULL,
  `digest` VARCHAR(71) NOT NULL,
  `expires_at` DATETIME(6) NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`),
  UNIQUE KEY `uq_config_proposal_0` (`tenant_id`, `base_resource_id`, `version`),
  KEY `ix_config_proposal_0` (`tenant_id`, `owner_member_id`, `state`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_analysis_plan` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `owner_member_id` VARCHAR(64) NOT NULL,
  `base_resource_id` VARCHAR(64) NOT NULL,
  `version` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `state` VARCHAR(32) NOT NULL,
  `payload_json` JSON NOT NULL,
  `digest` VARCHAR(71) NOT NULL,
  `expires_at` DATETIME(6) NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`),
  UNIQUE KEY `uq_analysis_plan_0` (`tenant_id`, `base_resource_id`, `version`),
  KEY `ix_analysis_plan_0` (`tenant_id`, `owner_member_id`, `state`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_relation_assertion` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `owner_member_id` VARCHAR(64) NOT NULL,
  `base_resource_id` VARCHAR(64) NOT NULL,
  `version` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `state` VARCHAR(32) NOT NULL,
  `payload_json` JSON NOT NULL,
  `digest` VARCHAR(71) NOT NULL,
  `expires_at` DATETIME(6) NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`),
  UNIQUE KEY `uq_relation_assertion_0` (`tenant_id`, `base_resource_id`, `version`),
  KEY `ix_relation_assertion_0` (`tenant_id`, `owner_member_id`, `state`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_opportunity` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `owner_member_id` VARCHAR(64) NOT NULL,
  `base_resource_id` VARCHAR(64) NOT NULL,
  `version` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `state` VARCHAR(32) NOT NULL,
  `payload_json` JSON NOT NULL,
  `digest` VARCHAR(71) NOT NULL,
  `expires_at` DATETIME(6) NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`),
  UNIQUE KEY `uq_opportunity_0` (`tenant_id`, `base_resource_id`, `version`),
  KEY `ix_opportunity_0` (`tenant_id`, `owner_member_id`, `state`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `oa_evolution_proposal` (
  `tenant_id` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `owner_member_id` VARCHAR(64) NOT NULL,
  `base_resource_id` VARCHAR(64) NOT NULL,
  `version` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `state` VARCHAR(32) NOT NULL,
  `payload_json` JSON NOT NULL,
  `digest` VARCHAR(71) NOT NULL,
  `expires_at` DATETIME(6) NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_id`, `id`),
  UNIQUE KEY `uq_evolution_proposal_0` (`tenant_id`, `base_resource_id`, `version`),
  KEY `ix_evolution_proposal_0` (`tenant_id`, `owner_member_id`, `state`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

ALTER TABLE `oa_human_task` ADD CONSTRAINT `fk_human_task_0` FOREIGN KEY (`tenant_id`, `work_id`) REFERENCES `oa_work_item` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_binding` ADD CONSTRAINT `fk_binding_0` FOREIGN KEY (`tenant_id`, `work_id`) REFERENCES `oa_work_item` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_binding` ADD CONSTRAINT `fk_binding_1` FOREIGN KEY (`tenant_id`, `human_task_id`) REFERENCES `oa_human_task` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_binding_version` ADD CONSTRAINT `fk_binding_version_0` FOREIGN KEY (`tenant_id`, `binding_id`) REFERENCES `oa_binding` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_baseline` ADD CONSTRAINT `fk_baseline_0` FOREIGN KEY (`tenant_id`, `work_id`) REFERENCES `oa_work_item` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_context_manifest` ADD CONSTRAINT `fk_context_manifest_0` FOREIGN KEY (`tenant_id`, `work_id`) REFERENCES `oa_work_item` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_context_manifest` ADD CONSTRAINT `fk_context_manifest_1` FOREIGN KEY (`tenant_id`, `baseline_id`) REFERENCES `oa_baseline` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_execution_snapshot` ADD CONSTRAINT `fk_execution_snapshot_0` FOREIGN KEY (`tenant_id`, `work_id`) REFERENCES `oa_work_item` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_execution_snapshot` ADD CONSTRAINT `fk_execution_snapshot_1` FOREIGN KEY (`tenant_id`, `binding_id`) REFERENCES `oa_binding` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_execution_snapshot` ADD CONSTRAINT `fk_execution_snapshot_2` FOREIGN KEY (`tenant_id`, `manifest_id`) REFERENCES `oa_context_manifest` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_execution_grant` ADD CONSTRAINT `fk_execution_grant_0` FOREIGN KEY (`tenant_id`, `work_id`) REFERENCES `oa_work_item` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_attempt` ADD CONSTRAINT `fk_attempt_0` FOREIGN KEY (`tenant_id`, `work_id`) REFERENCES `oa_work_item` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_attempt` ADD CONSTRAINT `fk_attempt_1` FOREIGN KEY (`tenant_id`, `binding_id`) REFERENCES `oa_binding` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_attempt` ADD CONSTRAINT `fk_attempt_2` FOREIGN KEY (`tenant_id`, `snapshot_id`) REFERENCES `oa_execution_snapshot` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_artifact_version` ADD CONSTRAINT `fk_artifact_version_0` FOREIGN KEY (`tenant_id`, `work_id`) REFERENCES `oa_work_item` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_artifact_version` ADD CONSTRAINT `fk_artifact_version_1` FOREIGN KEY (`tenant_id`, `source_attempt_id`) REFERENCES `oa_attempt` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_collaboration` ADD CONSTRAINT `fk_collaboration_0` FOREIGN KEY (`tenant_id`, `parent_work_id`) REFERENCES `oa_work_item` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_collaboration` ADD CONSTRAINT `fk_collaboration_1` FOREIGN KEY (`tenant_id`, `child_work_id`) REFERENCES `oa_work_item` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_contribution_version` ADD CONSTRAINT `fk_contribution_version_0` FOREIGN KEY (`tenant_id`, `collaboration_id`) REFERENCES `oa_collaboration` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_review` ADD CONSTRAINT `fk_review_0` FOREIGN KEY (`tenant_id`, `work_id`) REFERENCES `oa_work_item` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_review` ADD CONSTRAINT `fk_review_1` FOREIGN KEY (`tenant_id`, `baseline_id`) REFERENCES `oa_baseline` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_completion_check` ADD CONSTRAINT `fk_completion_check_0` FOREIGN KEY (`tenant_id`, `work_id`) REFERENCES `oa_work_item` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_delivery` ADD CONSTRAINT `fk_delivery_0` FOREIGN KEY (`tenant_id`, `work_id`) REFERENCES `oa_work_item` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_delivery` ADD CONSTRAINT `fk_delivery_1` FOREIGN KEY (`tenant_id`, `completion_check_id`) REFERENCES `oa_completion_check` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_handoff` ADD CONSTRAINT `fk_handoff_0` FOREIGN KEY (`tenant_id`, `delivery_id`) REFERENCES `oa_delivery` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_handoff` ADD CONSTRAINT `fk_handoff_1` FOREIGN KEY (`tenant_id`, `recipient_work_id`) REFERENCES `oa_work_item` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_handoff_receipt` ADD CONSTRAINT `fk_handoff_receipt_0` FOREIGN KEY (`tenant_id`, `handoff_id`) REFERENCES `oa_handoff` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_invocation` ADD CONSTRAINT `fk_invocation_0` FOREIGN KEY (`tenant_id`, `attempt_id`) REFERENCES `oa_attempt` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_invocation` ADD CONSTRAINT `fk_invocation_1` FOREIGN KEY (`tenant_id`, `operation_id`) REFERENCES `oa_operation` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_output_release` ADD CONSTRAINT `fk_output_release_0` FOREIGN KEY (`tenant_id`, `work_id`) REFERENCES `oa_work_item` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_output_release` ADD CONSTRAINT `fk_output_release_1` FOREIGN KEY (`tenant_id`, `public_artifact_version_id`) REFERENCES `oa_artifact_version` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_thread_entry` ADD CONSTRAINT `fk_thread_entry_0` FOREIGN KEY (`tenant_id`, `work_id`) REFERENCES `oa_work_item` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_thread_entry` ADD CONSTRAINT `fk_thread_entry_1` FOREIGN KEY (`tenant_id`, `release_id`) REFERENCES `oa_output_release` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oa_draft` ADD CONSTRAINT `fk_draft_0` FOREIGN KEY (`tenant_id`, `work_id`) REFERENCES `oa_work_item` (`tenant_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
