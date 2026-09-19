import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';

interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
}

interface GoogleTaskList {
  id: string;
  title: string;
}

interface GmailMessage {
  id: string;
  threadId: string;
  subject?: string;
  from?: string;
  date?: string;
  snippet?: string;
  body?: string;
}

interface GoogleWorkspaceContextType {
  googleToken: string | null;
  isGoogleConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connectGoogle: () => void;
  disconnectGoogle: () => Promise<void>;
  
  // Gmail API Actions
  fetchEmails: (q?: string) => Promise<GmailMessage[]>;
  fetchEmailDetails: (id: string) => Promise<GmailMessage>;
  sendEmail: (to: string[], subject: string, bodyText: string) => Promise<any>;
  
  // Google Tasks API Actions
  fetchTaskLists: () => Promise<GoogleTaskList[]>;
  fetchTasks: (listId: string) => Promise<GoogleTask[]>;
  createTask: (listId: string, title: string, notes?: string, due?: string) => Promise<GoogleTask>;
  completeTask: (listId: string, taskId: string, completed: boolean) => Promise<void>;
  
  // Google Meet API Actions
  createMeetSpace: () => Promise<string>;
  
  // Google Chat API Actions
  sendChatMessage: (spaceId: string, text: string) => Promise<any>;
}

const GoogleWorkspaceContext = createContext<GoogleWorkspaceContextType | undefined>(undefined);

const SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/meetings.space.created',
  'https://www.googleapis.com/auth/chat.messages.create'
].join(' ');

