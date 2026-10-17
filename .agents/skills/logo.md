# AGENT: Arquitecto Fullstack Senior - Sistema de Marca Blanca, Logos Corporativos y Ajustes Multi-Tenant

## 1. ROL Y DIRECTIVA PRINCIPAL (SYSTEM OVERRIDE)
Actúas como un **Desarrollador Fullstack Senior y Diseñador de Software de Alto Nivel**. Tu objetivo principal es diseñar, implementar y mantener un sistema de carga, gestión y persistencia de logos corporativos y ajustes de identidad de marca (*Marca Blanca / Multi-Tenant Settings*) en aplicaciones web modernas, garantizando un **100% de persistencia y resiliencia en entornos de producción con contenedores efímeros** (Docker, Render, Railway, Vercel, Fly.io, etc.).

---

## 2. CONTEXTO ARQUITECTÓNICO Y PROBLEMAS A EVITAR

### 2.1. El Problema de los Contenedores Efímeros
* En despliegues modernos (Docker, Kubernetes, plataformas PaaS como Render o Railway), el sistema de archivos del contenedor es **efímero**.
* Si se guardan archivos en disco local (ej. `/uploads/logo.png`) usando `multer` o `multipart/form-data`:
  1. Cada nuevo despliegue o reinicio automático destruye los archivos cargados (HTTP 404).
  2. En entornos escalados con múltiples instancias, un contenedor no puede acceder a las imágenes guardadas en el disco de otro contenedor.
  3. Al generar reportes PDF con `jsPDF` o `html2canvas`, las rutas relativas o URLs externas suelen fallar por políticas de CORS (*Cross-Origin Resource Sharing*) o restricciones de red internas.

### 2.2. La Solución Arquitectónica: Base64 en Base de Datos (TEXT / JSONB)
* **Conversión Client-Side:** El navegador valida el archivo y lo convierte a formato Data URL (`data:image/png;base64,...`) usando `FileReader`.
* **Payload Unificado JSON:** La imagen viaja como un string regular dentro del payload JSON de actualización de configuración (`PUT /api/ajustes`).
* **Persistencia Atómica:** La cadena Base64 se almacena directamente en la base de datos (PostgreSQL / Prisma) en una columna de tipo `TEXT` (sin límite arbitrario de longitud).
* **Beneficios:**
  - Cero dependencias de almacenamiento S3 o discos persistentes externos para la identidad corporativa básica.
  - El logo vive con el tenant/configuración en las copias de seguridad de la base de datos.
  - Funciona 100% offline o en redes privadas corporativas / VPN.
  - Cero problemas de CORS al renderizar o incrustar en PDFs.

---

## 3. ESPECIFICACIONES TÉCNICAS FRONTEND

### 3.1. Validación Estricta de Archivos
* **Tamaño Máximo:** 2 MB (`2 * 1024 * 1024` bytes) para evitar sobrecargar memoria o bases de datos innecesariamente.
* **Formatos Admitidos:**
  - `image/png` (Altamente recomendado con fondo transparente para modo claro/oscuro).
  - `image/jpeg` / `image/jpg`.
  - `image/webp`.
  - `image/svg+xml`.

### 3.2. Conversor Asíncrono a Base64 (`fileToBase64`)
```typescript
export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export const validateLogoFile = (file: File): FileValidationResult => {
  const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Formato no soportado. Usa PNG (fondo transparente), JPG, WEBP o SVG.'
    };
  }

  if (file.size > MAX_SIZE_BYTES) {
    return {
      valid: false,
      error: 'El archivo excede el límite máximo de 2 MB.'
    };
  }

  return { valid: true };
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Error al procesar el archivo como Base64'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};
```

### 3.3. Componente de Visualización Inteligente (`LogoViewer`)
El componente debe resolver dinámicamente si el string es:
1. Una Data URL (`data:image/...`).
2. Una URL externa o relativa (`http://`, `https://`, `/assets/...`).
3. Vacío/nulo: en cuyo caso renderiza un fallback elegante con las iniciales de la institución o el ícono corporativo por defecto.

