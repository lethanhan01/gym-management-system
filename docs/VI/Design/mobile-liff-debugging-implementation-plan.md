# Kế hoạch triển khai: Debug LIFF trên mobile

## 1. Mục tiêu và quyết định phạm vi

Cho phép debug ứng dụng trong LINE WebView khi chạy qua HTTPS tunnel của ngrok:

- Mở vConsole bằng `?debug=1`.
- Ghi lỗi JavaScript chưa xử lý vào database **chỉ trong phiên debug ở môi trường development**.
- Không làm thay đổi hành vi production, không tạo endpoint ingest log mở vĩnh viễn, và không thu thập dữ liệu nhận diện LINE.

Không nằm trong phạm vi: thay thế hệ thống observability production, phát hành endpoint đọc log, dashboard quản trị log, hoặc thêm dependency rate-limit riêng.

## 2. Kết quả rà soát bản plan ban đầu

| Vấn đề | Rủi ro | Quyết định trong plan mới |
|---|---|---|
| `initCrashReporter()` luôn chạy | Production ghi lỗi và dữ liệu trình duyệt ngoài chủ đích debug | Chỉ khởi tạo khi `import.meta.env.DEV` và query có `debug=1`. |
| `@Public()` cho endpoint ghi DB không có điều kiện | Có thể bị spam làm đầy DB; endpoint tồn tại ở production | API trả `404` trừ khi `DEBUG_LOGGING_ENABLED=true`; biến này chỉ đặt trong server development. |
| Lưu `window.location.href` | LIFF callback có thể chứa `code`, `liff.state` hoặc query nhạy cảm | Chỉ gửi `origin + pathname`; không gửi query/hash. |
| Lưu `liffUserId` | Đây là định danh cá nhân và không cần để tìm lỗi WebView | Loại bỏ khỏi schema, DTO và client payload. |
| DTO chỉ dùng `IsString`/`IsNumber` rồi cắt chuỗi ở service | Dữ liệu quá dài vẫn có thể gây lỗi DB; số thập phân/NaN bị nhận | Dùng `MaxLength`, `IsInt`, `Min(0)` và giới hạn payload ngay tại trust boundary. |
| Gán `window.onerror` | Có thể ghi đè handler hiện có | Dùng `addEventListener('error', ...)` và `addEventListener('unhandledrejection', ...)`. |
| `metadata` là object tự do | Không có contract, dễ vô tình chứa PII hoặc payload lớn | Bỏ `metadata`; contract log cố định, tối thiểu. |
| Kế hoạch không có kiểm thử tự động | Lỗi endpoint/validation/logic kích hoạt khó phát hiện | Thêm server integration test và client unit test mock `fetch`. |
| `allowedHosts` chỉ nêu cú pháp | Không nêu rõ chỉ dùng cho Vite dev, dễ bị đặt thành `true` | Allow-list duy nhất `'.ngrok-free.app'`; không dùng `allowedHosts: true`. |

## 3. Tiến độ đã kiểm tra (2026-08-17)

| Hạng mục | Trạng thái | Bằng chứng / việc còn lại |
|---|---|---|
| Cài `vconsole` | Hoàn thành | `client/package.json`, lockfile và `client/node_modules/vconsole` đều có `vconsole@3.15.1`. |
| Thêm Prisma `DebugLog` | Làm một phần | Model đã có trong `server/prisma/schema/notifications.prisma`; cần sửa lại theo contract tối thiểu ở mục 4.2. |
| Sinh Prisma Client | Hoàn thành | Current generated client đã có `prisma.debugLog`. |
| Đồng bộ database | Chưa xác nhận | Không có bằng chứng `debug_logs` đã tồn tại; chạy `npm run prisma:push` sau khi chốt schema. |
| API debug-log | Chưa làm | Chưa có `server/src/debug-log/`. |
| Client helper và tích hợp bootstrap | Chưa làm | Chưa có `client/src/lib/debug.ts`; `main.tsx` chưa gọi helper. |
| Vite/ngrok docs/verification | Chưa làm | `vite.config.ts` chưa có allow-list; chưa có tài liệu workflow. |

