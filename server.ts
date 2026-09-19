import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import crypto from 'crypto';


// === EMAIL TRANSPORTER — se crea en el momento de enviar para leer .env correctamente ===
const getEmailTransporter = () => nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// === TOKEN STORE (en memoria, expira en 1 hora) ===
const resetTokens = new Map<string, { email: string; expires: number }>();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- HEALTH CHECK ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'postgresql' });
});

// --- AUTHENTICATION ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, pass } = req.body;
    const user = await prisma.usuario.findFirst({
      where: { email: email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    // Simple password check (matches migration passwordHash 'chinchi123' or direct match)
    if (user.passwordHash && user.passwordHash !== pass && pass !== 'chinchi123') {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    const rol = await prisma.rol.findUnique({
      where: { id: user.rolId }
    });

    await prisma.usuario.update({
      where: { id: user.id },
      data: { lastSignInAt: new Date() }
    });

    res.json({ user, rol });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/update-last-signin/:id', async (req, res) => {
  try {
    await prisma.usuario.update({
      where: { id: req.params.id },
      data: { lastSignInAt: new Date() }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/update-password', async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    await prisma.usuario.update({
      where: { id: userId },
      data: { passwordHash: newPassword }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- ENVIAR EMAIL DE RECUPERACIÓN DE CONTRASEÑA ---
app.post('/api/auth/send-reset-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido' });

    // Verificar que el usuario existe en la BD
    const user = await prisma.usuario.findFirst({ where: { email } });
    // Respondemos siempre igual (seguridad: no revelar si el email existe)
    if (!user) {
      return res.json({ success: true, message: 'Si el correo está registrado, recibirás un enlace.' });
    }

    // Generar token único
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 60 * 60 * 1000; // 1 hora
    resetTokens.set(token, { email, expires });

    // URL de reset
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    // Contenido del email
    const mailOptions = {
      from: `"TeensTracker" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: '🔐 Recuperación de Contraseña - TeensTracker',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #141417; color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #2a2a2e;">
          <div style="background: linear-gradient(135deg, #0c0c0e, #1a1a1f); padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #2a2a2e;">
            <div style="display: inline-block; background: rgba(0,255,136,0.1); border: 1px solid rgba(0,255,136,0.3); border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-size: 28px; margin-bottom: 16px;">🔐</div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff;">Recuperar Contraseña</h1>
            <p style="margin: 8px 0 0; color: rgba(255,255,255,0.5); font-size: 13px; font-family: monospace; letter-spacing: 0.1em;">SISTEMA DE SEGUIMIENTO DE ADOLESCENTES</p>
          </div>
          <div style="padding: 36px 40px;">
            <p style="color: rgba(255,255,255,0.8); font-size: 15px; line-height: 1.6; margin: 0 0 20px;">Hola <strong style="color: #fff;">${user.nombre}</strong>,</p>
            <p style="color: rgba(255,255,255,0.7); font-size: 15px; line-height: 1.6; margin: 0 0 28px;">Recibimos una solicitud para restablecer la contraseña de tu cuenta. Hacé clic en el botón de abajo para crear una nueva contraseña:</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}" style="display: inline-block; background: #00ff88; color: #000000; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 36px; border-radius: 6px; letter-spacing: 0.05em;">RESTABLECER CONTRASEÑA</a>
            </div>
            <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 16px 20px; margin: 24px 0 0;">
              <p style="margin: 0; color: rgba(255,255,255,0.4); font-size: 12px; line-height: 1.6;">⏱️ Este enlace expira en <strong style="color: rgba(255,255,255,0.6);">1 hora</strong>.<br>Si no solicitaste este cambio, podés ignorar este correo — tu contraseña no será modificada.</p>
            </div>
          </div>
          <div style="padding: 20px 40px; border-top: 1px solid #2a2a2e; text-align: center;">
            <p style="margin: 0; color: rgba(255,255,255,0.25); font-size: 11px; font-family: monospace;">TeensTracker &copy; ${new Date().getFullYear()} — Sistema Seguro</p>
          </div>
        </div>
      `
    };

    await getEmailTransporter().sendMail(mailOptions);
    res.json({ success: true, message: 'Si el correo está registrado, recibirás un enlace.' });
  } catch (error: any) {
    console.error('=== ERROR GMAIL ===');
    console.error('Código:', error.code);
    console.error('Mensaje:', error.message);
    console.error('GMAIL_USER configurado:', process.env.GMAIL_USER);
    console.error('GMAIL_APP_PASSWORD configurado:', process.env.GMAIL_APP_PASSWORD ? `Sí (${process.env.GMAIL_APP_PASSWORD.length} chars)` : 'NO');
    
    let userMessage = 'No se pudo enviar el email. ';
    if (!process.env.GMAIL_USER || process.env.GMAIL_USER === 'tu_correo@gmail.com') {
      userMessage += 'GMAIL_USER no configurado en el .env';
    } else if (!process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_APP_PASSWORD.includes('xxxx')) {
      userMessage += 'GMAIL_APP_PASSWORD no configurado en el .env';
    } else if (error.code === 'EAUTH' || error.responseCode === 535) {
      userMessage += 'La Contraseña de Aplicación de Gmail es incorrecta. Verificá que copiaste correctamente los 16 caracteres (sin espacios).';
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      userMessage += 'Error de conexión con Gmail. Verificá tu internet.';
    } else {
      userMessage += error.message;
    }
    
    res.status(500).json({ error: userMessage });
  }
});

// --- VALIDAR TOKEN DE RESET ---
app.get('/api/auth/validate-reset-token', (req, res) => {
  const { token } = req.query;
  if (!token || typeof token !== 'string') return res.status(400).json({ valid: false });
  const data = resetTokens.get(token);
  if (!data || Date.now() > data.expires) {
    resetTokens.delete(token as string);
    return res.json({ valid: false, error: 'El enlace expiró o es inválido.' });
  }
  res.json({ valid: true, email: data.email });
});

// --- CAMBIAR CONTRASEÑA CON TOKEN ---
app.post('/api/auth/reset-password-with-token', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Datos incompletos.' });

    const data = resetTokens.get(token);
    if (!data || Date.now() > data.expires) {
      resetTokens.delete(token);
      return res.status(400).json({ error: 'El enlace expiró o ya fue utilizado.' });
    }

    // Actualizar contraseña
    await prisma.usuario.updateMany({
      where: { email: data.email },
      data: { passwordHash: newPassword }
    });

    // Invalidar token (uso único)
    resetTokens.delete(token);
    res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- ROLES ---
app.get('/api/roles', async (req, res) => {
  try {
    const roles = await prisma.rol.findMany();
    res.json(roles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/roles/:id', async (req, res) => {
  try {
    const rol = await prisma.rol.findUnique({ where: { id: req.params.id } });
    if (!rol) return res.status(404).json({ error: 'Rol no encontrado' });
    res.json(rol);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/roles', async (req, res) => {
  try {
    const newRol = await prisma.rol.create({ data: req.body });
    res.json(newRol);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/roles/:id', async (req, res) => {
  try {
    const updated = await prisma.rol.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/roles/:id', async (req, res) => {
  try {
    await prisma.rol.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ success: false, message: 'El rol está en uso.' });
  }
});

// --- USUARIOS ---
app.get('/api/usuarios', async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany();
    res.json(usuarios);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/usuarios/by-email', async (req, res) => {
  try {
    const email = req.query.email as string;
    const user = await prisma.usuario.findFirst({ where: { email } });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/usuarios/:id', async (req, res) => {
  try {
    const user = await prisma.usuario.findUnique({ where: { id: req.params.id } });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/usuarios', async (req, res) => {
  try {
    const newUser = await prisma.usuario.create({
      data: {
        id: req.body.id,
        email: req.body.email,
        nombre: req.body.nombre,
        rolId: req.body.rolId || '1',
        passwordHash: req.body.password || 'chinchi123',
        avatarUrl: req.body.avatarUrl || null
      }
    });
    res.json(newUser);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/usuarios/:id', async (req, res) => {
  try {
    const { id, ...data } = req.body;
    const updated = await prisma.usuario.update({
      where: { id: req.params.id },
      data
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/usuarios/:id', async (req, res) => {
  try {
    await prisma.usuario.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- ADOLESCENTES ---
app.get('/api/adolescentes', async (req, res) => {
  try {
    const list = await prisma.adolescente.findMany();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/adolescentes', async (req, res) => {
  try {
    const created = await prisma.adolescente.create({ data: req.body });
    res.json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/adolescentes/:id', async (req, res) => {
  try {
    const { id, ...data } = req.body;
    const updated = await prisma.adolescente.update({
      where: { id: req.params.id },
      data
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/adolescentes/:id', async (req, res) => {
  try {
    await prisma.adolescente.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/adolescentes/bulk', async (req, res) => {
  try {
    const list = req.body as any[];
    await prisma.adolescente.createMany({ data: list, skipDuplicates: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- ENCARGADOS ---
app.get('/api/encargados', async (req, res) => {
  try {
    const list = await prisma.encargado.findMany();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/encargados', async (req, res) => {
  try {
    const created = await prisma.encargado.create({ data: req.body });
    res.json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/encargados/:id', async (req, res) => {
  try {
    const { id, ...data } = req.body;
    const updated = await prisma.encargado.update({
      where: { id: req.params.id },
      data
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/encargados/:id', async (req, res) => {
  try {
    await prisma.encargado.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/encargados/bulk', async (req, res) => {
  try {
    const list = req.body as any[];
    await prisma.encargado.createMany({ data: list, skipDuplicates: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- REUNIONES ---
app.get('/api/reuniones', async (req, res) => {
  try {
    const list = await prisma.reunion.findMany();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reuniones/resumen', async (req, res) => {
  try {
    const asistencias = await prisma.asistencia.groupBy({
      by: ['reunionId', 'estado'],
      _count: { _all: true }
    });
    
    const resumen: Record<string, { reunionId: string; presentes: number; ausentes: number }> = {};
    asistencias.forEach(a => {
      if (!resumen[a.reunionId]) {
        resumen[a.reunionId] = { reunionId: a.reunionId, presentes: 0, ausentes: 0 };
      }
      if (a.estado === 'Presente') resumen[a.reunionId].presentes += a._count._all;
      else if (a.estado === 'Ausente') resumen[a.reunionId].ausentes += a._count._all;
    });

    res.json(Object.values(resumen));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reuniones', async (req, res) => {
  try {
    const created = await prisma.reunion.create({ data: req.body });
    res.json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/reuniones/:id', async (req, res) => {
  try {
    const { id, ...data } = req.body;
    const updated = await prisma.reunion.update({
      where: { id: req.params.id },
      data
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/reuniones/:id', async (req, res) => {
  try {
    await prisma.reunion.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reuniones/bulk', async (req, res) => {
  try {
    const list = req.body as any[];
    await prisma.reunion.createMany({ data: list, skipDuplicates: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- ASISTENCIAS ---
app.get('/api/asistencias', async (req, res) => {
  try {
    const list = await prisma.asistencia.findMany();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/asistencias/by-reunion/:reunionId', async (req, res) => {
  try {
    const list = await prisma.asistencia.findMany({
      where: { reunionId: req.params.reunionId }
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/asistencias/bulk', async (req, res) => {
  try {
    const list = req.body as { reunionId: string; adolescenteId: string; estado: string; detalle?: string }[];
    for (const item of list) {
      await prisma.asistencia.upsert({
        where: {
          reunionId_adolescenteId: {
            reunionId: item.reunionId,
            adolescenteId: item.adolescenteId
          }
        },
        create: {
          reunionId: item.reunionId,
          adolescenteId: item.adolescenteId,
          estado: item.estado,
          detalle: item.detalle || null
        },
        update: {
          estado: item.estado,
          detalle: item.detalle || null
        }
      });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- TUTORES ---
app.get('/api/tutores', async (req, res) => {
  try {
    const list = await prisma.tutor.findMany();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tutores', async (req, res) => {
  try {
    const created = await prisma.tutor.create({ data: req.body });
    res.json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/tutores/:id', async (req, res) => {
  try {
    const { id, ...data } = req.body;
    const updated = await prisma.tutor.update({
      where: { id: req.params.id },
      data
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/tutores/:id', async (req, res) => {
  try {
    await prisma.tutor.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tutor-adolescente', async (req, res) => {
  try {
    const links = await prisma.tutorAdolescente.findMany();
    res.json(links);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tutor-adolescente/links', async (req, res) => {
  try {
    const { tutorId, adolescenteIds } = req.body;
    await prisma.tutorAdolescente.deleteMany({ where: { tutorId } });
    if (adolescenteIds && adolescenteIds.length > 0) {
      await prisma.tutorAdolescente.createMany({
        data: adolescenteIds.map((aId: string) => ({ tutorId, adolescenteId: aId })),
        skipDuplicates: true
      });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- SERVIDORES ---
app.get('/api/servidores', async (req, res) => {
  try {
    const list = await prisma.servidor.findMany();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/servidores', async (req, res) => {
  try {
    const created = await prisma.servidor.create({ data: req.body });
    res.json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/servidores/:id', async (req, res) => {
  try {
    const { id, ...data } = req.body;
    const updated = await prisma.servidor.update({
      where: { id: req.params.id },
      data
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/servidores/:id', async (req, res) => {
  try {
    await prisma.servidor.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/inscripciones-servidores', async (req, res) => {
  try {
    const list = await prisma.inscripcionServidor.findMany();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/inscripciones-servidores', async (req, res) => {
  try {
    const created = await prisma.inscripcionServidor.create({ data: req.body });
    res.json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/inscripciones-servidores/:id', async (req, res) => {
  try {
    const { id, ...data } = req.body;
    const updated = await prisma.inscripcionServidor.update({
      where: { id: req.params.id },
      data
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/inscripciones-servidores/:id', async (req, res) => {
  try {
    await prisma.inscripcionServidor.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/pagos-servidores', async (req, res) => {
  try {
    const list = await prisma.pagoServidor.findMany();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pagos-servidores', async (req, res) => {
  try {
    const created = await prisma.pagoServidor.create({ data: req.body });
    res.json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/pagos-servidores/:id', async (req, res) => {
  try {
    await prisma.pagoServidor.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- EVENTOS ---
app.get('/api/eventos', async (req, res) => {
  try {
    const list = await prisma.evento.findMany();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/eventos', async (req, res) => {
  try {
    const created = await prisma.evento.create({ data: req.body });
    res.json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/eventos/:id', async (req, res) => {
  try {
    const { id, ...data } = req.body;
    const updated = await prisma.evento.update({
      where: { id: req.params.id },
      data
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/eventos/:id', async (req, res) => {
  try {
    await prisma.evento.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/inscripciones-eventos', async (req, res) => {
  try {
    const list = await prisma.inscripcionEvento.findMany();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/inscripciones-eventos', async (req, res) => {
  try {
    const created = await prisma.inscripcionEvento.create({ data: req.body });
    res.json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/inscripciones-eventos/:id', async (req, res) => {
  try {
    const { id, ...data } = req.body;
    const updated = await prisma.inscripcionEvento.update({
      where: { id: req.params.id },
      data
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/inscripciones-eventos/:id', async (req, res) => {
  try {
    await prisma.inscripcionEvento.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/pagos-eventos', async (req, res) => {
  try {
    const list = await prisma.pagoEvento.findMany();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pagos-eventos', async (req, res) => {
  try {
    const created = await prisma.pagoEvento.create({ data: req.body });
    res.json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/pagos-eventos/:id', async (req, res) => {
  try {
    await prisma.pagoEvento.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/participantes-eventos', async (req, res) => {
  try {
    const list = await prisma.participanteEvento.findMany();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/participantes-eventos', async (req, res) => {
  try {
    const created = await prisma.participanteEvento.create({ data: req.body });
    res.json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/participantes-eventos', async (req, res) => {
  try {
    const { eventoId, adolescenteId } = req.body;
    await prisma.participanteEvento.delete({
      where: {
        eventoId_adolescenteId: { eventoId, adolescenteId }
      }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- DEVOCIONALES ---
app.get('/api/devocionales', async (req, res) => {
  try {
    const list = await prisma.devocional.findMany();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/devocionales', async (req, res) => {
  try {
    const created = await prisma.devocional.create({ data: req.body });
    res.json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/devocionales/:id', async (req, res) => {
  try {
    const { id, ...data } = req.body;
    const updated = await prisma.devocional.update({
      where: { id: req.params.id },
      data
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/devocionales/:id', async (req, res) => {
  try {
    await prisma.devocional.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/entregas-devocionales', async (req, res) => {
  try {
    const list = await prisma.entregaDevocional.findMany();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/entregas-devocionales', async (req, res) => {
  try {
    const created = await prisma.entregaDevocional.create({ data: req.body });
    res.json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/entregas-devocionales/bulk', async (req, res) => {
  try {
    const list = req.body as any[];
    await prisma.entregaDevocional.createMany({ data: list, skipDuplicates: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/entregas-devocionales/:id', async (req, res) => {
  try {
    const { id, ...data } = req.body;
    const updated = await prisma.entregaDevocional.update({
      where: { id: req.params.id },
      data
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/entregas-devocionales/:id', async (req, res) => {
  try {
    await prisma.entregaDevocional.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- CELEBRACIONES CUMPLEAÑOS ---
app.get('/api/celebraciones-cumpleanos', async (req, res) => {
  try {
    const list = await prisma.celebracionCumpleanos.findMany();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/celebraciones-cumpleanos', async (req, res) => {
  try {
    const created = await prisma.celebracionCumpleanos.create({ data: req.body });
    res.json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- TEMAS CLASES ---
app.get('/api/temas-clases', async (req, res) => {
  try {
    const list = await prisma.temaClase.findMany();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/temas-clases', async (req, res) => {
  try {
    const created = await prisma.temaClase.create({ data: req.body });
    res.json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/temas-clases/:id', async (req, res) => {
  try {
    const { id, ...data } = req.body;
    const updated = await prisma.temaClase.update({
      where: { id: req.params.id },
      data
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/temas-clases/:id', async (req, res) => {
  try {
    await prisma.temaClase.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- ADHESIONES / ENTRADAS ---
app.get('/api/entregas-adhesiones', async (req, res) => {
  try {
    const list = await prisma.entregaAdhesion.findMany();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/entregas-adhesiones', async (req, res) => {
  try {
    const created = await prisma.entregaAdhesion.create({ data: req.body });
    res.json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/entregas-adhesiones/:id', async (req, res) => {
  try {
    const { id, ...data } = req.body;
    const updated = await prisma.entregaAdhesion.update({
      where: { id: req.params.id },
      data
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/entregas-adhesiones/:id', async (req, res) => {
  try {
    await prisma.entregaAdhesion.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/pagos-adhesiones', async (req, res) => {
  try {
    const list = await prisma.pagoAdhesion.findMany();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pagos-adhesiones', async (req, res) => {
  try {
    const created = await prisma.pagoAdhesion.create({ data: req.body });
    res.json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/pagos-adhesiones/:id', async (req, res) => {
  try {
    await prisma.pagoAdhesion.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Express API server running on http://localhost:${PORT}`);
});
