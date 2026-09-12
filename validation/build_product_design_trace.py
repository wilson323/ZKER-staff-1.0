"""Generate the new project's design trace from preserved, local source records.

This script writes only documents 29 and 30. It never marks a product test as run.
"""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'docs/设计包'
MAIN = '26-完整产品设计文档.md'
MODEL = '27-逻辑数据模型与接口契约.md'
CASES = '28-开发分期与验收用例.md'
OUT = '30-产品设计追踪数据.json'

def read(name):
    return json.loads((BASE / name).read_text())

source = read('10-需求追踪数据.json')
roles = read('17-角色需求与验收追踪.json')
role_fixtures = read('16-角色视角与权限演示数据.json')
oa = read('21-OA需求细化与验收追踪.json')
forms = read('24-业务模板字段候选.json')

# Chapter anchors, scenario IDs, and application-command groups are deliberately
# explicit so their mapping can be independently checked against the documents.
DOMAIN_MAP = {
    'WD': ('oa', [1, 2, 3, 4, 7, 51, 57], [1, 2, 3, 15]),
    'HR': ('roles', [3, 6, 7, 8, 46, 47], [3, 8, 24]),
    'NC': ('execution', [9, 10, 11, 12, 59], [4, 5, 6, 7]),
    'AG': ('assets', [24, 25, 27, 28, 29], [13, 17]),
    'SK': ('assets', [10, 26, 27, 29], [5, 13, 17]),
    'CN': ('execution', [30, 31, 32, 38, 56], [7, 14, 18]),
    'KB': ('knowledge', [16, 17, 33, 34], [5, 19]),
    'MM': ('knowledge', [17, 28, 35, 36], [16, 19]),
    'WS': ('knowledge', [11, 37, 38, 56], [20, 25]),
    'CV': ('execution', [11, 12, 16, 19, 45], [5, 6, 7, 14, 23]),
    'TM': ('extensions', [14, 19, 39, 58], [6, 7, 21]),
    'FL': ('extensions', [10, 12, 19, 40], [6, 7, 17]),
    'AT': ('extensions', [18, 41, 42, 58, 59], [22]),
    'IM': ('extensions', [43, 44, 45, 57], [15, 23]),
    'RS': ('collaboration', [19, 20, 21, 22, 23, 31], [9, 10, 11, 12, 14]),
    'SD': ('oa', [4, 5, 6, 48, 52], [2, 26]),
    'AD': ('roles', [8, 28, 32, 46, 47, 56, 59], [18, 24, 25]),
    'OP': ('quality', [1, 49, 50, 51, 53, 54, 55, 56, 58, 60], [14, 25]),
    'HC': ('collaboration', [6, 13, 14, 15, 39, 45], [8, 9, 21, 23]),
    'CX': ('context', [15, 16, 17, 18, 59], [5, 6, 16]),
    'SY': ('context', [15, 17, 18, 20, 21, 22, 23, 50, 59], [9, 10, 11, 12, 16]),
}

OVERRIDES = {
    'WD-01': '统一员工工作入口与任务打开/开始路径；使用选定前端的一套会话与路由，刷新恢复真实状态。',
    'AG-01': '数字员工版本由真实档案及能力引用生成，内容、摘要、发布版和实际执行一致。',
    'CN-01': '数字员工与能力的绑定持久化、可回读、可撤销；实际运行按有效关联执行。',
    'FL-06': '执行方案使用选定的单一运行适配链，运行有界且只产候选；不强制采用旧DSH。',
    'CX-06': '在选定运行边界验证真实上下文装载与消费，区分文件物化、投递和运行器装载证据。',
    'AD-01': '导航、路由、字段与动作按职责、对象关系及授权投影；保留历史精确夹具的隔离语义，映射选定底座。',
    'OP-01': '启动本项目选定服务并证明代码、进程和访问地址来源；真实身份、任务、AI及依赖完成首条链，不强制旧端口。',
    'SD-01': '同一节点合同贯通人员职责、表单、数字员工与全部执行资源，设计器、待办、快照与运行消费一致。',
}

def design_goal(req):
    return OVERRIDES.get(req['id'], req['requirement'])