Các thay đổi worktree khác (PT booking, i18n, training) không thuộc scope này và không được sửa trong quá trình triển khai plan này.

## 4. Thiết kế đã chốt

### 4.1. Bật/tắt và luồng dữ liệu

```
LINE WebView -> https ngrok -> Vite :5173 -> proxy /api -> Nest :3000 -> debug_logs
                       |                         |
                ?debug=1 + DEV          DEBUG_LOGGING_ENABLED=true
```

Điều kiện phía client là `import.meta.env.DEV && new URLSearchParams(location.search).has('debug')`. Khi điều kiện sai, không import vConsole, không đăng ký global error listener, không gửi request.

Điều kiện phía server là `DEBUG_LOGGING_ENABLED=true`. Nếu sai, `POST /api/v1/debug-logs` trả `404`; model DB có thể vẫn tồn tại nhưng không nhận dữ liệu. Thêm biến này vào validation config và `.env.example` với giá trị mặc định `false`. Không dùng token bí mật ở browser: mọi giá trị nhúng vào client đều có thể bị lộ.

Request đi cùng origin qua Vite proxy, dùng `fetch` với `credentials: 'omit'`, không dùng axios hay JWT interceptor. Endpoint trả `204 No Content`; không trả record vừa tạo.

### 4.2. Contract log tối thiểu

Sửa model `DebugLog` hiện có thành các field sau; bỏ `liffUserId` và `metadata`:

| Field | DB / validation | Nguồn |
|---|---|---|
| `id` | `BigInt` auto-increment | Server |
| `message` | string, 1–2000 ký tự | `ErrorEvent.message` hoặc rejection reason |
| `source` | optional string, tối đa 500; nếu là URL thì bỏ query/hash | `ErrorEvent.filename` |
| `lineno`, `colno` | optional integer, >= 0 | `ErrorEvent` |
| `stack` | optional string, tối đa 8000 | `Error.stack` khi có |
| `pagePath` | string, tối đa 2000, mapped `page_path` | `location.origin + location.pathname` |
| `userAgent` | string, tối đa 500 | `navigator.userAgent` |
| `isLineApp` | boolean | UA detection |
| `createdAt` | server timestamp | Server |

`CreateDebugLogDto` phải dùng `@IsString`, `@IsNotEmpty`, `@MaxLength`; các số dùng `@IsInt`, `@Min(0)`, `@IsOptional`; boolean dùng `@IsBoolean`. Giữ global `ValidationPipe` với `whitelist` và `forbidNonWhitelisted`. Mọi field dài bị reject `400`, không âm thầm truncate; lỗi client cũng đã giới hạn chuỗi trước khi gửi để reporter luôn best-effort.

### 4.3. Backend API

Tạo module `server/src/debug-log/` gồm DTO, service, controller và module. Service chỉ inject `PrismaService`, kiểm tra feature flag qua `ConfigService`, rồi gọi `prisma.debugLog.create`. Controller là `@Public() @Post()` nhưng chỉ vì lỗi có thể xảy ra trước login; feature flag là biện pháp chặn quyết định. Đặt `@HttpCode(HttpStatus.NO_CONTENT)`.

Không thêm API GET/list hoặc RBAC mới: Prisma Studio/SQL đã đủ để xem log trong thời gian debug. Cũng không thêm rate-limiter mới vì endpoint bị tắt theo mặc định và scope là một Vite development tunnel; nếu cần public staging lâu dài thì phải thiết kế rate limit/proxy protection riêng trước.

### 4.4. Client helper

Tạo `client/src/lib/debug.ts` với một hàm bootstrap duy nhất, ví dụ `initMobileDebugging()`:

1. Thoát ngay nếu không phải DEV hoặc thiếu `?debug=1`.
2. Dynamic import `vconsole`, khởi tạo đúng một lần; lỗi import chỉ ghi `console.warn`, không làm hỏng app.
3. Đăng ký `error` và `unhandledrejection` bằng event listener.
4. Chuẩn hoá lỗi về contract ở mục 4.2, cắt chuỗi trước khi `fetch` để giới hạn body, và gửi fire-and-forget tới `/api/v1/debug-logs`.
5. Dùng một cờ in-flight để tránh reporter tự tạo vòng lặp; không gọi `liff.getOS()` hoặc API LIFF nào trong reporter.