```tsx
import React, { useState } from 'react';

interface LogoViewerProps {
  src?: string | null;
  alt: string;
  fallbackText?: string;
  className?: string;
  imgClassName?: string;
}

export const LogoViewer: React.FC<LogoViewerProps> = ({
  src,
  alt,
  fallbackText = 'ST',
  className = 'w-10 h-10',
  imgClassName = 'w-full h-full object-contain'
}) => {
  const [hasError, setHasError] = useState(false);

  const getInitials = (text: string) => {
    return text
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join('');
  };

  if (!src || hasError) {
    return (
      <div className={`flex items-center justify-center bg-primary text-white font-bold rounded-lg select-none shadow-sm ${className}`}>
        <span>{getInitials(fallbackText)}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center overflow-hidden rounded-lg ${className}`}>
      <img
        src={src}
        alt={alt}
        className={imgClassName}
        onError={() => setHasError(true)}
      />
    </div>
  );
};
```

---

## 4. ESPECIFICACIONES TÉCNICAS BACKEND (Node.js & Express)

### 4.1. Configuración Crítica del Body Parser
Por defecto, Express tiene un límite de `100kb` en `express.json()`. Al recibir imágenes Base64 de hasta 2 MB, el servidor lanzará inmediatamente `HTTP 413: Payload Too Large`.
**Configuración Obligatoria:**
```typescript
import express from 'express';

const app = express();

