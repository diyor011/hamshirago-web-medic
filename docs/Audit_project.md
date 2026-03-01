# HamshiraGo — Project Management va Kamchiliklar Auditi

> Sana: 2026-03-01
> Audit turi: Project management, kod sifati, arxitektura, xavfsizlik, bozorga tayyorlik

---

## UMUMIY BAHO

| Kategoriya | Baho | Holat |
|------------|------|-------|
| Project Management | 4/10 | Yomon |
| Kod sifati | 5/10 | O'rtacha |
| Test qamrovi | 1/10 | Kritik |
| Xavfsizlik | 4/10 | Yomon |
| i18n/Lokalizatsiya | 0/10 | Mavjud emas |
| CI/CD | 2/10 | Deyarli yo'q |
| Dokumentatsiya | 6/10 | O'rtacha |
| Arxitektura | 7/10 | Yaxshi |
| UI/UX | 7/10 | Yaxshi |
| Production tayyorligi | 3/10 | Tayyor emas |

**Umumiy: 3.9/10** — Platforma funksional, lekin productionга chiqarish uchun jiddiy kamchiliklar bor.

---

## 1. PROJECT MANAGEMENT KAMCHILIKLARI

### 1.1 Task tracking tizimi primitiv
- `docs/tasks.md` — oddiy markdown fayl, hech qanday prioritet, assignee, deadline yo'q
- Hech qanday project management tool ishlatilmaydi (GitHub Issues, Jira, Linear, Notion)
- Buglar va featurelar aralash, severity/priority aniqlanmagan
- Backlog boshqaruvi yo'q

**Hozirgi holat:**
```
docs/tasks.md  — 3 ta bug + 1 ta task + 4 ta idea
docs/done.md   — 50+ bajarilgan task ro'yxati
```

**Muammo:** Katta loyihada markdown fayl bilan task tracking qilish mumkin emas. Prioritetlar, deadlinelar, assigneelar, sprintlar yo'q.

### 1.2 Versiya boshqaruvi yo'q
- **Backend:** `0.1.0` — hech qachon yangilanmagan
- **Admin:** `0.0.0` — standart placeholder
- **Web/Web-Medic:** `0.1.0`
- **Mobile/Medic:** `1.0.0`
- **Semantic versioning** (semver) qo'llanilmaydi
- **CHANGELOG.md** yo'q
- **Release notes** yo'q
- Git tag/release ishlatilmaydi

### 1.3 Branching strategiyasi yo'q
- Faqat `main` branch mavjud
- Feature branch, develop branch, staging branch yo'q
- Pull Request jarayoni aniqlanmagan
- Code review jarayoni yo'q
- Branch protection rules yo'q

### 1.4 Sprint/Milestone rejalash yo'q
- Hech qanday sprint yoki milestone aniqlanmagan
- MVP scope aniq, lekin bajarish tartibi boshqarilmagan
- Roadmap faqat `docs/V1/00_web_gaps.md` da umumiy ko'rinishda

### 1.5 Jamoa aloqasi va jarayonlar
- Contributing guide yo'q (CONTRIBUTING.md)
- Pull Request template yo'q
- Issue template yo'q
- Code of conduct yo'q
- Onboarding guide yangi developerlar uchun yo'q

---

## 2. CI/CD VA DEVOPS KAMCHILIKLARI

### 2.1 CI pipeline yo'q
- `.github/workflows/` papkasi mavjud emas
- Hech qanday GitHub Actions, CircleCI, Jenkins yo'q
- Kod push qilinganda hech narsa tekshirilmaydi:
  - Testlar ishlatilmaydi
  - Lint tekshirilmaydi
  - Build tekshirilmaydi
  - Type checking yo'q

### 2.2 Deployment avtomatlashtirilmagan
- Backend: Railway ga manual deploy
- Web/Web-Medic: Vercel ga auto-deploy (git push orqali)
- Mobile: EAS Build konfiguratsiyasi bor, lekin CI yo'q
- **Staging muhiti yo'q** — to'g'ridan-to'g'ri production ga deploy
- **Rollback strategiyasi yo'q**

### 2.3 Docker to'liq emas
- `docker-compose.yml` yo'q — barcha servislarni bir vaqtda ishga tushirish uchun
- `Dockerfile` faqat Railway uchun (backend)
- Local development uchun Docker setup yo'q
- PostgreSQL faqat qo'lda Docker container orqali

