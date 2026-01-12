# Logista CRM - Authentication System

## API Documentation

Server ishga tushganidan so'ng Swagger dokumentatsiyasini ko'rish uchun:
- **Swagger UI**: http://localhost:3000/api/docs

## Available Endpoints

### Authentication

#### 1. Register (Ro'yxatdan o'tish)
```
POST /api/auth/register
```

Request body:
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "fullName": "John Doe",
  "role": "agent",
  "phone": "+998901234567"
}
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "email": "john@example.com",
    "fullName": "John Doe",
    "role": "agent"
  }
}
```

#### 2. Login (Tizimga kirish)
```
POST /api/auth/login
```

Request body:
```json
{
  "username": "john_doe",
  "password": "password123"
}
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "email": "john@example.com",
    "fullName": "John Doe",
    "role": "agent"
  }
}
```

#### 3. Get Profile (Profil ma'lumotlari)
```
GET /api/auth/profile
Authorization: Bearer {accessToken}
```

Response:
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "username": "john_doe",
  "email": "john@example.com",
  "role": "agent"
}
```

## User Roles

Sistema quyidagi rollarni qo'llab-quvvatlaydi:
- **admin** - Tizim administratori
- **manager** - Menejер
- **accountant** - Buxgalter
- **agent** - Agent (default)

## Authorization

Himoyalangan endpoint'larga murojaat qilish uchun, so'rov header'iga JWT token qo'shish kerak:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Environment Variables

`.env` faylida quyidagi o'zgaruvchilarni sozlang:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/logista-crm

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:3001
```

## Running the Application

### Development Mode
```bash
npm run start:dev
```

### Production Mode
```bash
npm run build
npm run start:prod
```

## Features

✅ User registration va login
✅ JWT-based authentication
✅ Role-based access control (RBAC)
✅ Password hashing (bcrypt)
✅ Swagger/OpenAPI documentation
✅ Global validation pipes
✅ MongoDB integration
✅ Public/Protected routes
✅ CORS enabled

## Testing with Swagger

1. Serverni ishga tushiring: `npm run start:dev`
2. Brauzerda quyidagi manzilga o'ting: http://localhost:3000/api/docs
3. "Authentication" bo'limini oching
4. `/api/auth/register` orqali yangi foydalanuvchi yarating
5. `/api/auth/login` orqali tizimga kiring va JWT token oling
6. Sahifaning yuqorisidagi "Authorize" tugmasini bosing
7. Olingan `accessToken`ni kiriting (faqat token, "Bearer" so'zini qo'shmasdan)
8. Endi himoyalangan endpoint'lardan foydalanishingiz mumkin

## Next Steps

Keyingi qadamlar:
- [ ] Users CRUD endpoints
- [ ] Clients management module
- [ ] Agents management module
- [ ] Documents module
- [ ] Accounting module
- [ ] Reports module
- [ ] Real-time chat (Socket.IO)
- [ ] Email integration
- [ ] Archive module