// Aumentar límites para soportar payloads JSON con imágenes Base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
```

### 4.2. Controlador de Ajustes y Logos (`server.ts`)
```typescript
// GET /api/ajustes
app.get('/api/ajustes', async (req, res) => {
  try {
    let ajustes = await prisma.ajustesSistema.findFirst({
      where: { id: 'default' }
    });

    if (!ajustes) {
      ajustes = await prisma.ajustesSistema.create({
        data: {
          id: 'default',
          tenantId: 'main',
          nombreSistema: 'Seguimiento',
          subtitulo: 'Sistema de Gestión',
          logoBase64: null
        }
      });
    }

    res.json(ajustes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/ajustes
app.put('/api/ajustes', async (req, res) => {
  try {
    const { nombreSistema, subtitulo, logoBase64, tenantId } = req.body;

    // Validación básica de tamaño de cadena para evitar abusos
    if (logoBase64 && typeof logoBase64 === 'string') {
      const isDataUrl = logoBase64.startsWith('data:image/');
      if (!isDataUrl && !logoBase64.startsWith('http')) {
        return res.status(400).json({ error: 'Formato de imagen inválido' });
      }
      // Chequeo de seguridad: ~2.8MB en Base64 para límite de 2MB
      if (logoBase64.length > 3.5 * 1024 * 1024) {
        return res.status(400).json({ error: 'La imagen supera el límite permitido de 2MB' });
      }
    }

    const actualizado = await prisma.ajustesSistema.upsert({
      where: { id: 'default' },
      update: {
        nombreSistema: nombreSistema?.trim() || 'Seguimiento',
        subtitulo: subtitulo?.trim() || null,
        logoBase64: logoBase64 !== undefined ? logoBase64 : undefined,
        tenantId: tenantId || 'main'
      },
      create: {
        id: 'default',
        tenantId: tenantId || 'main',
        nombreSistema: nombreSistema?.trim() || 'Seguimiento',
        subtitulo: subtitulo?.trim() || null,
        logoBase64: logoBase64 || null
      }
    });

    res.json(actualizado);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 5. MODELADO DE DATOS (Prisma ORM & PostgreSQL)

En `prisma/schema.prisma`:
```prisma
model AjustesSistema {
  id              String   @id @default("default")
  tenantId        String?  @default("main")
  nombreSistema   String   @default("Seguimiento")
  subtitulo       String?  @default("Sistema de Gestión")
  logoBase64      String?  @db.Text
  updatedAt       DateTime @updatedAt
  createdAt       DateTime @default(now())
}
```

> **IMPORTANTE:** La anotación `@db.Text` en PostgreSQL asegura que no exista el límite de 255/1024 caracteres de un `VARCHAR`, permitiendo almacenar Data URLs completas de varios megabytes sin truncamiento.

---

## 6. OPTIMIZADOR PARA GENERACIÓN DE PDFS Y REPORTES (`pdfLogoOptimizer`)

### 6.1. El Reto: Lag al Generar PDFs con Imágenes Pesadas
Al usar `doc.addImage(...)` en `jsPDF`, inyectar una imagen de 2 MB sin optimizar provoca:
1. Congelamiento de la pestaña del navegador (UI thread block).
2. Generación de PDFs enormes (10-20 MB por hoja).
3. Posibles errores de Canvas `out-of-memory`.

### 6.2. Implementación de `pdfLogoOptimizer`
* **Escalado Automático:** Limita la resolución a una caja máxima de `400 x 160 px` manteniendo la proporción original (*aspect ratio*).
* **Caché en Memoria:** Utiliza un `Map` para que la conversión ocurra una sola vez durante la sesión (las siguientes descargas toman 0 ms).
* **Timeout de Seguridad:** Garantiza que si la imagen tarda más de 1.5s en procesarse, el reporte continúe sin bloquear al usuario.

```typescript
interface OptimizedLogo {
  dataUrl: string;
  width: number;
  height: number;
  format: 'PNG' | 'JPEG';
}

const logoCache = new Map<string, OptimizedLogo>();

export const optimizeLogoForPDF = async (
  rawLogoSrc: string | null | undefined,
  maxWidth = 400,
  maxHeight = 160,
  timeoutMs = 1500
): Promise<OptimizedLogo | null> => {
  if (!rawLogoSrc) return null;

  // Verificar caché
  if (logoCache.has(rawLogoSrc)) {
    return logoCache.get(rawLogoSrc)!;
  }

  const processPromise = new Promise<OptimizedLogo>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;

        // Calcular escala proporcional
        const scale = Math.min(maxWidth / w, maxHeight / h, 1);
        const targetWidth = Math.round(w * scale);
        const targetHeight = Math.round(h * scale);

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('No se pudo obtener el contexto 2D de Canvas'));
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Detectar si es PNG para preservar transparencia
        const isPng = rawLogoSrc.startsWith('data:image/png') || rawLogoSrc.toLowerCase().includes('.png');
        const format: 'PNG' | 'JPEG' = isPng ? 'PNG' : 'JPEG';
        const mimeType = isPng ? 'image/png' : 'image/jpeg';

        const optimizedDataUrl = canvas.toDataURL(mimeType, 0.92);

        const result: OptimizedLogo = {
          dataUrl: optimizedDataUrl,
          width: targetWidth,
          height: targetHeight,
          format
        };

        logoCache.set(rawLogoSrc, result);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => reject(err);
    img.src = rawLogoSrc;
  });

  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), timeoutMs);
  });

  try {
    return await Promise.race([processPromise, timeoutPromise]);
  } catch (error) {
    console.warn('[pdfLogoOptimizer] Error al optimizar logo:', error);
    return null;
  }
};
```

---

## 7. ERRORES COMUNES Y ANTIPATRONES

| Antipatrón | Consecuencia | Solución Correcta |
| :--- | :--- | :--- |
| Almacenar en `/uploads` o disco local | El logo desaparece tras cada reinicio o deploy de Docker | Guardar en PostgreSQL (`@db.Text`) |
| No configurar límite en `express.json` | Error HTTP 413 Payload Too Large al guardar | `app.use(express.json({ limit: '50mb' }))` |
| Inyectar imagen de 2MB sin optimizar en jsPDF | Lag severo, PDFs gigantes de 20MB | Usar `optimizeLogoForPDF` con Canvas |
| Olvidar `crossOrigin = 'anonymous'` en Canvas | Error `The canvas has been tainted by cross-origin data` | Habilitar crossOrigin y priorizar Base64 Data URLs |
| No contemplar estados de carga o fallback | Pantallas rotas o imágenes con icono de error 404 | Renderizar `LogoViewer` con fallback de iniciales |

---

## 8. CHECKLIST DE VERIFICACIÓN PARA PRODUCCIÓN

- [ ] ¿El esquema Prisma tiene `logoBase64 String? @db.Text`?
- [ ] ¿Se ejecutó `prisma db push` o `prisma migrate deploy` en la base de datos?
- [ ] ¿Express tiene configurado `limit: '50mb'` en `express.json` y `express.urlencoded`?
- [ ] ¿El frontend valida tamaño `<= 2MB` y tipos MIME admitidos antes de convertir a Base64?
- [ ] ¿El formulario cuenta con previsualización inmediata y botón de "Eliminar / Restablecer logo"?
- [ ] ¿El `Sidebar`, `Header` y `LoginPage` reflejan los cambios de logo y nombre en tiempo real?
- [ ] ¿Los reportes PDF (`jsPDF`) escalan el logo a 400x160 px con caché en memoria sin congelar la UI?
- [ ] ¿La interfaz cumple con la Filosofía Mobile-First (targets de 44px, tipografía >= 16px, CTA accesible)?
