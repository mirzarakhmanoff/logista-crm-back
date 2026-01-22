**Login (Kirish):**
Kirish uchun, `email` va `password` bilan JSON ob'ektini yuboring.

Misol:
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Register (Ro'yxatdan o'tish):**
Ro'yxatdan o'tish uchun, `email`, `password`, `fullName` va ixtiyoriy `role` va `phone` bilan JSON ob'ektini yuboring.

Misol:
```json
{
  "email": "newuser@example.com",
  "password": "securepassword",
  "fullName": "New User",
  "role": "AGENT", // Ixtiyoriy, 'ADMIN', 'AGENT', 'CLIENT' va boshqalar bo'lishi mumkin.
  "phone": "+998901234567" // Ixtiyoriy
}
```
