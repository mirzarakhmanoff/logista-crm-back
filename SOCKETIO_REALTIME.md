# 🔌 Socket.IO Real-time Updates - Dokumentatsiya

Logista CRM backend Socket.IO orqali real-time updates qo'llab-quvvatlaydi. Bu hujjatda frontend qanday ulanish va eventlarni qanday handle qilish kerakligi batafsil tushuntirilgan.

---

## 📡 SERVER KONFIGURATSIYASI

### Backend Socket.IO Endpoint

```
ws://localhost:3000/documents
```

**Namespaces:**
- `/documents` - Barcha document-related events

**CORS:**
- Origin: `http://localhost:3001` (yoki `.env` da `SOCKET_IO_CORS`)
- Credentials: `true`

---

## 🎯 REAL-TIME EVENTS

Socket.IO orqali quyidagi real-time events emit qilinadi:

### **1. Global Events (Barcha clientlarga)**

| Event | Description | Data |
|-------|-------------|------|
| `documentCreated` | Yangi dokument yaratildi | `{ _id, title, status, ... }` |
| `documentDeleted` | Dokument o'chirildi | `{ documentId }` |

### **2. Document-specific Events (Faqat o'sha dokumentga join qilgan clientlarga)**

| Event | Description | Data |
|-------|-------------|------|
| `documentStatusChanged` | Status o'zgartirildi | `{ documentId, oldStatus, newStatus, document }` |
| `documentUpdated` | Dokument yangilandi | `{ _id, title, ... }` |
| `fileUploaded` | Fayl yuklandi | `{ documentId, filename, document }` |
| `fileDeleted` | Fayl o'chirildi | `{ documentId, fileId, filename, document }` |
| `newComment` | Yangi comment qo'shildi | `{ _id, type: 'comment', content, userId, ... }` |
| `newActivity` | Yangi activity yaratildi | `{ _id, type, content, userId, metadata, ... }` |

---

## 🚀 FRONTEND INTEGRATSIYA

### **1. Socket.IO Client o'rnatish**

```bash
npm install socket.io-client
```

### **2. Socket connection yaratish (React misol)**

#### `src/services/socket.service.ts`

```typescript
import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io('http://localhost:3000/documents', {
      auth: {
        token, // JWT token (agar kerak bo'lsa)
      },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket.IO connected:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket.IO disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }

  // Dokumentga join bo'lish
  joinDocument(documentId: string) {
    if (this.socket) {
      this.socket.emit('joinDocument', documentId);
      console.log(`📄 Joined document room: ${documentId}`);
    }
  }

  // Dokumentdan chiqish
  leaveDocument(documentId: string) {
    if (this.socket) {
      this.socket.emit('leaveDocument', documentId);
      console.log(`📤 Left document room: ${documentId}`);
    }
  }

  // Event listener qo'shish
  on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Event listener o'chirish
  off(event: string, callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export const socketService = new SocketService();
```

---

### **3. React Hook (useSocket)**

#### `src/hooks/useSocket.ts`

```typescript
import { useEffect } from 'react';
import { socketService } from '../services/socket.service';

export const useSocket = (token?: string) => {
  useEffect(() => {
    if (token) {
      socketService.connect(token);
    }

    return () => {
      // Cleanup on unmount
      socketService.disconnect();
    };
  }, [token]);

  return socketService;
};
```

---

### **4. Document Detail Page - Real-time Updates**

#### `src/pages/DocumentDetail.tsx` (React misol)

```typescript
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { socketService } from '../services/socket.service';
import { useSocket } from '../hooks/useSocket';

const DocumentDetail: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const [document, setDocument] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const token = localStorage.getItem('token'); // JWT token

  // Socket connection
  useSocket(token || '');

  useEffect(() => {
    if (!documentId) return;

    // Dokumentga join bo'lish
    socketService.joinDocument(documentId);

    // Status o'zgarganda
    socketService.on('documentStatusChanged', (data) => {
      console.log('Status changed:', data);
      if (data.documentId === documentId) {
        setDocument((prev: any) => ({
          ...prev,
          status: data.newStatus,
        }));
        // Toast notification ko'rsatish
        showToast(`Status changed: ${data.oldStatus} → ${data.newStatus}`);
      }
    });

    // Dokument yangilanganda
    socketService.on('documentUpdated', (updatedDoc) => {
      if (updatedDoc._id === documentId) {
        setDocument(updatedDoc);
        showToast('Document updated');
      }
    });

    // Yangi comment qo'shilganda
    socketService.on('newComment', (comment) => {
      console.log('New comment:', comment);
      setActivities((prev) => [...prev, comment]);
      // Toast notification
      showToast(`${comment.userId.fullName} commented`);
    });

    // Yangi activity qo'shilganda
    socketService.on('newActivity', (activity) => {
      console.log('New activity:', activity);
      setActivities((prev) => [...prev, activity]);
    });

    // Fayl yuklanganda
    socketService.on('fileUploaded', (data) => {
      if (data.documentId === documentId) {
        setDocument(data.document);
        showToast(`File uploaded: ${data.filename}`);
      }
    });

    // Fayl o'chirilganda
    socketService.on('fileDeleted', (data) => {
      if (data.documentId === documentId) {
        setDocument(data.document);
        showToast(`File deleted: ${data.filename}`);
      }
    });

    // Cleanup
    return () => {
      socketService.leaveDocument(documentId);
      socketService.off('documentStatusChanged');
      socketService.off('documentUpdated');
      socketService.off('newComment');
      socketService.off('newActivity');
      socketService.off('fileUploaded');
      socketService.off('fileDeleted');
    };
  }, [documentId]);

  // ... rest of component
};
```