export const GoogleWorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginGoogle = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      setGoogleToken(tokenResponse.access_token);
      setIsConnecting(false);
      setError(null);
    },
    onError: (error) => {
      console.error('[Google Workspace] Error connecting:', error);
      setError('Error al conectar con Google Workspace');
      setIsConnecting(false);
    },
    onNonOAuthError: (error) => {
      console.error('[Google Workspace] Config/Popup Error:', error);
      setError('Revisa tu VITE_GOOGLE_CLIENT_ID o permite las ventanas emergentes.');
      setIsConnecting(false);
    },
    scope: SCOPES,
  });

  const connectGoogle = () => {
    setIsConnecting(true);
    setError(null);
    loginGoogle();
  };

  const disconnectGoogle = async () => {
    setGoogleToken(null);
    setError(null);
  };

  const getValidToken = async (): Promise<string> => {
    if (!googleToken) {
       throw new Error('Se requiere autenticación de Google Workspace.');
    }
    return googleToken;
  };

  // --- Gmail API ---
  const fetchEmails = async (q?: string): Promise<GmailMessage[]> => {
    const token = await getValidToken();
    let url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10';
    if (q) {
      url += `&q=${encodeURIComponent(q)}`;
    }
    
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error(`Error de Gmail API: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.messages) return [];
    
    // Fetch details for each message
    const detailsPromises = data.messages.map(async (msg: any) => {
      try {
        const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!detailRes.ok) return null;
        const detailData = await detailRes.json();
        
        const headers = detailData.payload?.headers || [];
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(Sin asunto)';
        const from = headers.find((h: any) => h.name === 'From')?.value || 'Desconocido';
        const date = headers.find((h: any) => h.name === 'Date')?.value || '';
        
        return {
          id: msg.id,
          threadId: msg.threadId,
          subject,
          from,
          date: new Date(date).toLocaleString('es-ES'),
          snippet: detailData.snippet
        };
      } catch (err) {
        console.error('Error fetching email details for', msg.id, err);
        return null;
      }
    });
    
    const results = await Promise.all(detailsPromises);
    return results.filter((r): r is GmailMessage => r !== null);
  };

  const fetchEmailDetails = async (id: string): Promise<GmailMessage> => {
    const token = await getValidToken();
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error(`Error de Gmail API: ${response.statusText}`);
    }
    
    const data = await response.json();
    const headers = data.payload?.headers || [];
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(Sin asunto)';
    const from = headers.find((h: any) => h.name === 'From')?.value || 'Desconocido';
    const date = headers.find((h: any) => h.name === 'Date')?.value || '';
    
    // Extract body
    let body = data.snippet || '';
    const parts = data.payload?.parts;
    if (parts && parts.length > 0) {
      const textPart = parts.find((p: any) => p.mimeType === 'text/plain');
      if (textPart && textPart.body?.data) {
        // Base64 decode body
        try {
          const decoded = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          body = new TextDecoder('utf-8').decode(Uint8Array.from(decoded, c => c.charCodeAt(0)));
        } catch (e) {
          console.error('Failed to decode body:', e);
        }
      }
    }

    return {
      id,
      threadId: data.threadId,
      subject,
      from,
      date: new Date(date).toLocaleString('es-ES'),
      snippet: data.snippet,
      body
    };
  };

  const sendEmail = async (to: string[], subject: string, bodyText: string): Promise<any> => {
    const token = await getValidToken();

    // Construct raw RFC2822 message
    const emailLines = [
      `To: ${to.join(', ')}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      '',
      bodyText.replace(/\n/g, '<br/>')
    ];

    const emailStr = emailLines.join('\r\n');
    const base64EncodedEmail = btoa(unescape(encodeURIComponent(emailStr)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: base64EncodedEmail })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`Error al enviar correo por Gmail: ${errData.error?.message || response.statusText}`);
    }

    return response.json();
  };

  // --- Google Tasks API ---
  const fetchTaskLists = async (): Promise<GoogleTaskList[]> => {
    const token = await getValidToken();
    const response = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error(`Error de Google Tasks API: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.items || [];
  };

  const fetchTasks = async (listId: string): Promise<GoogleTask[]> => {
    const token = await getValidToken();
    const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks?showCompleted=true&showHidden=true`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error(`Error de Google Tasks API: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.items || [];
  };

  const createTask = async (listId: string, title: string, notes?: string, due?: string): Promise<GoogleTask> => {
    const confirmed = window.confirm(`¿Deseas crear la tarea "${title}" en tu cuenta de Google Tasks?`);
    if (!confirmed) {
      throw new Error('Operación cancelada por el usuario');
    }

    const token = await getValidToken();
    const body: any = { title };
    if (notes) body.notes = notes;
    if (due) {
      body.due = new Date(due).toISOString();
    }
    
    const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      throw new Error(`Error al crear tarea: ${response.statusText}`);
    }
    
    return response.json();
  };

  const completeTask = async (listId: string, taskId: string, completed: boolean): Promise<void> => {
    const confirmed = window.confirm(`¿Deseas marcar la tarea como ${completed ? 'completada' : 'pendiente'} en Google Tasks?`);
    if (!confirmed) {
      throw new Error('Operación cancelada por el usuario');
    }

    const token = await getValidToken();
    const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: completed ? 'completed' : 'needsAction',
        completed: completed ? new Date().toISOString() : null
      })
    });
    
    if (!response.ok) {
      throw new Error(`Error al actualizar tarea: ${response.statusText}`);
    }
  };

  // --- Google Meet API (v1 /spaces) ---
  const createMeetSpace = async (): Promise<string> => {
    const confirmed = window.confirm('¿Deseas generar un nuevo enlace de reunión de Google Meet?');
    if (!confirmed) {
      throw new Error('Operación cancelada por el usuario');
    }

    const token = await getValidToken();
    const response = await fetch('https://meet.googleapis.com/v1/spaces', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        config: {
          accessType: 'OPEN'
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Error de Google Meet API: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.meetingUri || data.meetingLink || 'https://meet.google.com';
  };

  // --- Google Chat API ---
  const sendChatMessage = async (spaceId: string, text: string): Promise<any> => {
    const confirmed = window.confirm(`¿Deseas enviar este mensaje al espacio de Google Chat "${spaceId}"?`);
    if (!confirmed) {
      throw new Error('Operación cancelada por el usuario');
    }

    const token = await getValidToken();
    const response = await fetch(`https://chat.googleapis.com/v1/spaces/${spaceId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });
    
    if (!response.ok) {
      throw new Error(`Error de Google Chat API: ${response.statusText}`);
    }
    
    return response.json();
  };

  return (
    <GoogleWorkspaceContext.Provider
      value={{
        googleToken,
        isGoogleConnected: !!googleToken,
        isConnecting,
        error,
        connectGoogle,
        disconnectGoogle,
        fetchEmails,
        fetchEmailDetails,
        sendEmail,
        fetchTaskLists,
        fetchTasks,
        createTask,
        completeTask,
        createMeetSpace,
        sendChatMessage
      }}
    >
      {children}
    </GoogleWorkspaceContext.Provider>
  );
};

export const useGoogleWorkspace = () => {
  const context = useContext(GoogleWorkspaceContext);
  if (!context) throw new Error('useGoogleWorkspace must be used within GoogleWorkspaceProvider');
  return context;
};
