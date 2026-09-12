"""Inline current-product AI interactions after the execution workspace module."""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
target = root / 'docs/设计包/31-完整产品交互原型.html'
content = target.read_text()
for kind, suffix in [('CSS', 'css'), ('JS', 'js')]:
    content = re.sub(r'/\* AI_EXPERIENCE_' + kind + r'_START \*/.*?/\* AI_EXPERIENCE_' + kind + r'_END \*/\n?', '', content, flags=re.S)
    source = (root / 'validation' / ('ai-experience.' + suffix)).read_text()
    block = '/* AI_EXPERIENCE_' + kind + '_START */\n' + source + '\n/* AI_EXPERIENCE_' + kind + '_END */\n'
    anchor = '</style>' if kind == 'CSS' else 'const params=new URLSearchParams(location.search);'
    assert anchor in content
    content = content.replace(anchor, block + anchor, 1)
content = content.replace('设计版本 1.2', '设计版本 1.3').replace('关联26—34号设计文档', '关联26—35号设计文档')
target.write_text(content)
print('Inlined AI experience:', len(content), 'characters')