def esc(value):
    return str(value).replace('|', '\\|').replace('\n', '<br>')

by_role_requirement = {r['requirementId']: r for r in roles['requirements']}
role_story = {s['id']: s for s in roles['roleStories']}
page_ids = {p[0] for p in source['pages']}
requirements = []
for req in source['requirements']:
    anchor, case_numbers, command_numbers = DOMAIN_MAP[req['domain']]
    requirements.append({
        'id': req['id'], 'priority': req['priority'], 'domain': req['domain'],
        'storyId': req['storyId'], 'sourceRecord': req,
        'designGoal': design_goal(req),
        'userStory': f"作为{req['persona']}，我要{design_goal(req)}",
        'sourceGiven': req['given'], 'sourceAcceptance': req['acceptance'],
        'sourceNegative': req['negative'],
        'adaptationNote': '原技术锚点转换为新项目等价业务行为；原文及原验收完整保留用于比对。' if req['id'] in OVERRIDES else '业务要求保留；原文中的既有实现、路径、合同和状态只按历史来源解释。',
        'pageIds': req['pages'],
        'roleProfiles': by_role_requirement[req['id']]['roleProfiles'],
        'designRefs': [f'{MAIN}#{anchor}', f'{MODEL}#fields', f'{MODEL}#commands', f'{CASES}#cases'],
        'commandIds': [f'C{n:02d}' for n in command_numbers],
        'caseIds': [f'AC-{n:02d}' for n in case_numbers],
        'mappingGranularity': 'SOURCE_REQUIREMENT_PLUS_DOMAIN_SCENARIOS_NOT_PROOF_OF_IMPLEMENTATION',
        'designStatus': 'SPECIFIED_FOR_REVIEW',
        'implementationStatus': 'NOT_IMPLEMENTED_IN_THIS_PROJECT',
        'validationStatus': 'PRODUCT_TESTS_NOT_RUN',
        'implementationRefs': [], 'productEvidence': [],
    })

profiles = []
for p in roles['profiles']:
    s = role_story['ROLE-' + p['profileId'].upper()]
    profiles.append({**p, 'sourceStory': s, 'designRef': f'{MAIN}#roles',
                     'caseIds': ['AC-46', 'AC-47', 'AC-51'],
                     'mappingStatus': 'RESPONSIBILITY_PRESERVED_BASE_PERMISSION_MAPPING_PENDING',
                     'productEvidence': []})

def refine_record(r, prefix, cases):
    return {'id': r['id'], 'sourceRecord': r, 'requirementIds': r['requirementIds'],
            'designRefs': [f'{MAIN}#{prefix}', f'{MODEL}#commands', f'{CASES}#cases'],
            'caseIds': cases, 'validationStatus': 'PRODUCT_TESTS_NOT_RUN'}

source_names = ['10-需求追踪数据.json', '16-角色视角与权限演示数据.json',
                '17-角色需求与验收追踪.json', '21-OA需求细化与验收追踪.json',
                '24-业务模板字段候选.json', '25-从零开发最小工作量开源选型.md']
