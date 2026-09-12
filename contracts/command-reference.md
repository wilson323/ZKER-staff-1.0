# 接口动作与字段参考

由OpenAPI和command-catalog生成；设计合同，非运行接口。精确类型/枚举/必填/条件见openapi.json；下表不存在任意JSON直通。

| 动作ID / 阶段 | 方法与路径（前缀/oa-api/v1） | 请求字段（均必需，除Schema明确可选） | 返回类型 | 授权 |
|---|---|---|---|---|
| C01_listInbox / M1 | GET /work-items | — | WorkList | CURRENT_MEMBER_DISCOVER |
| C01_getWork / M1 | GET /work-items/{workId} | — | WorkspaceView | WORK_DISCOVER_AND_FIELD_READ |
| C02_startProcess / M1 | POST /process-instances | command, definitionRef, formRef, intent, fields | Operation | DEFINITION_INITIATE |
| C03_claim / M1 | POST /work-items/{workId}/responsibility-commands | command, expectedRevision, responsibilityEpoch, humanTaskId | Operation | CURRENT_HUMAN_TASK_ACTION |
| C03_release / M1 | POST /work-items/{workId}/responsibility-commands | command, expectedRevision, responsibilityEpoch, humanTaskId | Operation | CURRENT_HUMAN_TASK_ACTION |
| C03_transfer / M1 | POST /work-items/{workId}/responsibility-commands | command, expectedRevision, responsibilityEpoch, humanTaskId, targetMemberId, reason | Operation | CURRENT_HUMAN_TASK_ACTION |
| C03_delegate / M1 | POST /work-items/{workId}/responsibility-commands | command, expectedRevision, responsibilityEpoch, humanTaskId, targetMemberId, reason | Operation | CURRENT_HUMAN_TASK_ACTION |
| C04_saveDraft / M1 | PATCH /work-items/{workId}/draft | command, expectedRevision, responsibilityEpoch, humanTaskId, mode, resourceRefs, outputFormat, outputContractRef, budget | Binding | CURRENT_ASSIGNEE_AND_FIELD_WRITE |
| C04_saveTaskBinding / M1 | PATCH /work-items/{workId}/binding | command, expectedRevision, responsibilityEpoch, humanTaskId, mode, resourceRefs, outputFormat, outputContractRef, budget | Binding | CURRENT_ASSIGNEE_AND_FIELD_WRITE |
| C05_previewContext / M1 | POST /work-items/{workId}/context-previews | command, expectedRevision, responsibilityEpoch, bindingVersion, purpose | ContextPreview | HUMAN_READ_PROJECTION |
| C05_eligibleResources / M1 | GET /work-items/{workId}/eligible-resources | — | ResourceList | RESOURCE_DISCOVER_AND_USE |
| C06_startAttempt / M1 | POST /work-items/{workId}/attempts | command, expectedRevision, responsibilityEpoch, bindingVersion, contextPreviewId, executionMode, outputContractRef | AttemptView | ASSIGNEE_AND_EXECUTION_GRANT |
| C07_pause / M1 | POST /attempts/{attemptId}/controls | command, expectedRevision, reason | AttemptView | ATTEMPT_CONTROL_SUPPORTED_BY_SDK |
| C07_resume / M1 | POST /attempts/{attemptId}/controls | command, expectedRevision, reason | AttemptView | ATTEMPT_CONTROL_SUPPORTED_BY_SDK |
| C07_cancel / M1 | POST /attempts/{attemptId}/controls | command, expectedRevision, reason | AttemptView | ATTEMPT_CONTROL_SUPPORTED_BY_SDK |
| C08_request / M2 | POST /collaborations/commands | command, workId, expectedRevision, responsibilityEpoch, recipientMemberId, outputContractRef, dueAt | Operation | PARENT_CONTRACT_OR_RECIPIENT |
| C08_accept / M2 | POST /collaborations/commands | command, targetRef, expectedRevision, reason | Operation | PARENT_CONTRACT_OR_RECIPIENT |
| C08_decline / M2 | POST /collaborations/commands | command, targetRef, expectedRevision, reason | Operation | PARENT_CONTRACT_OR_RECIPIENT |
| C09_submit / M2 | POST /contributions/commands | command, linkRef, expectedRevision, responsibilityEpoch, artifactRefs, baselineRef | Operation | CHILD_ASSIGNEE |
| C09_decide / M2 | POST /contributions/commands | command, targetRef, expectedRevision, decision, reason, baselineRef | Operation | PARENT_ASSIGNEE |
| C10_requestReview / M1 | POST /reviews/commands | command, workId, expectedRevision, responsibilityEpoch, candidateRef, reviewerMemberId, baselineRef | Operation | REVIEW_REQUEST |
| C10_decideReview / M1 | POST /reviews/commands | command, targetRef, expectedRevision, decision, reason, candidateDigest | Operation | INDEPENDENT_REVIEWER |
| C11_checkCompletion / M1 | POST /work-items/{workId}/completion-checks | command, expectedRevision, responsibilityEpoch, artifactRefs, baselineRef, approvalRefs | CompletionCheck | CURRENT_ASSIGNEE |
| C11_submitDelivery / M1 | POST /work-items/{workId}/deliveries | command, expectedRevision, responsibilityEpoch, completionCheckId, artifactRefs, artifactSetDigest, baselineRef, approvalRefs, provenance | Operation | CURRENT_ASSIGNEE_AND_ALL_GUARDS |
| C12_receiveHandoff / M1 | POST /handoffs/{packageId}/receipts | command, packageVersion, recipientWorkId, expectedRevision, responsibilityEpoch | Operation | CURRENT_RECIPIENT_AND_REQUIRED_INPUT_READ |
| C13_listMarket / M2 | GET /market | — | ResourceList | RESOURCE_DISCOVER |
| C13_adoptMarket / M2 | POST /market/adoptions | command, sourceRef, mode, targetWorkId, expectedRevision | Operation | DISCOVER_COPY_USE_SEPARATELY |
| C14_queryOperation / M1 | GET /operations/{operationId} | — | Operation | OPERATION_OWNER_OR_SCOPED_RECOVERY |
| C14_reconcile / M1 | POST /operations/{operationId}/reconcile | command, expectedRevision, evidenceRefs | Operation | SCOPED_RECOVERY_NO_REDISPATCH |
| C15_read / M1 | POST /notifications/commands | command, targetRef, expectedRevision, reason | Operation | RECIPIENT_OR_WORK_ACTION |
| C15_remind / M1 | POST /notifications/commands | command, targetRef, expectedRevision, reason | Operation | RECIPIENT_OR_WORK_ACTION |
| C15_withdraw / M1 | POST /notifications/commands | command, targetRef, expectedRevision, reason | Operation | RECIPIENT_OR_WORK_ACTION |
| C15_appendWorkMessage / M1 | POST /work-items/{workId}/messages | command, expectedRevision, responsibilityEpoch, text, attachmentRefs | Operation | CURRENT_WORK_CONVERSATION_WRITE_AND_SOURCE_REFERENCE |
| C15_saveMessageDraft / M1 | PATCH /work-items/{workId}/message-draft | command, expectedRevision, responsibilityEpoch, text | Operation | CURRENT_SUBJECT_DRAFT_ONLY |
| C16_propose / M1 | POST /facts/commands | command, workId, expectedRevision, responsibilityEpoch, baselineRef, sourceRefs, facts | Operation | SOURCE_WRITE_OR_BASELINE_CONFIRM |
| C16_confirm / M1 | POST /facts/commands | command, workId, expectedRevision, responsibilityEpoch, baselineRef, sourceRefs, facts | Operation | SOURCE_WRITE_OR_BASELINE_CONFIRM |
| C17_draft / M2 | POST /assets/commands | command, draft | Operation | ASSET_KIND_ACTION |
| C17_test / M2 | POST /assets/commands | command, targetRef, expectedRevision, evidenceRefs | Operation | ASSET_KIND_ACTION |
| C17_publish / M2 | POST /assets/commands | command, targetRef, expectedRevision, evidenceRefs | Operation | ASSET_KIND_ACTION |
| C17_disable / M2 | POST /assets/commands | command, targetRef, expectedRevision | Operation | ASSET_KIND_ACTION |
| C17_import / M2 | POST /assets/commands | command, artifactRef, targetScopeRef | Operation | ASSET_KIND_ACTION |
| C17_export / M2 | POST /assets/commands | command, targetRef, expectedRevision | Operation | ASSET_KIND_ACTION |
| C17_diff / M2 | POST /assets/commands | command, targetRef, expectedRevision, compareRef | Operation | ASSET_KIND_ACTION |
| C17_promote / M2 | POST /assets/commands | command, targetRef, expectedRevision, evidenceRefs | Operation | ASSET_KIND_ACTION |
| C18_discover / M2 | POST /connections/commands | command, providerId | Operation | CONNECTION_OWNER_AND_SCOPE |
| C18_health / M2 | POST /connections/commands | command, targetRef, expectedRevision | Operation | CONNECTION_OWNER_AND_SCOPE |
| C18_authorize / M2 | POST /connections/commands | command, targetRef, expectedRevision, requestedActionIds, returnPath | Operation | CONNECTION_OWNER_AND_SCOPE |
| C18_revoke / M2 | POST /connections/commands | command, targetRef, expectedRevision, reason | Operation | CONNECTION_OWNER_AND_SCOPE |
| C19_ingest / M3 | POST /knowledge/commands | command, sourceArtifactRefs, purpose, scope | Operation | SOURCE_PURPOSE_AND_OUTPUT_READ |
| C19_process / M3 | POST /knowledge/commands | command, targetRef, expectedRevision | Operation | SOURCE_PURPOSE_AND_OUTPUT_READ |
| C19_search / M3 | POST /knowledge/commands | command, query, workId, sourceRefs, limit | Operation | SOURCE_PURPOSE_AND_OUTPUT_READ |
| C19_publish / M3 | POST /knowledge/commands | command, targetRef, expectedRevision, sourceRefs, evidenceRefs | Operation | SOURCE_PURPOSE_AND_OUTPUT_READ |
| C19_reviseMemory / M3 | POST /knowledge/commands | command, targetRef, expectedRevision, sourceRefs, evidenceRefs | Operation | SOURCE_PURPOSE_AND_OUTPUT_READ |
| C20_prepareUpload / M1 | POST /artifacts/uploads | command, workId, expectedRevision, responsibilityEpoch, fileName, mediaType, sizeBytes | UploadTicket | WORK_ARTIFACT_WRITE |
| C20_uploadComplete / M1 | POST /artifacts/commands | command, workId, expectedRevision, responsibilityEpoch, uploadId, digest | Operation | UPLOAD_OWNER_AND_ACTUAL_OBJECT_VERIFY |
| C20_parse / M2 | POST /artifacts/commands | command, workId, expectedRevision, responsibilityEpoch, sourceRefs, outputContractRef | Operation | ALL_SOURCE_READ_AND_WORK_WRITE |
| C20_merge / M2 | POST /artifacts/commands | command, workId, expectedRevision, responsibilityEpoch, sourceRefs, outputContractRef | Operation | ALL_SOURCE_READ_AND_WORK_WRITE |
| C20_readContent / M1 | GET /artifacts/{artifactId}/versions/{version}/content | — | Binary | EXACT_VERSION_DOWNLOAD_CURRENT_POLICY |
| C21_configure / M3 | POST /agent-teams/commands | command, workId, expectedRevision, responsibilityEpoch, teamRef, memberRefs, budget | Operation | WORK_TEAM_BOUND_GRANTS |
| C21_execute / M3 | POST /agent-teams/commands | command, workId, expectedRevision, responsibilityEpoch, teamRef, parentAttemptId | Operation | WORK_TEAM_BOUND_GRANTS |
| C21_replace / M3 | POST /agent-teams/commands | command, workId, expectedRevision, responsibilityEpoch, teamRef, oldMemberRef, newMemberRef | Operation | WORK_TEAM_BOUND_GRANTS |
| C21_control / M3 | POST /agent-teams/commands | command, workId, expectedRevision, responsibilityEpoch, teamRef, attemptId, control | Operation | WORK_TEAM_BOUND_GRANTS |
| C22_create / M4 | POST /automation-plans/commands | command, workId, definitionRef, schedule, budget | Operation | PLAN_OWNER_BOUNDED_EXECUTION |
| C22_preview / M4 | POST /automation-plans/commands | command, targetRef, expectedRevision | Operation | PLAN_OWNER_BOUNDED_EXECUTION |
| C22_test / M4 | POST /automation-plans/commands | command, targetRef, expectedRevision | Operation | PLAN_OWNER_BOUNDED_EXECUTION |
| C22_pause / M4 | POST /automation-plans/commands | command, targetRef, expectedRevision | Operation | PLAN_OWNER_BOUNDED_EXECUTION |
| C22_resume / M4 | POST /automation-plans/commands | command, targetRef, expectedRevision | Operation | PLAN_OWNER_BOUNDED_EXECUTION |
| C22_trigger / M4 | POST /automation-plans/commands | command, targetRef, expectedRevision | Operation | PLAN_OWNER_BOUNDED_EXECUTION |
| C23_receiveEvent / M4 | POST /integrations/events | command, sourceId, eventId, occurredAt, kind, workRef, payloadArtifactRef | Operation | SIGNED_SOURCE_AND_MAPPED_MEMBER |
| C24_identity / M2 | POST /administration/commands | command, targetRef, expectedRevision, purpose, memberState | Operation | SPECIFIC_ADMIN_DOMAIN_NO_SUPERUSER_ASSUMPTION |
| C24_grant / M2 | POST /administration/commands | command, targetRef, expectedRevision, purpose, subjectRef, actions, expiresAt, scopeRef | Operation | SPECIFIC_ADMIN_DOMAIN_NO_SUPERUSER_ASSUMPTION |
| C24_revoke / M2 | POST /administration/commands | command, targetRef, expectedRevision, purpose | Operation | SPECIFIC_ADMIN_DOMAIN_NO_SUPERUSER_ASSUMPTION |
| C24_transfer / M2 | POST /administration/commands | command, targetRef, expectedRevision, purpose, targetMemberId, workIds | Operation | SPECIFIC_ADMIN_DOMAIN_NO_SUPERUSER_ASSUMPTION |
| C24_privacy / M2 | POST /administration/commands | command, targetRef, expectedRevision, purpose, requestKind | Operation | SPECIFIC_ADMIN_DOMAIN_NO_SUPERUSER_ASSUMPTION |
| C25_readInsights / M2 | GET /operations-insights | — | ResourceList | SCOPED_DIAGNOSTICS_NOT_CONTENT |
| C26_draft / M2 | POST /process-definitions/commands | command, name, formRef, definitionArtifactRef, nodeContractRefs | Operation | DESIGNER_OR_INDEPENDENT_PUBLISHER |
| C26_check / M2 | POST /process-definitions/commands | command, targetRef, expectedRevision | Operation | DESIGNER_OR_INDEPENDENT_PUBLISHER |
| C26_preview / M2 | POST /process-definitions/commands | command, targetRef, expectedRevision | Operation | DESIGNER_OR_INDEPENDENT_PUBLISHER |
| C26_review / M2 | POST /process-definitions/commands | command, targetRef, expectedRevision, evidenceRefs | Operation | DESIGNER_OR_INDEPENDENT_PUBLISHER |
| C26_publish / M2 | POST /process-definitions/commands | command, targetRef, expectedRevision, evidenceRefs | Operation | DESIGNER_OR_INDEPENDENT_PUBLISHER |
| C27_proposeConfig / M3 | POST /config-proposals/commands | command, targetRef, expectedRevision, scope, goal | Operation | ORIGINAL_OBJECT_FIELD_WRITE |
| C27_applyProposal / M3 | POST /config-proposals/commands | command, targetRef, expectedRevision, scope, selectedChanges, baseRevision | Operation | ORIGINAL_OBJECT_FIELD_WRITE |
| C27_undo / M3 | POST /config-proposals/commands | command, targetRef, expectedRevision, scope, mutationId, baseRevision | Operation | ORIGINAL_OBJECT_FIELD_WRITE |
| C28_plan / M3 | POST /analysis/commands | command, query | Operation | METRIC_ROW_COLUMN_READ_AND_OUTPUT_RELEASE |
| C28_execute / M3 | POST /analysis/commands | command, targetRef, expectedRevision | Operation | METRIC_ROW_COLUMN_READ_AND_OUTPUT_RELEASE |
| C28_readResult / M3 | POST /analysis/commands | command, targetRef, expectedRevision | Operation | METRIC_ROW_COLUMN_READ_AND_OUTPUT_RELEASE |
| C29_suggest / M3 | POST /relations/commands | command, sourceRefs, purpose | Operation | SOURCE_READ_ASSERTION_CONFIRM_RESULT_READ |
| C29_confirm / M3 | POST /relations/commands | command, targetRef, expectedRevision | Operation | SOURCE_READ_ASSERTION_CONFIRM_RESULT_READ |
| C29_readRelated / M3 | POST /relations/commands | command, targetRef, expectedRevision | Operation | SOURCE_READ_ASSERTION_CONFIRM_RESULT_READ |
| C30_listOpportunities / M4 | GET /opportunities | — | ResourceList | CURRENT_RECIPIENT |
| C30_accept / M4 | POST /opportunities/{opportunityId}/commands | command, targetRef, expectedRevision, sourceVersion | Operation | CURRENT_RECIPIENT_VALID_SIGNAL |
| C30_dismiss / M4 | POST /opportunities/{opportunityId}/commands | command, targetRef, expectedRevision, sourceVersion | Operation | CURRENT_RECIPIENT_VALID_SIGNAL |
| C30_snooze / M4 | POST /opportunities/{opportunityId}/commands | command, targetRef, expectedRevision, sourceVersion, until | Operation | CURRENT_RECIPIENT_VALID_SIGNAL |
| C31_propose / M5 | POST /evolution/commands | command, targetRef, expectedRevision, baselineRef, candidateRef | Operation | VERSION_BOUND_EVALUATION_AND_INDEPENDENT_PUBLICATION |
| C31_evaluate / M5 | POST /evolution/commands | command, targetRef, expectedRevision, baselineRef, candidateRef, evidenceRefs | Operation | VERSION_BOUND_EVALUATION_AND_INDEPENDENT_PUBLICATION |
| C31_trial / M5 | POST /evolution/commands | command, targetRef, expectedRevision, baselineRef, candidateRef, evidenceRefs, scopeRef, expiresAt, budget | Operation | VERSION_BOUND_EVALUATION_AND_INDEPENDENT_PUBLICATION |
| C31_publish / M5 | POST /evolution/commands | command, targetRef, expectedRevision, baselineRef, candidateRef, evidenceRefs | Operation | VERSION_BOUND_EVALUATION_AND_INDEPENDENT_PUBLICATION |
| C31_rollback / M5 | POST /evolution/commands | command, targetRef, expectedRevision, baselineRef, candidateRef, evidenceRefs, publicationRef | Operation | VERSION_BOUND_EVALUATION_AND_INDEPENDENT_PUBLICATION |
| C01_readVersionResource / M2 | GET /resources/{kind}/{resourceId}/versions/{version} | — | VersionResourceView | EXACT_VERSION_AND_ALL_RETURNED_FIELDS_READ_RELEASE |

另有二进制上传PUT与只读SSE通道，见OpenAPI明确路径；不计入原31命令组的新增业务能力。
