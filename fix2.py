with open('pages/Eventos.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix shorthand property error
text = text.replace('cantidadEntradas,', 'cantidadEntradas: cantidad,')

# Fix numerosEntregados
text = text.replace('numerosEntregados:', 'numerosEntradas:')
text = text.replace('numerosEntregados =', 'numerosEntradas =')
text = text.replace('.numerosEntregados', '.numerosEntradas')
text = text.replace('{ numerosEntregados:', '{ numerosEntradas:')

# Fix missing eventoId in addPagoAdhesion calls
text = text.replace('entregaAdhesionId: entrega.id,\n                    monto: Number(newEntregaPagoInicial),', 'entregaAdhesionId: entrega.id,\n                    eventoId: selectedEvent.id,\n                    monto: Number(newEntregaPagoInicial),')

text = text.replace('entregaAdhesionId: entregaId,\n                monto: Number(montoStr),', 'entregaAdhesionId: entregaId,\n                eventoId: selectedEvent?.id || \'\',\n                monto: Number(montoStr),')

with open('pages/Eventos.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fix 2 applied successfully!")
