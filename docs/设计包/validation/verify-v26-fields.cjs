const { chromium } = require('/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.dirname(__dirname);
const file = path.join(root, '08-人员数字员工协作交互原型.html');
const url = 'file://' + file;
const roles = JSON.parse(fs.readFileSync(path.join(root, '16-角色视角与权限演示数据.json'))).profiles;
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  page.setDefaultTimeout(5000);
  const checks = [], errors = [], network = [], inventory = [], screenshots = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (/^https?:/.test(r.url())) network.push(r.url()); });
  const check = (name, ok, type = 'interaction') => { checks.push({ name, type, passed: !!ok }); if (!ok) throw new Error(name); };
  const fresh = role => page.goto(url + '?role=' + role);
  const open = id => page.evaluate(id => window.oaDemo.open(id), id);
  const action = name => page.locator('[data-oa-action="' + name + '"]').last().click();
  const body = () => page.locator('main').innerText();
  const snapshot = () => page.evaluate(() => window.oaDemo.snapshot());
  const captureFields = async (role, view) => inventory.push({role, view, semanticStatus:'INVENTORIED_NOT_FULL_CONTRACT_ACCEPTANCE', fields: await page.locator('main').evaluate(el => [...el.querySelectorAll('label.field,.row,.summary>div')].filter(n => n.getClientRects().length).map(n => ({label:(n.querySelector('h3,span.label,span')?.textContent || '').trim(), content:(n.querySelector('.small,strong')?.textContent || '').trim(), controls:[...n.querySelectorAll('input,select,textarea')].map(c=>({id:c.id, value:c.value, type:c.type, required:c.required, disabled:c.disabled}))}))) });
  for (const r of roles) {
    await fresh(r.id);
    const views = (await page.evaluate(() => window.rolePrototypeState())).views;
    for (const view of views) {
      await page.evaluate(v => window.roleDemoNavigate(v), view);
      await captureFields(r.id, view);
      if (view === 'node') for (const tab of await page.locator('[data-tab]').evaluateAll(ns=>ns.map(n=>n.dataset.tab))) {
        await page.locator('[data-tab="'+tab+'"]').click();
        await captureFields(r.id, 'node-tab-'+tab);
      }
    }
    await open('t-'+r.id+'-pi-002');
    await captureFields(r.id,'oa-task');
  }
  check('All 41 profiles inventoried without converting inventory into contract acceptance',new Set(inventory.map(x=>x.role)).size===41);
  await fresh('main');
  check('OA human responsibility and B/S are explicit in homepage',(await body()).includes('OA 流程把人和责任串起来')&&(await body()).includes('企业 B/S 产品'));
  check('Counters are not mislabeled as only tasks due today',(await body()).includes('当前待办概览')&&!(await body()).includes('今天需要关注'));
  const cases = [
    ['pi-002','purchase',['采购项目','申请预算金额','币种'],['合同相对方','报销人员','交接生效日期']],
    ['pi-004','contract',['关联合同事项','合同相对方','合同类型','含税合同金额'],['申请预算金额','报销人员']],
    ['pi-005','expense',['报销人员','费用类型','费用发生日期','申报报销金额'],['合同相对方','申请预算金额']],
    ['pi-006','people',['交接人员','原任职岗位','接收岗位','交接生效日期'],['金额','币种','申请预算']]
  ];
  for (const [id,type,yes,no] of cases) {
    await open('t-main-'+id); const text=await body();
    check(type+' uses its own business labels',yes.every(v=>text.includes(v))&&no.every(v=>!text.includes(v)));
    check(type+' field origin is explicitly a template candidate',text.includes('虚构模板示例')&&text.includes('尚未映射正式后端合同'));
    if(type==='people') check('Completed HR case does not show active current phase',!text.includes('本任务所在阶段')&&text.includes('实例已结束'));
  }
  const s=await snapshot();
  check('No fabricated money field in HR fixture',!('amount' in s.instances.find(i=>i.type==='people').form));
  check('Task deadlines are not earlier than case creation',s.items.every(t=>Date.parse(t.dueAt)>=Date.parse(s.instances.find(i=>i.id===t.instanceId).startedAt)));
  check('Manual-only task configurations do not claim human-AI mode',s.items.filter(t=>t.config.agent===null).every(t=>t.config.mode==='人工执行'));
  await fresh('review');await open('t-review-pi-002');
  check('Review phase is not fixed at preparation phase',(await page.locator('[data-oa-stage="2"]').innerText()).includes('本任务所在阶段'));
  check('Missing target submission cannot be approved',await page.locator('[data-oa-action="approve"]').isDisabled()&&await page.evaluate(()=>window.oaDemo.action('approve'))===false);
  await fresh('auditor');await open('t-auditor-pi-007');await page.evaluate(()=>window.oaDemo.action('back'));await page.locator('[data-oa-tab="cc"]').click();
  check('CC accessible labels also use masked case references',!(await page.locator('[data-oa-select]').getAttribute('aria-label')).includes('HT-'));
  await fresh('initiator');await page.locator('[data-oa-tab="started"]').click();
  check('Instance list does not apply unsupported per-task due filter',await page.locator('#oa-due').isDisabled());
  for(const [type,name] of [['purchase','设备采购'],['contract','合同评审'],['expense','费用报销'],['people','人事服务']]) {
    await page.evaluate(()=>window.roleDemoNavigate('dashboard'));await action('new');await page.selectOption('#oa-new-type',{label:name});await page.fill('#oa-new-title',name+'字段验证');
    const labels=await page.locator('#oa-new-fields').innerText();
    check(type+' start form uses template-specific required fields',type==='people'?!labels.includes('金额')&&labels.includes('交接人员'):labels.includes(type==='contract'?'合同相对方':type==='expense'?'费用发生日期':'申请预算金额'));
    await action('create'); const after=await snapshot(),inst=after.instances.find(i=>i.title===name+'字段验证');
    check(type+' creation persists a distinct valid form',!!inst&&inst.type===type);
    await open('t-initiator-'+inst.id);
    check(type+' new task belongs to registration phase',(await page.locator('[data-oa-stage="0"]').innerText()).includes('本任务所在阶段'));
  }
  const purchase={type:'purchase',title:'金额边界',project:'项目 A',amount:100};
  for(const [label,amount] of [['zero',0],['negative',-1],['fractional-cent',1.001],['empty',NaN]]) {
    const result=await page.evaluate(([p,label,amount])=>window.oaDemo.create({...p,amount},'invalid-'+label),[purchase,label,amount]);
    check('Invalid amount '+label+' cannot create case',result===false);
  }
  check('Invalid calendar date cannot create HR case',await page.evaluate(()=>window.oaDemo.create({type:'people',title:'日期验证',form:{person:'示例人员',fromPosition:'原岗位',toPosition:'接收岗位',effectiveDate:'2026-02-30'}},'bad-date'))===false);
  check('Extra money cannot leak into HR form through forged payload',await page.evaluate(()=>window.oaDemo.create({type:'people',title:'字段越界',form:{person:'示例人员',fromPosition:'原岗位',toPosition:'接收岗位',effectiveDate:'2026-09-11',amount:120000}},'bad-field'))===false);
  await fresh('approver');await page.evaluate(()=>window.roleDemoNavigate('domain'));await page.locator('[data-role-action="access-reject"]').click();await page.selectOption('#role','access');await page.evaluate(()=>window.roleDemoNavigate('domain'));await page.fill('#access-scope','合同 B / 指定附件读取');await page.fill('#access-days','14');await page.locator('[data-role-action="access-request"]').click();
  await page.selectOption('#role','approver');await page.evaluate(()=>window.roleDemoNavigate('domain'));
  check('Approval uses actual requested scope and validity',(await body()).includes('合同 B / 指定附件读取')&&(await body()).includes('申请 14 天'));
  await page.fill('#approval-reason','限定合同 B 附件，并保留操作记录');await page.locator('[data-role-action="access-approve"]').click();
  check('Approval reason is preserved',(await page.evaluate(()=>window.rolePrototypeState())).data.approvalReason==='限定合同 B 附件，并保留操作记录');
  await fresh('automation');await page.evaluate(()=>window.roleDemoNavigate('domain'));await page.fill('#schedule-time','14:35');await page.selectOption('#schedule-zone','UTC');await page.locator('[data-role-action="schedule-save"]').click();
  check('Saved schedule shows selected time and zone',await page.inputValue('#schedule-time')==='14:35'&&await page.inputValue('#schedule-zone')==='UTC');
  await fresh('initiator');await page.evaluate(()=>window.roleDemoNavigate('domain'));await page.fill('#process-title','从职责入口发起的采购');await page.locator('[data-role-action="process-check"]').click();await page.locator('[data-role-action="process-start"]').click();
  check('Legacy start page creates real prototype instance rather than standalone boolean',(await snapshot()).instances.some(i=>i.title==='从职责入口发起的采购'));
  await page.evaluate(()=>window.roleDemoNavigate('dashboard'));await page.locator('[data-oa-tab="started"]').click();
  check('Both process entry points share I started list',(await body()).includes('从职责入口发起的采购'));
  for(const width of [1440,1024,390]) {
    await page.setViewportSize({width,height:width===390?844:1050});await fresh('main');
    for(const [id,type] of cases) {
      await open('t-main-'+id);
      check(type+' detail at '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'layout');
      const shot=path.join(__dirname,'v26-fields-'+type+'-'+width+'.png');await page.screenshot({path:shot,fullPage:true});screenshots.push(shot);
    }
  }
  check('No browser script errors',errors.length===0);check('No external network effects',network.length===0);
  const result={revision:'v2.6',passed:checks.every(c=>c.passed),checks,layoutChecks:checks.filter(c=>c.type==='layout').length,interactionChecks:checks.filter(c=>c.type==='interaction').length,inventoryViews:inventory.length,inventory,roleCount:41,screenshots,pageErrors:errors,networkRequests:network,htmlSha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),limitations:['Field inventory is not complete backend-contract acceptance.','Four business forms contain fictional candidate fields.','Only named semantic assertions are verified; no real B/S server, database or Agent runtime tested.']};
  fs.writeFileSync(path.join(__dirname,'v26-field-audit.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({passed:result.passed,inventoryViews:inventory.length,layouts:result.layoutChecks,interactions:result.interactionChecks,screenshots:screenshots.length,pageErrors:errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