human_keys = sorted({k for p in profiles for k in p['canonicalRoles']})
AI_SPECS = [
    ('渐进式四区入口', ['P01','P02','P04','P21','P22'], ['C01','C04'], '首次使用者有当前任务与获准资源', '沿四区导航打开任务并办理', '常见任务无需打开高级设置；全部原能力仍可达', '不能靠删功能或隐藏必要责任减少点击'),
    ('任务默认推荐与缺项补齐', ['P02','P04','P05','P22'], ['C05','C27'], '模板与本人资源已有合法默认值', '打开任务生成推荐配置', '不重复询问已有信息，只补影响结果的缺项', '缺模型或连接时保留人工路径，不伪报就绪'),
    ('自然语言设置、Diff与部分采用', ['P04','P14','P21'], ['C04','C27'], '当前对象版本明确且有字段写权', '生成、改单项并采用设置建议', '来源、Diff、作用域可见，仅写获选字段并校验版本', '并发冲突不覆盖，保存不自动运行'),
    ('授权业务分析与口径来源', ['P01','P02','P19'], ['C28'], '存在合法只读业务数据源与指标定义', '提出问题、核对显著歧义后查询', '口径、粒度、时间、权限、来源及明细可复核', '越权/超时不当成零，不运行任意写SQL'),
    ('业务实体关系与来源确认', ['P08','P20'], ['C19','C29'], '已有业务对象与可读版本资料', '提取并确认或纠正关系候选', '来源、版本、有效期、确认方式和ACL完整', '推断不得直接改OA责任、批准或权限，路径计数也不泄密'),
    ('主动建议、去重与冷却', ['P01','P14','P21'], ['C15','C30'], '当前未决任务发生可行动事件', '生成、忽略或稍后处理建议', '理由与来源可见，重复事件一张有效卡，忽略进入冷却', '忽略不等于完成业务，不重复打扰'),
    ('有限授权的主动准备与执行', ['P02','P14','P16'], ['C06','C22','C30'], '已有明确动作、对象、期限、次数与预算授权', '主动准备草稿或执行范围内动作', '运行前及副作用前重验，暂停提醒/触发/运行分别处理', '不代审批/正式交付，不盲重试未知外部结果'),
    ('验收反馈驱动的受控进化', ['P06','P09','P19'], ['C17','C31'], '改进提案具有合法真实案例与基线候选', '对照评估、独立复核、试用、发布或回退', '原业务与安全验收不得退化，试用范围及回退点可追溯', '结构检查不代替业务评估，不改安全策略或在途快照'),
    ('纠错与个人偏好范围', ['P09','P11','P21'], ['C19','C27'], '反馈或偏好有明确人员与作用域', '纠正、保存、忽略或撤回', '来源、范围、版本和实际消费变化可查看', '模糊反馈不自动写全局规则，私人内容不自动共享'),
    ('跨页AI保持业务作用域', ['P01','P02','P08','P11','P19','P20'], ['C01','C05','C28'], '同人参与多个实例与数据范围', '从不同入口调用AI并切换对象', '当前业务对象明确，同任务上下文合法连续', '不得串实例、私人历史、工作空间或连接身份'),
    ('不确定性与人工恢复出口', ['P02','P04','P16','P19','P20'], ['C07','C14','C24'], 'AI不可用、资料冲突或恢复人员未解析', '尝试继续处理并修复', '保留草稿、普通表单/人工路径与合法恢复任务', '无处理人进入待分配异常，不自动续跑旧尝试或复用过期批准'),
    ('可测学习成本与AI效果', ['P01','P19','P21'], ['C25'], '真实代表性用户、固定任务与设备已准备', '执行首次使用、纠错和主动协助评测', '记录样本量、任务难度、帮助次数、正确率与干扰成本', '不得把虚构原型数值、点击数或建议采纳率当真实收益'),
]
ai_enhancements=[]
for i,(title,pages,commands,given,when,then,negative) in enumerate(AI_SPECS,1):
    ai_enhancements.append({'id':f'AI-{i:02d}','title':title,'source':'../../history/本轮产品设计需求补充-2026-09-11.md#u21','userStory':f'作为本产品的授权使用者，我要{title}，以便用更少学习成本完成有依据的工作。','given':given,'when':when,'then':then,'negative':negative,'pageIds':pages,'commandIds':commands,'caseIds':[f'AC-{i+60:02d}'],'designRefs':[f'{MAIN}#ai-experience',f'{MODEL}#ai-contracts',f'{CASES}#cases','33-QoderWake与StaffDeck融合及AI体验研究.md'],'designPriority':'PROPOSED_WITHIN_EXISTING_DOMAIN_SLICES','implementationStatus':'NOT_IMPLEMENTED_IN_THIS_PROJECT','productEvidence':[]})