**Kerak bo'lgan docker-compose.yml:**
```yaml
# BU MAVJUD EMAS — yaratish kerak
services:
  postgres:
    image: postgres:17-alpine
  backend:
    build: ./backend
  admin:
    build: ./admin
  web:
    build: ./web
  web-medic:
    build: ./web-medic
```

### 2.4 Environment boshqaruvi yomon
- `.env` fayllari izchil emas — faqat backend da `.env.example` bor
- Web/web-medic da environment variable yo'q — `localhost:3000` qattiq kodlangan
- Admin da `.env` bor, lekin boshqa frontendlarda yo'q
- Secret management tool ishlatilmaydi
- `.env` git tarixida oshkor bo'lgan bo'lishi mumkin

---

## 3. TEST QAMROVI — KRITIK MUAMMO

### 3.1 Hozirgi holat: TESTLAR YO'Q

| Loyiha | Test fayllari | Test framework | Qamrov |
|--------|--------------|----------------|--------|
| Backend | 0 | Yo'q (Jest o'rnatilmagan) | 0% |
| Admin | 1 (placeholder) | Vitest | ~0% |
| Web | 0 | Yo'q | 0% |
| Web-Medic | 0 | Yo'q | 0% |
| Mobile | 0 | Yo'q | 0% |
| Medic | 0 | Yo'q | 0% |

**Yagona test:**
```typescript
// admin/src/test/example.test.ts
describe("example", () => {
  it("should pass", () => {
    expect(true).toBe(true);  // Ma'nosiz placeholder
  });
});
```

### 3.2 Nima testlanishi kerak (minimal)
1. **Backend unit testlar:** Auth service, Orders service, payment hisoblash
2. **Backend integration testlar:** API endpointlar, WebSocket eventlar
3. **Frontend component testlar:** Form validatsiya, auth flow
4. **E2E testlar:** Buyurtma yaratish to'liq oqimi (Playwright)

### 3.3 Xavf
- Refactoring xavfli — biror narsa buzilganini bilish imkonsiz
- Regression buglar aniqlanmaydi
- Yangi developerlar kodga ishonch bilan o'zgartirish qila olmaydi
- CI/CD pipeline qurib bo'lmaydi (tekshirish uchun test yo'q)

---

## 4. KOD SIFATI KAMCHILIKLARI

### 4.1 TypeScript strict mode izchil emas

| Loyiha | strict | noImplicitAny | strictNullChecks |
|--------|--------|---------------|------------------|
| Backend | ??? | ??? | ??? |
| Admin | **false** | **false** | **false** |
| Web | true | ha | ha |
| Web-Medic | true | ha | ha |
| Mobile | true | ha | ha |
| Medic | true | ha | ha |

**Admin paneli** — eng muhim xavfsizlik paneli — eng zaif TypeScript konfiguratsiyasiga ega. `any` turi hamma joyda ishlatilishi mumkin, null xatolar aniqlanmaydi.

### 4.2 ESLint/Prettier izchil emas
- **Admin:** ESLint konfiguratsiyasi bor (`eslint.config.js`)
- **Backend:** ESLint yo'q
- **Web/Web-Medic:** ESLint yo'q
- **Mobile/Medic:** ESLint yo'q
- **Prettier:** Hech qayerda konfiguratsiya yo'q
- Kod formatlash standarti yo'q

### 4.3 `any` tipi keng ishlatilgan
```typescript
// admin/src/lib/api.ts — barcha API javoblari `any`
export const getPendingMedics = () => request<any[]>("GET", "/medics/admin/pending");
export const verifyMedic = (id: string, status: "APPROVED" | "REJECTED", reason?: string) =>
  request<any>("PATCH", `/medics/admin/${id}/verify`, { status, reason });
export const createService = (data: any) => request<any>("POST", "/services", data);

// web/lib/api.ts
interface Order {
  id: string;
  // ... boshqa maydonlar
  [key: string]: any;  // har qanday maydon qabul qiladi
}
```

### 4.4 Error Boundary yo'q
- Hech qanday frontend loyihada React Error Boundary ishlatilmaydi
- Komponent xatosi butun ilovani buzadi
- Foydalanuvchi oq ekran ko'radi, tushunarsiz holat

### 4.5 Backend da Swagger/OpenAPI yo'q
- `@nestjs/swagger` o'rnatilmagan
- API endpointlari faqat markdown hujjatda tasvirlangan
- Interaktiv API testi (Swagger UI) imkonsiz
- Frontend developerlar uchun API kashfiyoti qiyin

