# Clients va Deals Modullari - Qo'llanma

## Umumiy Arxitektura

Tizim ikki asosiy moduldan iborat:
- **Clients** - Mijozlar bazasi
- **Deals** - Buyurtmalar/Shartnomalar (Sales Funnel)

Ular o'zaro bog'langan: har bir Deal bitta Clientga tegishli.

---

## 1. CLIENTS MODULI

### Maqsad
Mijozlar (kompaniyalar yoki jismoniy shaxslar) ma'lumotlarini saqlash va boshqarish.

### Asosiy Tushunchalar

**Client Turlari:**
- `company` - Yuridik shaxs (kompaniya)
- `individual` - Jismoniy shaxs

**Support Darajasi:**
- `standard` - Oddiy mijoz
- `priority` - Muhim mijoz
- `vip` - VIP mijoz (UI da "Key Account • VIP Support" ko'rinadi)

**Client Holati:**
- `active` - Faol mijoz
- `inactive` - Nofaol
- `potential` - Potensial (hali shartnoma tuzilmagan)
- `archived` - Arxivlangan

### Frontend Integratsiya

**Mijozlar ro'yxati sahifasi:**
1. Sahifa yuklanganda `GET /api/clients` so'rov yuboriladi
2. Filter parametrlari query string orqali yuboriladi (type, status, search, va h.k.)
3. Natijada mijozlar massivi qaytadi

**Yangi mijoz qo'shish:**
1. Forma to'ldiriladi (companyName, type - majburiy)
2. `POST /api/clients` ga JSON yuboriladi
3. Muvaffaqiyatli bo'lsa, yangi mijoz obyekti qaytadi
4. Socket orqali `clientCreated` eventi keladi - ro'yxatni yangilash

**Mijoz tahrirlash:**
1. `GET /api/clients/:id` orqali mavjud ma'lumotlar olinadi
2. Forma tahrir qilinadi
3. `PATCH /api/clients/:id` ga o'zgartirilgan maydonlar yuboriladi
4. Socket orqali `clientUpdated` eventi keladi

**Mijoz o'chirish:**
1. `DELETE /api/clients/:id` yuboriladi
2. 204 No Content qaytadi
3. Socket orqali `clientDeleted` eventi keladi

---

## 2. DEALS MODULI

### Maqsad
Logistika buyurtmalarini (deallarni) boshqarish - Kanban board ko'rinishida sales funnel.

### Pipeline Bosqichlari (Kanban Ustunlari)

| Bosqich | Tavsif |
|---------|--------|
| `new_request` | Yangi buyurtma (kirish nuqtasi) |
| `part_assembly` | Yuk yig'ilmoqda |
| `cost_calculation` | Narx hisoblanmoqda |
| `document_processing` | Hujjatlar rasmiylashtirilmoqda |
| `loading` | Yuklanmoqda |
| `in_transit` | Yo'lda |
| `on_delivery` | Yetkazilmoqda |
| `completed` | Yakunlangan |
| `declined` | Bekor qilingan |

### Asosiy Tushunchalar

**Deal Tarkibi:**
- Nomi va raqami (auto-generated: DEAL-2024-0001)
- Client (bog'langan mijoz)
- Marshrut: Origin (qayerdan) → Destination (qayerga)
- Yuk parametrlari: vazn (kg), hajm (m³)
- Summa (amount) va valyuta
- Mas'ul xodim (assignedTo)
- Biriktirilgan hujjatlar

**Prioritet:**
- `low`, `medium`, `high`, `urgent`

### Frontend Integratsiya

#### Kanban Board (Asosiy Ko'rinish)

**Yuklash:**
1. `GET /api/deals/kanban` so'rov yuboriladi
2. Natijada bosqichlar bo'yicha guruhlangan deallar qaytadi:
   ```
   {
     "new_request": [deal1, deal2],
     "in_transit": [deal3],
     ...
   }
   ```
3. Har bir ustun uchun kartochkalar chiziladi

**Drag & Drop (Kartochkani ko'chirish):**
1. Foydalanuvchi kartochkani boshqa ustun yoki pozitsiyaga tortadi
2. `PATCH /api/deals/:id/kanban-move` yuboriladi:
   - `targetStage` - yangi bosqich
   - `position` - ustun ichidagi yangi pozitsiya (0 dan boshlanadi)
3. Server stage history ga yozuv qo'shadi
4. Socket orqali `dealKanbanMoved` eventi keladi - boshqa foydalanuvchilar ham ko'radi

**Ustun ichida tartib o'zgartirish:**
1. `PATCH /api/deals/reorder` yuboriladi:
   - `stage` - qaysi ustun
   - `dealIds` - yangi tartibdagi ID lar massivi
2. Socket orqali `dealsReordered` eventi keladi

#### Deal Yaratish

1. Forma to'ldiriladi:
   - Nomi (name)
   - Client tanlash (dropdown - `GET /api/clients` dan)
   - Origin: shahar, mamlakat, sana
   - Destination: shahar, mamlakat, ETA sana
   - Yuk: vazn, hajm
   - Summa
   - Mas'ul xodim tanlash
2. `POST /api/deals` ga yuboriladi
3. Yangi deal `new_request` bosqichiga qo'shiladi
4. Socket orqali `dealCreated` eventi keladi

#### Deal Detail Sahifasi

**Yuklash:**
1. `GET /api/deals/:id` so'rov yuboriladi
2. To'liq deal ma'lumotlari qaytadi (client, assignedTo populate qilingan)

**Status O'zgartirish (dropdown orqali):**
1. `PATCH /api/deals/:id/stage` yuboriladi:
   - `stage` - yangi bosqich
   - `comment` - izoh (ixtiyoriy)
2. Stage history ga yozuv qo'shiladi
3. Socket orqali `dealStageChanged` eventi keladi

**Tahrirlash:**
1. `PATCH /api/deals/:id` ga o'zgartirilgan maydonlar yuboriladi

---

## 3. REAL-TIME (SOCKET.IO)

### Ulanish
Frontend Socket.IO client bilan `/documents` namespace ga ulanadi.

### Tinglanadigan Eventlar

**Clients:**
- `clientCreated` - yangi mijoz qo'shildi
- `clientUpdated` - mijoz yangilandi
- `clientDeleted` - mijoz o'chirildi

**Deals:**
- `dealCreated` - yangi deal qo'shildi
- `dealUpdated` - deal yangilandi
- `dealDeleted` - deal o'chirildi
- `dealStageChanged` - deal bosqichi o'zgardi
- `dealKanbanMoved` - deal Kanbanda ko'chirildi
- `dealsReordered` - deallar tartibi o'zgardi

### Foydalanish Logikasi

1. Sahifa yuklanganda Socket ulanadi
2. Tegishli eventlarni tinglash boshlanadi
3. Event kelganda local state yangilanadi (qayta so'rov yubormasdan)
4. Sahifadan chiqishda Socket uziladi

---

## 4. FILTRLASH VA QIDIRUV

### Clients Filtrlari
| Parametr | Tavsif |
|----------|--------|
| `type` | company yoki individual |
| `category` | Soha (logistics, retail, va h.k.) |
| `supportLevel` | standard, priority, vip |
| `status` | active, inactive, potential, archived |
| `assignedManager` | Manager ID |
| `search` | Nom, email, telefon bo'yicha qidiruv |
| `isArchived` | Arxivlanganlarni ko'rsatish |

### Deals Filtrlari
| Parametr | Tavsif |
|----------|--------|
| `stage` | Pipeline bosqichi |
| `priority` | low, medium, high, urgent |
| `client` | Client ID |
| `assignedTo` | Mas'ul xodim ID |
| `originCity` | Jo'nash shahri |
| `destinationCity` | Yetkazish shahri |
| `minAmount` / `maxAmount` | Summa oralig'i |
| `dateFrom` / `dateTo` | Sana oralig'i |
| `search` | Nom, raqam bo'yicha qidiruv |

---

## 5. STATISTIKA

### Client Statistikasi
`GET /api/clients/stats` qaytaradi:
- Holat bo'yicha soni (active, inactive, ...)
- Tur bo'yicha soni (company, individual)
- Support darajasi bo'yicha soni
- Jami mijozlar soni

### Deal Statistikasi
`GET /api/deals/stats` qaytaradi:
- Bosqich bo'yicha soni va jami summa
- Jami deallar soni
- Jami summa

`GET /api/deals/pipeline-stats` qaytaradi:
- Har bir bosqich uchun: soni, jami summa, o'rtacha summa, jami vazn, jami hajm
- Conversion rate (completed / total * 100)

---

## 6. XAVFSIZLIK VA ROLLAR

### Rollar
- `admin` - To'liq huquq
- `manager` - Yaratish, tahrirlash, o'chirish
- `agent` - Yaratish, tahrirlash (o'chira olmaydi)
- `accountant` - Faqat ko'rish

### Autentifikatsiya
Har bir so'rovda `Authorization: Bearer <token>` header yuborilishi shart.

Token olish: `POST /api/auth/login` - email va password bilan.

---

## 7. MA'LUMOTLAR OQIMI DIAGRAMMASI

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   FRONTEND  │────▶│   BACKEND   │────▶│   MONGODB   │
│  (React/Vue)│◀────│   (NestJS)  │◀────│             │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       │                   │
       ▼                   ▼
┌─────────────┐     ┌─────────────┐
│  Socket.IO  │◀───▶│  Socket.IO  │
│   Client    │     │   Server    │
└─────────────┘     └─────────────┘
```

### Oddiy So'rov Oqimi
1. Frontend → HTTP Request → Backend
2. Backend → Database operatsiya → MongoDB
3. MongoDB → Natija → Backend
4. Backend → HTTP Response → Frontend
5. Backend → Socket Event → Barcha ulangan frontendlar

---

## 8. XATOLAR BILAN ISHLASH

### HTTP Status Kodlari
| Kod | Ma'no |
|-----|-------|
| 200 | Muvaffaqiyatli |
| 201 | Yaratildi |
| 204 | O'chirildi (content yo'q) |
| 400 | Noto'g'ri so'rov (validatsiya xatosi) |
| 401 | Autentifikatsiya talab qilinadi |
| 403 | Ruxsat yo'q (rol yetarli emas) |
| 404 | Topilmadi |

### Frontend Xato Logikasi
1. 401 kelsa → Login sahifasiga yo'naltirish
2. 403 kelsa → "Ruxsat yo'q" xabari
3. 404 kelsa → "Topilmadi" xabari
4. 400 kelsa → Validatsiya xatolarini formada ko'rsatish

---

## 9. AUTO-GENERATED RAQAMLAR

- **Client:** `CLT-2024-001`, `CLT-2024-002`, ...
- **Deal:** `DEAL-2024-0001`, `DEAL-2024-0002`, ...

Raqamlar har yil yangilanadi va ketma-ket davom etadi.
