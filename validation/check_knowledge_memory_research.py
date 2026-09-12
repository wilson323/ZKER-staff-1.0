"""Validate research evidence and document integrity; never product readiness."""
from pathlib import Path
from urllib.parse import urlsplit, unquote
from datetime import datetime, timezone
import hashlib
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "validation/knowledge-memory"
checks, failures, checked_sources, fetch_failures = [], [], [], []


def read(path):
    return json.loads(path.read_text())


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def check(name, condition):
    checks.append({"name": name, "pass": bool(condition)})
    if not condition:
        failures.append(name)


task = read(ROOT / "validation/development-task-knowledge-memory-research-20260911.json")
for rel, before in task["baseline"].items():
    if Path(rel).name.startswith(("30-", "31-")):
        check("original unchanged: " + rel, digest(ROOT / rel) == before)

trace = read(ROOT / "docs/设计包/30-产品设计追踪数据.json")
check("173 requirements retained", sum(len(trace[k]) for k in
      ("requirements", "aiEnhancements", "workspaceRefinements")) == 173)
check("22 pages retained", len(trace["pages"]) == 22)
check("72 original product cases unrun", len(trace["acceptanceCases"]) == 72 and
      all(c["status"] == "NOT_RUN" and not c["evidence"] for c in trace["acceptanceCases"]))
product = read(ROOT / "validation/development-workflow.json")["product"]
check("stack remains unconfigured", product["status"] == "NOT_CONFIGURED" and
      product["stackDecision"] is None and product["commands"] == [])

# Check exact captured bytes. Failed HTTP/TLS requests remain evidence of failure,
# not successful source reads. This checker does not execute downloaded sources.
rows = read(BASE / "sources/file-manifest.json") + read(BASE / "sources/web-manifest.json")
memory_files = {}
for path in (BASE / "memory-sources").rglob("*"):
    if path.is_file():
        memory_files.setdefault((path.name, digest(path)), []).append(path)
for source in read(BASE / "memory-sources/source-manifest.json"):
    if not source.get("sha256"):
        fetch_failures.append(source)
        check("memory failed fetch not credited: " + source["repo"] + "/" + source["path"],
              bool(source.get("error")))
        continue
    matches = memory_files.get((Path(source["path"]).name, source["sha256"]), [])
    check("memory snapshot located: " + source["url"], bool(matches))
    if matches:
        rows.append({**source, "file": str(matches[0].relative_to(ROOT)), "exit": 0})
for row in rows:
    if row.get("exit", 0) != 0:
        fetch_failures.append({k: row[k] for k in ("url", "exit", "error") if k in row})
        check("failed fetch not credited: " + row["url"], not row.get("sha256"))
        continue
    p = ROOT / row["file"]
    ok = p.is_file() and digest(p) == row["sha256"]
    check("source SHA-256: " + row["file"], ok)
    if row.get("commit"):
        check("fixed commit: " + row["url"], bool(re.fullmatch(r"[0-9a-f]{40}", row["commit"]))
               and row["commit"] in row["url"])
    if ok:
        checked_sources.append({"path": row["file"], "url": row["url"], "sha256": row["sha256"]})

numbers = (41, 46, 53, 54, 55, 56)
documents = [next((ROOT / "docs/设计包").glob(f"{n}-*.md")) for n in numbers]
documents += [ROOT / "README.md", ROOT / "CONTEXT.md"]
texts = {}
for p in documents:
    s = p.read_text()
    texts[p.name.split("-")[0]] = s
    check("balanced fences: " + p.name, len(re.findall(r"^```", s, re.M)) % 2 == 0)
    refs = dict(re.findall(r"^\[([^\]]+)\]:\s*(\S+)", s, re.M))
    for key in re.findall(r"\[[^\]]+\]\[([^\]]+)\]", s):
        check("reference defined: " + p.name + ":" + key, key in refs)
    for target in re.findall(r"\[[^\]]+\]\(([^)]+)\)", s) + list(refs.values()):
        url = urlsplit(target.strip("<>"))
        if url.scheme or not url.path:
            continue
        target_path = (p.parent / unquote(url.path)).resolve()
        check("local target: " + p.name + ":" + target, target_path.exists())

research, design = texts["55"], texts["56"]
case_ids = re.findall(r"^\| (KM-P\d{2}) \|", design, re.M)
check("30 distinct POC cases", len(case_ids) == 30 and set(case_ids) ==
      {f"KM-P{i:02}" for i in range(1, 31)})
check("POC is explicitly unrun", "全部 `NOT_RUN`" in design)
for term in ("QoderWake", "LangChain4j", "Qdrant", "Weaviate", "Milvus", "pgvector",
             "Apache Tika", "Docling", "RAGFlow", "Mem0", "Graphiti", "OpenViking",
             "Dify", "FastGPT", "PageIndex"):
    check("candidate covered: " + term, term in research)
for term in ("责任轮次", "不可变", "正式交付", "来源版本", "CAS", "Outbox", "墓碑",
             "policyRevision", "default", "接收人权限", "有限试用", "恢复备份"):
    check("design topic present (not runtime proof): " + term, term in design)
check("two design flowcharts", design.count("```mermaid") == 2)
for p in documents:
    if p.name.startswith(("55-", "56-")):
        check("implementation boundary: " + p.name, "NOT_IMPLEMENTED" in p.read_text()
              and "RELEASE_NOT_CLEARED" in p.read_text())

# Guard against the stale blanket-license assumptions uncovered during research.
wl = (BASE / "sources/weaviate-wl-license.source").read_text()
root_license = (BASE / "sources/weaviate-license.source").read_text()
ov = (BASE / "memory-sources/openviking/LICENSE").read_text()
check("Weaviate actual partition marker", '"wl"' in root_license and "BSD-3-Clause" in root_license)
check("Weaviate restricted file verified", "All rights reserved" in wl)
check("Weaviate mixed license disclosed", "分区许可" in research and "受限代码" in research)
check("OpenViking actual AGPL marker", "GNU AFFERO GENERAL PUBLIC LICENSE" in ov)
check("OpenViking commercial limitation disclosed", "AGPLv3" in research and "闭源" in research)

report = {
    "scope": "KNOWLEDGE_MEMORY_RESEARCH_DOCUMENTS_ONLY",
    "checkedAt": datetime.now(timezone.utc).isoformat(),
    "status": "FAIL" if failures else "PASS",
    "checkCount": len(checks), "checksPassed": len(checks) - len(failures),
    "failures": failures, "checks": checks,
    "sourceFilesVerified": len(checked_sources), "sources": checked_sources,
    "failedFetches": fetch_failures,
    "documents": [{"path": str(p.relative_to(ROOT)), "sha256": digest(p)} for p in documents],
    "pocCases": [{"id": ident, "status": "NOT_RUN"} for ident in case_ids],
    "productTestsRun": False, "commercialReleaseCleared": False,
    "limitations": [
        "SHA checks prove saved-source integrity, not dependency compatibility or legal clearance.",
        "Text/topic checks prove document structure only; source interpretation was reviewed separately.",
        "No candidate installation, build, real model, database, permission runtime or product acceptance.",
        "Mermaid blocks are checked structurally; these new diagrams have not been browser-rendered."
    ]
}
(BASE / "research-check.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({k: report[k] for k in ("status", "scope", "checkCount", "checksPassed",
                 "sourceFilesVerified", "failures")}, ensure_ascii=False, indent=2))
sys.exit(bool(failures))
