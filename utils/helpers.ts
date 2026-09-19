
export const calcularEdad = (fechaNacimiento: string): number => {
  if (!fechaNacimiento) return 0;
  
  let year: number = 0;
  let month: number = 0;
  let day: number = 0;

  const cleanDate = fechaNacimiento.trim();

  if (cleanDate.includes('-')) {
      const datePart = cleanDate.split('T')[0]; 
      const parts = datePart.split('-');
      if (parts.length === 3) {
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1;
          day = parseInt(parts[2], 10);
      }
  } 
  else if (cleanDate.includes('/')) {
      const parts = cleanDate.split('/');
      if (parts.length === 3) {
          if (parts[0].length === 4) {
              year = parseInt(parts[0], 10);
              month = parseInt(parts[1], 10) - 1;
              day = parseInt(parts[2], 10);
          } else {
              day = parseInt(parts[0], 10);
              month = parseInt(parts[1], 10) - 1;
              year = parseInt(parts[2], 10);
          }
      }
  }

  if (year > 1900 && year < new Date().getFullYear() + 1 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const hoy = new Date();
      let edad = hoy.getFullYear() - year;
      const m = hoy.getMonth() - month;
      if (m < 0 || (m === 0 && hoy.getDate() < day)) {
          edad--;
      }
      return edad >= 0 ? edad : 0;
  }
  
  const cumpleanos = new Date(fechaNacimiento);
  if (isNaN(cumpleanos.getTime())) return 0;

  const hoy = new Date();
  let edad = hoy.getFullYear() - cumpleanos.getFullYear();
  const m = hoy.getMonth() - cumpleanos.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < cumpleanos.getDate())) {
    edad--;
  }
  return edad >= 0 ? edad : 0;
};

export const calcularProximoCumpleanos = (fechaNacimiento: string): Date => {
  if (!fechaNacimiento) return new Date();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  let cumpleMonth: number, cumpleDay: number;
  const cleanDate = fechaNacimiento.trim().split('T')[0];

  if (cleanDate.includes('-')) {
      const parts = cleanDate.split('-');
      cumpleMonth = parseInt(parts[1], 10) - 1;
      cumpleDay = parseInt(parts[2], 10);
  } else if (cleanDate.includes('/')) {
      const parts = cleanDate.split('/');
      if (parts[0].length === 4) {
          cumpleMonth = parseInt(parts[1], 10) - 1;
          cumpleDay = parseInt(parts[2], 10);
      } else {
           cumpleMonth = parseInt(parts[1], 10) - 1;
           cumpleDay = parseInt(parts[0], 10);
      }
  } else {
      const cumple = new Date(fechaNacimiento);
      if (isNaN(cumple.getTime())) return new Date();
      cumpleMonth = cumple.getMonth();
      cumpleDay = cumple.getDate();
  }

  const currentYear = hoy.getFullYear();
  let proximoCumple = new Date(currentYear, cumpleMonth, cumpleDay);
  if (proximoCumple < hoy) proximoCumple.setFullYear(currentYear + 1);
  return proximoCumple;
};

export const formatDate = (date: Date | string) => {
  if (!date) return 'N/A';
  
  const dateStr = typeof date === 'string' ? date.trim() : '';

  // Si ya viene en formato dd/mm/yyyy o dd/mm/yyyy hh:mm, mantenerlo si es válido
  if (dateStr && /^\d{2}\/\d{2}\/\d{4}/.test(dateStr)) {
      return dateStr.split(' ')[0];
  }
  
  // Si viene en formato YYYY-MM-DD (con o sin hora T/espacio)
  if (dateStr && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const [year, month, day] = dateStr.split('T')[0].split(' ')[0].split('-').map(Number);
      return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
  }

  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Fecha inválida';
  
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export const formatDateShort = (date: Date | string) => formatDate(date);

export const formatRelativeTime = (date: Date | string) => {
    if (!date) return 'Nunca';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'N/A';
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffInSeconds < 60) return 'Hace un momento';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} horas`;
    if (diffInSeconds < 604800) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
    return formatDate(d);
};

export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(amount);
};

export const parseNumeros = (text?: string): number[] => {
  if (!text) return [];
  const numbers = new Set<number>();

  // Normalizar el texto: convertir 'al', 'a', etc. en guión si están entre dos números
  // Ej: "001 al 004" -> "001-004", "001 a 004" -> "001-004"
  let normalized = text.toLowerCase().replace(/(\d+)\s*(?:al|a)\s*(\d+)/g, '$1-$2');

  const parts = normalized.split(/[,;\s]+/);
  for (const part of parts) {
    const clean = part.trim();
    if (!clean) continue;

    if (clean.includes('-')) {
      const range = clean.split('-').map(s => parseInt(s.trim(), 10));
      if (range.length === 2 && !isNaN(range[0]) && !isNaN(range[1])) {
        const start = Math.min(range[0], range[1]);
        const end = Math.max(range[0], range[1]);
        for (let i = start; i <= end; i++) {
          numbers.add(i);
        }
      }
    } else {
      const val = parseInt(clean, 10);
      if (!isNaN(val)) {
        numbers.add(val);
      }
    }
  }
  return Array.from(numbers).sort((a, b) => a - b);
};

export const formatNumerosComprometidos = (numbers: number[]): string => {
  if (!numbers || numbers.length === 0) return '';
  const sorted = [...numbers].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  const pad = (n: number) => String(n).padStart(3, '0');

  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === prev + 1) {
      prev = sorted[i];
    } else {
      if (start === prev) {
        ranges.push(pad(start));
      } else if (prev === start + 1) {
        ranges.push(`${pad(start)}, ${pad(prev)}`);
      } else {
        ranges.push(`${pad(start)} al ${pad(prev)}`);
      }
      if (i < sorted.length) {
        start = sorted[i];
        prev = sorted[i];
      }
    }
  }
  return ranges.join(', ');
};