WORKSPACE_SPECS = [
 ('对话与大展示区', ['WD-01','CV-04'], ['C01','C15'], '本人有合法任务和输入草稿', '切换对话、展示内容与窄屏布局', '同任务定位与草稿保留，右侧为主要展示区域', '不得混入其他实例或建立第二会话'),
 ('鱼骨节点与产物历史联动', ['WD-01','CV-02','CX-02'], ['C01','C15','C20'], '存在授权内的流程和执行记录', '点节点、产物、历史摘要及返回来源', '定位同实例、节点、轮次和精确版本', '无发现权节点、私有边和隐藏计数不返回'),
 ('文件夹文档与版本', ['WS-02','WS-05'], ['C20'], '文件和版本具有明确读取范围', '预览、搜索、选择历史版本和下载', '仅返回获准字段、文件名、路径和版本', '无权直链、对象猜测、缩略图和导出均拒绝'),
 ('通用动作级授权', ['AD-01','AD-03','CX-03'], ['C01','C05','C24'], '同对象有不同主体和动作授予', '读取路径、已发布摘要和源文档', '分别判定动作与任务关系，获准摘要不开放源文档', '部门名称、管理身份和设计总览不扩权'),
 ('后台输入使用独立授权', ['CV-01','CX-03','AD-06'], ['C05','C06','C07'], '人员不可读输入且存在任务限定执行授权', '开始执行或撤销后台授权', '实际执行主体按目的消费，人员读取范围保持独立', '无授权不能运行，已消费外部输入不能宣称收回'),
 ('受限结果与摘要发布', ['CV-02','CX-04','CX-07'], ['C09','C10','C15','C20'], '运行使用受限资料产生候选结果', '生成摘要、回复、日志、文件与流式片段', '进入人员通道前检查具体接收者、版本和发布条件', '不靠提示词或关键词过滤单独防止间接输出'),
 ('切换撤权与旧响应隔离', ['AD-07','CX-10','WS-01'], ['C01','C07','C24'], '多个任务和人员会话存在且有旧响应在途', '切换人员、实例、任务轮次或撤权', '清除旧内容，分开草稿，丢弃过期授权和请求代次', '不能由隐藏DOM、离线缓存或旧订阅恢复已撤权内容'),
 ('权限不足的恢复闭环', ['CV-07','CX-05','AD-02'], ['C07','C14','C24'], '出现内容无权、后台输入不可用或结果发布受阻', '请求所需共享结论并处理恢复', '复用现有人员任务路由到有权负责人，恢复后重查', '申请不自动授权，修复不自动完成原业务'),
]
workspace_refinements=[]
for i,(title,reqs,commands,given,when,then,negative) in enumerate(WORKSPACE_SPECS,1):
    workspace_refinements.append({'id':f'EW-{i:02d}','title':title,'source':'../../history/本轮产品设计需求补充-2026-09-11.md#u22','clarificationSource':'../../history/本轮产品设计需求补充-2026-09-11.md#u23','userStory':f'作为当前任务的授权参与者，我要{title}，使执行体验与权限保持一致。','requirementIds':reqs,'aiEnhancementIds':['AI-10','AI-11'],'pageIds':['P02','P10','P11'],'commandIds':commands,'given':given,'when':when,'then':then,'negative':negative,'designRefs':[f'{MAIN}#execution-workspace',f'{MODEL}#workspace-contracts',f'{CASES}#workspace-cases','34-任务执行工作台与权限分层设计.md'],'validationStatus':'PRODUCT_TESTS_NOT_RUN','implementationStatus':'NOT_IMPLEMENTED_IN_THIS_PROJECT','productEvidence':[]})
# 1.3 is a refinement of existing AI requirements, not new requirement IDs.
experience_pages = [{'pageId': p[0], 'label': p[1],
    'prototypeScope': 'CORE_FICTIONAL_STATE_FLOW' if p[0] in ['P04','P08','P09','P14','P19','P21'] else 'EXISTING_TASK_CHAT' if p[0] in ['P02','P10','P11'] else 'CONTEXTUAL_DRAFT_ONLY',
    'source': '../../history/本轮产品设计需求补充-2026-09-11.md#u24',
    'designRef': MAIN+'#ai-iteration', 'productStatus':'NOT_IMPLEMENTED_IN_THIS_PROJECT'} for p in source['pages']]
for a in ai_enhancements:
    a['designRefs'].extend([MAIN+'#ai-iteration',MODEL+'#ai-ux-contracts',CASES+'#ai-iteration-cases','35-全产品AI体验复核与改进.md'])