---

### **5. Kanban Board - Global Updates**

#### `src/pages/KanbanBoard.tsx` (React misol)

```typescript
import React, { useEffect, useState } from 'react';
import { socketService } from '../services/socket.service';
import { useSocket } from '../hooks/useSocket';

const KanbanBoard: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const token = localStorage.getItem('token');

  useSocket(token || '');

  useEffect(() => {
    // Yangi dokument yaratilganda (global)
    socketService.on('documentCreated', (newDocument) => {
      console.log('New document created:', newDocument);
      setDocuments((prev) => [newDocument, ...prev]);
      showToast(`New document: ${newDocument.title}`);
    });

    // Status o'zgarganda (Kanban drag-drop)
    socketService.on('documentStatusChanged', (data) => {
      console.log('Document status changed:', data);
      setDocuments((prev) =>
        prev.map((doc) =>
          doc._id === data.documentId
            ? { ...doc, status: data.newStatus }
            : doc
        )
      );
    });

    // Dokument o'chirilganda (global)
    socketService.on('documentDeleted', (data) => {
      console.log('Document deleted:', data.documentId);
      setDocuments((prev) =>
        prev.filter((doc) => doc._id !== data.documentId)
      );
      showToast('Document deleted');
    });

    // Cleanup
    return () => {
      socketService.off('documentCreated');
      socketService.off('documentStatusChanged');
      socketService.off('documentDeleted');
    };
  }, []);

  // ... rest of component
};
```

---

## 🔥 Vue.js / Nuxt.js Misol

#### `composables/useSocket.ts`

```typescript
import { ref, onMounted, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';

export const useSocket = () => {
  const socket = ref<Socket | null>(null);

  const connect = (token: string) => {
    socket.value = io('http://localhost:3000/documents', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.value.on('connect', () => {
      console.log('✅ Connected:', socket.value?.id);
    });
  };

  const joinDocument = (documentId: string) => {
    socket.value?.emit('joinDocument', documentId);
  };

  const leaveDocument = (documentId: string) => {
    socket.value?.emit('leaveDocument', documentId);
  };

  const on = (event: string, callback: (data: any) => void) => {
    socket.value?.on(event, callback);
  };

  const off = (event: string) => {
    socket.value?.off(event);
  };

  const disconnect = () => {
    socket.value?.disconnect();
  };

  return {
    socket,
    connect,
    joinDocument,
    leaveDocument,
    on,
    off,
    disconnect,
  };
};
```

---

## 📱 EVENTS DATA STRUCTURE

### **documentCreated**
```json
{
  "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
  "documentNumber": "DOC-2024-001",
  "title": "Договор №001-2024",
  "status": "received",
  "priority": "high",
  "type": "incoming",
  "assignedTo": {
    "_id": "...",
    "fullName": "Сара Дженкинс",
    "avatar": "...",
    "email": "sara@example.com"
  },
  "createdBy": { ... },
  "createdAt": "2024-01-22T10:00:00Z"
}
```

### **documentStatusChanged**
```json
{
  "documentId": "65a1b2c3d4e5f6g7h8i9j0k1",
  "oldStatus": "received",
  "newStatus": "under_review",
  "document": {
    "_id": "...",
    "title": "...",
    "status": "under_review",
    ...
  }
}
```

### **newComment**
```json
{
  "_id": "65b2c3d4e5f6g7h8i9j0k1l2",
  "type": "comment",
  "content": "@Маркус, пожалуйста, проверь расчеты",
  "userId": {
    "_id": "...",
    "fullName": "Майкл Роуз",
    "avatar": "...",
    "email": "..."
  },
  "mentions": [
    {
      "_id": "...",
      "fullName": "Маркус",
      "avatar": "...",
      "email": "..."
    }
  ],
  "documentId": "65a1b2c3d4e5f6g7h8i9j0k1",
  "createdAt": "2024-01-22T10:30:00Z"
}
```

### **fileUploaded**
```json
{
  "documentId": "65a1b2c3d4e5f6g7h8i9j0k1",
  "filename": "contract.pdf",
  "document": {
    "_id": "...",
    "title": "...",
    "files": [
      {
        "_id": "...",
        "filename": "contract.pdf",
        "path": "...",
        "mimetype": "application/pdf",
        "size": 1024000,
        "uploadedAt": "2024-01-22T11:00:00Z",
        "uploadedBy": { ... }
      }
    ],
    ...
  }
}
```

---

## 🎨 BEST PRACTICES

### ✅ **Do's:**

