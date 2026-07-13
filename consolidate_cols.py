import sys

def consolidate_category_columns():
    file_path = 'src/views/CRMView.tsx'
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Header consolidation
    # Looking for the 2 lines to remove
    start_header = -1
    for i, line in enumerate(lines):
        if 'Cat. Anterior (2025)' in line:
            start_header = i
            break
    
    if start_header != -1:
        # Replace line i with "Categoría Club" and remove i+1
        lines[start_header] = lines[start_header].replace('Cat. Anterior (2025)', 'Categoría Club')
        del lines[start_header + 1]
        print("Updated header")

    # Body consolidation
    # We need to find the TD that contains catPrev logic
    new_lines = []
    skip_mode = False
    for i, line in enumerate(lines):
        if '<td className="p-5">' in line and 'catPrev' in lines[i+4]: # Heuristic to find the TD block
            skip_mode = True
            print(f"Found catPrev TD at line {i+1}, starting skip")
            continue
        
        if skip_mode:
            if '</td>' in line:
                skip_mode = False
                print(f"Ended skip at line {i+1}")
            continue
            
        new_lines.append(line)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("Consolidated CRM columns successfully")

if __name__ == "__main__":
    consolidate_category_columns()