data = {
    'schemaVersion': 'oa-digital-workforce.product-design-trace/v1',
    'designDate': '2026-09-11', 'generatedAt': datetime.now(timezone.utc).isoformat(),
    'generationSource': 'validation/build_product_design_trace.py and immutable local source records',
    'productStatus': 'DESIGN_ONLY_NOT_IMPLEMENTED', 'baseSelectionStatus': 'PENDING_SELECTION',
    'traceIsNewDesignProjection': True, 'sourceRequirementsRemainAuthoritative': True,
    'counts': {'requirements': len(requirements), 'aiEnhancements':len(ai_enhancements), 'domains': len(source['domains']),
               'pageGroups': len(page_ids), 'roleProfiles': len(profiles), 'historicalHumanRoleKeys': len(human_keys),
               'marketRefinements': len(source['marketRefinements']), 'oaRefinements': len(oa['refinements']),
               'formTemplates': len(forms['templates']), 'sampleFormFields': sum(map(len, forms['templates'].values())),
               'crossDomainAcceptanceCases': 72, 'workspaceRefinements':len(workspace_refinements)},
    'sourceHashes': {n: hashlib.sha256((BASE / n).read_bytes()).hexdigest() for n in source_names},
    'requirements': requirements,
    'domains': [{'id': d[0], 'label': d[1], 'sourceRecord': d,
                 'designRef': f'{MAIN}#{DOMAIN_MAP[d[0]][0]}'} for d in source['domains']],
    'pages': [{'id': p[0], 'label': p[1], 'sourceRecord': p,
               'designRef': f'{MAIN}#ui', 'actualRouteStatus': 'PENDING_BASE_MAPPING'} for p in source['pages']],
    'roleProfiles': profiles, 'historicalHumanRoleKeys': human_keys,
    'historicalCanonicalFixtures': role_fixtures['canonicalFixtures'],
    'nonHumanRoles': role_fixtures['nonHumanRoles'],
    'marketRefinements': [refine_record(r, 'assets', ['AC-27', 'AC-28', 'AC-29']) for r in source['marketRefinements']],
    'oaRefinements': [refine_record(r, 'oa', ['AC-02', 'AC-03', 'AC-04', 'AC-05', 'AC-06', 'AC-07', 'AC-08', 'AC-48', 'AC-52']) for r in oa['refinements']],
    'businessFormSource': forms,
    'aiEnhancements': ai_enhancements,
    'workspaceRefinements': workspace_refinements,
    'aiExperienceRevision': {'version':'1.3','pages':experience_pages,'productTestsRun':False},
    'acceptanceCases': [{'id': f'AC-{i:02d}', 'ref': f'{CASES}#cases', 'status': 'NOT_RUN', 'evidence': []} for i in range(1, 73)],
    'limitations': ['未核验新产品运行或旧仓全部源码能力', '场景映射不替代各项原验收及角色细化',
                   '旧角色键与旧端口等仅是历史迁移核对锚点', '候选框架、依赖及物理模型尚未固定'],
}
(BASE / OUT).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

