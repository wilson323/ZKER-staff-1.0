const {chromium}=require('/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
(async()=>{
 const root='/Users/mac/Documents/New project 2',dir=path.join(root,'validation');fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({headless:true,channel:'chrome'});const page=await browser.newPage();const errors=[],checks=[],screenshots=[];page.on('pageerror',e=>errors.push(e.message));
 const url=pathToFileURL(path.join(root,'08-人员数字员工协作交互原型.html')).href+'?view=node';
 for(const [width,height] of [[1440,1000],[1024,1000],[390,844]]){
  await page.setViewportSize({width,height});await page.goto(url);
  for(const role of ['main','collab','review','designer','resource']){
   await page.selectOption('#role',role);const n=await page.locator('[data-tab]').count();
   for(let t=0;t<n;t++){
    await page.locator('[data-tab="'+t+'"]').click();
    const measure=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,width:innerWidth,text:document.querySelector('#panel').innerText.length,h1:document.querySelector('h1').innerText}));
    checks.push({type:'layout',width,role,tab:t,passed:measure.doc<=measure.width+1&&measure.text>30,measure});
   }
  }
  await page.selectOption('#role',width===1024?'collab':'main');
  if(width===1024)await page.locator('[data-tab="2"]').click();
  const file=path.join(dir,'qoder-node-'+width+'.png');await page.screenshot({path:file,fullPage:true});screenshots.push(file);
 }
 await page.setViewportSize({width:1440,height:1000});await page.goto(url);
 const verify=(name,ok)=>{checks.push({type:'interaction',name,passed:!!ok});if(!ok)throw Error(name)};
 await page.locator('#change-input').click();await page.locator('[data-tab="3"]').click();
 verify('stale input disables parent commit',await page.locator('[data-action="commit"]').isDisabled());
 await page.selectOption('#role','collab');await page.locator('[data-tab="1"]').click();await page.selectOption('#agent','共享岗位助手');await page.selectOption('#mode','人工执行');await page.locator('[data-action="save-config"]').click();
 let st=await page.evaluate(()=>window.designState());verify('collaborator configuration isolated',st.agents.collab==='共享岗位助手'&&st.agents.main==='方案编制助手'&&st.modes.main==='人机协助');
 await page.locator('[data-tab="2"]').click();await page.locator('[data-action="recheck"]').click();st=await page.evaluate(()=>window.designState());verify('recheck produces new matching basis draft',st.loaded===2&&st.budget===2&&st.contribution==='draft');
 await page.locator('[data-tab="3"]').click();await page.locator('[data-action="submit-contribution"]').click();st=await page.evaluate(()=>window.designState());verify('contribution submitted separately',st.contribution==='submitted'&&!st.committed);
 await page.selectOption('#role','main');await page.locator('[data-tab="3"]').click();await page.locator('[data-action="accept"]').click();verify('acceptance still requires approval',await page.locator('[data-action="commit"]').isDisabled());
 await page.selectOption('#role','review');await page.locator('[data-tab="1"]').click();verify('reviewer configuration read only',await page.locator('#agent').isDisabled()&&await page.locator('[data-action="save-config"]').isDisabled());
 await page.locator('[data-tab="3"]').click();await page.locator('[data-action="approve"]').click();st=await page.evaluate(()=>window.designState());verify('review creates separate decision',st.approved&&!st.committed);
 await page.selectOption('#role','main');await page.locator('[data-tab="3"]').click();await page.locator('[data-action="commit"]').click();st=await page.evaluate(()=>window.designState());verify('parent commit after accepted current contribution and approval',st.committed&&st.contribution==='accepted'&&st.approved);
 const result={url,layoutChecks:checks.filter(x=>x.type==='layout').length,interactionChecks:checks.filter(x=>x.type==='interaction').length,checks,pageErrors:errors,screenshots,passed:checks.every(x=>x.passed)&&errors.length===0,limitations:'Local HTML demonstration only. No product server, DSH, real dependency, complete a11y audit, or production verification.'};
 fs.writeFileSync(path.join(dir,'qoder-node-validation.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({layoutChecks:result.layoutChecks,interactionChecks:result.interactionChecks,pageErrors:errors,failed:checks.filter(x=>!x.passed),screenshots,passed:result.passed},null,2));await browser.close();process.exit(result.passed?0:1);
})().catch(e=>{console.error(e);process.exit(1)});

