import json
from pathlib import Path
from ima_read import call,OUT
rs=json.loads((OUT/'article-searches.json').read_text());allrows=[]
for r in rs:
 for e in r['entries']:
  if not any(x['media_id']==e['media_id'] for x in allrows):allrows.append(dict(e,knowledgeBase=r['knowledgeBase']))
patterns=['企业AI对话记忆为什么不能只存Redis','LangMem 发布','为 AI 智能体打造高效的上下文工程','智能体架构，利用文件系统重塑上下文工程','Anthropic：如何评测 Agent','商家端PC Agent框架重构','RAG-MCP：突破','KnowFlow v2.0.4','Dify v1.1.0','Meta-Harness','Harness design for long-runnin','Pi']
sel=[]
for pattern in patterns:
 hits=[x for x in allrows if pattern.lower() in x['title'].lower()]
 if not hits:continue
 e=hits[0];ident=f'IMA-{len(sel)+1:02d}'
 d=call('get_media_info',{'media_id':e['media_id']},'media-'+ident)
 rec=dict(e,id=ident,bodyStatus='PENDING',mediaInfoAvailable=d is not None)
 sel.append(rec)
 print(ident,e['title'],'type',e.get('media_type'),'keys',list(d) if d else [])
 if d:
  print('infoShape',{k:list(v) if isinstance(v,dict) else type(v).__name__ for k,v in d.items()})
(OUT/'selected.json').write_text(json.dumps(sel,ensure_ascii=False,indent=2)+'\n')