lines = [
    '# OA数字员工协作平台 · 全量需求与角色追踪', '',
    '版本：1.3｜2026-09-11｜`DESIGN_TRACE_NOT_PRODUCT_ACCEPTANCE`', '',
    '由 `validation/build_product_design_trace.py` 从保留的本地需求自动生成。'
    '原ID、优先级、验收、角色与细化记录在[30号JSON](30-产品设计追踪数据.json)逐条保存；'
    '原始权威数据仍在[10号需求](10-需求追踪数据.json)、[17号角色](17-角色需求与验收追踪.json)与[21号OA](21-OA需求细化与验收追踪.json)。', '',
    '[产品设计](26-完整产品设计文档.md) · [模型与契约](27-逻辑数据模型与接口契约.md) · [验收用例](28-开发分期与验收用例.md)', '',
    '## 1. 覆盖口径', '',
    '| 集合 | 条数 | 含义 |', '|---|---:|---|',
    '| 原需求 | 153 | ID和优先级不变；全部仍待新产品实现验证 |',
    '| 领域 / 页面组 | 21 / 22 | 全部有新设计章节；页面编号不是已挂载路由 |',
    '| 角色视角 / 历史人类角色键 | 41 / 44 | 职责与隔离边界保留，底座权限映射待定 |',
    '| 市场 / OA细化 | 10 / 28 | 是原需求的细化，不能叠加成新需求总数 |',
    '| 表单模板 / 样例字段 | 4 / 17 | 业务候选，非企业最终完整字段 |',
    '| AI体验增强 | 12 | 用户后续明确要求，关联原页面与领域，不改原153项 |',
    '| 执行工作台与权限细化 | 8 | EW-01—EW-08细化既有能力，不按部门写死权限；产品验收未执行 |',
    '| 跨域验收场景 | 72 | 原60项加12项AI体验场景，均未执行，不替代逐项原验收 |', '',
    '本表“设计目标”是新项目业务语义。旧源码缺陷、固定端口、DSH及历史测试夹具已明确按等价行为适配；'
    '“原验收”保留原文，其中旧地址与框架名称按历史锚点阅读。每项还必须执行原Given/验收/负例，'
    '关联AC仅为领域场景入口，不能将整域所有条目自动判为通过。完整原记录及历史sourcePath见30号sourceRecord。', '',
    '## 2. 153项逐项追踪', '',
]
for domain in source['domains']:
    code, label = domain[:2]
    anchor = DOMAIN_MAP[code][0]
    lines += [f'### {code} · {label}', '', f'新设计：[业务章节]({MAIN}#{anchor}) · [数据字段]({MODEL}#fields) · [命令合同]({MODEL}#commands)。', '',
              '| ID / 优先级 / 故事 | 新项目设计目标 | 原验收与负例 | 页面 / 命令 / 场景 |', '|---|---|---|---|']
    for r in requirements:
        if r['domain'] != code:
            continue
        fields = [f"{r['id']} / {r['priority']} / {r['storyId']}", r['userStory'],
                  f"前置：{r['sourceGiven']}<br>验收：{r['sourceAcceptance']}<br>负例：{r['sourceNegative']}",
                  ', '.join(r['pageIds']) + '<br>' + ', '.join(r['commandIds']) + '<br>' + ', '.join(r['caseIds'])]
        lines.append('| ' + ' | '.join(esc(v) for v in fields) + ' |')
    lines.append('')

lines += ['## 3. 41个业务视角', '',
          '职责视角基于同一登录身份的当前对象关系。表中的角色键为历史追踪锚点，不是新系统已经实现的角色或前端可自行切换的身份。', '',
          '| 视角 / ID | 目标与可见范围 | 完整旅程与负例 | 页面 / 历史角色键 |', '|---|---|---|---|']
for p in profiles:
    s = p['sourceStory']
    vals = [s['persona'] + ' / ' + p['profileId'], s['goal'] + '<br>可见：' + s['visibleScope'],
            p['journey'] + '<br>负例：' + p['negative'], ', '.join(p['pageGroups']) + '<br>' + ', '.join(p['canonicalRoles'])]
    lines.append('| ' + ' | '.join(esc(v) for v in vals) + ' |')
lines += ['', '全部视角共同关联AC-46、AC-47、AC-51，并按自身领域执行对应场景；服务身份不能替代上述人员决定。', '',
          '### 44个人类角色键与视角归属', '', '| 历史键 | 业务视角ID |', '|---|---|']
for key in human_keys:
    lines.append('| ' + key + ' | ' + ', '.join(p['profileId'] for p in profiles if key in p['canonicalRoles']) + ' |')
lines += ['', '原7类canonical测试夹具与非人类身份声明完整保存在30号JSON，作为迁移时的精确负例基线，不作为新平台权限继承树。', '',
          '## 4. 市场10条细化', '', '| ID / 标题 | 关联原需求 | 用户故事与Given / When / Then |', '|---|---|---|']
for r in source['marketRefinements']:
    vals = [r['id'] + ' / ' + r['title'], ', '.join(r['requirementIds']),
            r['story'] + '<br>Given：' + r['given'] + '<br>When：' + r['when'] + '<br>Then：' + r['then']]
    lines.append('| ' + ' | '.join(esc(v) for v in vals) + ' |')
