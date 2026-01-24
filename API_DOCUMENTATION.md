# Logista CRM API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "...",
    "email": "admin@example.com",
    "fullName": "Admin User",
    "role": "admin"
  }
}
```

### Using Token
Barcha protected endpointlarga token qo'shish:
```http
Authorization: Bearer <access_token>
```

---

## 1. Dashboard

### Get Summary
```http
GET /dashboard/summary
```

**Response:**
```json
{
  "newClients": 12,
  "ourClients": 8,
  "inWork": 10,
  "activeCodes": 6,
  "shipmentsInTransit": 2,
  "unpaidInvoices": 4
}
```

### Get Stats
```http
GET /dashboard/stats
```

**Response:**
```json
{
  "newClient": {
    "new": 5,
    "in_work": 3,
    "quote_sent": 2,
    "won": 2
  },
  "ourClient": {
    "new": 2,
    "in_work": 4,
    "loading": 1,
    "in_transit": 1
  }
}
```

---

## 2. Clients

### Create Client
```http
POST /clients
Content-Type: application/json

{
  "name": "Alisher Karimov",
  "company": "Tech Solutions LLC",
  "phone": "+998901234567",
  "email": "alisher@techsolutions.uz",
  "inn": "123456789",
  "address": "Toshkent, Chilonzor"
}
```

### Get All Clients
```http
GET /clients?search=alisher&page=1&limit=20
```

**Response:**
```json
{
  "data": [
    {
      "_id": "...",
      "name": "Alisher Karimov",
      "company": "Tech Solutions LLC",
      "phone": "+998901234567",
      "email": "alisher@techsolutions.uz",
      "createdBy": {
        "_id": "...",
        "fullName": "Manager"
      },
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

### Get Client by ID
```http
GET /clients/:id
```

### Get Client Requests
```http
GET /clients/:id/requests
```

### Update Client
```http
PATCH /clients/:id
Content-Type: application/json

{
  "phone": "+998901234568",
  "address": "Toshkent, Yunusobod"
}
```

### Delete Client
```http
DELETE /clients/:id
```

---

## 3. Request Statuses (Kanban Columns)

### Get Statuses by Type
```http
GET /request-statuses?type=NEW_CLIENT
```

**Response:**
```json
[
  { "_id": "...", "requestType": "NEW_CLIENT", "key": "new", "title": "Yangi", "order": 1, "isFinal": false },
  { "_id": "...", "requestType": "NEW_CLIENT", "key": "in_work", "title": "Ishda", "order": 2, "isFinal": false },
  { "_id": "...", "requestType": "NEW_CLIENT", "key": "quote_sent", "title": "Taklif yuborildi", "order": 3, "isFinal": false },
  { "_id": "...", "requestType": "NEW_CLIENT", "key": "negotiation", "title": "Muzokaralar", "order": 4, "isFinal": false },
  { "_id": "...", "requestType": "NEW_CLIENT", "key": "won", "title": "Yutildi", "order": 5, "isFinal": true },
  { "_id": "...", "requestType": "NEW_CLIENT", "key": "lost", "title": "Yo'qotildi", "order": 6, "isFinal": true }
]
```

### Seed Default Statuses (Admin only)
```http
POST /request-statuses/seed
```

---

## 4. Requests (Kanban)

### Request Types
- `NEW_CLIENT` - Yangi klientlar
- `OUR_CLIENT` - O'zimizning klientlar

### Request Sources
- `telegram`
- `instagram`
- `olx`
- `site`
- `phone`
- `other`

### Create Request
```http
POST /requests
Content-Type: application/json

{
  "clientId": "507f1f77bcf86cd799439011",
  "type": "NEW_CLIENT",
  "source": "telegram",
  "comment": "Xitoydan yuk keltirish haqida so'rov",
  "assignedTo": "507f1f77bcf86cd799439012"
}
```

### Get Kanban Board ⭐
```http
GET /requests/kanban?type=NEW_CLIENT
```

**Response:**
```json
{
  "columns": [
    { "key": "new", "title": "Yangi", "order": 1, "isFinal": false },
    { "key": "in_work", "title": "Ishda", "order": 2, "isFinal": false },
    { "key": "quote_sent", "title": "Taklif yuborildi", "order": 3, "isFinal": false },
    { "key": "negotiation", "title": "Muzokaralar", "order": 4, "isFinal": false },
    { "key": "won", "title": "Yutildi", "order": 5, "isFinal": true },
    { "key": "lost", "title": "Yo'qotildi", "order": 6, "isFinal": true }
  ],
  "itemsByStatus": {
    "new": [
      {
        "_id": "...",
        "type": "NEW_CLIENT",
        "statusKey": "new",
        "source": "telegram",
        "comment": "...",
        "client": {
          "_id": "...",
          "name": "Alisher",
          "company": "Tech Solutions",
          "phone": "+998901234567"
        },
        "assignedTo": {
          "_id": "...",
          "fullName": "Manager"
        },
        "position": 1,
        "createdAt": "2024-01-15T10:00:00Z"
      }
    ],
    "in_work": [...],
    "quote_sent": [...],
    "negotiation": [],
    "won": [],
    "lost": []
  }
}
```

### Get All Requests (List)
```http
GET /requests?type=NEW_CLIENT&statusKey=in_work&search=alisher&page=1&limit=20
```

### Get Request Detail
```http
GET /requests/:id/detail
```

**Response:**
```json
{
  "request": {
    "_id": "...",
    "type": "NEW_CLIENT",
    "statusKey": "in_work",
    "source": "telegram",
    "comment": "...",
    "clientId": {...},
    "assignedTo": {...},
    "createdBy": {...},
    "createdAt": "..."
  },
  "client": {
    "_id": "...",
    "name": "...",
    "company": "...",
    "phone": "...",
    "email": "..."
  },
  "activity": [
    {
      "_id": "...",
      "action": "status_changed",
      "message": "Status changed from new to in_work",
      "userId": {...},
      "createdAt": "..."
    }
  ]
}
```

### Update Request
```http
PATCH /requests/:id
Content-Type: application/json

{
  "comment": "Yangilangan izoh",
  "assignedTo": "507f1f77bcf86cd799439012"
}
```

### Change Status ⭐
```http
PATCH /requests/:id/status
Content-Type: application/json

{
  "toKey": "in_work"
}
```

### Move Request (Drag & Drop) ⭐
```http
PATCH /requests/:id/move
Content-Type: application/json

{
  "toStatusKey": "quote_sent",
  "position": 2
}
```

---

## 5. Rate Quotes (Stavkalar)

### Create Quote
```http
POST /requests/:requestId/quotes
Content-Type: application/json

{
  "fromCity": "Guangzhou",
  "toCity": "Toshkent",
  "cargoName": "Elektronika",
  "weightKg": 500,
  "volumeM3": 2.5,
  "cost": 1500,
  "currency": "USD",
  "margin": 200,
  "status": "DRAFT",
  "notes": "Havo yo'li orqali"
}
```

### Get Request Quotes
```http
GET /requests/:requestId/quotes
```

**Response:**
```json
[
  {
    "_id": "...",
    "requestId": "...",
    "fromCity": "Guangzhou",
    "toCity": "Toshkent",
    "cargoName": "Elektronika",
    "weightKg": 500,
    "volumeM3": 2.5,
    "cost": 1500,
    "currency": "USD",
    "margin": 200,
    "status": "DRAFT",
    "createdBy": {...},
    "createdAt": "..."
  }
]
```

### Update Quote
```http
PATCH /quotes/:id
Content-Type: application/json

{
  "status": "APPROVED",
  "cost": 1400
}
```

### Quote Statuses
- `DRAFT` - Qoralama
- `APPROVED` - Tasdiqlangan
- `SENT` - Yuborilgan
- `REJECTED` - Rad etilgan

---

## 6. Issued Codes (Kodlar)

### Create Code
```http
POST /requests/:requestId/codes
Content-Type: application/json

{
  "code": "WH-2024-001",
  "codeType": "warehouse",
  "notes": "Guangzhou skladiga"
}
```

### Get Request Codes
```http
GET /requests/:requestId/codes
```

### Get All Active Codes
```http
GET /codes
```

### Search by Code
```http
GET /codes/search/WH-2024-001
```

### Update Code (Close/Cancel)
```http
PATCH /codes/:id
Content-Type: application/json

{
  "status": "CLOSED",
  "notes": "Yuk qabul qilindi"
}
```

### Code Types
- `internal` - Ichki kod
- `warehouse` - Sklad kodi
- `container` - Konteyner kodi
- `other` - Boshqa

### Code Statuses
- `ACTIVE` - Faol
- `CLOSED` - Yopilgan
- `CANCELLED` - Bekor qilingan

---

## 7. Shipments (Tashishlar)

### Create Shipment
```http
POST /requests/:requestId/shipments
Content-Type: application/json

{
  "shipmentNo": "SHP-2024-001",
  "carrier": "China Rail",
  "vehicleNo": "ABC123",
  "driverName": "Wang Li",
  "driverPhone": "+8613800138000",
  "fromCity": "Guangzhou",
  "toCity": "Toshkent",
  "departureDate": "2024-01-20",
  "arrivalDate": "2024-02-05",
  "status": "PLANNED",
  "notes": "Temir yo'l orqali"
}
```

### Get Request Shipments
```http
GET /requests/:requestId/shipments
```

### Get In-Transit Shipments
```http
GET /shipments/in-transit
```

### Update Shipment
```http
PATCH /shipments/:id
Content-Type: application/json

{
  "status": "IN_TRANSIT",
  "actualDepartureDate": "2024-01-21"
}
```

### Shipment Statuses
- `PLANNED` - Rejalashtirilgan
- `IN_TRANSIT` - Yo'lda
- `DELIVERED` - Yetkazildi
- `CANCELLED` - Bekor qilingan

---

## 8. Invoices (Hisob-fakturalar)

### Create Invoice
```http
POST /requests/:requestId/invoices
Content-Type: application/json

{
  "number": "INV-2024-001",
  "amount": 1500,
  "currency": "USD",
  "issuedAt": "2024-01-15",
  "dueDate": "2024-02-15",
  "notes": "Tashish xizmati uchun"
}
```

### Get Request Invoices
```http
GET /requests/:requestId/invoices
```

### Get Unpaid Invoices
```http
GET /invoices/unpaid
```

### Update Invoice
```http
PATCH /invoices/:id
Content-Type: application/json

{
  "dueDate": "2024-02-20"
}
```

### Pay Invoice ⭐
```http
PATCH /invoices/:id/pay
Content-Type: application/json

{
  "amount": 500
}
```

**Partial payment mumkin. Agar to'liq to'lansa, status `PAID` ga o'zgaradi.**

### Invoice Statuses
- `UNPAID` - To'lanmagan
- `PARTIAL` - Qisman to'langan
- `PAID` - To'langan
- `CANCELLED` - Bekor qilingan

---

## 9. Activity Logs

### Get Entity Activities
```http
GET /activity-logs?entityType=REQUEST&entityId=507f1f77bcf86cd799439011
```

### Get Recent Activities
```http
GET /activity-logs/recent?limit=50
```

**Response:**
```json
[
  {
    "_id": "...",
    "entityType": "REQUEST",
    "entityId": "...",
    "action": "status_changed",
    "message": "Status changed from new to in_work",
    "userId": {
      "_id": "...",
      "fullName": "Manager"
    },
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

---

## 10. WebSocket (Real-time)

### Connection
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/documents', {
  auth: {
    token: 'Bearer <access_token>'
  }
});
```

### Events

#### Listen to Events
```javascript
// Yangi request yaratilganda
socket.on('requestCreated', (request) => {
  console.log('New request:', request);
});

// Request yangilanganda
socket.on('requestUpdated', (request) => {
  console.log('Updated request:', request);
});

// Status o'zgarganda
socket.on('requestStatusChanged', ({ request, fromStatus, toStatus }) => {
  console.log(`Status changed: ${fromStatus} -> ${toStatus}`);
});

// Request ko'chirilganda (drag & drop)
socket.on('requestMoved', ({ request, fromStatus, toStatus }) => {
  console.log('Request moved');
});

// Rate quote yaratilganda
socket.on('rateQuoteCreated', (quote) => {
  console.log('New quote:', quote);
});

// Kod yaratilganda
socket.on('issuedCodeCreated', (code) => {
  console.log('New code:', code);
});

// Shipment yaratilganda
socket.on('shipmentCreated', (shipment) => {
  console.log('New shipment:', shipment);
});

// Invoice to'langanda
socket.on('invoicePaid', (invoice) => {
  console.log('Invoice paid:', invoice);
});
```

---

## 11. Users

### Get All Users
```http
GET /users
```

### Get User by ID
```http
GET /users/:id
```

### Create User (Admin only)
```http
POST /users
Content-Type: application/json

{
  "email": "operator@example.com",
  "password": "password123",
  "fullName": "Operator User",
  "role": "operator",
  "phone": "+998901234567"
}
```

### User Roles
- `admin` - Administrator (to'liq huquq)
- `manager` - Menejer
- `operator` - Operator
- `accountant` - Buxgalter

---

## Frontend Integration Example (React)

### API Client Setup
```typescript
// src/api/client.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### Kanban Hook Example
```typescript
// src/hooks/useKanban.ts
import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import api from '../api/client';

interface KanbanData {
  columns: Array<{
    key: string;
    title: string;
    order: number;
    isFinal: boolean;
  }>;
  itemsByStatus: Record<string, any[]>;
}

export function useKanban(type: 'NEW_CLIENT' | 'OUR_CLIENT') {
  const [data, setData] = useState<KanbanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Fetch initial data
    const fetchData = async () => {
      const response = await api.get(`/requests/kanban?type=${type}`);
      setData(response.data);
      setLoading(false);
    };

    fetchData();

    // Setup WebSocket
    const token = localStorage.getItem('token');
    const newSocket = io('http://localhost:3000/documents', {
      auth: { token: `Bearer ${token}` }
    });

    newSocket.on('requestCreated', (request) => {
      if (request.type === type) {
        setData(prev => {
          if (!prev) return prev;
          const newItems = { ...prev.itemsByStatus };
          newItems[request.statusKey] = [
            ...newItems[request.statusKey],
            request
          ];
          return { ...prev, itemsByStatus: newItems };
        });
      }
    });

    newSocket.on('requestMoved', ({ request, fromStatus, toStatus }) => {
      if (request.type === type) {
        setData(prev => {
          if (!prev) return prev;
          const newItems = { ...prev.itemsByStatus };

          // Remove from old status
          newItems[fromStatus] = newItems[fromStatus].filter(
            r => r._id !== request._id
          );

          // Add to new status
          newItems[toStatus] = [...newItems[toStatus], request];

          return { ...prev, itemsByStatus: newItems };
        });
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [type]);

  const moveRequest = async (requestId: string, toStatusKey: string, position?: number) => {
    await api.patch(`/requests/${requestId}/move`, {
      toStatusKey,
      position
    });
  };

  return { data, loading, moveRequest };
}
```

### Kanban Component Example
```tsx
// src/components/KanbanBoard.tsx
import { useKanban } from '../hooks/useKanban';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

export function KanbanBoard({ type }: { type: 'NEW_CLIENT' | 'OUR_CLIENT' }) {
  const { data, loading, moveRequest } = useKanban(type);

  if (loading || !data) return <div>Loading...</div>;

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    moveRequest(draggableId, destination.droppableId, destination.index);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto p-4">
        {data.columns.map((column) => (
          <div key={column.key} className="w-80 bg-gray-100 rounded-lg p-4">
            <h3 className="font-bold mb-4">{column.title}</h3>

            <Droppable droppableId={column.key}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-2 min-h-[200px]"
                >
                  {data.itemsByStatus[column.key].map((request, index) => (
                    <Draggable
                      key={request._id}
                      draggableId={request._id}
                      index={index}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="bg-white p-3 rounded shadow"
                        >
                          <p className="font-medium">{request.client.name}</p>
                          <p className="text-sm text-gray-500">
                            {request.client.company}
                          </p>
                          <p className="text-xs text-gray-400">
                            {request.source}
                          </p>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Invalid status transition from new to won",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Request with ID xxx not found",
  "error": "Not Found"
}
```

---

## Status Transitions

### NEW_CLIENT Flow
```
new → in_work → quote_sent → negotiation → won
                    ↓            ↓
                  lost         lost
```

### OUR_CLIENT Flow
```
new → in_work → loading → in_transit → delivered → completed
         ↓         ↓
     cancelled  cancelled
```
