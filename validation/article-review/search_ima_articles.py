import json,re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from ima_read import call,OUT
kbs=json.loads((OUT/'knowledge-bases.json').read_text());by={x['kb_name']:x for x in kbs}
plans=[('DeepSeek Harness',None),('驾驭AI - Harness',None),('Wilson的知识库','智能体'),('Wilson的知识库','记忆'),('AI Agent Coding知识库','Harness'),('AI Agent Coding知识库','AgentScope'),('智能化软件工程','上下文'),('智能化软件工程','评测'),('AI知识库RAG & LLM（持续更新）','权限'),('AI知识库RAG & LLM（持续更新）','知识'),('AI BI Agent 人工智能 商业智能 智能体','本体'),('MCP、A2A和AG-UI宝库','工具'),('AI产品设计师UXUI用户体验B端SaaS','Agent'),('AI Coding（每日更新 ing）','Pi')]
def search(entry):
 name,query=entry;kb=by[name];cursor='';entries=[];pages=[];reason=''
 label=re.sub(r'[^A-Za-z0-9]','',name) or 'kb'
 label=str(list(by).index(name))+'-'+str(plans.index(entry))
 for page in range(12 if query is None else 3):
  body={'knowledge_base_id':kb['kb_id'],'cursor':cursor}
  if query is None:body['limit']=50;op='get_knowledge_list'
  else:body['query']=query;op='search_knowledge'
  data=call(op,body,f'search-{label}-{page}')
  if data is None:reason='API_ERROR';break
  entries+=data.get('info_list',[]);pages.append(page)
  if data.get('is_end'):reason='END';break
  new=data.get('next_cursor')
  if not new or new==cursor:reason='CURSOR_MISSING_OR_REPEATED';break
  cursor=new
 else:reason='BOUNDED_PAGE_LIMIT'
 return {'knowledgeBase':name,'query':query,'entries':entries,'pages':len(pages),'stopReason':reason}
with ThreadPoolExecutor(max_workers=3) as pool:results=list(pool.map(search,plans))
(OUT/'article-searches.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
for r in results:
 print(r['knowledgeBase'],r['query'],len(r['entries']),r['pages'],r['stopReason'])
 for a in r['entries'][:10]:print(' ',a.get('title') or a.get('media_name') or str(list(a)))
