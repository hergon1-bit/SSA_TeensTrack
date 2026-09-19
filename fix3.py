with open('pages/Eventos.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Revert the incorrect replacement globally
text = text.replace('cantidadEntradas: cantidad,', 'cantidadEntradas,')

# Apply the correct replacement only inside the object initialization
# specifically at line ~207 where we have:
# nombrePersona: newEntregaPersona.trim(),
# cantidadEntradas,
text = text.replace('nombrePersona: newEntregaPersona.trim(),\n                cantidadEntradas,', 'nombrePersona: newEntregaPersona.trim(),\n                cantidadEntradas: cantidad,')

with open('pages/Eventos.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fix 3 applied successfully!")
