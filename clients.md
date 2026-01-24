# NestJS + MongoDB CRM Architecture (Request-Centric, 2 Types, Kanban)

## 0) Maqsad
Sistemada **Request** (Заявка) — markaziy obyekt. Request 2 tur bo‘ladi:
- `NEW_CLIENT` (Yangi klientlar)
- `OUR_CLIENT` (O‘zimizning klientlar)

Kanban doska requestlarni `statusKey` bo‘yicha ko‘rsatadi.
Hamma bog‘liqlar requestga ulanadi:
- hisoblangan stavkalar (RateQuote)
- berilgan kodlar (IssuedCode)
- client kartochkasi (Client) — request orqali ko‘rinadi
- фактические перевозки (Shipment)
- finance/fакт (Invoice/Payment) — ixtiyoriy

---

## 1) Domen modeli (MongoDB collections)

### 1.1 Users (`users`)
Minimal:
- `_id`
- `fullName`
- `email` (unique)
- `role`: `ADMIN | MANAGER | OPERATOR | ACCOUNTANT`
- `isActive`
- `createdAt`, `updatedAt`

### 1.2 Clients (`clients`)
Client — to‘liq kartochka (rekvizitlar):
- `_id`
- `name`
- `company`
- `phone`, `email`
- `inn`, `address`
- `createdAt`, `updatedAt`

> Eslatma: “Yangi” yoki “Bizniki” degan ajratish **request.type** orqali yuradi. Clientda alohida flag saqlash shart emas.

### 1.3 Requests (`requests`) — AGGREGATE ROOT
Request markaz:
- `_id`
- `clientId` (ObjectId -> clients)
- `type`: `NEW_CLIENT | OUR_CLIENT`
- `statusKey`: string (Kanban ustuni key)
- `source`: `telegram | instagram | olx | site | other`
- `comment`
- `createdBy` (ObjectId -> users)
- `assignedTo` (ObjectId -> users)
- `createdAt`, `updatedAt`

> Qolgan barcha entitylar `requestId` bilan ulanadi.

### 1.4 Request Status Config (`request_statuses`)
Kanban columnlar DB’da turadi, har bir request type uchun alohida:
- `_id`
- `requestType`: `NEW_CLIENT | OUR_CLIENT`
- `key`: `new`, `in_work`, `quote_sent`, `won`, ...
- `title`: UI ko‘rinadigan nom
- `order`: number
- `isFinal`: boolean

### 1.5 Status Transition Rules (`request_transitions`) (ixtiyoriy, lekin tavsiya)
Status o‘tishlarini qat’iy nazorat qilish uchun:
- `_id`
- `requestType`
- `fromKey`
- `toKey`

Backend `PATCH /requests/:id/status` da shu transition ruxsat bormi tekshiradi.

### 1.6 Rate Quotes (`rate_quotes`) — Расчет ставок
- `_id`
- `requestId` (ObjectId -> requests)
- route: `fromCity`, `toCity`
- cargo: `cargoName`, `weightKg`, `volumeM3`
- `cost`, `currency`, `margin`
- `status`: `DRAFT | APPROVED | SENT`
- `createdBy` (ObjectId -> users)
- `createdAt`, `updatedAt`

### 1.7 Issued Codes (`issued_codes`) — Выданные коды
- `_id`
- `requestId` (ObjectId -> requests)
- `code` (unique)
- `codeType`: `internal | warehouse | container | other`
- `status`: `ACTIVE | CLOSED | CANCELLED`
- `issuedBy` (ObjectId -> users)
- `issuedAt`, `closedAt`

### 1.8 Shipments (`shipments`) — Фактические перевозки
- `_id`
- `requestId` (ObjectId -> requests)
- `shipmentNo`
- `carrier`
- `vehicleNo`
- `driverName`
- `departureDate`, `arrivalDate`
- `status`: `PLANNED | IN_TRANSIT | DELIVERED | CANCELLED`
- `createdAt`, `updatedAt`

### 1.9 Invoices/Payments (`invoices`) — Факт (ixtiyoriy)
Agar “Факт” = invoice/payment bo‘lsa:
- `_id`
- `requestId`
- `number`
- `amount`, `currency`
- `paidAmount`
- `status`: `UNPAID | PARTIAL | PAID | CANCELLED`
- `issuedAt`, `dueDate`
- `createdBy`
- `createdAt`, `updatedAt`

### 1.10 Documents (`documents`) — file storage link
Mongo’da file metadata:
- `_id`
- `entityType`: `CLIENT | REQUEST | SHIPMENT`
- `entityId`: ObjectId
- `fileName`, `fileUrl`
- `docType`
- `uploadedBy`
- `createdAt`

### 1.11 Activity Log (`activity_logs`) (tavsiya)
Har bir o‘zgarish tarixini saqlash:
- `_id`
- `entityType`
- `entityId`
- `action`: `created | updated | status_changed | file_uploaded | comment`
- `message`
- `userId`
- `createdAt`

---

## 2) NestJS modul arxitekturasi (folder structure)

