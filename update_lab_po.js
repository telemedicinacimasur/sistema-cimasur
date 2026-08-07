const fs = require('fs');

let content = fs.readFileSync('src/views/LabView.tsx', 'utf8');

// 1. Change poSelectedArea state to array and add dropdown state
content = content.replace(
  /const \[poSelectedArea, setPoSelectedArea\] = useState<string>\('Etiquetas salina'\);/,
  `const [poSelectedAreas, setPoSelectedAreas] = useState<string[]>(['TODAS']);\n  const [isAreaDropdownOpen, setIsAreaDropdownOpen] = useState(false);`
);

// 2. Change update of items when area changes
// We need to inject the update function and modify the render
