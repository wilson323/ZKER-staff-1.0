import json, subprocess, hashlib
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit,parse_qsl,urlencode
OUT=Path(__file__).resolve().parent/'ima';OUT.mkdir(exist_ok=True)
SCRIPT='/Users/mac/.codex/skills/ima-skill/ima_api.cjs'
READS={'search_knowledge_base','get_knowledge_base','get_knowledge_list','search_knowledge','get_media_info'}
def sanitize(x):
 if isinstance(x,dict):return {k:sanitize(v) for k,v in x.items() if k.lower() not in ('headers','authorization','token','api_key','apikey','client_id','clientid','request_id')}
 if isinstance(x,list):return [sanitize(v) for v in x]
 if isinstance(x,str) and x.startswith(('https://','http://')):
  u=urlsplit(x)
  if u.hostname=='mp.weixin.qq.com':
   q={k:v for k,v in parse_qsl(u.query) if k in ('__biz','mid','idx','sn')}
   return u._replace(query=urlencode(q),fragment='').geturl()
  return u._replace(query='',fragment='').geturl()
 return x
def call(op,body,label):
 assert op in READS
 proc=subprocess.run(['node',SCRIPT,'openapi/wiki/v1/'+op,json.dumps(body,ensure_ascii=False),json.dumps({'baseUrl':'https://ima.qq.com'})],capture_output=True,text=True,timeout=45)
 try:data=json.loads(proc.stdout)
 except ValueError:data={'code':None,'msg':proc.stderr or 'non-JSON response'}
 record={'retrievedAt':datetime.now(timezone.utc).isoformat(),'operation':op,'request':sanitize(body),'exitCode':proc.returncode,'response':sanitize(data)}
 (OUT/(label+'.json')).write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
 if proc.returncode or data.get('code')!=0:
  print('IMA_ERROR',label,data.get('msg',proc.stderr));return None
 return data.get('data',{})
if __name__=='__main__':
 entries=[];cursor='';page=0
 while True:
  d=call('search_knowledge_base',{'query':'','cursor':cursor,'limit':20},f'kb-{page}')
  if d is None:break
  entries+=d.get('info_list',[]);page+=1
  if d.get('is_end'):break
  new=d.get('next_cursor')
  if not new or new==cursor or page>=10:break
  cursor=new
 (OUT/'knowledge-bases.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps([{'name':i.get('kb_name'),'count':i.get('content_count')} for i in entries],ensure_ascii=False))
 print('pages',page,'ended',d.get('is_end') if d else False)
