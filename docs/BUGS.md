# HamshiraGo - Xatoliklar hisoboti

> Sana: 2026-03-01
> Jami: 39 ta bug topildi (7 kritik, 8 yuqori, 18 o'rta, 6 past)

---

## Onboarding Test Natijalari

### To'liq oqim xulosasi

**Mijoz tomoni** (web, localhost:3001):
1. "Тест Клиент" (+998901234567) ro'yxatdan o'tdi
2. Dashboard — 6 ta kategoriyada 9 ta xizmat
3. "Внутримышечный укол" tanlandi (35,000 UZS)
4. Manzil kiritildi: "ул. Навои 12" (Leaflet xarita bilan)
5. Tasdiqlash sahifasi — birinchi buyurtma uchun 10% chegirma (-3,500 = 31,500 UZS)
6. Buyurtma yaratildi — 7 bosqichli kuzatuv sahifasi
7. Buyurtma tugadi — medikga 5 yulduz baho berildi

**Medik tomoni** (web-medic, localhost:3002):
1. "Тест Медик" ro'yxatdan o'tdi (5 yil tajriba)
2. Admin API orqali tasdiqlandi (APPROVED)
3. Onlayn holat yoqildi — 1 ta mavjud buyurtma ko'rindi
4. Buyurtma qabul qilindi — 6 ta bosqichdan o'tdi:
   Tayinlangan — Qabul qilingan — Yo'lda — Yetib keldi — Xizmat ko'rsatilmoqda — Bajarildi
5. "Спасибо за работу" tasdiqlash xabari bilan yakunlandi

### Onboarding bahosi: 8/10

| Jihat | Baho | Izoh |
|-------|------|------|
| Mijoz ro'yxatdan o'tishi | 9/10 | Toza, oddiy, tez |
| Xizmat tanlash | 9/10 | Yaxshi kategoriyalar, aniq narxlar |
| Buyurtma yaratish oqimi | 8/10 | Xarita + manzil + tasdiqlash yaxshi ishlaydi |
| Medik ro'yxatdan o'tishi | 7/10 | Ishlaydi, lekin verifikatsiya kutish chalkash |
| Medik buyurtma qabul qilishi | 9/10 | Aniq buyurtma kartasi |
| Status oqimi (medik) | 9/10 | Silliq 6 bosqichli jarayon |
| Status kuzatuvi (mijoz) | 8/10 | 7 bosqichli stepper |
| Baholash tizimi | 8/10 | Oddiy va samarali |
| Umumiy dizayn | 8/10 | Professional, izchil UI |

**Kamchiliklari**: Medik verifikatsiyasi admin aralashuvini talab qiladi (kutish vaqti/tushuntirish yo'q); mijoz tomonida real-vaqt WebSocket yangilanishlari yo'q (sahifani yangilash kerak); test paytida SMS/push bildirishnoma ko'rinmadi.

---

## KRITIK (7 ta bug)

### BUG 1: Buyurtma qabul qilishda race condition
- **Fayl:** `backend/src/orders/orders.service.ts:278-299`
- **Muammo:** Ikkita medik bir vaqtda bitta buyurtmani qabul qilishi mumkin. `acceptOrder` metodi buyurtmani o'qiydi, `status !== CREATED` tekshiradi, keyin yangilaydi. O'qish va yozish orasida ikkita medik bir vaqtda tekshiruvdan o'tishi mumkin.
- **Ta'siri:** Ikki marta tayinlash — ikkinchi medik birinchisini qayta yozadi.
- **Yechim:** Atomik `UPDATE orders SET medicId=?, status='ASSIGNED' WHERE id=? AND status='CREATED'` ishlatish.

### BUG 2: Autentifikatsiyasiz status yangilash
- **Fayl:** `backend/src/orders/orders.controller.ts:76-80`
- **Muammo:** `PATCH /orders/:id/status` endpoint `JwtAuthGuard` ishlatadi (mijoz VA medikga ruxsat beradi) va `ordersService.updateStatus(id, dto)` ni chaqiradi — bunda **hech qanday avtorizatsiya tekshiruvi yo'q**. Har qanday autentifikatsiya qilingan foydalanuvchi har qanday buyurtma statusini har qanday qiymatga o'zgartirishi mumkin.
- **Ta'siri:** Xavfsizlik teshigi — to'liq holatlar mashinasini chetlab o'tish.
- **Yechim:** Egasi tekshiruvi qo'shish (mijoz yoki tayinlangan medik ekanligini tekshirish).

### BUG 3: WebSocket avtorizatsiyasiz
- **Fayl:** `backend/src/realtime/order-events.gateway.ts:61-71`
- **Muammo:** `subscribe_order` handler har qanday autentifikatsiya qilingan WebSocket mijoziga har qanday buyurtma xonasiga kirishga ruxsat beradi. Foydalanuvchi buyurtmaning mijozi yoki tayinlangan medik ekanligini tekshirmaydi.
- **Ta'siri:** Har qanday foydalanuvchi har qanday buyurtmaning status yangilanishlari va medik GPS koordinatalarini olishi mumkin — manzil va shaxsiy ma'lumotlar oqishi.

### BUG 4: GET /orders/:id egasi tekshiruvisiz
- **Fayl:** `backend/src/orders/orders.controller.ts:51-54`
- **Muammo:** `findOne` endpoint `JwtAuthGuard` ishlatadi lekin chaqiruvchi buyurtmaning mijozi yoki tayinlangan medik ekanligini tekshirmaydi.
- **Ta'siri:** Har qanday autentifikatsiya qilingan foydalanuvchi UUID ni topib/sanab har qanday buyurtma tafsilotlarini ko'rishi mumkin (mijoz manzili va telefon raqami).

### BUG 5: Admin parol timing-attack ga zaif
- **Fayl:** `backend/src/auth/auth.service.ts:53`
- **Muammo:** `username !== adminUsername || password !== adminPassword` to'g'ridan-to'g'ri string taqqoslash ishlatadi. Bu timing hujumlariga zaif.
- **Yechim:** `crypto.timingSafeEqual()` ishlatish.

### BUG 6: Telefon raqam validatsiyasi yo'q
- **Fayllar:** `backend/src/auth/dto/register-client.dto.ts:4`, `login.dto.ts:4`, `register-medic.dto.ts:4`
- **Muammo:** Telefon maydonlari faqat `@IsString()` ishlatadi, format validatsiyasi yo'q. Foydalanuvchilar har qanday stringni telefon raqam sifatida ro'yxatdan o'tkazishi mumkin.
- **Yechim:** `@Matches(/^\+998\d{9}$/)` regex qo'shish.

### BUG 7: RegisterClientDto.name ixtiyoriy maydon validatsiyasi
- **Fayl:** `backend/src/auth/dto/register-client.dto.ts:11-13`
- **Muammo:** `name` maydoni `@IsString()` bor lekin `@IsOptional()` yo'q. TypeScript turida `name?: string` lekin `@IsString()` dekoratori `undefined` ni rad qiladi.
- **Yechim:** `@IsOptional() @IsString()` qo'shish.

---

## YUQORI (8 ta bug)

### BUG 8: Medik refreshProfile noto'g'ri pattern
- **Fayl:** `medic/context/AuthContext.tsx:68-76`
- **Muammo:** `refreshProfile` funksiyasi `setState` callback ichida async API chaqiruvni ishga tushiradi. setState callback sinxron bo'lishi kerak. Async `apiFetch` chaqiruvi ichida ishga tushadi lekin tashqi `setState` darhol `s` qaytaradi.

### BUG 9: ClientId dekoratori bo'sh string qaytaradi
- **Fayl:** `backend/src/auth/decorators/client-id.decorator.ts:3-8`
- **Muammo:** `request.user` undefined bo'lganda dekorator xato tashlash o'rniga `''` (bo'sh string) qaytaradi. Bu xizmat qatlamida `clientId = ''` bilan buyurtmalar yaratishi mumkin.

### BUG 10: updateStatus holatlar mashinasi validatsiyasiz
- **Fayl:** `backend/src/orders/orders.service.ts:199-205`
- **Muammo:** `updateStatusByMedic` dan farqli o'laroq, `updateStatus` metodi har qanday `OrderStatus` qabul qiladi va to'g'ridan-to'g'ri saqlaydi. BUG 2 bilan birgalikda har qanday foydalanuvchi har qanday buyurtmani har qanday statusga o'tkazishi mumkin (DONE dan CREATED ga qaytarish ham mumkin).

### BUG 11: WebSocket CORS barcha originlarga ruxsat beradi
- **Fayl:** `backend/src/realtime/order-events.gateway.ts:23`
- **Muammo:** `@WebSocketGateway({ cors: { origin: '*' } })` har qanday origindan WebSocket ulanishlariga ruxsat beradi, REST API esa qat'iy origin ro'yxatiga ega.
- **Yechim:** WebSocket CORS ni REST API bilan bir xil allowedOrigins ga moslashtirish.

### BUG 12: Admin login body validatsiyasi yo'q
- **Fayl:** `backend/src/auth/auth.controller.ts:100-102`
- **Muammo:** `adminLogin` metodi `@Body() body: { username: string; password: string }` oddiy interface sifatida qabul qiladi, validatsiya qilingan DTO emas.

### BUG 13: Route mos kelish konflikti
- **Fayl:** `backend/src/orders/orders.controller.ts:51 vs 85`
- **Muammo:** `GET /orders/medic/available` (85-qator) va `GET /orders/:id` (51-qator) ikkalasi ham `@Get` routelar. NestJS routelarni e'lon tartibida moslashtiradi, shuning uchun `GET /orders/medic/available` `:id` tomonidan birinchi ushlab qolinadi (`id = 'medic'`). UUID kutilganligi uchun "Order not found" xato beradi. Xuddi shunday `GET /orders/admin/all` ham.
- **Yechim:** Statik routelarni (`medic/available`, `admin/all`) `:id` parametrli routedan OLDIN joylashtirish.

### ✅ BUG 14: web-medic barcha buyurtmalarni yuklaydi bitta topish uchun — ИСПРАВЛЕН
- **Fayl:** `web-medic/app/order/[id]/page.tsx:51-66`
- **Muammo:** `loadOrder` funksiyasi `medicApi.orders.my()` (BARCHA medik buyurtmalarini yuklaydi), keyin `id` bo'yicha client tomonida filtrlaydi. Buyurtmalar ko'paygan sari samarasiz bo'ladi.
- **Tuzatish:** To'g'ridan-to'g'ri `GET /orders/:id` ishlatilmoqda.

### BUG 15: Web client CreateOrderDto ortiqcha maydonlar
- **Fayl:** `web/lib/api.ts:143-156`
- **Muammo:** Web client `CreateOrderDto` turida `serviceTitle` va `priceAmount` maydonlari bor, lekin backend DTO da bu maydonlar yo'q (server tomonida `serviceId` dan hisoblanadi). `whitelist: true` tufayli bu maydonlar o'chiriladi.

---

## O'RTA (18 ta bug)

### BUG 16: Web push eskirgan obunalarni o'chirish
- **Fayl:** `backend/src/realtime/web-push.service.ts:131`
- **Muammo:** `delete()` da array of condition objects ishlatiladi — `DELETE ... WHERE endpoint IN (...)` dan kamroq samarali.

### BUG 17: notifyClient push operatsiyalarini kutmaydi
- **Fayl:** `backend/src/orders/orders.service.ts:48-72`
- **Muammo:** `this.pushService.send()` va `this.webPushService.sendToSubscriber()` `await` siz chaqiriladi. Xatolar jimgina yo'qoladi.

### BUG 18: JwtPayload turida admin roli yo'q
- **Fayl:** `backend/src/auth/strategies/jwt.strategy.ts:8`
- **Muammo:** `JwtPayload` `{ sub: string; role: 'client' | 'medic' }` deb tiplangan, lekin admin tokenlarida `role: 'admin'`. Admin token `JwtStrategy` orqali validatsiya qilinsa, `client` branch ga tushadi va `UnauthorizedException` tashlaydi.

### BUG 19: discountAmount entity tur nomuvofiqligi
- **Fayl:** `backend/src/orders/entities/order.entity.ts:40`
- **Muammo:** `discountAmount` TypeScript da `number` (not nullable), lekin ustun `nullable: true`. Mavjud qatorlarda `null` bo'lishi mumkin.

### BUG 20: Auth token saqlanmaydi (mobil ilovalar)
- **Fayl:** `mobile/context/AuthContext.tsx:24`, `medic/context/AuthContext.tsx:37`
- **Muammo:** Mobil auth holati faqat `useState` ishlatadi — `AsyncStorage` yoki `SecureStore` persistensi yo'q. Ilova o'chirilib qayta ishga tushirilganda foydalanuvchi chiqib ketadi.
- **Yechim:** `expo-secure-store` bilan tokenlarni saqlash.

### BUG 21: Mavjud bo'lmagan routega navigatsiya
- **Fayl:** `mobile/app/(tabs)/two.tsx:212`
- **Muammo:** `OrderCard` komponenti `'/order/track'` ga navigate qiladi, lekin `mobile/app/order/` da `track.tsx` fayli yo'q. Faqat `confirm.tsx`, `location.tsx` va `_layout.tsx` bor. Bu 404 ekran beradi.

### BUG 22: useEffect dependency yo'q
- **Fayl:** `mobile/app/order/location.tsx:131`
- **Muammo:** `useEffect(() => { fetchLocation(); }, []);` — `fetchLocation` useEffect dependency arrayida yo'q.

### BUG 23: Cheksiz qayta yuklash loop xavfi
- **Fayl:** `mobile/app/order/location.tsx:133-136`
- **Muammo:** `fetchNearbyMedics` dependency arrayda, u `token` ga bog'liq. Auth holat o'zgarishi `fetchNearbyMedics` ni qayta yaratadi, effect ni qayta ishga tushiradi.

### BUG 24: Bosh sahifa xatolarni jimgina yutadi
- **Fayl:** `mobile/app/(tabs)/index.tsx:24`
- **Muammo:** `.catch(() => {})` barcha xatolarni jimgina yutadi. API ishlamasa, foydalanuvchi bo'sh ekran ko'radi, xato xabari yoki qayta urinish yo'q.

### BUG 25: Medik buyurtmalar sahifasi xatolarni e'tiborsiz qoldiradi
- **Fayl:** `medic/app/(tabs)/index.tsx:122-124`
- **Muammo:** `fetchOrders` barcha xatolarni ushlaydi va hech narsa qilmaydi.

### ✅ BUG 26: Qattiq kodlangan localhost:3000 — ИСПРАВЛЕН
- **Fayllar:** `web/lib/api.ts:1`, `web-medic/lib/api.ts:1`
- **Muammo:** `const BASE_URL = "http://localhost:3000"` qattiq kodlangan. Environment variable fallback yo'q. Production da ishlamaydi.
- **Tuzatish:** `NEXT_PUBLIC_API_URL` env variable ishlatilmoqda.

### ✅ BUG 27: API javob turi nomuvofiqligi — ИСПРАВЛЕН
- **Fayl:** `web/lib/api.ts:58`
- **Muammo:** `list: () => request<Order[]>("/orders")` massiv kutadi, lekin backend `{ data: Order[], total, page, totalPages }` qaytaradi. Web client massiv bo'lmagan ob'yektni iteratsiya qilishga harakat qiladi.
- **Tuzatish:** `request<{ data: Order[] }>("/orders").then(r => r.data)` ishlatilmoqda.

### ✅ BUG 28: WebSocket tozalash muammosi — ИСПРАВЛЕН
- **Fayl:** `web/app/orders/[id]/page.tsx:118-152`
- **Muammo:** `useEffect` cleanup faqat `socket.disconnect()` chaqiradi, `unsubscribe_order` emit qilmaydi. Server `clientOrderRooms` map da obunani saqlab qoladi.
- **Tuzatish:** `unsubscribe_order` emit qilinmoqda disconnect oldidan.

### ✅ BUG 29: Web client to'g'ridan-to'g'ri DONE statusiga o'tkazishi mumkin — ИСПРАВЛЕН
- **Fayl:** `web/app/orders/[id]/page.tsx:174-185`
- **Muammo:** `handleConfirmDone` funksiyasi `api.orders.updateStatus(id, "DONE")` chaqiradi. BUG 2 va BUG 10 tufayli har qanday mijoz har qanday buyurtmani DONE qilishi mumkin.
- **Tuzatish:** `confirmDone` endpoint ishlatilmoqda, status client tomonida qattiq DONE ga qo'yilgan.

### ✅ BUG 30: Dashboard daromad faqat birinchi 100 ta buyurtmani hisobga oladi — ИСПРАВЛЕН
- **Fayl:** `admin/src/pages/Dashboard.tsx:39-41`
- **Muammo:** `getOrders(1, 100, "DONE")` faqat birinchi 100 ta bajarilgan buyurtmani yuklaydi. 100 dan ortiq bo'lsa daromad kam ko'rsatiladi.
- **Tuzatish:** Parallel pagination — barcha sahifalar bir vaqtda yuklanadi.

### ✅ BUG 31: Dashboard "bugun" hisob 100 ta bilan cheklangan — ИСПРАВЛЕН
- **Fayl:** `admin/src/pages/Dashboard.tsx:45-49`
- **Muammo:** `getOrders(1, 100)` faqat oxirgi 100 buyurtmani yuklaydi. "Bugun" soni va 7 kunlik grafik shu qisqartirilgan ma'lumotlardan hisoblanadi.
- **Tuzatish:** Parallel pagination — barcha sahifalar yuklanadi.

### ✅ BUG 32: Admin routelar faqat token mavjudligini tekshiradi — ИСПРАВЛЕН
- **Fayl:** `admin/src/App.tsx:27-33`
- **Muammo:** `hasAdminToken()` faqat localStorage da token stringi borligini tekshiradi — token yaroqli yoki muddati o'tmaganligini tekshirmaydi.
- **Tuzatish:** `hasAdminToken()` JWT payload dagi `exp` ni tekshiradi.

### ✅ BUG 33: Admin JWT localStorage da — XSS ga zaif — ЧАСТИЧНО ИСПРАВЛЕН
- **Fayl:** `admin/src/lib/api.ts:28-44`
- **Muammo:** Admin JWT localStorage da saqlanadi. Agar admin panelda biron XSS zaiflik bo'lsa, hujumchi admin JWT ni o'g'irlashi mumkin.
- **Tuzatish:** `vercel.json` da qat'iy CSP, X-Frame-Options, X-Content-Type-Options headerlar qo'shildi — XSS xavfi kamaydi. HttpOnly cookie ga o'tkazish backend tarafida kerak.

---

## PAST (6 ta bug)

### BUG 34: name maydonda @IsOptional() yo'q
- **Fayl:** `backend/src/auth/dto/register-client.dto.ts`

### ✅ BUG 35: User.phone da DB unique constraint yo'q — ИСПРАВЛЕН
- **Fayl:** `backend/src/users/entities/user.entity.ts:17`
- **Muammo:** `phone` ustunida `unique: true` constraint yo'q. `registerClient` xizmati dublikatlarni tekshiradi, lekin unique index bo'lmasa, parallel ro'yxatdan o'tishlar dublikat foydalanuvchilar yaratishi mumkin. Xuddi shunday `Medic.phone` uchun ham.
- **Tuzatish:** `@Index({ unique: true })` qo'shildi `User.phone`, `Medic.phone` ga.

### BUG 36: Order.location aloqasi mo'rt
- **Fayl:** `backend/src/orders/orders.service.ts`
- **Muammo:** `notifyClient` `adminCancelOrder` dan chaqirilganda, `order` birinchi `findOne` dan yuklangan (qayta yuklanishdan oldin). Ishlaydi lekin mo'rt.

### BUG 37: Medik balance tur nomuvofiqligi
- **Fayl:** `backend/src/medics/entities/medic.entity.ts:63`
- **Muammo:** `balance` `decimal(12,2)` sifatida saqlanadi lekin `number` deb tiplangan. TypeORM PostgreSQL da decimal ustunlarni string qaytaradi.

### BUG 38: medic_location event GPS ni barcha obunachilarga tarqatadi
- **Fayl:** `backend/src/realtime/order-events.gateway.ts:124`
- **Muammo:** `emitMedicLocation` butun `order:${orderId}` xonasiga emit qiladi. BUG 3 bilan birgalikda har qanday foydalanuvchi medik GPS koordinatalarini olishi mumkin.

### BUG 39: handleMedicLocation medik tayinlanganligini tekshirmaydi
- **Fayl:** `backend/src/realtime/order-events.gateway.ts:91-107`
- **Muammo:** Har qanday autentifikatsiya qilingan medik har qanday buyurtma ID uchun lokatsiya yangilanishlarini emit qilishi mumkin. Faqat `role === 'medic'` tekshiradi.

---

## Eng shoshilinch 5 ta tuzatish

1. **BUG 2+10**: `PATCH /orders/:id/status` ga egasi tekshiruvi va holatlar mashinasi validatsiyasi qo'shish
2. **BUG 13**: `orders.controller.ts` da routelarni qayta tartiblash — statik routelar `:id` dan OLDIN
3. **BUG 1**: Buyurtma qabul qilishda atomik `UPDATE ... WHERE status='CREATED'` ishlatish
4. **BUG 11**: WebSocket CORS ni REST API ruxsat ro'yxatiga moslashtirish
5. **BUG 20**: Mobil/medik ilovalarda auth tokenlarni `expo-secure-store` bilan saqlash
