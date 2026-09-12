// Inspect the exact delivered diagram; never rerender or modify it.
const {chromium}=require('/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),html=path.join(root,'docs/设计包/44-技术架构交互图.html');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
(async()=>{const report={scope:'SUPPLEMENTARY_DIAGRAM_UI_ONLY',artifactSha256:sha(html),checks:[],errors:[],productTestsRun:false};const b=await chromium.launch({channel:'chrome',headless:true});
try {const p=await b.newPage({viewport:{width:1440,height:900},acceptDownloads:true});p.on('pageerror',e=>report.errors.push(String(e)));
const check=(name,ok)=>{report.checks.push({name,pass:!!ok});if(!ok)throw Error(name);};
await p.goto(pathToFileURL(html).href);await p.locator('#btn-node-finder').click();await p.locator('#node-finder-input').fill('Worker');
check('search finds one intended node',await p.locator('#node-finder').getByRole('button',{name:'聚焦隔离 AI Worker，4 条相关连接',exact:true}).count()===1);
await p.getByRole('button',{name:'聚焦隔离 AI Worker，4 条相关连接',exact:true}).click();check('selection opens semantic passport',await p.locator('#btn-focus-clear').isVisible());
await p.screenshot({path:path.join(root,'validation/technical-architecture-focus.png')});
await p.locator('#btn-focus-clear').click();check('passport can close',!await p.locator('#btn-focus-clear').isVisible());
await p.locator('#btn-node-finder').click();await p.locator('#node-finder-close').click();check('search can close',!await p.locator('#node-finder').isVisible());
await p.getByRole('button',{name:'打开第 1/2 章：人员工作链。章节聚焦差异：0 个保留，4 个进入，0 个离开',exact:true}).click();check('guided view selected',p.url().includes('human-work'));await p.keyboard.press('Escape');
await p.goto(pathToFileURL(html).href);
for(const [label,ext] of [['SVG可编辑矢量图','svg'],['PNG无损图像','png']]) {await p.locator('#btn-export').click();const [d]=await Promise.all([p.waitForEvent('download'),p.getByRole('menuitem').filter({hasText:ext==='svg'?/SVG/:/^PNG/}).click()]);const output=path.join(root,'validation/technical-architecture-export.'+ext);await d.saveAs(output);check(ext+' export produces bytes',fs.statSync(output).size>1000);(report.exports??=[]).push({path:path.relative(root,output),sha256:sha(output),bytes:fs.statSync(output).size});}
const svg=fs.readFileSync(path.join(root,'validation/technical-architecture-export.svg'),'utf8');check('SVG is standalone without scripts or local workspace paths',svg.includes('<svg')&&!/<script\b|\/Users\/mac|localhost|127\.0\.0\.1/.test(svg));check('no page errors',report.errors.length===0);
} catch(e){report.errors.push(String(e));process.exitCode=1;}finally{await b.close();report.status=report.errors.length?'FAIL':'PASS';report.checkedAt=new Date().toISOString();fs.writeFileSync(path.join(root,'validation/technical-architecture-interaction.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}})();
