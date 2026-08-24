import re

with open('src/views/LabView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Imports
if 'import { Pagination }' not in content:
    content = content.replace("import { SearchableRefInput } from '../components/SearchableRefInput';", 
                              "import { SearchableRefInput } from '../components/SearchableRefInput';\nimport { Pagination } from '../components/Pagination';")

# Remove Conejero
content = re.sub(r'\{\(\!user\?\.allowedSubmodules\?\.lab \|\| user\.allowedSubmodules\.lab\.includes\(\'conejero\'\)\) && \([\s\S]*?onClick=\{\(\) => setActiveForm\(\'conejero\'\)\}[\s\S]*?\)\}', '', content)
content = re.sub(r'\{activeForm === \'conejero\' && <div[\s\S]*?Volver</button></div>\}', '', content)

with open('src/views/LabView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