### 4.6 Database migratsiyalar yo'q
- `synchronize: true` ishlatiladi — TypeORM avtomatik jadval yaratadi
- Production da bu **juda xavfli** — ma'lumot yo'qotilishi mumkin
- Migratsiya fayllari yo'q
- Schema versiyalash yo'q
- Rollback imkoniyati yo'q

---

## 5. XAVFSIZLIK KAMCHILIKLARI

### 5.1 Credentials git tarixida oshkor
Backend `.env` fayli real kalitlar bilan commit qilingan bo'lishi mumkin:
- `JWT_SECRET` — oshkor
- `CLOUDINARY_API_SECRET` — oshkor
- `TELEGRAM_BOT_TOKEN` — oshkor
- `VAPID_PRIVATE_KEY` — oshkor
- `ADMIN_PASSWORD` — `change-this-strong-password` (standart)

**Darhol harakatlar:**
1. Barcha kalitlarni almshtirish (rotate)
2. Git tarixini tozalash yoki force push
3. Secret management tool ishlatish

### 5.2 Admin parol standart
```
ADMIN_PASSWORD=change-this-strong-password
```
Bu hali ham standart qiymat. Production da bu o'zgartirilishi **shart**.

### 5.3 WebSocket CORS `origin: '*'`
```typescript
// backend/src/realtime/order-events.gateway.ts:23
@WebSocketGateway({ cors: { origin: '*' } })
```
REST API qat'iy CORS ro'yxatiga ega, lekin WebSocket har qanday saytdan ulanishga ruxsat beradi.

### 5.4 Token localStorage da saqlanadi
Barcha frontendlarda JWT tokenlar `localStorage` da saqlanadi:
- XSS hujumi orqali o'g'irilishi mumkin
- HttpOnly cookie ishlatilmaydi
- Token refresh mexanizmi yo'q

### 5.5 Rate limiting yetarli emas
- Global: 120 so'rov/daqiqa
- Login: 10 so'rov/daqiqa
- **Lekin:** Buyurtma yaratish, WebSocket, fayl yuklash uchun maxsus limit yo'q
- Brute force hujumlardan to'liq himoya yo'q

### 5.6 Input validatsiya zaif
- Telefon raqam formati tekshirilmaydi (`@IsString()` faqat)
- Manzil maydoni uzunlik limiti yo'q
- Fayl yuklash hajm/tur tekshiruvi yetarli emas

---

## 6. i18n/LOKALIZATSIYA — MAVJUD EMAS

### 6.1 Muammo
Ilova **O'zbekiston bozori** uchun yaratilgan, lekin:
- Butun UI **faqat rus tilida**
- O'zbek tili **umuman qo'llab-quvvatlanmaydi**
- Til almashtirish imkoniyati yo'q
- i18n kutubxonasi o'rnatilmagan

### 6.2 Qattiq kodlangan matnlar (misollar)
```typescript
// web/app/page.tsx
"Вызовите медсестру на дом"
"Внутримышечный укол"
"Капельница"

// web-medic/app/page.tsx
"Доступные заказы"
"Принять заказ"

// admin/src/pages/Dashboard.tsx
"Заказы за сегодня"
"Общая выручка"

// mobile/app/(tabs)/index.tsx
"Наши услуги"
```

### 6.3 Ta'siri
- O'zbek tilida gaplashuvchi foydalanuvchilar (aholining 80%+) ilovani ishlata olmaydi
- Bozor penetratsiyasi cheklangan
- Raqobatchilar ikki tilli bo'lsa, HamshiraGo ortda qoladi

