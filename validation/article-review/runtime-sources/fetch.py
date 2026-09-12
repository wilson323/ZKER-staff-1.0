import sys,json,subprocess,hashlib,datetime,concurrent.futures
from pathlib import Path
root=Path(__file__).parent
items=json.loads(Path(sys.argv[1]).read_text())
def get(x):
 name,url=x;out=root/name
 r=subprocess.run(["curl","-L","--fail","--connect-timeout","8","--max-time","40","--silent","--show-error",url,"-o",str(out)],capture_output=True,text=True)
 row={"name":name,"url":url,"retrievedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),"exitCode":r.returncode}
 if r.returncode==0:row.update(sha256=hashlib.sha256(out.read_bytes()).hexdigest(),bytes=out.stat().st_size)
 else:row["error"]=r.stderr[:500]
 return row
rows=list(concurrent.futures.ThreadPoolExecutor(max_workers=4).map(get,items))
mp=root/"manifest.json";old=json.loads(mp.read_text()) if mp.exists() else []
mp.write_text(json.dumps(old+rows,ensure_ascii=False,indent=2))
print(json.dumps(rows,ensure_ascii=False,indent=2))
