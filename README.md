# SIGAP Backend - Setup & Installation Guide

## 📋 Prerequisites

Sebelum memulai, pastikan Anda sudah menginstal:
- **Node.js** (v16 atau lebih baru) - [Download](https://nodejs.org/)
- **MySQL** (v8.0 atau lebih baru) - [Download](https://www.mysql.com/downloads/)
- **Git** - [Download](https://git-scm.com/)

## 🚀 Installation Steps

### 1. Setup MySQL Database

```bash
# Buka MySQL command line
mysql -u root -p

# Buat database dan tables
source backend/database/schema.sql

# Insert seed data (optional untuk testing)
source backend/database/seed.sql

# Verify
SHOW DATABASES;
USE sigap_db;
SHOW TABLES;
```

**Test Credentials:**
- Admin: `ADMIN001` / `admin123`
- Student: `F55123064` / `123456`

### 2. Install Dependencies

```bash
cd backend
npm install
```

### 3. Setup Environment Variables

```bash
# Copy .env.example ke .env
cp .env.example .env

# Edit .env dengan konfigurasi lokal Anda
```

**Contoh .env:**
```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=sigap_db
DB_PORT=3306

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRES_IN=7d

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### 4. Start Backend Server

```bash
# Development mode (dengan auto-reload)
npm run dev

# Production mode
npm start
```

Server akan berjalan di: **http://localhost:5000**

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Registrasi user baru
- `POST /api/auth/login` - Login
- `GET /api/auth/verify` - Verify token (Protected)

### Users
- `GET /api/users/profile` - Get profil user (Protected)
- `PUT /api/users/profile` - Update profil (Protected)
- `GET /api/users` - Get semua user (Admin only)
- `GET /api/users/:userId` - Get user by ID (Admin only)

### Rooms
- `GET /api/rooms` - Get semua ruangan
- `GET /api/rooms/:roomId` - Get detail ruangan
- `POST /api/rooms` - Buat ruangan baru (Admin only)
- `PUT /api/rooms/:roomId` - Update ruangan (Admin only)
- `DELETE /api/rooms/:roomId` - Hapus ruangan (Admin only)
- `POST /api/rooms/check-availability` - Cek ketersediaan ruangan

### Bookings
- `POST /api/bookings` - Buat booking baru
- `GET /api/bookings/my-bookings` - Get booking saya
- `GET /api/bookings` - Get semua booking (Admin only)
- `GET /api/bookings/:bookingId` - Get detail booking
- `PUT /api/bookings/:bookingId` - Update booking (pending only)
- `POST /api/bookings/:bookingId/approve` - Approve booking (Admin only)
- `POST /api/bookings/:bookingId/reject` - Reject booking (Admin only)
- `POST /api/bookings/:bookingId/cancel` - Cancel booking

### Inventory
- `GET /api/inventory` - Get semua barang
- `GET /api/inventory/:itemId` - Get detail barang
- `POST /api/inventory` - Buat barang baru (Admin only)
- `PUT /api/inventory/:itemId` - Update barang (Admin only)
- `DELETE /api/inventory/:itemId` - Hapus barang (Admin only)
- `POST /api/inventory/:itemId/borrow` - Pinjam barang
- `POST /api/inventory/:loanId/return` - Kembalikan barang
- `GET /api/inventory/history` - Get loan history (Admin only)

### Lost & Found
- `POST /api/lostfound` - Buat laporan L&F
- `GET /api/lostfound` - Get semua laporan
- `GET /api/lostfound/my-reports` - Get laporan saya
- `GET /api/lostfound/:reportId` - Get detail laporan
- `PUT /api/lostfound/:reportId` - Update laporan (Admin only)
- `DELETE /api/lostfound/:reportId` - Hapus laporan
- `POST /api/lostfound/:reportId/claim` - Klaim barang
- `POST /api/lostfound/claims/:claimId/approve` - Approve klaim (Admin only)
- `POST /api/lostfound/claims/:claimId/reject` - Reject klaim (Admin only)

## 🧪 Testing API dengan Postman/Insomnia

### 1. Register User Baru
```
POST /api/auth/register
Body:
{
  "nim": "F55123100",
  "email": "newuser@student.untad.ac.id",
  "name": "New User",
  "password": "123456",
  "phone": "08123456789",
  "prodi": "Teknik Informatika"
}
```

### 2. Login
```
POST /api/auth/login
Body:
{
  "identifier": "F55123064",
  "password": "123456"
}

Response:
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-001",
    "nim": "F55123064",
    "name": "Syaif Ali M. Risal",
    "role": "mahasiswa"
  }
}
```

### 3. Create Booking (dengan Authorization header)
```
POST /api/bookings
Headers:
Authorization: Bearer {token}

Body:
{
  "roomId": "room-001",
  "bookingDate": "2026-06-10",
  "startTime": "08:00",
  "endTime": "10:00",
  "courseName": "Capstone Project",
  "lecturer": "Dr. Ahmad Fauzi",
  "duration": 2
}
```

### 4. Get My Bookings
```
GET /api/bookings/my-bookings
Headers:
Authorization: Bearer {token}
```

## 📁 Project Structure

```
backend/
├── config/
│   └── database.js           # Database connection configuration
├── controllers/
│   ├── authController.js     # Authentication logic
│   ├── userController.js     # User management logic
│   ├── roomController.js     # Room management logic
│   ├── bookingController.js  # Booking logic
│   ├── inventoryController.js # Inventory logic
│   └── lostFoundController.js # Lost & Found logic
├── middleware/
│   ├── auth.js               # JWT authentication & authorization
│   ├── errorHandler.js       # Error handling
│   └── validation.js         # Input validation
├── routes/
│   ├── auth.js              # Auth endpoints
│   ├── users.js             # User endpoints
│   ├── rooms.js             # Room endpoints
│   ├── bookings.js          # Booking endpoints
│   ├── inventory.js         # Inventory endpoints
│   └── lostfound.js         # Lost & Found endpoints
├── utils/
│   ├── auth.js              # Password hashing & JWT utilities
│   └── response.js          # Response formatting
├── database/
│   ├── schema.sql           # Database schema
│   └── seed.sql             # Sample data
├── server.js                # Main server entry point
├── package.json             # Dependencies
├── .env.example             # Environment variables template
└── README.md                # This file
```

## 🔒 Authentication Flow

1. **Register/Login** → Dapatkan JWT token
2. **Include Token** di header: `Authorization: Bearer {token}`
3. **Server verify** token di middleware
4. **Akses resource** yang dilindungi

## ⚠️ Error Handling

### Common Error Responses:

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "password",
      "message": "Password must be at least 6 characters"
    }
  ]
}
```

```json
{
  "error": "Invalid credentials"
}
```

```json
{
  "error": "Time slot already booked"
}
```

## 🛠️ Troubleshooting

### Error: "connect ECONNREFUSED 127.0.0.1:3306"
**Solution:** Pastikan MySQL server sudah running
```bash
# Windows
net start MySQL80

# macOS
brew services start mysql

# Linux
sudo systemctl start mysql
```

### Error: "Access denied for user 'root'@'localhost'"
**Solution:** Check DB_PASSWORD di .env file

### Error: "Unknown database 'sigap_db'"
**Solution:** Jalankan schema.sql terlebih dahulu
```bash
mysql -u root -p < backend/database/schema.sql
```

## 📝 Database Backup & Restore

```bash
# Backup database
mysqldump -u root -p sigap_db > backup.sql

# Restore database
mysql -u root -p sigap_db < backup.sql
```

## 🚀 Deployment

### Untuk production, ubah .env:
```env
NODE_ENV=production
JWT_SECRET=very_long_random_secret_key_here
DB_HOST=your_production_db_host
```

## 📞 Support

Jika ada pertanyaan atau issue, silakan hubungi tim developer.

---

**Last Updated:** June 2026
**Version:** 1.0.0
