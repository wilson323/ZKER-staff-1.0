import collections, hashlib, html, json, re, subprocess
from datetime import datetime, timezone
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, parse_qsl, urlencode
ROOT=Path('/Users/mac/Documents/微信公众号文章')
OUT=Path(__file__).resolve().parent
TOPICS={
'runtime':r'agent|智能体|harness|codex|qoder|staffdeck|deepseek.?harness|\bpi\b|多智能体',
'knowledge':r'知识库|RAG|文档检索|知识管理|wiki|pageindex',
'memory_ontology':r'记忆|本体|知识图谱|memory|ontology|graphiti|mem0|openviking',
'context_tools':r'上下文|context|MCP|code.?mode|tool.?search|插件|skills?',
'workflow':r'工作流|workflow|流程|durable|temporal|langgraph|低代码|协作',
'evaluation':r'评测|评估|evaluation|evals?|自进化|自我改进|自我迭代|复盘|演进',
'security':r'权限|注入|沙箱|sandbox|隔离|安全|授权|许可|商用',
'performance':r'并发|延迟|性能|成本|token|缓存|压缩|cache'
}
RX={k:re.compile(v,re.I) for k,v in TOPICS.items()}
class Body(HTMLParser):
 def __init__(self): super().__init__();self.parts=[];self.skip=0;self.depth=0;self.content=False;self.target=[];self.targetdepth=0
 def handle_starttag(self,tag,attrs):
  self.depth+=1
  if tag in ('script','style','noscript'):self.skip+=1
  if dict(attrs).get('id')=='js_content':self.targetdepth=self.depth;self.content=True
  if tag in ('p','div','br','section','h1','h2','h3','li'):self.parts.append('\n');self.target.append('\n') if self.content else None
 def handle_endtag(self,tag):
  if tag in ('script','style','noscript') and self.skip:self.skip-=1
  if self.content and self.depth<=self.targetdepth:self.content=False
  self.depth=max(0,self.depth-1)
 def handle_data(self,s):
  if not self.skip:
   self.parts.append(s)
   if self.content:self.target.append(s)
def extract(p):
 raw=p.read_text(errors='replace')
 if p.suffix=='.md':return raw
 b=Body();b.feed(raw)
 return re.sub(r'\n[ \t]*\n+', '\n\n',html.unescape(''.join(b.target or b.parts))).strip()
def canonical(u):
 if not u:return ''
 s=urlsplit(u)
 if s.hostname=='mp.weixin.qq.com':
  q=dict(parse_qsl(s.query));safe={k:q[k] for k in ('__biz','mid','idx','sn') if k in q}
  return 'https://mp.weixin.qq.com'+s.path+('?' + urlencode(safe) if safe else '')
 return u
paths=subprocess.check_output(['rg','--files','-g','metadata.json',str(ROOT)],text=True).splitlines()
rows=[];errors=[];texts={}
for name in sorted(paths):
 p=Path(name)
 try:
  m=json.loads(p.read_text());article=m.get('article',{});folder=p.parent
  title=article.get('title') or re.sub(r'_Mz[^/]*==$', '',folder.name).rstrip('_')
  chosen=next((folder/n for n in ('article.md','article.html','article_local.html') if (folder/n).is_file()),None)
  content=extract(chosen) if chosen else ''
  clean=re.sub(r'!\[[^\]]*\]\([^)]*\)','',content)
  topics=[k for k,r in RX.items() if r.search(title)]
  # Body discovery is supplementary; it is not a claim that the model reviewed every body.
  bodycounts={k:len(r.findall(clean)) for k,r in RX.items()}
  relevant=bool(topics) or (bodycounts['runtime']>=3 and sum(v>0 for v in bodycounts.values())>=3)
  ident=f'WX-{len(rows)+1:04d}'
  row={'id':ident,'title':title,'account':m.get('account',{}).get('name',folder.parent.name),'metadataPath':str(p),'bodyPath':str(chosen) if chosen else None,'sourceUrl':canonical(m.get('url') or article.get('link') or ''),'publishTime':article.get('publish_time_str') or article.get('publish_time') or None,'downloadedAt':m.get('downloaded_at'),'bodyFormat':chosen.suffix if chosen else None,'bodyChars':len(content),'metadataSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bodySha256':hashlib.sha256(chosen.read_bytes()).hexdigest() if chosen else None,'normalizedTitle':re.sub(r'[^\w\u4e00-\u9fff]','',title.lower()).replace('_',''),'titleTopics':topics,'bodyKeywordCounts':bodycounts,'candidate':relevant,'reviewStatus':'AUTOMATED_SCREEN_ONLY'}
  rows.append(row);texts[ident]=content
 except Exception as e:errors.append({'path':name,'error':str(e)})
groups={}
for r in rows:
 key=r['sourceUrl'] or r['normalizedTitle']
 # Title grouping catches local copies without a URL; preserve every path in the group.
 titlekey=r['normalizedTitle']
 existing=next((g for g in groups.values() if g['normalizedTitle']==titlekey or (r['sourceUrl'] and r['sourceUrl']==g['sourceUrl'])),None)
 if existing:existing['members'].append(r['id'])
 else:groups[r['id']]={'id':r['id'],'normalizedTitle':titlekey,'sourceUrl':r['sourceUrl'],'members':[r['id']]}
lookup={r['id']:r for r in rows}
for g in groups.values():
 candidates=[lookup[i] for i in g['members']]
 best=max(candidates,key=lambda r:(r['bodyChars']>300,r['bodyFormat']=='.md',len(r['sourceUrl'])>0,r['bodyChars']))
 g['representative']=best['id'];g['title']=best['title'];g['candidate']=any(r['candidate'] for r in candidates)
for r in rows:r['groupId']=next(g['id'] for g in groups.values() if r['id'] in g['members'])
result={'capturedAt':datetime.now(timezone.utc).isoformat(),'root':str(ROOT),'method':'Metadata + local title/body keyword screening; URL or normalized-title dedup; not exhaustive semantic review','counts':{'metadata':len(paths),'readableRows':len(rows),'groups':len(groups),'candidateRows':sum(r['candidate'] for r in rows),'candidateGroups':sum(g['candidate'] for g in groups.values())},'topics':TOPICS,'errors':errors,'articles':rows,'groups':list(groups.values())}
(OUT/'local-inventory.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
(OUT/'local-text-cache.json').write_text(json.dumps({r['id']:texts[r['id']] for r in rows if r['candidate']},ensure_ascii=False)+'\n')
print(json.dumps(result['counts'],ensure_ascii=False));print('errors',len(errors))
for g in groups.values():
 if g['candidate']:
  r=lookup[g['representative']]
  print(r['id'],r['bodyChars'],','.join(r['titleTopics']),r['title'][:100])
