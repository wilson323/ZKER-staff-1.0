"""Inline the bounded workspace prototype into existing document 31."""
from pathlib import Path
import re
ROOT = Path(__file__).resolve().parents[1]
target = ROOT/'docs/设计包/31-完整产品交互原型.html'
text = target.read_text()
css = (ROOT/'validation/execution-workspace.css').read_text()
js = (ROOT/'validation/execution-workspace.js').read_text()
css_marker = '/* EXECUTION_WORKSPACE_CSS_START */'
js_marker = '/* EXECUTION_WORKSPACE_JS_START */'
text = re.sub(r'/\* EXECUTION_WORKSPACE_CSS_START \*/.*?/\* EXECUTION_WORKSPACE_CSS_END \*/\n?', '', text, flags=re.S)
text = re.sub(r'/\* EXECUTION_WORKSPACE_JS_START \*/.*?/\* EXECUTION_WORKSPACE_JS_END \*/\n?', '', text, flags=re.S)
text = text.replace('</style>', css_marker+'\n'+css+'\n/* EXECUTION_WORKSPACE_CSS_END */\n</style>', 1)
assert 'const params=new URLSearchParams(location.search);' in text
anchor = '/* AI_EXPERIENCE_JS_START */' if '/* AI_EXPERIENCE_JS_START */' in text else 'const params=new URLSearchParams(location.search);'
text = text.replace(anchor, js_marker+'\n'+js+'\n/* EXECUTION_WORKSPACE_JS_END */\n'+anchor,1)
text = text.replace('设计版本 1.1','设计版本 1.2').replace('关联26—33号设计文档','关联26—34号设计文档')
target.write_text(text)
print('Inlined execution workspace:', len(text), 'characters')