1. **Join/Leave rooms correctly**
   ```typescript
   // Page open bo'lganda join
   socketService.joinDocument(documentId);

   // Page close bo'lganda leave
   return () => socketService.leaveDocument(documentId);
   ```

2. **Cleanup listeners**
   ```typescript
   useEffect(() => {
     socketService.on('newComment', handleNewComment);

     return () => {
       socketService.off('newComment', handleNewComment);
     };
   }, []);
   ```

3. **Optimistic updates + Real-time sync**
   ```typescript
   const handleStatusChange = async (newStatus) => {
     // Optimistic update (darhol UI update qilish)
     setDocument(prev => ({ ...prev, status: newStatus }));

     try {
       // Backend API call
       await updateDocumentStatus(documentId, newStatus);
     } catch (error) {
       // Rollback on error
       setDocument(prev => ({ ...prev, status: oldStatus }));
     }

     // Real-time event boshqa clientlar uchun keladi
   };
   ```

4. **Toast/Notifications ko'rsatish**
   ```typescript
   socketService.on('newComment', (comment) => {
     // Faqat boshqa userlarning commentlarini ko'rsatish
     if (comment.userId._id !== currentUserId) {
       showToast(`${comment.userId.fullName} commented`);
     }
   });
   ```

### ❌ **Don'ts:**

1. **Har bir render da reconnect qilmaslik**
   ```typescript
   // ❌ BAD
   useEffect(() => {
     socketService.connect(token); // Har render da
   }); // dependency array yo'q

   // ✅ GOOD
   useEffect(() => {
     socketService.connect(token);
   }, [token]); // Faqat token o'zgarganda
   ```

2. **Memory leak oldini olish**
   ```typescript
   // ❌ BAD - cleanup yo'q
   useEffect(() => {
     socketService.on('newComment', handleComment);
   }, []);

   // ✅ GOOD - cleanup bilan
   useEffect(() => {
     socketService.on('newComment', handleComment);
     return () => socketService.off('newComment', handleComment);
   }, []);
   ```

3. **Duplicate events subscribe qilmaslik**
   ```typescript
   // ❌ BAD
   socketService.on('newComment', callback1);
   socketService.on('newComment', callback2); // duplicate!

   // ✅ GOOD - bitta handler
   socketService.on('newComment', (data) => {
     callback1(data);
     callback2(data);
   });
   ```

---

## 🧪 TESTING (Browser Console)

Browserni console da test qilish uchun:

```javascript
// 1. Socket.IO client import qilish (CDN)
const script = document.createElement('script');
script.src = 'https://cdn.socket.io/4.8.0/socket.io.min.js';
document.head.appendChild(script);

// 2. Connect
const socket = io('http://localhost:3000/documents', {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

// 3. Dokumentga join
socket.emit('joinDocument', '65a1b2c3d4e5f6g7h8i9j0k1');

// 4. Eventlarni listen qilish
socket.on('documentStatusChanged', (data) => {
  console.log('Status changed:', data);
});

socket.on('newComment', (data) => {
  console.log('New comment:', data);
});

// 5. Disconnect
socket.disconnect();
```

---

## 🔍 DEBUGGING

### Backend logs
```bash
# Terminal da server logs ko'rish
npm run start:dev
```

Backend da har bir socket event log qilinadi:
```
[SocketGateway] Client connected: abc123
[SocketGateway] Client abc123 joined document-65a1b2c3d4e5f6g7h8i9j0k1
[SocketGateway] Status changed for document 65a1b2c3d4e5f6g7h8i9j0k1
[SocketGateway] New comment added to document 65a1b2c3d4e5f6g7h8i9j0k1
```

### Frontend debugging
```typescript
socketService.getSocket()?.onAny((event, ...args) => {
  console.log('📡 Socket event:', event, args);
});
```

---

## 🚀 PRODUCTION DEPLOYMENT

`.env` faylida:

```env
# Development
SOCKET_IO_CORS=http://localhost:3001

# Production
SOCKET_IO_CORS=https://your-frontend-domain.com
```

Frontend da:

```typescript
const SOCKET_URL = process.env.NODE_ENV === 'production'
  ? 'wss://your-backend-domain.com/documents'
  : 'ws://localhost:3000/documents';

socketService.connect(SOCKET_URL, token);
```

---

## 📚 QO'SHIMCHA RESURSLAR

- **Socket.IO Client docs:** https://socket.io/docs/v4/client-api/
- **Socket.IO React integration:** https://socket.io/how-to/use-with-react
- **NestJS WebSockets:** https://docs.nestjs.com/websockets/gateways

---

## ✅ SUMMARY

✅ Socket.IO namespace: `/documents`
✅ Global events: `documentCreated`, `documentDeleted`
✅ Room-based events: `documentStatusChanged`, `newComment`, `fileUploaded`, etc.
✅ Join/Leave rooms: `joinDocument(id)`, `leaveDocument(id)`
✅ Real-time UI updates: Kanban, Timeline, Comments, Files
✅ Production ready: CORS, error handling, logging

Savol bo'lsa, backend developer bilan bog'laning! 🚀