src/
- modules/
  - auth/
  - users/
  - clients/
  - requests/
  - request-statuses/
  - rate-quotes/
  - issued-codes/
  - shipments/
  - invoices/ (optional)
  - documents/
  - activity-logs/
- common/
  - guards/ (JwtAuthGuard, RolesGuard)
  - decorators/ (@Roles)
  - filters/
  - pipes/
  - dto/
  - utils/

Har bir modul:
- controller.ts
- service.ts
- schema.ts (Mongoose schema)
- dto/ (create/update DTO)
- repository (optional)

---

## 3) API dizayn (REST)

### 3.1 Dashboard (counts)
GET /dashboard/summary
Response:
{
  "newClients": 12,
  "ourClients": 8,
  "inWork": 10,
  "activeCodes": 6,
  "shipmentsInTransit": 2,
  "unpaidInvoices": 4
}

### 3.2 Clients
POST /clients
GET /clients?search=&page=&limit=
GET /clients/:id
PATCH /clients/:id
GET /clients/:id/requests  // clientga tegishli requestlar

### 3.3 Request Status Config (Kanban columns)
GET /request-statuses?type=NEW_CLIENT
POST /request-statuses (admin)
PATCH /request-statuses/:id (admin)

### 3.4 Requests (Kanban)
POST /requests
Body: { clientId, type, source?, comment?, assignedTo? }

GET /requests?type=NEW_CLIENT&statusKey=in_work&search=&page=&limit=
GET /requests/:id (detail)
PATCH /requests/:id (update fields)

PATCH /requests/:id/status
Body: { "toKey": "in_work" }
- validate transition via request_transitions (agar ishlatsa)
- write activity log

**Kanban uchun qulay endpoint (recommended):**
GET /requests/kanban?type=NEW_CLIENT
Response:
{
  "columns": [
    { "key": "new", "title": "Yangi", "order": 1 },
    { "key": "in_work", "title": "V rabote", "order": 2 },
    ...
  ],
  "itemsByStatus": {
    "new": [ {requestSummary...}, ... ],
    "in_work": [ ... ]
  }
}

### 3.5 Rate Quotes
POST /requests/:id/quotes
GET /requests/:id/quotes
PATCH /quotes/:id

### 3.6 Issued Codes
POST /requests/:id/codes
GET /requests/:id/codes
PATCH /codes/:id (close/cancel)

### 3.7 Shipments (Фактические перевозки)
POST /requests/:id/shipments
GET /requests/:id/shipments
PATCH /shipments/:id

### 3.8 Invoices (optional)
POST /requests/:id/invoices
GET /requests/:id/invoices
PATCH /invoices/:id/pay

### 3.9 Documents
POST /documents (multipart) or presigned url approach
GET /documents?entityType=REQUEST&entityId=...
DELETE /documents/:id (optional)

### 3.10 Activity Logs
GET /activity-logs?entityType=REQUEST&entityId=...

---

## 4) Business rules (eng muhim logika)

### 4.1 Request type = 2 ta “board”
- `type=NEW_CLIENT` => alohida kanban columns
- `type=OUR_CLIENT` => alohida kanban columns

### 4.2 Status transition (optional strict)
`PATCH /requests/:id/status`:
1) requestni top
2) request.type bo‘yicha transition qoidalarini ol
3) fromKey -> toKey ruxsat bo‘lsa o‘zgartir
4) activity log yoz

### 4.3 “Everything linked to request”
- quote/code/shipment/invoice yaratishda request mavjudligi tekshirilsin
- request type/statusga qarab cheklovlar bo‘lishi mumkin (ixtiyoriy)

---

## 5) Mongo indexes (tavsiya)
Requests:
- index: { type: 1, statusKey: 1, createdAt: -1 }
- index: { clientId: 1, createdAt: -1 }
- index: { assignedTo: 1, statusKey: 1 }

Issued codes:
- unique index: { code: 1 }
- index: { requestId: 1, status: 1 }

Rate quotes:
- index: { requestId: 1, createdAt: -1 }

Shipments:
- index: { requestId: 1, status: 1 }

---

## 6) DTO va Response shape (frontendga qulay)

### RequestSummary (kanban card)
{
  "_id": "...",
  "type": "NEW_CLIENT",
  "statusKey": "in_work",
  "client": { "_id": "...", "name": "...", "company": "...", "phone": "..." },
  "assignedTo": { "_id": "...", "fullName": "..." },
  "createdAt": "...",
  "updatedAt": "..."
}

### RequestDetail (single page)
{
  "request": {...},
  "client": {...},
  "quotes": [...],
  "codes": [...],
  "shipments": [...],
  "invoices": [...],
  "documents": [...],
  "activity": [...]
}

---

## 7) Claude Code task (what to generate)
Generate NestJS modules with Mongoose:
- Schemas: clients, requests, request_statuses, request_transitions, rate_quotes, issued_codes, shipments, (invoices optional), documents, activity_logs
- Controllers/services with endpoints above
- Guards: JWT + Roles
- Request kanban endpoint: `/requests/kanban?type=...` that returns columns + grouped items
- Status update endpoint with transition validation

Also create seed script:
- Insert request_statuses for both request types
- Insert request_transitions (basic flow)
