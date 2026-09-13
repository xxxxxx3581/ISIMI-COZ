from pathlib import Path
import re
p=Path('index.html')
s=p.read_text(encoding='utf-8')
marker="if(m.module==='prop'||['konut_alimi','isyeri_satisi','kira_hazirligi'].indexOf(row.case_type)>=0){"
pos=s.find(marker)
if pos<0:
    raise SystemExit('property case branch not found')
end=s.find('\n    try{',pos)
if end<0:
    raise SystemExit('property case branch body not found')
block=s[pos:end]
if 'H.officialTransactionStatus=' not in block:
    if 'H.caseSteps=[];' not in block:
        raise SystemExit('case step anchor not found')
    block=block.replace('H.caseSteps=[];','H.caseSteps=[]; H.officialTransactionStatus=m.official_transaction_status||\'not_completed\';',1)
    s=s[:pos]+block+s[end:]
p.write_text(s,encoding='utf-8')
print('official status reopen patch applied')