### 6.4 Yechim
**Minimal:** `next-intl` (web), `react-i18next` (admin/mobile) qo'shish
- `uz` (O'zbek) va `ru` (Rus) tillari
- Xizmat nomlari bazada ikki tilda saqlash
- Til tanlash ekrani qo'shish

---

## 7. ARXITEKTURA KAMCHILIKLARI

### 7.1 API URL boshqaruvi buzilgan
```
web/lib/api.ts:        const BASE_URL = "http://localhost:3000";     // Qattiq kodlangan!
web-medic/lib/api.ts:  const BASE_URL = "http://localhost:3000";     // Qattiq kodlangan!
web/lib/webPush.ts:    const BASE_URL = "http://localhost:3000";     // Qattiq kodlangan!
web-medic/lib/webPush.ts: const BASE_URL = "http://localhost:3000";  // Qattiq kodlangan!
admin/.env:            VITE_API_URL=http://localhost:3000             // Environment variable
mobile/constants/api.ts: export const API_BASE = 'http://localhost:3000';
medic/constants/api.ts:  export const API_BASE = 'http://localhost:3000';
```

**Muammo:** Web va web-medic da environment variable ishlatilmaydi. Production deploy qilganda manba kodini o'zgartirish kerak bo'ladi.

### 7.2 Monorepo asboblari yo'q
- 6 ta loyiha bitta repoda, lekin:
- Monorepo tool yo'q (nx, turborepo, lerna)
- Umumiy kodlar (types, utils) dublikatsiya qilingan
- Bitta `npm install` barchani o'rnatmaydi
- Root `package.json` yo'q

### 7.3 Umumiy tiplar dublikatsiya
`Order`, `Medic`, `User`, `Service` tiplari har bir frontendda alohida aniqlangan:
```
web/lib/api.ts         — Order, Service interfacelar
web-medic/lib/api.ts   — Order, Service interfacelar (boshqacha)
mobile/types/          — Order, Service tiplar
medic/context/         — MedicUser, Order tiplar
admin/src/lib/api.ts   — MedicsResponse, OrdersResponse
```

**Muammo:** Tiplar sinxron emas. Backend o'zgarganda, 6 ta joyni alohida yangilash kerak.

### 7.4 State management izchil emas
| Loyiha | Server state | Client state | Caching |
|--------|-------------|--------------|---------|
| Admin | TanStack Query | useState | React Query cache |
| Web | fetch + useEffect | useState + localStorage | Yo'q |
| Web-Medic | fetch + useEffect | useState + localStorage | Yo'q |
| Mobile | fetch + useEffect | AuthContext | Yo'q |
| Medic | fetch + useEffect | AuthContext | Yo'q |

Admin TanStack Query ishlatadi (to'g'ri), lekin boshqa loyihalar to'g'ridan-to'g'ri `useEffect` da `fetch` qiladi — loading/error/cache boshqaruvi qo'lda.

### 7.5 Backend route konflikti
```typescript
// orders.controller.ts
@Get(':id')              // 51-qator — HAR QANDAY path ni ushlaydi
findOne(@Param('id') id: string)

@Get('medic/available')  // 85-qator — HECH QACHON ishlamaydi
findAvailable()

@Get('admin/all')        // 132-qator — HECH QACHON ishlamaydi
adminFindAll()
```

`:id` route birinchi e'lon qilingan va `medic/available`, `admin/all` ni ham ushlaydi. Bu NestJS ning route matching tartibidagi taniqli muammo.

---

## 8. UI/UX KAMCHILIKLARI

### 8.1 Yuklanish holatlari to'liq emas
- Admin: Skeleton loader bor (yaxshi)
- Web: Spinner bor, lekin ba'zi sahifalarda yo'q
- Web-medic: Minimal loading holati
- Mobile: Ba'zi ekranlarda xato yutib yuboriladi (`.catch(() => {})`)

### 8.2 Xato xabarlari foydalanuvchiga yetarli emas
```typescript
// mobile/app/(tabs)/index.tsx
.catch(() => {})  // Xato jimgina yutiladi — foydalanuvchi hech narsa ko'rmaydi

// medic/app/(tabs)/index.tsx
.catch(() => {})  // Xuddi shunday
```

### 8.3 Offline holat boshqarilmaydi
- Internet yo'qolganda hech qanday xabar ko'rsatilmaydi
- Oflayn rejim yo'q
- So'rovlar muvaffaqiyatsiz bo'lganda retry yo'q
- Network holat indikatori yo'q

### 8.4 Accessibility (a11y) past
- Alt text ko'p joylarda yo'q
- Keyboard navigatsiya tekshirilmagan
- Rang kontrasti tekshirilmagan
- Screen reader qo'llab-quvvatlanmaydi
- ARIA atributlari kam ishlatilgan

### 8.5 SEO to'liq emas (web loyihalar)
- `robots.txt` yo'q
- `sitemap.xml` yo'q
- Structured data (JSON-LD) yo'q
- Har sahifa uchun alohida meta taglar yo'q
- Canonical URLlar yo'q
- OpenGraph faqat asosiy sahifada

### 8.6 PWA to'liq emas
- Service Worker faqat web-push uchun
- Offline kesh yo'q
- Install prompt yo'q
- App manifest to'liq emas

---

## 9. FUNKSIONAL KAMCHILIKLAR

### 9.1 To'lov tizimi yo'q
- Hech qanday to'lov integratsiyasi (Payme, Click, Uzum Pay)
- Narxlar ko'rsatiladi, lekin to'lov qabul qilinmaydi
- Medik balansiga pul o'tkazish mexanizmi yo'q
- Kvitansiya/chek yaratish yo'q

### 9.2 Bildirishnoma tizimi to'liq emas
- Expo Push: ishlaydi, lekin `notifyClient` da `await` yo'q (xatolar yo'qoladi)
- Web Push: ishlaydi
- Telegram Bot: ishlaydi, lekin xatolar jimgina yutiladi
- SMS bildirishnoma: **mavjud emas**
- Email bildirishnoma: **mavjud emas**
- In-app notification center: **yo'q**

