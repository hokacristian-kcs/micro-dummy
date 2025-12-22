# Microservice Demo - Simulasi & Usecase

## Setup
1. Jalankan semua service di 5 terminal berbeda:
```bash
npm run dev:user          # Terminal 1 - port 3001
npm run dev:wallet        # Terminal 2 - port 3002
npm run dev:payment       # Terminal 3 - port 3003
npm run dev:notification  # Terminal 4 - port 3004
npm run dev:credit        # Terminal 5 - port 3005
```

2. Import `postman_collection.json` ke Postman

---

## Usecase 1: User Registration + Auto Create Wallet

**Skenario:** User baru register, sistem otomatis buatkan wallet

**Steps:**
1. `POST /users` - Register user baru
2. Cek di Wallet Service - wallet otomatis terbuat dengan balance 0

**Flow:**
```
User Service → (HTTP call) → Wallet Service
```

---

## Usecase 2: Top Up via QRIS (Seperti di Diagram)

**Skenario:** User bayar 10rb via QRIS, saldo bertambah

**Steps:**
1. `POST /payments` dengan method "qris" dan amount 10000
2. Payment Service call BNI System (simulasi)
3. Jika sukses → Wallet di-topup
4. Notification dikirim ke user

**Flow:**
```
Payment Service → BNI (simulasi) → Wallet Service → Notification Service
```

**Cek hasil:**
- `GET /wallets/{userId}` - balance bertambah
- `GET /notifications/{userId}` - ada notif "Pembayaran Berhasil"
- `GET /payments/{userId}` - ada history payment

---

## Usecase 3: Apply Credit (Pinjaman)

**Skenario:** User ajukan kredit 100rb, langsung masuk wallet

**Steps:**
1. `POST /credits` dengan amount 100000
2. Credit Service topup wallet user
3. Notification dikirim

**Flow:**
```
Credit Service → Wallet Service → Notification Service
```

**Cek hasil:**
- `GET /wallets/{userId}` - balance bertambah 100rb
- `GET /credits/{userId}` - ada kredit aktif
- `GET /notifications/{userId}` - ada notif "Kredit Disetujui"

---

## Usecase 4: Bayar Kredit

**Skenario:** User bayar kredit dari saldo wallet

**Steps:**
1. `POST /credits/{creditId}/pay` dengan amount
2. Wallet di-deduct
3. Status kredit jadi "paid"
4. Notification dikirim

**Flow:**
```
Credit Service → Wallet Service (deduct) → Notification Service
```

---

## Full Simulation Flow

Jalankan berurutan di Postman:

| Step | Endpoint | Deskripsi |
|------|----------|-----------|
| 1 | `POST /users` | Register "John Doe" |
| 2 | `GET /wallets/{userId}` | Cek wallet (balance: 0) |
| 3 | `POST /payments` (QRIS 10000) | Bayar via QRIS |
| 4 | `GET /wallets/{userId}` | Cek wallet (balance: 10000) |
| 5 | `POST /payments` (Transfer 25000) | Bayar via Transfer |
| 6 | `GET /wallets/{userId}` | Cek wallet (balance: 35000) |
| 7 | `POST /credits` (100000) | Ajukan kredit |
| 8 | `GET /wallets/{userId}` | Cek wallet (balance: 135000) |
| 9 | `GET /credits/{userId}` | Cek kredit aktif |
| 10 | `POST /credits/{id}/pay` | Bayar kredit |
| 11 | `GET /wallets/{userId}` | Cek wallet (balance: 35000) |
| 12 | `GET /notifications/{userId}` | Lihat semua notifikasi |

---

## Service Ports

| Service | Port | Database |
|---------|------|----------|
| User | 3001 | user_db |
| Wallet | 3002 | wallet_db |
| Payment | 3003 | payment_db |
| Notification | 3004 | notification_db |
| Credit | 3005 | credit_db |

---

## Inter-Service Communication

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────────┐
│ User Svc    │────▶│ Wallet Svc   │◀────│ Payment Svc         │
│ :3001       │     │ :3002        │     │ :3003               │
└─────────────┘     └──────────────┘     │ ↓                   │
                           ▲             │ BNI System (mock)   │
                           │             └─────────────────────┘
                    ┌──────┴──────┐
                    │ Credit Svc  │
                    │ :3005       │
                    └─────────────┘
                           │
                           ▼
                    ┌─────────────────┐
                    │ Notification Svc│
                    │ :3004           │
                    └─────────────────┘
```
