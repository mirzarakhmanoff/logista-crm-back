# Email Integration API Documentation

> Logista CRM — To'liq pochta integratsiyasi (Gmail, Mail.ru, Korporativ pochta)
>
> Base URL: `http://localhost:3000/api`
>
> Swagger: `http://localhost:3000/api/docs`

---

## Mundarija

1. [Autentifikatsiya](#autentifikatsiya)
2. [Enumlar](#enumlar)
3. [Email Account API](#email-account-api)
4. [Gmail OAuth2](#gmail-oauth2)
5. [Email Messages API](#email-messages-api)
6. [Send & Reply](#send--reply)
7. [CRM Linking](#crm-linking)
8. [Status Operations](#status-operations)
9. [Statistics & Attachments](#statistics--attachments)
10. [WebSocket Events](#websocket-events)
11. [Response Formatlar](#response-formatlar)
12. [Frontend Integratsiya Bo'yicha Qo'llanma](#frontend-integratsiya-boyicha-qollanma)
13. [Xatolarni Boshqarish](#xatolarni-boshqarish)

---

## Autentifikatsiya

Barcha endpointlar JWT token talab qiladi (Google OAuth callback bundan mustasno).

```
Authorization: Bearer <JWT_TOKEN>
```

### Rollar bo'yicha ruxsatlar

| Rol | Akkaunt yaratish | Xat jo'natish | Xat o'chirish | Akkaunt o'chirish |
|-----|-----------------|---------------|---------------|-------------------|
| `admin` | ✅ | ✅ | ✅ | ✅ |
| `manager` | ✅ | ✅ | ✅ | ❌ |
| `operator` | ❌ | ✅ | ❌ | ❌ |
| `accountant` | ❌ | ❌ | ❌ | ❌ |

---

## Enumlar

Frontend da ishlatish uchun barcha enum qiymatlari:

### EmailProvider
```typescript
type EmailProvider = 'gmail' | 'mailru' | 'corporate' | 'custom';
```

### EmailAccountStatus
```typescript
type EmailAccountStatus = 'active' | 'inactive' | 'error';
```

### EmailDirection
```typescript
type EmailDirection = 'inbound' | 'outbound';
```

### EmailStatus
```typescript
type EmailStatus = 'unread' | 'read' | 'replied' | 'forwarded' | 'archived' | 'deleted';
```

### LinkEntityType
```typescript
type LinkEntityType = 'CLIENT' | 'REQUEST';
```

---

## Email Account API

### 1. Yangi email akkaunt qo'shish

```
POST /api/email/accounts
```

**Rollar:** `admin`, `manager`

**Request Body:**

```json
{
  "name": "Korporativ pochta",
  "emailAddress": "info@logistatrans.uz",
  "provider": "corporate",
  "imapConfig": {
    "host": "mail.logistatrans.uz",
    "port": 993,
    "secure": true
  },
  "smtpConfig": {
    "host": "mail.logistatrans.uz",
    "port": 465,
    "secure": true
  },
  "credentials": {
    "user": "info@logistatrans.uz",
    "password": "parol123"
  },
  "syncEnabled": true
}
```

> **Gmail uchun** `imapConfig` va `smtpConfig` **avtomatik to'ldiriladi** — faqat quyidagini yuboring:
>
> ```json
> {
>   "name": "Gmail pochta",
>   "emailAddress": "user@gmail.com",
>   "provider": "gmail",
>   "credentials": {
>     "user": "user@gmail.com",
>     "password": "xxxx-xxxx-xxxx-xxxx"
>   }
> }
> ```
>
> Gmail **App Password** kerak bo'ladi (oddiy parol ishlamaydi). Yoki OAuth2 ni ishlating.

**Response: `201 Created`**

```json
{
  "_id": "679a1b2c3d4e5f6789012345",
  "name": "Korporativ pochta",
  "emailAddress": "info@logistatrans.uz",
  "provider": "corporate",
  "status": "active",
  "imapConfig": {
    "host": "mail.logistatrans.uz",
    "port": 993,
    "secure": true
  },
  "smtpConfig": {
    "host": "mail.logistatrans.uz",
    "port": 465,
    "secure": true
  },
  "lastSyncUid": 0,
  "syncEnabled": true,
  "createdBy": {
    "_id": "...",
    "fullName": "Admin",
    "email": "admin@logista.uz"
  },
  "sharedWith": [],
  "createdAt": "2026-01-30T10:00:00.000Z",
  "updatedAt": "2026-01-30T10:00:00.000Z"
}
```

> `credentials` maydon response da **qaytmaydi** (xavfsizlik).

---

### 2. Barcha akkauntlarni olish

```
GET /api/email/accounts
```

**Response: `200 OK`** — Joriy foydalanuvchi yaratgan yoki shared qilingan akkauntlar

```json
[
  {
    "_id": "679a1b2c3d4e5f6789012345",
    "name": "Korporativ pochta",
    "emailAddress": "info@logistatrans.uz",
    "provider": "corporate",
    "status": "active",
    "lastSyncAt": "2026-01-30T10:05:00.000Z",
    "syncEnabled": true,
    "createdBy": { "_id": "...", "fullName": "Admin", "email": "admin@logista.uz" },
    "createdAt": "2026-01-30T10:00:00.000Z"
  }
]
```

---

### 3. Akkauntni ID bo'yicha olish

```
GET /api/email/accounts/:id
```

---

### 4. Akkauntni yangilash

```
PATCH /api/email/accounts/:id
```

**Rollar:** `admin`, `manager`

**Request Body:** (faqat o'zgartirmoqchi bo'lgan maydonlar)

```json
{
  "name": "Yangi nom",
  "syncEnabled": false
}
```

---

### 5. Akkauntni o'chirish

```
DELETE /api/email/accounts/:id
```

**Rollar:** `admin`

**Response: `204 No Content`**

> Akkauntga tegishli **barcha xatlar ham o'chiriladi**.

---

### 6. IMAP/SMTP ulanishni tekshirish

```
POST /api/email/accounts/:id/test
```

**Rollar:** `admin`, `manager`

**Response: `200 OK`**

```json
{
  "imap": true,
  "smtp": true
}
```

---

### 7. Akkauntni qo'lda sinxronlashtirish

```
POST /api/email/accounts/:id/sync
```

**Rollar:** `admin`, `manager`

**Response: `200 OK`**

```json
{
  "accountId": "679a1b2c3d4e5f6789012345",
  "newMessages": 5,
  "errors": [],
  "syncedAt": "2026-01-30T10:06:00.000Z"
}
```

---

## Gmail OAuth2

Gmail ni App Password o'rniga OAuth2 bilan ulash uchun.

### 1. Google ruxsat URL olish

```
GET /api/email/oauth/google/url
```

**Rollar:** `admin`, `manager`

**Response:**

```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&scope=https://mail.google.com/&state=USER_ID"
}
```

**Frontend logikasi:**

```typescript
// 1. URL ni oling
const { url } = await api.get('/email/oauth/google/url');

// 2. Foydalanuvchini Google sahifasiga yo'naltiring
window.location.href = url;

// Yoki popup ochish:
window.open(url, 'gmail-oauth', 'width=600,height=700');
```

### 2. Google callback

```
GET /api/email/oauth/google/callback?code=AUTH_CODE&state=USER_ID
```

**Auth:** Public (JWT kerak emas)

> Bu endpoint Google tomonidan chaqiriladi. Frontend da callback sahifasida natijani ko'rsating.

**Response: `200 OK`** — Yaratilgan EmailAccount

---

## Email Messages API

### 1. Xatlar ro'yxati (filtrlash bilan)

```
GET /api/email/messages
```

**Query parametrlar:**

| Parametr | Turi | Default | Tavsif |
|----------|------|---------|--------|
| `search` | string | — | Subject, body, from address/name bo'yicha qidirish |
| `accountId` | ObjectId | — | Ma'lum akkauntning xatlari |
| `direction` | `inbound` \| `outbound` | — | Kiruvchi yoki chiquvchi |
| `status` | `unread` \| `read` \| `replied` \| `archived` | — | Xat holati |
| `folder` | string | — | Papka nomi (`INBOX`, `SENT`, ...) |
| `clientId` | ObjectId | — | Ma'lum klientga bog'langan xatlar |
| `requestId` | ObjectId | — | Ma'lum so'rovga bog'langan xatlar |
| `page` | number | `1` | Sahifa raqami |
| `limit` | number | `20` | Har sahifadagi xatlar soni |

**Misollar:**

```
GET /api/email/messages?status=unread&page=1&limit=10
GET /api/email/messages?search=invoice&direction=inbound
GET /api/email/messages?accountId=679a1b2c3d4e5f6789012345&folder=INBOX
GET /api/email/messages?clientId=507f1f77bcf86cd799439011
```

**Response: `200 OK`**

```json
{
  "data": [
    {
      "_id": "679b2c3d4e5f67890123abcd",
      "accountId": {
        "_id": "679a1b2c3d4e5f6789012345",
        "name": "Korporativ pochta",
        "emailAddress": "info@logistatrans.uz",
        "provider": "corporate"
      },
      "messageId": "<abc123@mail.logistatrans.uz>",
      "uid": 1542,
      "direction": "inbound",
      "status": "unread",
      "from": {
        "name": "John Smith",
        "address": "john@example.com"
      },
      "to": [
        { "address": "info@logistatrans.uz" }
      ],
      "cc": [],
      "bcc": [],
      "subject": "Shipment inquiry #4521",
      "date": "2026-01-30T09:30:00.000Z",
      "threadId": "<abc123@mail.logistatrans.uz>",
      "attachments": [
        {
          "filename": "invoice.pdf",
          "path": "uploads/email-attachments/679a.../1542-invoice.pdf",
          "mimetype": "application/pdf",
          "size": 245000
        }
      ],
      "linkedEntities": [
        {
          "entityType": "CLIENT",
          "entityId": "507f1f77bcf86cd799439011"
        }
      ],
      "folder": "INBOX",
      "createdAt": "2026-01-30T10:05:00.000Z"
    }
  ],
  "total": 156,
  "page": 1,
  "limit": 20
}
```

---

### 2. Bitta xatni olish

```
GET /api/email/messages/:id
```

**Response: `200 OK`**

> Xat avtomatik `read` deb belgilanadi.

```json
{
  "_id": "679b2c3d4e5f67890123abcd",
  "accountId": {
    "_id": "679a1b2c3d4e5f6789012345",
    "name": "Korporativ pochta",
    "emailAddress": "info@logistatrans.uz",
    "provider": "corporate"
  },
  "messageId": "<abc123@mail.logistatrans.uz>",
  "uid": 1542,
  "direction": "inbound",
  "status": "read",
  "from": {
    "name": "John Smith",
    "address": "john@example.com"
  },
  "to": [{ "address": "info@logistatrans.uz" }],
  "cc": [],
  "bcc": [],
  "subject": "Shipment inquiry #4521",
  "textBody": "Hello, I would like to inquire about...",
  "htmlBody": "<p>Hello, I would like to inquire about...</p>",
  "date": "2026-01-30T09:30:00.000Z",
  "inReplyTo": null,
  "references": [],
  "threadId": "<abc123@mail.logistatrans.uz>",
  "attachments": [
    {
      "filename": "invoice.pdf",
      "path": "uploads/email-attachments/679a.../1542-invoice.pdf",
      "mimetype": "application/pdf",
      "size": 245000
    }
  ],
  "linkedEntities": [
    {
      "entityType": "CLIENT",
      "entityId": "507f1f77bcf86cd799439011"
    }
  ],
  "flags": ["\\Seen"],
  "folder": "INBOX",
  "sentBy": null,
  "createdAt": "2026-01-30T10:05:00.000Z",
  "updatedAt": "2026-01-30T10:05:30.000Z"
}
```

---

### 3. Xat zanjiri (thread)

```
GET /api/email/messages/:id/thread
```

**Response: `200 OK`** — Sana bo'yicha tartiblangan xatlar massivi

```json
[
  {
    "_id": "...",
    "subject": "Shipment inquiry #4521",
    "direction": "inbound",
    "from": { "address": "john@example.com" },
    "date": "2026-01-30T09:30:00.000Z"
  },
  {
    "_id": "...",
    "subject": "Re: Shipment inquiry #4521",
    "direction": "outbound",
    "from": { "address": "info@logistatrans.uz" },
    "date": "2026-01-30T10:15:00.000Z"
  },
  {
    "_id": "...",
    "subject": "Re: Shipment inquiry #4521",
    "direction": "inbound",
    "from": { "address": "john@example.com" },
    "date": "2026-01-30T11:00:00.000Z"
  }
]
```

---

## Send & Reply

### 1. Yangi xat jo'natish

```
POST /api/email/messages/send
```

**Rollar:** `admin`, `manager`, `operator`

**Request Body:**

```json
{
  "accountId": "679a1b2c3d4e5f6789012345",
  "to": ["client@example.com"],
  "cc": ["manager@logista.uz"],
  "bcc": [],
  "subject": "Yuk tashish narxi haqida",
  "textBody": "Salom, yuk tashish narxi quyidagicha...",
  "htmlBody": "<p>Salom, yuk tashish narxi quyidagicha...</p>"
}
```

**Response: `201 Created`** — Saqlangan EmailMessage

---

### 2. Fayllar bilan xat jo'natish

```
POST /api/email/messages/send-with-attachments
Content-Type: multipart/form-data
```

**Rollar:** `admin`, `manager`, `operator`

**Form Data:**

| Maydon | Turi | Tavsif |
|--------|------|--------|
| `accountId` | string | Akkaunt ID |
| `to` | string[] | Qabul qiluvchilar |
| `cc` | string[] | Nusxa oluvchilar (ixtiyoriy) |
| `subject` | string | Mavzu |
| `textBody` | string | Oddiy matn (ixtiyoriy) |
| `htmlBody` | string | HTML matn (ixtiyoriy) |
| `files` | File[] | Biriktirmalar (max 25MB har biri) |

**Frontend misoli (React):**

```typescript
const formData = new FormData();
formData.append('accountId', '679a1b2c3d4e5f6789012345');
formData.append('to', 'client@example.com');
formData.append('subject', 'Hujjatlar');
formData.append('textBody', 'Iltimos, hujjatlarni ko\'ring');
formData.append('files', file1);
formData.append('files', file2);

await api.post('/email/messages/send-with-attachments', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
```

---

### 3. Xatga javob yozish

```
POST /api/email/messages/reply
```

**Rollar:** `admin`, `manager`, `operator`

**Request Body:**

```json
{
  "originalMessageId": "679b2c3d4e5f67890123abcd",
  "textBody": "Rahmat, ma'lumot uchun.",
  "htmlBody": "<p>Rahmat, ma'lumot uchun.</p>",
  "replyAll": false,
  "cc": []
}
```

| Maydon | Turi | Default | Tavsif |
|--------|------|---------|--------|
| `originalMessageId` | ObjectId | — | Javob beriladigan xat ID (majburiy) |
| `textBody` | string | — | Javob matni |
| `htmlBody` | string | — | Javob HTML |
| `replyAll` | boolean | `false` | Barchaga javob berish |
| `cc` | string[] | — | Qo'shimcha CC |

> `replyAll: true` bo'lsa, asl xatning barcha `to` va `cc` qabul qiluvchilari avtomatik qo'shiladi (o'zingiz bundan mustasno).

**Response: `201 Created`** — Saqlangan javob EmailMessage

---

## CRM Linking

Xatlarni klient yoki so'rovga bog'lash. Yangi kelgan xatlar avtomatik bog'lanadi (klient email bo'yicha).

### 1. Xatni CRM obyektiga bog'lash

```
POST /api/email/messages/:id/link
```

**Rollar:** `admin`, `manager`, `operator`

**Request Body:**

```json
{
  "entityType": "CLIENT",
  "entityId": "507f1f77bcf86cd799439011"
}
```

| entityType qiymatlari | Tavsif |
|----------------------|--------|
| `CLIENT` | Klientga bog'lash |
| `REQUEST` | So'rovga bog'lash |

---

### 2. Xatni CRM obyektidan uzish

```
DELETE /api/email/messages/:id/link/:entityType/:entityId
```

**Misol:**

```
DELETE /api/email/messages/679b2c3d.../link/CLIENT/507f1f77...
```

---

### 3. Klientga bog'langan barcha xatlar

```
GET /api/email/by-client/:clientId?page=1&limit=20
```

**Response:** Sahifalangan `{ data, total, page, limit }` format

---

### 4. So'rovga bog'langan barcha xatlar

```
GET /api/email/by-request/:requestId?page=1&limit=20
```

---

## Status Operations

### Xatni o'qilgan deb belgilash

```
PATCH /api/email/messages/:id/read
```

### Xatni o'qilmagan deb belgilash

```
PATCH /api/email/messages/:id/unread
```

### Xatni arxivlash

```
PATCH /api/email/messages/:id/archive
```

### Xatni o'chirish

```
DELETE /api/email/messages/:id
```

**Rollar:** `admin`, `manager`

**Response: `204 No Content`**

---

## Statistics & Attachments

### Email statistikasi (dashboard uchun)

```
GET /api/email/stats
```

**Response: `200 OK`**

```json
{
  "totalAccounts": 2,
  "totalMessages": 1543,
  "unreadCount": 23,
  "sentToday": 5,
  "receivedToday": 12
}
```

---

### Attachment yuklash

```
GET /api/email/messages/:messageId/attachments/:index/download
```

| Parametr | Tavsif |
|----------|--------|
| `messageId` | Xat ID |
| `index` | Attachment indeksi (0 dan boshlanadi) |

**Frontend misoli:**

```typescript
// Attachment yuklash
const downloadUrl = `/api/email/messages/${messageId}/attachments/${index}/download`;
window.open(downloadUrl, '_blank');

// Yoki axios bilan:
const response = await api.get(downloadUrl, { responseType: 'blob' });
const url = window.URL.createObjectURL(new Blob([response.data]));
const link = document.createElement('a');
link.href = url;
link.download = attachment.filename;
link.click();
```

---

## WebSocket Events

Socket.IO namespace: `/documents`

### Ulanish

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/documents', {
  auth: { token: 'JWT_TOKEN' },
});
```

### Eventlar

#### Tinglash (listen)

| Event | Data | Qachon chaqiriladi |
|-------|------|---------------------|
| `newEmailReceived` | `{ accountId, accountName, messageId, from, subject, date }` | Bitta yangi xat kelganda |
| `newEmailsReceived` | `{ accountId, accountName, count }` | Sync da bir nechta xat kelganda |
| `emailSent` | `{ messageId, to: string[], subject }` | Xat jo'natilganda |
| `emailLinked` | `{ messageId, entityType, entityId }` | Xat CRM ga bog'langanda |
| `emailSyncError` | `{ accountId, accountName, error }` | Sync xatolik bo'lganda |

#### Jo'natish (emit)

| Event | Data | Tavsif |
|-------|------|--------|
| `joinEmailAccount` | `accountId: string` | Ma'lum akkaunt xabarlariga subscribe |
| `leaveEmailAccount` | `accountId: string` | Ma'lum akkauntdan unsubscribe |

### Frontend misoli

```typescript
// Yangi xatlarni tinglash
socket.on('newEmailsReceived', (data) => {
  console.log(`${data.count} ta yangi xat: ${data.accountName}`);
  // Xatlar ro'yxatini yangilash
  refetchEmails();
  // Notification ko'rsatish
  showNotification(`${data.count} ta yangi xat keldi`);
});

socket.on('newEmailReceived', (data) => {
  showNotification(`Yangi xat: ${data.subject} — ${data.from}`);
});

socket.on('emailSent', (data) => {
  console.log(`Xat jo'natildi: ${data.subject}`);
});

socket.on('emailSyncError', (data) => {
  showError(`Sync xatolik: ${data.accountName} — ${data.error}`);
});

// Ma'lum akkauntga subscribe
socket.emit('joinEmailAccount', '679a1b2c3d4e5f6789012345');
```

---

## Response Formatlar

### Paginated response (ro'yxatlar uchun)

```typescript
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

### Email Account

```typescript
interface EmailAccount {
  _id: string;
  name: string;
  emailAddress: string;
  provider: 'gmail' | 'mailru' | 'corporate' | 'custom';
  status: 'active' | 'inactive' | 'error';
  imapConfig?: { host: string; port: number; secure: boolean };
  smtpConfig?: { host: string; port: number; secure: boolean };
  lastSyncUid: number;
  lastSyncAt?: string;     // ISO date
  lastError?: string;
  syncEnabled: boolean;
  createdBy: { _id: string; fullName: string; email: string };
  sharedWith: string[];
  createdAt: string;
  updatedAt: string;
}
```

### Email Message

```typescript
interface EmailMessage {
  _id: string;
  accountId: {
    _id: string;
    name: string;
    emailAddress: string;
    provider: string;
  };
  messageId: string;
  uid: number;
  direction: 'inbound' | 'outbound';
  status: 'unread' | 'read' | 'replied' | 'forwarded' | 'archived' | 'deleted';
  from: { name?: string; address: string };
  to: { name?: string; address: string }[];
  cc: { name?: string; address: string }[];
  bcc: { name?: string; address: string }[];
  subject: string;
  textBody?: string;
  htmlBody?: string;
  date: string;            // ISO date
  inReplyTo?: string;
  references: string[];
  threadId?: string;
  attachments: {
    filename: string;
    path: string;
    mimetype: string;
    size: number;
    contentId?: string;
  }[];
  linkedEntities: {
    entityType: 'CLIENT' | 'REQUEST';
    entityId: string;
  }[];
  flags: string[];
  folder: string;
  sentBy?: { _id: string; fullName: string; email: string };
  createdAt: string;
  updatedAt: string;
}
```

### Email Stats

```typescript
interface EmailStats {
  totalAccounts: number;
  totalMessages: number;
  unreadCount: number;
  sentToday: number;
  receivedToday: number;
}
```

### Sync Result

```typescript
interface EmailSyncResult {
  accountId: string;
  newMessages: number;
  errors: string[];
  syncedAt: string;        // ISO date
}
```

### Connection Test Result

```typescript
interface ConnectionTestResult {
  imap: boolean;
  smtp: boolean;
}
```

---

## Frontend Integratsiya Bo'yicha Qo'llanma

### 1. Axios instance sozlash

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 2. Email service (React / Vue uchun)

```typescript
// services/emailService.ts

export const emailService = {

  // ===== ACCOUNTS =====

  getAccounts: () =>
    api.get('/email/accounts'),

  createAccount: (data: CreateEmailAccountDto) =>
    api.post('/email/accounts', data),

  deleteAccount: (id: string) =>
    api.delete(`/email/accounts/${id}`),

  testConnection: (id: string) =>
    api.post(`/email/accounts/${id}/test`),

  syncAccount: (id: string) =>
    api.post(`/email/accounts/${id}/sync`),

  // ===== GMAIL OAUTH =====

  getGmailAuthUrl: () =>
    api.get('/email/oauth/google/url'),

  // ===== MESSAGES =====

  getMessages: (params: FilterEmailDto) =>
    api.get('/email/messages', { params }),

  getMessage: (id: string) =>
    api.get(`/email/messages/${id}`),

  getThread: (id: string) =>
    api.get(`/email/messages/${id}/thread`),

  // ===== SEND =====

  sendEmail: (data: SendEmailDto) =>
    api.post('/email/messages/send', data),

  sendWithAttachments: (formData: FormData) =>
    api.post('/email/messages/send-with-attachments', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  replyToEmail: (data: ReplyEmailDto) =>
    api.post('/email/messages/reply', data),

  // ===== LINK =====

  linkToEntity: (messageId: string, data: LinkEmailDto) =>
    api.post(`/email/messages/${messageId}/link`, data),

  unlinkFromEntity: (messageId: string, entityType: string, entityId: string) =>
    api.delete(`/email/messages/${messageId}/link/${entityType}/${entityId}`),

  getByClient: (clientId: string, page = 1, limit = 20) =>
    api.get(`/email/by-client/${clientId}`, { params: { page, limit } }),

  getByRequest: (requestId: string, page = 1, limit = 20) =>
    api.get(`/email/by-request/${requestId}`, { params: { page, limit } }),

  // ===== STATUS =====

  markAsRead: (id: string) =>
    api.patch(`/email/messages/${id}/read`),

  markAsUnread: (id: string) =>
    api.patch(`/email/messages/${id}/unread`),

  archiveEmail: (id: string) =>
    api.patch(`/email/messages/${id}/archive`),

  deleteEmail: (id: string) =>
    api.delete(`/email/messages/${id}`),

  // ===== STATS =====

  getStats: () =>
    api.get('/email/stats'),

  // ===== ATTACHMENTS =====

  getAttachmentUrl: (messageId: string, index: number) =>
    `/api/email/messages/${messageId}/attachments/${index}/download`,
};
```

### 3. WebSocket ulanish (React hook)

```typescript
// hooks/useEmailSocket.ts

import { useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function useEmailSocket(onNewEmails?: (data: any) => void) {
  useEffect(() => {
    if (!socket) {
      socket = io('http://localhost:3000/documents', {
        transports: ['websocket'],
      });
    }

    const handleNewEmails = (data: any) => {
      onNewEmails?.(data);
    };

    socket.on('newEmailsReceived', handleNewEmails);
    socket.on('newEmailReceived', handleNewEmails);

    return () => {
      socket?.off('newEmailsReceived', handleNewEmails);
      socket?.off('newEmailReceived', handleNewEmails);
    };
  }, [onNewEmails]);

  const joinAccount = useCallback((accountId: string) => {
    socket?.emit('joinEmailAccount', accountId);
  }, []);

  const leaveAccount = useCallback((accountId: string) => {
    socket?.emit('leaveEmailAccount', accountId);
  }, []);

  return { joinAccount, leaveAccount };
}
```

### 4. Korporativ pochta ulash misoli

```typescript
// Korporativ pochta (info@logistatrans.uz) ulash
await emailService.createAccount({
  name: 'Logista Trans',
  emailAddress: 'info@logistatrans.uz',
  provider: 'corporate',
  imapConfig: {
    host: 'mail.logistatrans.uz',
    port: 993,
    secure: true,
  },
  smtpConfig: {
    host: 'mail.logistatrans.uz',
    port: 465,
    secure: true,
  },
  credentials: {
    user: 'info@logistatrans.uz',
    password: 'your-password',
  },
  syncEnabled: true,
});
```

### 5. Gmail ulash misoli (App Password)

```typescript
await emailService.createAccount({
  name: 'Gmail',
  emailAddress: 'user@gmail.com',
  provider: 'gmail',
  // imapConfig va smtpConfig avtomatik to'ldiriladi
  credentials: {
    user: 'user@gmail.com',
    password: 'xxxx-xxxx-xxxx-xxxx', // Google App Password
  },
});
```

### 6. Gmail ulash misoli (OAuth2)

```typescript
// 1. URL oling
const { data } = await emailService.getGmailAuthUrl();

// 2. Foydalanuvchini yo'naltiring
window.location.href = data.url;

// 3. Callback sahifasida (Google qaytarganidan keyin):
// Backend avtomatik akkaunt yaratadi
// Frontend faqat akkauntlar ro'yxatini yangilashi kerak
```

---

## Xatolarni Boshqarish

### HTTP xato kodlari

| Kod | Tavsif |
|-----|--------|
| `400` | Noto'g'ri so'rov (validation xatosi, ulanish muvaffaqiyatsiz) |
| `401` | Autentifikatsiya kerak (JWT yo'q yoki muddati o'tgan) |
| `403` | Ruxsat yo'q (rol yetarli emas) |
| `404` | Topilmadi (akkaunt, xat) |
| `409` | Conflict (bu email allaqachon ro'yxatdan o'tgan) |

### Xato response formati

```json
{
  "statusCode": 400,
  "message": "IMAP ulanish muvaffaqiyatsiz. Login va parolni tekshiring.",
  "error": "Bad Request"
}
```

### Validation xatosi

```json
{
  "statusCode": 400,
  "message": [
    "emailAddress must be an email",
    "provider must be one of the following values: gmail, mailru, corporate, custom"
  ],
  "error": "Bad Request"
}
```

---

## Provider sozlamalari (ma'lumotnoma)

| Provider | IMAP Host | IMAP Port | SMTP Host | SMTP Port | Auth |
|----------|-----------|-----------|-----------|-----------|------|
| `gmail` | imap.gmail.com | 993 | smtp.gmail.com | 465 | App Password yoki OAuth2 |
| `mailru` | imap.mail.ru | 993 | smtp.mail.ru | 465 | Parol |
| `corporate` | Hosting bergan | 993 | Hosting bergan | 465 | Parol |
| `custom` | O'zi kiritadi | O'zi | O'zi kiritadi | O'zi | Parol |

> `gmail` va `mailru` uchun `imapConfig`/`smtpConfig` kiritish **shart emas** — backend avtomatik to'ldiradi.

---

## Background Sync

- Har **1 daqiqada** barcha `active` + `syncEnabled` akkauntlar IMAP orqali tekshiriladi
- Yangi xatlar avtomatik DB ga saqlanadi
- Yangi xat kelsa, WebSocket orqali `newEmailsReceived` event chiqadi
- Xat jo'natuvchi/qabul qiluvchi email bo'yicha klientlar avtomatik bog'lanadi
- `POST /api/email/accounts/:id/sync` orqali qo'lda ham sync qilish mumkin
