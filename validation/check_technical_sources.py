"""Bounded independent reread of pinned primary sources; downloads no executable."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json,re,hashlib,datetime,subprocess
ROOT=Path(__file__).resolve().parents[1]
s=(ROOT/'docs/设计包/36-开源底座源码研究与技术选型.md').read_text()
refs=dict(re.findall(r'^\[([^\]]+)\]:\s*(\S+)',s,re.M))
patterns={
 'yd-root':r'<java.version>|<spring-boot.version>',
 'yd-bom':r'<flowable.version>|<spring.boot.version>',
 'yd-file':r'@PermitAll|@TenantIgnore|void getFileContent|byte\[\] getFileContent|@GetMapping',
 'ra-root':r'<java.version>|<spring-boot.version>|<langchain4j.version>|<warm-flow.version>',
 'ra-docx-license':r'License|copyright|may not|proprietary|Anthropic',
 'ra-sql':r'CREATE TABLE.*(agent_info|chat_model|knowledge_info|flow_definition|t_workflow|mcp_tool_info)|CREATE DATABASE|^USE ',
 'yd-mysql':r'CREATE TABLE',
 'gantt914':r'', 'tinyflow126':r'<licenses>|<license>|<name>|<url>'}
def fetch(key):
 url=refs[key]
 if '/blob/' in url:
  url=url.replace('https://github.com/','https://raw.githubusercontent.com/').replace('/blob/','/')
 data=subprocess.run(['curl','--fail','--silent','--show-error','--location','--max-time','30',url],check=True,capture_output=True).stdout;status=200
 text=data.decode('utf-8');lines=text.splitlines()
 matches=[{'line':i,'text':line.strip()[:420]} for i,line in enumerate(lines,1) if patterns[key] and re.search(patterns[key],line,re.I)][:65]
 if key=='ra-docx-license':matches=matches[:1]
 extra={}
 if key=='gantt914':extra={'version':json.loads(text)['version'],'license':json.loads(text).get('license')}
 if key=='yd-mysql':extra={'createTableCount':len(re.findall(r'CREATE TABLE',text,re.I)),'aiOrBpmTables':re.findall(r'CREATE TABLE\s+`?((?:ai|bpm)_[^`\s(]+)',text,re.I)}
 return {'key':key,'url':url,'httpStatus':status,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'lineEvidence':matches,**extra}
results=[]
with ThreadPoolExecutor(max_workers=5) as pool:
 for key,result in zip(patterns,pool.map(lambda k:fetch(k),patterns)):results.append(result)
r={'scope':'PINNED_SOURCE_REREAD_ONLY_NO_BUILD_OR_LICENSE_OPINION','checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'PASS','sources':results,'limits':['Only listed source declarations and source paths were re-read; no dependency resolution, build, SQL import or runtime test.','License observations do not grant rights or certify a complete distributed product.']}
(ROOT/'validation/technical-source-check.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({x['key']:{'status':x['httpStatus'],'bytes':x['bytes'],'evidence':x['lineEvidence'][:5],**{k:x[k] for k in ['license','createTableCount','aiOrBpmTables'] if k in x}} for x in results},ensure_ascii=False,indent=2))
