# Security Specification

## 1. Data Invariants
1. Solo los usuarios autenticados pueden realizar operaciones.
2. Todo documento creado debe provenir de un usuario con los permisos adecuados, determinados por su rol (guardado en la colección `usuarios` y `roles`).
3. El ID de un documento y los IDs referenciados deben ser válidos y limitados en tamaño.
4. Arrays deben estar estrictamente limitados (no exceder su capacidad).
5. Las fechas (timestamps) o campos inmutables como la propia data histórica deben verificarse.

## 2. The "Dirty Dozen" Payloads
1. **The Shadow Update:** Actualizar `adolescentes` insertando un campo de roles no permitido.
2. **The ID Poisoning:** Crear un registro con un nombre o un campo string de 2MB.
3. **The Orphaned Record:** Intentar insertar una asistencia para una reunión inexistente.
4. **The Ghost Field:** Crear usuario con rol administrador (id 1) no permitido.
5. **The Array Bomb:** Enviar un array de 1000 elementos en lugar de string (Denial of Wallet).
6. **The Unverified Admin:** Spoofing email sin verificar email_verified.
7. **The Status Exploit:** Reactivar un evento finalizado sin ser administrador.
8. **The PII Leak:** Leer info de adolescentes sin tener el permiso `adolescentes.read`.
9. **The Type Shift:** Guardar campo `id` como boolean.
10. **The Temporal Manip:** Poner `fecha` adelantada o atrasada a discreción evadiendo control estricto.
11. **The Sync Vulnerability:** Guardar un pago de evento para un evento que no existe.
12. **The Missing Invariant:** Tratar de borrar una configuración base del sistema.

## 3. The Test Runner
El archivo `firestore.rules.test.ts` implementa aserciones en estas vulnerabilidades para ser rechazadas (PERMISSION DENIED).
