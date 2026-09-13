from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Persist the explicit official status inside the property-case metadata.
needle="   disclaimer:f.disclaimer\n   }\n  };"
replacement="   disclaimer:f.disclaimer,\n   official_transaction_status:H.officialTransactionStatus||'not_completed'\n   }\n  };"
if "official_transaction_status:H.officialTransactionStatus||'not_completed'" not in s:
    if needle not in s:
        raise SystemExit('savePropCase metadata anchor not found')
    s=s.replace(needle,replacement,1)

# Restore the separate official status when opening a saved property case.
old="H.module='prop'; H.propFlowId=m.prop_flow||row.case_type; H.kurumFlowId=null; H.dbId=row.id; H.caseId=m.case_no||null; H.createdAt=row.created_at||null; H.status=row.status||'draft'; H.answers=(m.answers&&typeof m.answers==='object')?m.answers:{}; H.documents=(m.documents&&typeof m.documents==='object')?m.documents:{}; H.documentStatuses={}; H.documentFiles={}; H.caseSteps=[];"
new="H.module='prop'; H.propFlowId=m.prop_flow||row.case_type; H.kurumFlowId=null; H.dbId=row.id; H.caseId=m.case_no||null; H.createdAt=row.created_at||null; H.status=row.status||'draft'; H.answers=(m.answers&&typeof m.answers==='object')?m.answers:{}; H.documents=(m.documents&&typeof m.documents==='object')?m.documents:{}; H.documentStatuses={}; H.documentFiles={}; H.caseSteps=[]; H.officialTransactionStatus=m.official_transaction_status||'not_completed';"
if old in s:
    s=s.replace(old,new,1)
else:
    # Current exact line may have slight whitespace; patch the prop branch only.
    marker="if(m.module==='prop'||['konut_alimi','isyeri_satisi','kira_hazirligi'].indexOf(row.case_type)>=0){"
    pos=s.find(marker)
    if pos<0: raise SystemExit('prop open branch not found')
    end=s.find("\n    try{",pos)
    block=s[pos:end]
    if 'H.officialTransactionStatus=' not in block:
        block=block.replace('H.caseSteps=[];','H.caseSteps=[]; H.officialTransactionStatus=m.official_transaction_status||\'not_completed\';',1)
        s=s[:pos]+block+s[end:]

p.write_text(s,encoding='utf-8')
print('persistence patch applied')
