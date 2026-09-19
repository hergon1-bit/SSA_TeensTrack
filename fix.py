import re

with open('tsc.log', 'r', encoding='utf-8') as f:
    log_lines = f.readlines()

with open('pages/Eventos.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

replacements = {
    'personaNombre': 'nombrePersona',
    'cantidad': 'cantidadEntradas',
    'numerosEntregados': 'numerosEntradas',
    'fecha': 'fechaPago',
    'quienEntrego': 'registradoPor'
}

for ll in log_lines:
    match = re.search(r'Eventos\.tsx\((\d+),', ll)
    if not match:
        continue
    line_idx = int(match.group(1)) - 1
    
    if "personaNombre" in ll:
        lines[line_idx] = re.sub(r'\bpersonaNombre\b', replacements['personaNombre'], lines[line_idx])
    elif "cantidad" in ll:
        lines[line_idx] = re.sub(r'\bcantidad\b', replacements['cantidad'], lines[line_idx])
    elif "numerosEntregados" in ll:
        lines[line_idx] = re.sub(r'\bnumerosEntregados\b', replacements['numerosEntregados'], lines[line_idx])
    elif "fecha" in ll and "PagoAdhesion" in ll:
        lines[line_idx] = re.sub(r'\bfecha\b', replacements['fecha'], lines[line_idx])
    elif "quienEntrego" in ll:
        lines[line_idx] = re.sub(r'\bquienEntrego\b', replacements['quienEntrego'], lines[line_idx])

with open('pages/Eventos.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Fix applied successfully!")
