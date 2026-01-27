# Contragent (Client + Agent) — O'zgarishlar

## Umumiy

Client moduliga `type` field qo'shildi: `CLIENT` yoki `AGENT`. Request moduliga yangi turlar qo'shildi: `NEW_AGENT`, `OUR_AGENT`. Dashboard agent statistikalarni ko'rsatadi.

---

## Client moduli

### Schema (`client.schema.ts`)
- Yangi `ClientType` enum: `CLIENT`, `AGENT`
- Har bir clientda `type` field bor (default: `CLIENT`)
- `{ type: 1, createdAt: -1 }` index qo'shildi

### DTO
- `CreateClientDto` — ixtiyoriy `type` field (`CLIENT` | `AGENT`)
- `FilterClientDto` — ixtiyoriy `type` filter (`GET /clients?type=AGENT`)
- `UpdateClientDto` — `PartialType` orqali avtomatik oladi

### Service (`clients.service.ts`)
- `generateClientNumber(type)` — Agent uchun `AG-` prefix, Client uchun `CL-`
- `create()` — DTO dagi `type` ga qarab to'g'ri prefix generatsiya qiladi
- `findAll()` — `type` bo'yicha filterlash qo'shildi

---

## Request moduli

### Schema (`request.schema.ts`)
- `RequestType` ga yangi qiymatlar: `NEW_AGENT`, `OUR_AGENT`
- `REQUEST_STATUS_DEFINITIONS` — `NEW_AGENT` va `OUR_AGENT` uchun statuslar (client bilan bir xil)
- `REQUEST_STATUS_TRANSITIONS` — `NEW_AGENT` va `OUR_AGENT` uchun transitions

### Service (`requests.service.ts`)
- `getClientTypeForRequestType()` — request type dan client type aniqlaydi:
  - `NEW_AGENT` / `OUR_AGENT` → `AGENT`
  - `NEW_CLIENT` / `OUR_CLIENT` → `CLIENT`
- `generateClientNumber(clientType)` — type ga qarab prefix
- `create()` — client avtomatik yaratilganda to'g'ri `type` va prefix beradi

---

## Dashboard moduli

### Service (`dashboard.service.ts`)
- `getSummary()` — yangi fieldlar: `newAgents`, `ourAgents`
- `getRequestStats()` — yangi fieldlar: `newAgent`, `ourAgent`

---

## API misollari

```bash
# Agent yaratish
POST /clients
{ "name": "Agent Firm", "type": "AGENT" }
# Natija: clientNumber "AG-..." bilan yaratiladi

# Faqat agentlarni olish
GET /clients?type=AGENT

# Faqat clientlarni olish
GET /clients?type=CLIENT

# Agent request yaratish
POST /requests
{ "type": "NEW_AGENT", "client": "Yangi Agent" }
# Natija: avtomatik AGENT tipidagi client yaratiladi AG- prefix bilan

# Agent kanban
GET /requests/kanban?type=NEW_AGENT

# Dashboard
GET /dashboard/summary
# Natija: { newClients, ourClients, newAgents, ourAgents, ... }

GET /dashboard/request-stats
# Natija: { newClient: {...}, ourClient: {...}, newAgent: {...}, ourAgent: {...} }
```

---

## O'zgartirilgan fayllar (7 ta)

| # | Fayl | O'zgarish |
|---|------|-----------|
| 1 | `clients/schemas/client.schema.ts` | `ClientType` enum, `type` field, index |
| 2 | `clients/dto/create-client.dto.ts` | `type` field |
| 3 | `clients/dto/filter-client.dto.ts` | `type` filter |
| 4 | `clients/clients.service.ts` | `AG-`/`CL-` prefix, type filter |
| 5 | `requests/schemas/request.schema.ts` | `NEW_AGENT`, `OUR_AGENT` enum + status maps |
| 6 | `requests/requests.service.ts` | Auto-create agent, type-aware prefix |
| 7 | `dashboard/dashboard.service.ts` | Agent counts va stats |

## O'zgarmaydigan modullar

Documents, Invoices, Shipments, IssuedCodes, ActivityLogs — Client ref orqali ishlaydi, o'zgartirish talab qilmaydi. Controllers va `create-request.dto.ts` DTO/enum orqali avtomatik yangi qiymatlarni qabul qiladi.