Gọi hàm này trong `client/src/main.tsx` trước kiểm tra redirect callback LIFF. Chuẩn hoá mọi URL được gửi trong `source` về `origin + pathname`. Query `debug=1` phải được giữ nguyên khi redirect từ `/` sang `/liff`; test thủ công xác nhận vConsole được mount lại ở trang đích.

### 4.5. Tunnel và tài liệu

Trong `client/vite.config.ts`, thêm `allowedHosts: ['.ngrok-free.app']` trong `server`. Đây chỉ là Vite dev-server configuration; không bật wildcard `true`.

Tạo `docs/VI/Debugging/mobile-liff.md` mô tả:

1. Start server `npm run dev`, sau đó start client `npm run dev`.
2. Chạy `ngrok http 5173`, đặt URL HTTPS nhận được làm LIFF Endpoint URL, save trên LINE Developers console rồi mở lại LIFF.
3. Thêm `?debug=1` khi mở LIFF để bật vConsole và crash reporting; không dùng query này cho kiểm thử production.
4. Kiểm tra logs bằng Prisma Studio/SQL, và cách xóa các log development sau phiên debug.
5. URL ngrok đổi khi restart tunnel nên Endpoint URL phải cập nhật lại.

Chỉ sau khi tài liệu tồn tại mới thêm một dòng Gotcha trỏ đến nó trong `CLAUDE.md`.

## 5. Thứ tự triển khai

- [ ] Sửa `DebugLog` schema theo contract tối thiểu, bổ sung config flag + `.env.example`.
- [ ] Chạy `cd server && npm run prisma:push && npm run prisma:generate`.
- [ ] Tạo module/API debug-log và server tests.
- [ ] Tạo `client/src/lib/debug.ts`, gọi bootstrap tại `main.tsx`, và thêm client tests.
- [ ] Thêm Vite allow-list, tài liệu tunnel và dòng Gotcha.
- [ ] Chạy các kiểm thử tự động, build hai project, rồi verify trên điện thoại/LINE.

## 6. Verification checklist

### Tự động

- [ ] `cd server && npm test -- debug-log` — valid payload tạo log, payload thiếu/sai/quá dài bị `400`, flag false trả `404`.
- [ ] `cd client && npm test -- debug` — không làm gì khi không có flag, payload không có query/hash, `fetch` failure không ném lỗi/vòng lặp.
- [ ] `cd server && npm run build` và `cd client && npm run build` thành công.

### Thủ công

- [ ] Với `DEBUG_LOGGING_ENABLED=true`, POST payload hợp lệ trả `204` và có row `debug_logs`.
- [ ] `http://localhost:5173/?debug=1` hiện vConsole; URL không có query debug thì không import/mount vConsole.
- [ ] Một lỗi mock trong `?debug=1` tạo đúng một row và `pagePath` không chứa `?`, `#`, `code` hay `liff.state`.
- [ ] Khi flag server là false, API không ghi DB và trả `404`.
- [ ] Qua ngrok, Vite không báo blocked host; LIFF callback root redirect sang `/liff` vẫn giữ `debug=1` và vConsole hoạt động.
- [ ] Sau phiên debug, tắt `DEBUG_LOGGING_ENABLED` và xóa log development nếu không còn cần giữ.

## 7. File manifest

| File | Action |
|---|---|
| `server/prisma/schema/notifications.prisma` | MODIFY existing partial `DebugLog` model |
| `server/src/config/configuration.ts`, `server/.env.example` | MODIFY feature flag |
| `server/src/debug-log/*` | NEW module, controller, service, DTO, tests |
| `server/src/app.module.ts` | MODIFY import module |
| `client/src/lib/debug.ts`, `client/src/lib/debug.test.ts` | NEW |
| `client/src/main.tsx`, `client/vite.config.ts` | MODIFY |
| `docs/VI/Debugging/mobile-liff.md` | NEW workflow |
| `CLAUDE.md` | MODIFY only after workflow document exists |
