"""Derived human-readable indexes; no runtime or database side effects."""
from pathlib import Path
import json
import re
ROOT=Path(__file__).resolve().parents[1]
C=ROOT/'contracts';D=ROOT/'docs/设计包'
def read(n):return json.loads((C/n).read_text())
def save(n,v):(C/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def md(s):return str(s).replace('|','\\|').replace('\n',' ')

ops=read('command-catalog.json')['operations'];api=read('openapi.json');tables=read('data-model.json')['tables']
lines=['# 接口动作与字段参考','', '由OpenAPI和command-catalog生成；设计合同，非运行接口。精确类型/枚举/必填/条件见openapi.json；下表不存在任意JSON直通。', '', '| 动作ID / 阶段 | 方法与路径（前缀/oa-api/v1） | 请求字段（均必需，除Schema明确可选） | 返回类型 | 授权 |','|---|---|---|---|---|']
for o in ops:
    fields='—'
    if o['requestSchema']:
        schema=api['components']['schemas'][o['requestSchema']]
        fields=', '.join(schema['properties'])
    lines.append('| '+' | '.join(md(v) for v in [o['id']+' / '+o['phase'],o['method'].upper()+' '+o['path'],fields,o['responseSchema'],o['authorization']])+' |')
lines += ['','另有二进制上传PUT与只读SSE通道，见OpenAPI明确路径；不计入原31命令组的新增业务能力。','']
(C/'command-reference.md').write_text('\n'.join(lines))

lines=['# 字段级数据字典','','由data-model.json生成。34张候选参考表；优先映射底座，不能直接全部建表。未在数据库执行。','']
for t in tables:
    lines+=['## '+t['name'],'',f"归属：{t['authority']}。阶段：{t['phase']}；内容版本不可变标记：{t['immutable']}（可变安全/扫描状态另按49号处理）。",'', '| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |','|---|---|---|---|---|']
    for c in t['columns']:
        lines.append('| '+' | '.join(md(v) for v in [c['name'],c['type'],c['nullable'],c['default'] if c['default'] is not None else '无',c['meaning']+('；'+c['schemaRef'] if 'schemaRef' in c else '')])+' |')
    lines += ['', '主键：'+', '.join(t['primaryKey'])+'。', '唯一约束：'+json.dumps(t['unique'],ensure_ascii=False)+'。','索引：'+json.dumps(t['indexes'],ensure_ascii=False)+'。','外键：'+json.dumps(t['foreignKeys'],ensure_ascii=False)+'。','CHECK：'+json.dumps(t['checks'],ensure_ascii=False)+'。','']
(C/'data-dictionary.md').write_text('\n'.join(lines))

reuse={'human_task':'原生OA任务/待办及责任历史','review':'原生审批任务/回执，补候选digest/epoch','artifact_version':'原生文件版本与私有对象存储','thread_entry':'原生会话/消息，补work/release及字段投影',
 'attempt':'原生SDK run/checkpoint','invocation':'原生工具调用日志与幂等台账','execution_grant':'原生Grant/策略机制','asset_revision':'原生Agent/技能/方案/工具版本',
 'knowledge_job':'原生知识摄取作业','team_configuration':'原生Agent团队配置','automation_plan':'原生调度计划','draft':'原生草稿/用户偏好',
 'operation':'原生幂等/操作状态；不足才扩展','outbox':'底座已有事务消息机制','inbox':'底座已有消费去重机制'}
save('storage-reuse-plan.json',{'status':'M0_MAPPING_REQUIRED','createAllCandidateTables':False,'policy':'选定底座后先映射权威记录/字段/约束；每个新表需缺口证据，不复制身份/流程/SDK权威状态',
 'items':[{'candidateTable':t['name'],'strategy':'REUSE_BASE_FIRST' if t['name'][3:] in reuse else 'EXTEND_EXISTING_IF_POSSIBLE',
           'preferredAuthority':reuse.get(t['name'][3:],t['authority']),'actualBaseTable':None,'newTableAuthorized':False,'requiredProof':'确切源码/字段/约束差异及真实切片测试'} for t in tables]})

source=(D/'36-开源底座源码研究与技术选型.md').read_text()
links=dict(re.findall(r'^\[([^]]+)\]:\s+(https?://\S+)',source,re.M))
components=[
 ('RuoYi-AI backend','cca30905778357e3aeb42b6adb65ef2384e75e60','MIT with separately licensed subdirectories','ra-license','UNKNOWN','排除受限Skills并验证替代、全依赖和实际产物'),
 ('RuoYi-AI admin frontend','5155f43861c974770bc04bce0b11dc21f3142e04','MIT root','admin-license','UNKNOWN','完整依赖与实际启用前端核验'),
 ('RuoYi-AI user frontend','d920a210ea4d24098711507913a70ff444a0c8e6','MIT root','web-license','UNKNOWN','完整依赖与双前端整合'),
 ('RuoYi-AI bundled docx skill','cca30905778357e3aeb42b6adb65ef2384e75e60','separate restricted terms','ra-docx-license','EXCLUDE','排除内容和打包引用；以合格实现补齐文档能力'),
 ('RuoYi-AI bundled pdf skill','cca30905778357e3aeb42b6adb65ef2384e75e60','separate restricted terms','ra-pdf-license','EXCLUDE','同上'),
 ('RuoYi-AI bundled xlsx skill','cca30905778357e3aeb42b6adb65ef2384e75e60','separate restricted terms','ra-xlsx-license','EXCLUDE','同上'),
 ('Yudao backend','8e43004cf68a405cd3485f98f8a539b97ca6544a','MIT root','yd-license','UNKNOWN','BOM兼容/合法初始化/传递依赖'),
 ('Yudao frontend','aab14fb0e74720dd09e964ae066f8bbde9f9012e','MIT root with dependency obligations','ui-license','UNKNOWN','dhtmlx/Tinyflow等实际产物核验'),
 ('dhtmlx-gantt','9.1.4','GPL-2.0 published metadata','gantt914','REPLACE','保持原功能并验证合格替代；未完成'),
 ('Tinyflow Java','1.2.6','LGPL-3.0 declared POM','tinyflow126','UNKNOWN','优先复用SDK及合格界面，或明确具体分发义务'),
 ('Tinyflow vendored UI','upstream mapping unresolved','LGPL-3.0 upstream','tinyflow-ui-license','UNKNOWN','确切来源/修改链及义务未关闭'),
 ('bpmn-js','18.16.1','bpmn.io license with watermark condition','bpmn-license','UNKNOWN','保留适用标识并核最终界面'),
 ('Warm-Flow','1.8.2','Apache-2.0','warm182','UNKNOWN','具体starter、传递依赖与NOTICE核验'),
 ('RuoYi-Vue-Plus','4d1448b4b46453aff9f2521e2b9b8f44fe0db624','MIT root','plus-license','UNKNOWN','Java21/Boot4与完整产物核验')]
save('commercial-component-register.json',{'scope':'CANDIDATE_FINDINGS_NOT_FINAL_SBOM','finalStackSelected':False,'commercialReleaseCleared':False,'requirements':'开源二开优先；闭源商业部署/托管/客户交付及适用义务','source':'docs/设计包/36-开源底座源码研究与技术选型.md',
 'components':[dict(name=n,version=v,licenseFinding=l,sourceUrl=links[key],decision=dec,closure=cl,shipped=False,closureStatus='NOT_DONE') for n,v,l,key,dec,cl in components]})

def replace_generated(p,start,end,body):
    text=p.read_text()
    if end not in text:text=text.replace(start,start+'\n'+end)
    a,b=text.split(start,1);_,c=b.split(end,1)
    p.write_text(a+start+'\n\n'+body+'\n\n'+end+c)

trace=json.loads((D/'30-产品设计追踪数据.json').read_text());mapping=read('implementation-map.json')['requirements']
slice_extra={
 'WD':('M1','原生待办/筛选/发起表单','只补统一工作投影、实例隔离和状态解释'),
 'HR':('M1/M2','原生组织/任务领取/转派','轮次变更、协作父子合同，不重建负责人权威'),
 'NC':('M1/M3','原生参数表单/个人偏好','绑定版本、必需字段覆盖规则、单项AI建议'),
 'AG':('M2','原生Agent资源及版本发布','本人/共享/推荐、任务可用性和复制谱系'),
 'SK':('M2','原生技能编辑/测试/发布','输入输出合同、依赖及商用来源准入'),
 'CN':('M1/M2','原生OpenAPI/MCP/连接身份','用途Grant、目的地、幂等回执、撤权'),
 'KB':('M3','原生摄取/解析/检索/引用','来源版本授权、关系确认与输出发布'),
 'MM':('M3/M5','原生记忆/资源版本','范围隔离、纠正与经验证经验发布'),
 'WS':('M1/M2','原生文件/版本/目录/预览','私有访问代理、发布副本和版本合并候选'),
 'CV':('M1','原生会话与SDK事件','任务唯一线程、公开摘要、断线/未知效果恢复'),
 'TM':('M3','原生Agent团队/SDK编排','成员任务用途与共享预算；失败不冒充汇总成功'),
 'FL':('M2/M3','原生节点方案/图编辑器','合法出口/输入输出检查及列表替代，不增加循环'),
 'AT':('M4','原生调度器/触发设计器','时区、去重、冷却、有界授权与过期停止'),
 'IM':('M4','原生渠道/专家/回调适配','成员和工作映射、签名回执、意见不代审批'),
 'RS':('M1/M2','原生审批/文件版本/流程推进','候选摘要审核、唯一交付、下游必需输入接手'),
 'SD':('M0/M2','原生SOP/流程/表单设计器','节点输入输出合同、责任和人员预览、发布校验'),
 'AD':('M0/M2','原生组织/岗位/Grant/隐私申请','细分管理动作；无通用管理员读全部私有内容'),
 'OP':('M1/M3','原生日志/监控/用量/图表','脱敏投影、操作查证、指标口径与分析解释'),
 'HC':('M1/M2','原生成员/任务/Agent配置关系','本人配置、代理不能代替自然人确认'),
 'CX':('M1/M3','原生知识/文件/上下文注入扩展','基线/Manifest/快照/装载证据、权限分层'),
 'SY':('M1/M3','原生版本通知/事件机制','源变影响图、旧结果失效、撤权代次与重核')}
body=[]
for d in trace['domains']:
    rows=[r for r in mapping if r['domain']==d['id']];phase,reuse_text,delta=slice_extra[d['id']]
    commands=sorted({c for r in rows for c in r['commandIds']});ids=[r['requirementId'] for r in rows]
    body += [f'<a id="sl-{d["id"].lower()}"></a>',f'### SL-{d["id"]} {d["label"]}', '',
        f'阶段：{phase}。前置：M0合格底座与原生机制映射；M2以后依赖M1权限/版本/交付基础。',
        f'复用：{reuse_text}。最小扩展：{delta}。',
        '需求：'+', '.join(ids)+'。', '命令：'+', '.join(commands)+'；逐动作字段见48号和命令参考。',
        '页面：'+', '.join(sorted({p for r in rows for p in r['pageIds']}))+'。',
        '验收：逐条执行implementation-map中的normativeAcceptance与negative，再执行原30号关联AC/EW；成功需实际输出/版本回读，失败必须能恢复。',
        '失败/回退：保留原资源与已发布版本；禁用新增配置/插件入口或回退兼容版本；不得清空历史、扩大权限或删原需求。','']
replace_generated(D/'47-全产品实施切片与首期开发规格.md','<!-- DOMAIN_SLICES -->','<!-- DOMAIN_SLICES_END -->','\n'.join(body))
pages=read('ui-pages.json')['pages'];body=['| 页面 | 字段/内容 | 动作/合同组 | 事实源 | 失败与恢复 |','|---|---|---|---|---|']
for p in pages:body.append('| '+' | '.join(md(v) for v in [p['id']+' '+p['label'],p['fields'],p['actions']+'；'+','.join(p['commandIds']),p['authority'],p['failureRecovery']])+' |')
replace_generated(D/'52-UI实现与页面状态规格.md','<!-- UI_PAGES -->','<!-- UI_PAGES_END -->','\n'.join(body))

print(json.dumps({'commandRows':len(ops),'tableDictionaries':len(tables),'domainSlices':len(trace['domains']),'uiPages':len(pages),'commercialCandidates':len(components)}))