### 9.3 Medik hujjat tekshiruvi zaif
- Faqat rasm yuklash (yuz foto + litsenziya)
- AI/OCR tekshiruv yo'q
- Hujjat muddati tekshirilmaydi
- Admin faqat ko'z bilan tekshiradi
- Avtomatik eslatma (litsenziya muddati tugashi) yo'q

### 9.4 Buyurtma bekor qilish qoidalari yo'q
- Mijoz istalgan vaqtda bekor qilishi mumkin (jarima yo'q)
- Medik yo'lda bo'lganda ham bekor qilinishi mumkin
- Bekor qilish sababi so'ralmaydi
- Tez-tez bekor qiluvchilarga cheklov yo'q

### 9.5 Moliyaviy hisobotlar yo'q
- Admin panelda faqat umumiy daromad ko'rsatiladi
- Batafsil moliyaviy hisobot yo'q
- Mediklar uchun daromad hisoboti yo'q
- Soliq hisoboti yo'q
- Export (CSV, PDF) yo'q

### 9.6 Foydalanuvchi profil boshqaruvi cheklangan
- Mijoz parol o'zgartirishi mumkin emas
- Mijoz profilni tahrirlashi mumkin emas
- Medik malumotlarini yangilashi mumkin emas
- Account o'chirish imkoniyati yo'q (GDPR/ma'lumot himoyasi)

### 9.7 Izlash va filtrlash cheklangan
- Xizmatlarni qidirish yo'q (faqat kategoriya)
- Medikni nom bo'yicha qidirish yo'q (mijoz tomondan)
- Buyurtma tarixida filtrlash yo'q
- Manzil avtoto'ldirish yo'q (faqat reverse geocoding)

---

## 10. PERFORMANCE KAMCHILIKLARI

### 10.1 Database indekslar yo'q
```typescript
// Quyidagi ustunlarda indeks bo'lishi kerak:
User.phone       — login uchun (har safar qidiriladi)
Medic.phone      — login uchun
Order.clientId   — mijoz buyurtmalari ro'yxati
Order.medicId    — medik buyurtmalari ro'yxati
Order.status     — status bo'yicha filtrlash
Order.created_at — tartibga solish
Medic.verificationStatus — admin filtrlash
Medic.isOnline   — mavjud mediklar qidirish
```

### 10.2 N+1 query muammosi
- Buyurtmalar ro'yxatida har bir buyurtma uchun alohida query (service, medic, location)
- `eager: true` ba'zi aloqalarda, lekin barchada emas

### 10.3 Frontend caching yo'q
- Web/web-medic da API javoblari keshlanmaydi
- Har safar sahifa ochilganda barcha ma'lumotlar qayta yuklanadi
- Stale-while-revalidate strategiyasi yo'q
- Service worker caching yo'q

### 10.4 Rasm optimizatsiyasi yo'q
- `next/image` ishlatilmaydi (Next.js)
- Lazy loading yo'q
- WebP format konvertatsiyasi yo'q
- Cloudinary transformatsiyalari to'liq ishlatilmaydi

---

## 11. HUJJATLAR KAMCHILIKLARI

### 11.1 README.md primitiv
- Faqat boshqa hujjatlarga havolalar
- Quick start guide yo'q
- Arxitektura diagrammasi yo'q
- Screenshtlar yo'q (README ichida)

### 11.2 API hujjatlari faqat markdown
- `docs/BACKEND_API.md` — yaxshi, lekin interaktiv emas
- Swagger UI yo'q
- Postman collection yo'q
- API versiyalash yo'q

### 11.3 Kod ichida hujjatlar kam
- JSDoc/TSDoc deyarli yo'q
- Murakkab funksiyalar izohlarsiz
- Biznes logikasi tushuntirilmagan

### 11.4 Deployment guide yo'q
- Production deployment qadamlari hujjatlashtirilmagan
- Environment sozlamalari ro'yxati to'liq emas
- SSL/domain sozlash ko'rsatmasi yo'q
- Monitoring setup yo'q

---

## 12. BOZORGA TAYYORLIK KAMCHILIKLARI

### 12.1 Huquqiy talablar
- Foydalanish shartlari (Terms of Service) yo'q
- Maxfiylik siyosati (Privacy Policy) yo'q
- Tibbiy xizmat uchun litsenziya talablari tekshirilmagan
- GDPR/O'zbekiston ma'lumot himoyasi qonunlariga muvofiqlik yo'q

### 12.2 Analytics yo'q
- Google Analytics yo'q
- Mixpanel/Amplitude yo'q
- Foydalanuvchi xatti-harakatlarini kuzatish yo'q
- Conversion tracking yo'q
- A/B testing infratuzilmasi yo'q

### 12.3 Error tracking yo'q
- Sentry yo'q
- LogRocket yo'q
- Xatolar faqat server loglarida
- Frontend xatolar umuman kuzatilmaydi

### 12.4 Monitoring yo'q
- Server health monitoring yo'q
- Uptime monitoring yo'q
- Performance monitoring yo'q (APM)
- Database query monitoring yo'q
- Alert tizimi yo'q (server tushganda kim biladi?)

---

## XULOSA — ENG MUHIM 15 TA KAMCHILIK

### Kritik (darhol tuzatish kerak):
1. **Testlar yo'q** — hech qanday avtomatlashtirilgan test mavjud emas
2. **i18n yo'q** — O'zbek tili qo'llab-quvvatlanmaydi (bozor talabi)
3. **Credentials oshkor** — API kalitlari git tarixida
4. **CI/CD yo'q** — kod tekshiruvsiz deploy qilinadi
5. **Database migratsiyalar yo'q** — production da ma'lumot yo'qotish xavfi

### Yuqori (1-2 hafta ichida):
6. **TypeScript strict mode** — admin panelda barcha tekshiruvlar o'chirilgan
7. **Route konflikti** — backend da ba'zi endpointlar ishlamaydi
8. **To'lov tizimi yo'q** — asosiy biznes funksiyasi
9. **Error boundary yo'q** — frontend xatolar foydalanuvchiga yetadi
10. **WebSocket CORS `*`** — xavfsizlik teshigi

### O'rta (keyingi sprintlarda):
11. **Monorepo tooling yo'q** — tiplar dublikatsiya, build zanjiri yo'q
12. **State management izchil emas** — faqat admin da React Query
13. **API URL qattiq kodlangan** — web/web-medic da env var yo'q
14. **Monitoring/analytics yo'q** — production da ko'r holatda ishlash
15. **Accessibility past** — foydalanuvchi qulayligi cheklangan

---

## TAVSIYALAR — HARAKAT REJASI

### 1-hafta: Xavfsizlik va infratuzilma
```
- Barcha API kalitlarni rotate qilish
- CI/CD pipeline yaratish (GitHub Actions)
- TypeORM migratsiyalarni sozlash
- WebSocket CORS ni tuzatish
- Admin TypeScript strict mode yoqish
```

### 2-hafta: Sifat va testlar
```
- Jest (backend) va Vitest (frontend) sozlash
- Auth service unit testlar yozish
- Orders service unit testlar yozish
- Route konflikti tuzatish
- Error boundary qo'shish
```

### 3-hafta: Lokalizatsiya va UX
```
- i18n kutubxona qo'shish (next-intl, react-i18next)
- O'zbek tili tarjimalarini yaratish
- Til tanlash UI qo'shish
- Xizmat nomlarini ikki tilda saqlash
- Xato xabarlarini yaxshilash
```

### 4-hafta: Monitoring va deploy
```
- Sentry qo'shish (frontend + backend)
- Health check endpoint yaratish
- Staging muhit sozlash
- docker-compose.yml yaratish
- Deployment hujjatlarini yozish
```
