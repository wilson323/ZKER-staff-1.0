import json,hashlib,subprocess,re
from pathlib import Path
from datetime import datetime,timezone
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlsplit
from html.parser import HTMLParser
class TextExtractor(HTMLParser):
 def __init__(self):
  super().__init__();self.parts=[];self.skip=0
 def handle_starttag(self,tag,attrs):
  if tag in ('script','style','noscript','svg'):self.skip+=1
  elif tag in ('p','div','br','li','h1','h2','h3','tr'):self.parts.append('\n')
 def handle_endtag(self,tag):
  if tag in ('script','style','noscript','svg') and self.skip:self.skip-=1
 def handle_data(self,data):
  if not self.skip:self.parts.append(data)
def extract(raw):
 text=raw.decode(errors='replace')
 if '<html' in text[:3000].lower() or '<!doctype' in text[:1000].lower():
  parser=TextExtractor();parser.feed(text)
  text='\n'.join(x.strip() for x in ''.join(parser.parts).splitlines() if x.strip())
 return text
OUT=Path(__file__).resolve().parent/'public';OUT.mkdir(exist_ok=True)
def fetch(job):
 name,url=job;dest=OUT/(name+'.raw');p=subprocess.run(['curl','--fail','--location','--silent','--show-error','--max-time','35','--proto','=https','--proto-redir','=https',url],capture_output=True,timeout=40)
 row={'id':name,'url':url,'retrievedAt':datetime.now(timezone.utc).isoformat(),'exitCode':p.returncode,'bytes':len(p.stdout),'path':str(dest),'sha256':hashlib.sha256(p.stdout).hexdigest() if p.returncode==0 else None,'error':p.stderr.decode(errors='replace')[:500]}
 if p.returncode==0:
  dest.write_bytes(p.stdout)
  text=extract(p.stdout)
  (OUT/(name+'.txt')).write_text(text)
 return row
if __name__=='__main__':
 jobs=[
 ('anthropic-evals','https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents'),
 ('anthropic-context','https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents'),
 ('anthropic-tools','https://www.anthropic.com/engineering/advanced-tool-use'),
 ('anthropic-effective','https://www.anthropic.com/engineering/building-effective-agents'),
 ('otel-genai','https://opentelemetry.io/docs/specs/semconv/gen-ai/'),
 ('otel-genai-events','https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-events/'),
 ('cumora-readme','https://raw.githubusercontent.com/yetone/cumora/main/README.md'),
 ('cumora-license','https://raw.githubusercontent.com/yetone/cumora/main/LICENSE'),
 ('maka-readme','https://raw.githubusercontent.com/apache/maka/main/README.md'),
 ('planning-evals','https://raw.githubusercontent.com/OthmanAdi/planning-with-files/master/docs/evals.md'),
 ('planning-readme','https://raw.githubusercontent.com/OthmanAdi/planning-with-files/master/README.md')]
 for i in ['IMA-01','IMA-02']:
  p=OUT.parent/'ima'/('media-'+i+'.json');url=json.loads(p.read_text())['response']['data']['url_info']['url'];jobs.append((i,url))
 with ThreadPoolExecutor(max_workers=3) as ex:rows=list(ex.map(fetch,jobs))
 (OUT/'manifest.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
 for r in rows:print(r['id'],r['exitCode'],r['bytes'],r['error'][:100])
