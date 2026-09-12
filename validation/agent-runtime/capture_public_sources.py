"""Capture explicitly listed public sources; no source code is executed."""
import concurrent.futures
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess
import sys

BASE = Path(__file__).resolve().parent
OUT = BASE / 'sources'
OUT.mkdir(exist_ok=True)
MANIFEST = BASE / 'source-manifest.json'


def capture(item):
    ident, url = item
    if not url.startswith('https://') or '/' in ident or '..' in ident:
        raise ValueError('expected safe name and public HTTPS URL')
    p = OUT / ident
    run = subprocess.run(['curl', '--fail', '--location', '--silent', '--show-error',
                          '--max-time', '35', url, '-o', str(p)], capture_output=True, text=True)
    row = {'id': ident, 'url': url, 'retrievedAt': datetime.now(timezone.utc).isoformat(),
           'exit': run.returncode}
    if run.returncode == 0:
        row.update(file=str(p.relative_to(BASE.parents[1])), bytes=p.stat().st_size,
                   sha256=hashlib.sha256(p.read_bytes()).hexdigest())
    else:
        row['error'] = run.stderr.strip()
    return row


if __name__ == '__main__':
    items = json.load(sys.stdin)
    rows = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else []
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for row in pool.map(capture, items):
            rows.append(row)
            print(json.dumps(row, ensure_ascii=False))
    MANIFEST.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
