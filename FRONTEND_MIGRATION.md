# Frontend uchun Multi-Tenancy O'zgarishlari

Bu hujjat backend'da amalga oshirilgan barcha o'zgarishlarni va frontend'da nima qilish kerakligini tushuntiradi.

---

## 1. JWT Token — Yangi Field

Login va register qilganda qaytadigan token ichida endi `companyId` mavjud.

### Login response o'zgardi:

```json
// OLDIN
{
  "accessToken": "eyJ...",
  "user": {
    "id": "...",
    "email": "admin@logista.uz",
    "fullName": "John Doe",
    "role": "admin"
  }
}

// HOZIR
{
  "accessToken": "eyJ...",
  "user": {
    "id": "...",
    "email": "admin@logista.uz",
    "fullName": "John Doe",
    "role": "admin",
    "companyId": "685abc123def456"   // ← YANGI
  }
}
```

### Nima qilish kerak:
- Login/register da kelgan `companyId` ni `localStorage` yoki state'ga saqlang
- SUPER_ADMIN uchun `companyId` bo'sh (`null`) bo'lishi mumkin — bu normal

---

## 2. Yangi Rol: `super_admin`

Endi rollar quyidagicha:

| Rol | Ko'rishi mumkin |
|-----|----------------|
| `super_admin` | Barcha kompaniyalar, `/companies` endpoint'lar |
| `admin` | Faqat o'z kompaniyasi |
| `director` | Faqat o'z kompaniyasi |
| `manager` | Faqat o'z kompaniyasi |
| `accountant` | Faqat o'z kompaniyasi |
| `administrator` | Faqat o'z kompaniyasi |

### Nima qilish kerak:
- `super_admin` roli bo'lsa — alohida Super Admin panelini ko'rsating
- Oddiy userlar uchun hech narsa o'zgarmaydi

---

## 3. Yangi Endpoint'lar: `/api/companies`

Faqat `super_admin` uchun ishlaydi.

### Kompaniyalar ro'yxati
```
GET /api/companies
Authorization: Bearer <super_admin_token>

Response:
[
  {
    "_id": "685abc...",
    "name": "Logista",
    "slug": "logista",
    "isActive": true,
    "phone": "+998901234567",
    "email": "info@logista.uz",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  ...
]
```

### Yangi kompaniya yaratish
```
POST /api/companies
Authorization: Bearer <super_admin_token>

Body:
{
  "name": "ABC Logistics",
  "slug": "abc-logistics",       // kichik harf, faqat a-z, 0-9, -
  "phone": "+998901234567",      // optional
  "email": "info@abc.uz"         // optional
}
```

### Kompaniya ma'lumotlarini yangilash
```
PATCH /api/companies/:id
Authorization: Bearer <super_admin_token>

Body: (istalgan field)
{
  "name": "Yangi Nom",
  "phone": "+998901234567"
}
```

### Kompaniyani faollashtirish / bloklash
```
PATCH /api/companies/:id/toggle
Authorization: Bearer <super_admin_token>

Response:
{
  "_id": "...",
  "name": "ABC Logistics",
  "isActive": false    // toggle qilindi
}
```

---

## 4. Mavjud Endpoint'lar — O'ZGARMADI

Quyidagi barcha endpoint'lar **oldingiday** ishlaydi. Frontend hech narsa o'zgartirmaydi:

```
GET  /api/clients
POST /api/clients
GET  /api/requests
POST /api/requests
GET  /api/shipments
GET  /api/invoices
GET  /api/documents
GET  /api/dashboard/summary
GET  /api/notifications
...va boshqa hammasi
```

Backend avtomatik ravishda JWT tokendagi `companyId` ni olib, faqat o'sha kompaniyaning ma'lumotlarini qaytaradi.

---

## 5. WebSocket — Company Room

Socket ulanishda endi token yuborish shart. Aks holda real-time eventlar kelmaydi.

