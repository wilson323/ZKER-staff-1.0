# Current work

Goal: correct label normalization behavior documented in README.
Status: VERIFIED
Scope: existing parse_labels(items) function; README string-list contract only.
Change: trim each label, omit empty results, deduplicate after trimming while retaining first appearance. Public signature unchanged.
Evidence:
- evidence/baseline-tests.json and evidence/baseline-tests.stderr.log: 4 tests, 2 expected failures, exit 1.
- evidence/fixed-tests.json and evidence/fixed-tests.stderr.log: original 4 tests passed, exit 0; test source hash unchanged.
- evidence/baseline.json and evidence/labels.diff: captured file baseline and minimal source diff.
- trial-result.json: trial provenance, command records, outcomes and limitations.
Uncovered: non-string inputs (outside README contract), performance, package build/distribution and production integration were not evaluated.
Recovery: original source is preserved in evidence/baseline.json; no external side effects were performed.
