with open('src/views/LabView.tsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "const [compositionRows, setCompositionRows] = useState([" in line:
        # Swap this line with the next one if it contains useEffect
        if "useEffect" in lines[i+1]:
            lines[i], lines[i+1] = lines[i+1], lines[i]
            break

with open('src/views/LabView.tsx', 'w') as f:
    f.writelines(lines)