### Ulanish (connection)
```javascript
// OLDIN
const socket = io('http://localhost:3000/documents');

// HOZIR — token bilan ulanish kerak
const socket = io('http://localhost:3000/documents', {
  auth: {
    token: localStorage.getItem('accessToken')  // yoki qayerda saqlasangiz
  }
});
```

### Nima o'zgardi:
- Har bir user faqat o'z kompaniyasining socket eventlarini oladi
- Boshqa kompaniya yaratgan client/request/shipment eventlari kelmaydi
- Event nomlari va strukturasi **o'zgarmadi**

### Event'lar (o'zgarishsiz):
```javascript
socket.on('clientCreated', (data) => { ... })
socket.on('clientUpdated', (data) => { ... })
socket.on('requestCreated', (data) => { ... })
socket.on('requestStatusChanged', (data) => { ... })
socket.on('newNotification', (data) => { ... })
// ...va boshqalar
```

---

## 6. Super Admin Panel — Yangi Sahifalar

Agar `user.role === 'super_admin'` bo'lsa, quyidagi sahifalar kerak:

### `/super-admin/companies` — Kompaniyalar ro'yxati
- Barcha kompaniyalarni ko'rsatish
- Har birida: nom, slug, status (faol/blok), yaratilgan sana
- "Yangi kompaniya" tugmasi
- "Faollashtir/Blokla" toggle tugmasi

### `/super-admin/companies/new` — Yangi kompaniya
- Form: `name`, `slug`, `phone` (optional), `email` (optional)
- Saqlanganda `POST /api/companies` chaqiriladi

### Routing misoli (React):
```jsx
// App.jsx
{user?.role === 'super_admin' && (
  <>
    <Route path="/super-admin/companies" element={<CompaniesPage />} />
    <Route path="/super-admin/companies/new" element={<CreateCompanyPage />} />
  </>
)}

// Oddiy userlar uchun super-admin sahifalariga kirish yo'q
```

---

## 7. Login Sahifasi — O'ZGARMADI

Login sahifasida hech narsa o'zgarmaydi. Backend emaildan kompaniyani o'zi topadi.

```
POST /api/auth/login
{
  "email": "user@logista.uz",
  "password": "password"
}
```

---

## 8. User Taklif Qilish — O'ZGARMADI

Invitation tizimi oldingiday ishlaydi. Admin o'z kompaniyasi ichiga user taklif qiladi va yangi user avtomatik o'sha kompaniyaga birikadi.

---

## 9. Xulosa — Frontend Checklist

```
✅ Login da kelgan companyId ni saqlash (localStorage/state)
✅ super_admin roli uchun alohida routing
✅ GET /api/companies — kompaniyalar ro'yxati
✅ POST /api/companies — yangi kompaniya
✅ PATCH /api/companies/:id — yangilash
✅ PATCH /api/companies/:id/toggle — faollashtirish/bloklash
✅ Socket ulanishda auth.token yuborish

❌ Mavjud sahifalar (clients, requests, shipments...) — O'ZGARMAYDI
❌ API so'rovlarga companyId qo'shish shart emas — backend o'zi qo'shadi
❌ Login/logout logikasi — O'ZGARMAYDI
```

---

## 10. Muhim Eslatmalar

1. **companyId ni API so'rovlarga QO'SHMASLIK kerak** — backend JWT tokendagi companyId ni o'zi oladi. Frontend faqat token yuboradi, xolos.

2. **Super Admin oddiy CRM sahifalarini ko'rmaydi** — u faqat `/api/companies` endpoint'laridan foydalanadi.

3. **Mavjud tokenlar ishlaydi** — lekin logout qilib qayta kirish kerak bo'ladi, chunki eski tokenlarda `companyId` yo'q.

4. **Migration tugaganidan keyin** server qayta ishga tushiriladi — shu paytda barcha foydalanuvchilar qayta login qilishi kerak (eski token yangi formatda emas).
