import re

with open('src/components/ManualOperativo.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace the functions with our new state and handler
functions_regex = r'  const exportMarkdown = \(\) => \{[\s\S]*?const handlePrint = \(\) => \{\n    window\.print\(\);\n  \};'

new_functions = r'''  const [showPdfViewer, setShowPdfViewer] = useState<boolean>(false);

  const handleDownloadPDF = () => {
    const link = document.createElement('a');
    link.href = '/Manual_Operativo_CIMASUR.pdf';
    link.download = 'Manual_Operativo_CIMASUR.pdf';
    link.target = '_blank';
    link.click();
  };'''

text = re.sub(functions_regex, new_functions, text)

with open('src/components/ManualOperativo.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Functions replaced")
