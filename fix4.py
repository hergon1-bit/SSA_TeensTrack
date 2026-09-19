with open('pages/Eventos.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = """            const cantidad = Number(newEntregaCantidad);
            const entrega = await addEntregaAdhesion({
                eventoId: selectedEvent.id,
                fechaEntrega: newEntregaFecha || new Date().toISOString().split('T')[0],
                nombrePersona: newEntregaPersona.trim(),
                cantidadEntradas: cantidad,
                numerosEntradas: newEntregaNumeros.trim()
            });"""

replacement = """            const cantidad = Number(newEntregaCantidad);
            const precioVentaUnitario = selectedEvent.precioVentaUnitario || 0;
            const costoTotal = cantidad * precioVentaUnitario;
            const entrega = await addEntregaAdhesion({
                eventoId: selectedEvent.id,
                fechaEntrega: newEntregaFecha || new Date().toISOString().split('T')[0],
                nombrePersona: newEntregaPersona.trim(),
                cantidadEntradas: cantidad,
                numerosEntradas: newEntregaNumeros.trim(),
                precioVentaUnitario,
                costoTotal
            });"""

text = text.replace(target, replacement)

with open('pages/Eventos.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fix 4 applied successfully!")
