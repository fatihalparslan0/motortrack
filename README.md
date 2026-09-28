
# MotorTrack — Motor & Parça Yönetim Sistemi

> **SaaS** platformu: Motor takibi, parça envanteri, depo yönetimi ve iş emirleri sistemi.

## 🏗️ Mimari

```
motortrack/
├── backend/          # Node.js + Express + Prisma API
├── mobile/           # React Native (Expo) Mobil Uygulama
├── admin/            # React Web Admin Paneli (opsiyonel)
└── docker-compose.yml
```

## ⚡ Hızlı Başlangıç

### 1. Ön Gereksinimler

- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- Expo CLI (`npm install -g expo-cli`)

### 2. Backend Kurulumu

```bash
cd backend

# Bağımlılıkları yükle
npm install

# .env dosyasını oluştur
cp .env.example .env
# .env dosyasını kendi değerlerinizle doldurun

# Prisma istemcisi oluştur
npm run db:generate

# Veritabanı migrasyonlarını çalıştır
npm run db:migrate

# Demo verileri ekle
npm run db:seed

# Geliştirme sunucusunu başlat
npm run dev
```

API `http://localhost:3000` adresinde çalışır.

### 3. Mobil Uygulama

```bash
cd mobile

# Bağımlılıkları yükle
npm install

# .env oluştur
echo 'EXPO_PUBLIC_API_URL=http://localhost:3000/api' > .env

# Expo başlat
npm start
```

Expo DevTools'ta **i** (iOS) veya **a** (Android) ile çalıştırın.

### 4. Docker ile Çalıştır (Önerilen)

```bash
# .env dosyasını hazırla
cp backend/.env.example backend/.env

# Tüm servisleri başlat
docker-compose up -d

# Migrasyonları çalıştır
docker exec motortrack_backend npx prisma migrate deploy
docker exec motortrack_backend node prisma/seed.js
```

---

## 📋 API Endpoint'leri

### Auth
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/auth/register` | Şirket + kullanıcı kaydı |
| POST | `/api/auth/login` | Giriş |
| POST | `/api/auth/refresh` | Token yenile |
| POST | `/api/auth/logout` | Çıkış |
| GET | `/api/auth/me` | Aktif kullanıcı |

### Motorlar
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/motors` | Motor listesi |
| GET | `/api/motors/stats` | İstatistikler |
| POST | `/api/motors` | Motor oluştur |
| GET | `/api/motors/:id` | Motor detayı |
| PUT | `/api/motors/:id` | Motor güncelle |
| DELETE | `/api/motors/:id` | Motor sil |
| GET | `/api/motors/:id/parts` | Motor parçaları |
| GET | `/api/motors/:id/maintenance` | Bakım geçmişi |
| POST | `/api/motors/scan-qr` | QR kod tara |

### Parçalar
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/parts` | Parça listesi |
| GET | `/api/parts/low-stock` | Düşük stok uyarısı |
| GET | `/api/parts/stats` | İstatistikler |
| POST | `/api/parts` | Parça oluştur |
| POST | `/api/parts/:id/movement` | Stok hareketi |

### Abonelik
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/subscriptions/plans` | Planlar |
| POST | `/api/subscriptions/checkout` | Stripe checkout |
| POST | `/api/subscriptions/portal` | Fatura portalı |
| POST | `/api/subscriptions/cancel` | İptal et |

---

## 💳 Abonelik Planları

| Plan | Fiyat/Ay | Motor | Kullanıcı |
|------|----------|-------|-----------|
| **Starter** | ₺299 | 10 | 3 |
| **Pro** | ₺699 | 50 | 10 |
| **Enterprise** | ₺1.499 | ∞ | ∞ |

> Tüm planlar 14 gün ücretsiz deneme ile başlar.

---

## 🗄️ Veritabanı Şeması

Ana tablolar:
- `companies` — Şirketler
- `users` — Kullanıcılar (rol: ADMIN / MANAGER / TECHNICIAN)
- `motors` — Motorlar (QR kod, durum, bakım geçmişi)
- `parts` — Parça envanteri (stok takibi)
- `part_movements` — Stok hareketleri (giriş/çıkış/transfer)
- `maintenance_records` — Bakım kayıtları
- `subscriptions` — Stripe abonelikleri
- `subscription_plans` — Abonelik planları

---

## 🔧 Çevre Değişkenleri

Tüm değişkenler için `backend/.env.example` dosyasına bakın.

Zorunlu değişkenler:
```env
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 🚀 Deployment

### Backend (Railway / Render)
```bash
# Railway
railway login && railway up

# Render: render.yaml dosyası oluştur
```

### Mobil (EAS Build)
```bash
npm install -g eas-cli
eas login
eas build --platform all
```

---

## 📱 Mobil Uygulama Ekranları

1. **Dashboard** — Genel özet, uyarılar, hızlı işlemler
2. **Motorlar** — Motor listesi, QR tarama, filtreler
3. **Motor Detayı** — Bağlı parçalar, bakım geçmişi
4. **Parça Envanteri** — Stok takibi, düşük stok uyarıları, hareket geçmişi
5. **Depo & Sevkiyat** — Depo listesi, kritik stoklar, stok hareketleri
6. **İş Emirleri & Alacaklar** — İş emri oluşturma, plaka geçmişi, cari alacak takibi
7. **Bakım Takibi** — Geçmiş ve planlanan bakımlar
8. **Abonelik** — Plan seçimi, Stripe ödeme

---

## 🧪 Test Hesabı (Seed Verisi)

```
E-posta: admin@motortrack.com
Şifre:   Demo1234!
```

---

## 📞 Destek

MotorTrack v1.0.0 — Motor & Parça Yönetim SaaS Platformu