lines += ['', f'对应[市场设计]({MAIN}#assets)与AC-27—AC-29；各条Then须逐条判断，不能仅验证一次复制。', '',
          '## 5. OA 28条细化', '', '| ID / 优先级 / 标题 | 关联原需求 / 角色 | Given / When / Then / 负例 |', '|---|---|---|']
for r in oa['refinements']:
    vals = [r['id'] + ' / ' + r['priority'] + ' / ' + r['title'], ', '.join(r['requirementIds']) + '<br>' + ', '.join(r['roleProfiles']),
            'Given：' + r['given'] + '<br>When：' + r['when'] + '<br>Then：' + r['then'] + '<br>负例：' + r['negative']]
    lines.append('| ' + ' | '.join(esc(v) for v in vals) + ' |')
lines += ['', f'对应[OA设计]({MAIN}#oa)、[状态合同]({MODEL}#states)和28号相关AC场景。全部细化的产品验证状态仍为NOT_RUN。', '',
          '## 6. 追踪维护规则', '',
          '1. 修改产品范围须保留原来源，记录明确的用户变更依据；不得悄悄删ID或降低优先级。',
          '2. 选定底座后补物理对象、实际路由、前端组件、权限映射和实现证据；本表没有替这些尚未发生的工作填PASS。',
          '3. 源码盘点发现153条外的既有能力，新增来源和保留映射；153不是能力上限。',
          '4. 原型、设计覆盖、Schema通过、接口200、运行成功和业务验收分别记录。',
          '5. 生成文档29和数据30是原需求的派生设计索引，不另设独立需求优先级或任务状态权威。', '',
          '[当前文档检查](../../validation/product-design-document-check.json) · [本次任务状态](../../validation/product-design-task-state.json)', '']
lines += ['## 7. AI-01—AI-12 用户故事与验收', '',
          '依据[本轮U21要求](../../history/本轮产品设计需求补充-2026-09-11.md)，新增12条跨域体验增强；原153项不缩减。', '',
          '| ID / 用户故事 | Given / When / Then / 负例 | 页面 / 命令 / 用例 |', '|---|---|---|']
for a in ai_enhancements:
    vals=[a['id']+' / '+a['userStory'],'Given：'+a['given']+'<br>When：'+a['when']+'<br>Then：'+a['then']+'<br>负例：'+a['negative'],', '.join(a['pageIds'])+'<br>'+', '.join(a['commandIds'])+'<br>'+', '.join(a['caseIds'])]
    lines.append('| '+' | '.join(esc(v) for v in vals)+' |')
lines += ['', f'完整体验设计见[26号第15章]({MAIN}#ai-experience)，底层约束见[27号增量合同]({MODEL}#ai-contracts)。', '']
lines += ['## 8. EW-01—EW-08 工作台与权限细化', '',
          '依据U22与U23：案例只帮助说明，权限按主体、对象、动作、用途、期限和任务关系判定。', '',
          '| ID / 用户故事 | 原需求 | Given / When / Then / 负例 |', '|---|---|---|---|']
for w in workspace_refinements:
    vals=[w['id']+' / '+w['userStory'],', '.join(w['requirementIds']),'Given：'+w['given']+'<br>When：'+w['when']+'<br>Then：'+w['then']+'<br>负例：'+w['negative']]
    lines.append('| '+' | '.join(esc(v) for v in vals)+' |')
lines += ['', '对应[工作台设计](34-任务执行工作台与权限分层设计.md)及[验收入口](28-开发分期与验收用例.md#workspace-cases)。每项产品证据为空，不能由本地前端模拟提升为真实授权验收。', '']
lines += ['## 9. 1.3全产品AI原型范围', '', '原需求与AI编号保持不变；此表区分原型深度，不表示真实产品已实现。', '', '| 页面 | 原型交互范围 |', '|---|---|']
for p in experience_pages:
    lines.append('| '+p['pageId']+' / '+p['label']+' | '+p['prototypeScope']+' |')
lines += ['', '六个核心领域有虚构状态流；执行页沿用左侧对话；其他页面提供可保存的当前页协助草稿。完整目标和负例见[35号复核](35-全产品AI体验复核与改进.md)。', '']
(BASE / '29-全量需求与角色追踪.md').write_text('\n'.join(lines))
print(json.dumps(data['counts'], ensure_ascii=False))
