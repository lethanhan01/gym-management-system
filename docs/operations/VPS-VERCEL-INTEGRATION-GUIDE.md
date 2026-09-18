# Hướng dẫn Kết nối Frontend (Vercel) với Backend Docker qua aaPanel (VPS)

Tài liệu này hướng dẫn chi tiết quy trình kết nối Frontend React/Vite (đang chạy trên Vercel với HTTPS) tới Backend NestJS chạy Docker trên VPS quản trị bằng **aaPanel**, đồng thời thiết lập kiến trúc chuẩn để **dễ dàng mở rộng cho nhiều container server khác trong tương lai**.

---

## 🏗️ 1. Mô hình Kiến trúc Đa Container (Multi-Container) trên aaPanel

Tất cả container backend chỉ lắng nghe nội bộ trên dải IP Loopback `127.0.0.1` với các cổng khác nhau. Nginx (đã cài sẵn trên aaPanel) làm nhiệm vụ Reverse Proxy duy nhất tiếp nhận traffic HTTPS từ cổng 443 và định tuyến theo tên miền con (subdomain).

```mermaid
flowchart TD
    UserFE["💻 Client Browser / LIFF (HTTPS)<br/>https://gym-fe.vercel.app"]
    LINE["💬 LINE Messaging API<br/>(Webhook Callbacks)"]

    subgraph VPS ["🖥️ VPS Server (aaPanel)"]
        subgraph Security ["🛡️ Tường lửa VPS / aaPanel"]
            Ports["Chỉ mở Port 80 (HTTP) & 443 (HTTPS)<br/>🚫 Đóng Port 22 & Không mở các port nội bộ 3001, 3002..."]
        end

        subgraph AAPanelNginx ["🌐 Nginx trên aaPanel (Reverse Proxy & SSL)"]
            Site1["Site 1: rogym-api.lethanhan01.id.vn<br/>(SSL Let's Encrypt / Wildcard)"]
            Site2["Site 2: project2-api.lethanhan01.id.vn<br/>(Dự án tương lai)"]
        end

        subgraph DockerNet ["🐳 Docker Containers (Chỉ bind 127.0.0.1)"]
            ContainerGym["gym-server (Dự án Gym)<br/>Port: 127.0.0.1:3001"]
            ContainerP2["project2-server (Dự án 2)<br/>Port: 127.0.0.1:3002"]
        end
    end

    subgraph Database ["🐘 PostgreSQL / Supabase"]
        DB[("🐘 Supabase DB")]
    end

    UserFE -->|"1. REST Requests (HTTPS)"| Site1
    UserFE -->|"2. Real-time WebSocket (WSS)"| Site1
    LINE -->|"3. Webhook Events"| Site1

    Site1 -->|"Reverse Proxy http://127.0.0.1:3001"| ContainerGym
    Site2 -->|"Reverse Proxy http://127.0.0.1:3002"| ContainerP2
    ContainerGym -->|"Query / Mutation"| DB
```

---

## 📐 2. Chiến lược Tên miền & Phân bổ Cổng cho Nhiều Container

Để dễ quản lý và mở rộng không giới hạn các container server trên cùng một tên miền chính `lethanhan01.id.vn`:

| Dự án | Subdomain (Record A) | Cổng Host (`HOST_PORT`) | Cổng Container | URL công khai (HTTPS) |
| :--- | :--- | :--- | :--- | :--- |
| **Gym Management (Hiện tại)** | `rogym-api.lethanhan01.id.vn` | `127.0.0.1:3001` | `3000` | `https://rogym-api.lethanhan01.id.vn` |
| **Dự án B (Tương lai)** | `shop-api.lethanhan01.id.vn` | `127.0.0.1:3002` | `8080` (hoặc tuỳ chọn) | `https://shop-api.lethanhan01.id.vn` |
| **Dự án C (Tương lai)** | `bot-api.lethanhan01.id.vn` | `127.0.0.1:3003` | `5000` | `https://bot-api.lethanhan01.id.vn` |

> [!TIP]
> **Ưu điểm của mô hình subdomain cấp 1 (`[project]-api.lethanhan01.id.vn`)**:
> 1. Mỗi container hoàn toàn độc lập, không bị xung đột routing hay session path `/`.
> 2. Có thể sử dụng lại cùng 1 chứng chỉ Wildcard SSL `*.lethanhan01.id.vn` cho toàn bộ các dịch vụ con, hoặc cấp chứng chỉ Let's Encrypt riêng trong aaPanel chỉ với 1 click.
> 3. Tuyệt đối an toàn: Không cần mở bất kỳ cổng nào ngoài 80 và 443.

---

## 🌐 BƯỚC 1: Cấu hình DNS Record trỏ về VPS

1. Truy cập trang quản lý DNS của tên miền `lethanhan01.id.vn` (Cloudflare hoặc nhà cung cấp tên miền).
2. Tạo bản ghi cho dịch vụ Gym API:
   - **Type**: `A`
   - **Name**: `gym-api` (sẽ tạo thành `rogym-api.lethanhan01.id.vn`)
   - **IPv4 Address**: Địa chỉ IP Public của VPS.
   - **TTL**: `Auto` hoặc `5 minutes`.
   - *(Lưu ý nếu dùng Cloudflare)*: Tạm thời chuyển sang chế độ **DNS Only (Đám mây xám)** nếu bạn muốn aaPanel tự xác thực cấp SSL Let's Encrypt qua giao thức HTTP-01.

> [!NOTE]
> *(Mẹo cho tương lai)*: Bạn có thể tạo sẵn một bản ghi Wildcard:
> - **Type**: `A`, **Name**: `*`, **Value**: `IP_VPS`.
> Như vậy sau này mọi subdomain như `project2-api.lethanhan01.id.vn`, `project3-api.lethanhan01.id.vn` sẽ tự động trỏ về VPS mà bạn không cần phải vào trang DNS cấu hình lại từng cái.

---

## 🖥️ BƯỚC 2: Thao tác trên aaPanel (Tạo Site, SSL & Reverse Proxy)

Vì bạn đã có sẵn Nginx trên aaPanel, toàn bộ cấu hình Web Server được thực hiện qua giao diện đồ hoạ cực kỳ trực quan:

### 2.1 Tạo Website mới cho Subdomain
1. Đăng nhập vào trang quản trị **aaPanel**.
2. Chọn menu **Website** ở thanh bên trái → bấm nút **Add site**.
3. Điền các thông số:
   - **Domain**: `rogym-api.lethanhan01.id.vn`
   - **Description**: `Gym Management Backend API`
   - **Database**: `No` (vì dùng Supabase / Docker database riêng)
   - **PHP Version**: Chọn `Pure PHP` hoặc `Static` (vì trang này chỉ đóng vai trò Reverse Proxy cho Docker, không chạy PHP).
4. Bấm **Submit**.

---

### 2.2 Cấu hình Chứng chỉ SSL
Tại danh sách Website trong aaPanel, bấm vào tên miền `rogym-api.lethanhan01.id.vn` → chọn tab **SSL**:

- **Cách 1: Tự động cấp mới Let's Encrypt (Khuyên dùng)**
  1. Chọn tab con **Let's Encrypt**.
  2. Tích chọn tên miền `rogym-api.lethanhan01.id.vn`.
  3. Chọn phương thức xác thực: **File verification** (nếu DNS đám mây xám) hoặc **DNS verification**.
  4. Bấm **Apply**. aaPanel sẽ tự động đăng ký chứng chỉ và thiết lập tự động gia hạn khi gần hết hạn.
  5. Bật công tắc **Force HTTPS: ON** để tự động chuyển toàn bộ request HTTP sang HTTPS.

- **Cách 2: Sử dụng Chứng chỉ Wildcard `*.lethanhan01.id.vn` (Nếu bạn đã có sẵn)**
  1. Chọn tab con **Commercial SSL** / **Other certificates**.
  2. Dán mã `Private Key` và `Certificate (CRT/PEM)` của chứng chỉ `*.lethanhan01.id.vn` vào 2 khung tương ứng.
  3. Bấm **Save**.
  4. Bật công tắc **Force HTTPS: ON**.

---

### 2.3 Cấu hình Reverse Proxy & WebSocket cho Socket.IO Chat

Dự án có tính năng Chat thời gian thực sử dụng **Socket.IO** và các API tải ảnh đại diện / file media, nên cấu hình Reverse Proxy trên aaPanel cần được thiết lập tỉ mỉ để tránh lỗi ngắt kết nối WebSocket hoặc lỗi 413 (File too large).

#### 📝 Bước 2.3.1: Điền Form tạo Reverse Proxy trên aaPanel
1. Trong bảng cài đặt Website của `rogym-api.lethanhan01.id.vn`, chuyển sang tab **Reverse Proxy** (hoặc **反向代理**).
2. Bấm nút **Add reverse proxy**. Điền chính xác các trường sau:
   - **Proxy Name**: `gym_server_proxy` (chỉ dùng chữ thường, số, dấu gạch dưới).
   - **Target URL**: `http://127.0.0.1:3001` *(Lưu ý: KHÔNG thêm dấu gạch chéo `/` ở cuối)*.
   - **Sent Domain (Host)**: Điền `$host` *(RẤT QUAN TRỌNG: Mặc định một số phiên bản aaPanel để `127.0.0.1` hoặc để trống, bạn bắt buộc phải nhập `$host` để NestJS nhận đúng domain HTTPS của client)*.
   - **Proxy directory**: `/` (áp dụng cho toàn bộ đường dẫn).
   - **Cache (Bộ nhớ đệm)**: **TẮT HOÀN TOÀN (OFF)** *(Nếu bật, aaPanel sẽ cache các response GET của API khiến dữ liệu người dùng bị sai lệch!)*.
   - **WebSocket toggle**: Nếu phiên bản aaPanel của bạn có sẵn công tắc/checkbox **"WebSocket"** hoặc **"WebSocket support"**, hãy gạt sang **ON**.
3. Bấm **Submit** để tạo proxy.

#### 🛠️ Bước 2.3.2: Tối ưu trực tiếp qua nút 'ConfigFile' (Đảm bảo 100% không bị lỗi)
Giao diện form cơ bản của aaPanel đôi khi thiếu các tham số timeout và buffer cho WebSocket. Hãy chỉnh sửa file cấu hình proxy của aaPanel:
1. Trong danh sách Reverse Proxy, bấm vào chữ **ConfigFile** (hoặc **Config**) cạnh `gym_server_proxy`.
2. Thay thế hoặc điều chỉnh toàn bộ nội dung trong khối `location /` thành mẫu chuẩn dưới đây:

```nginx
# Cấu hình Reverse Proxy tối ưu cho NestJS REST API + Socket.IO Chat
location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # 1. Cấu hình BẮT BUỘC cho WebSocket (Socket.IO Chat)
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    # 2. Tăng giới hạn tải file ảnh đại diện và media chat
    client_max_body_size 25m;

    # 3. Timeout duy trì kết nối WebSocket bền vững (tránh bị ngắt kết nối mỗi 60s)
    proxy_connect_timeout 60s;
    proxy_send_timeout 86400s;
    proxy_read_timeout 86400s;
    proxy_buffering off;
}
```
3. Bấm **Save**. aaPanel sẽ tự động kiểm tra cú pháp Nginx và reload dịch vụ.

#### ⚠️ Các "Bẫy" Cấu hình Thường Gặp trên aaPanel & Cách Khắc phục

> [!CAUTION]
> **Bẫy 1: Xung đột luật Cache File tĩnh của aaPanel làm ảnh `/uploads/...` bị 404**
> - **Hiện tượng**: API trả về đường dẫn ảnh `/uploads/avatars/abc.jpg`, nhưng mở link thì bị lỗi `404 Not Found`.
> - **Nguyên nhân**: Mặc định khi tạo Website, aaPanel tự động thêm một khối cache file tĩnh vào cấu hình vhost (`location ~ .*\.(gif|jpg|jpeg|png|bmp|swf)$`). Khi có request ảnh, Nginx tìm file trên ổ cứng VPS tại `/www/wwwroot/rogym-api.lethanhan01.id.vn/uploads/...` thay vì chuyển sang Docker container!
> - **Cách khắc phục**: Vào tab **ConfigFile** chính của Website (trong bảng Site settings) -> Tìm khối `location ~ .*\.(gif|jpg|jpeg|png|bmp|swf)$` và comment lại (thêm dấu `#` vào trước các dòng) hoặc xóa khối đó đi để mọi request đều đi qua Reverse Proxy vào container.

> [!WARNING]
> **Bẫy 2: Bật nhầm Cache trên Reverse Proxy**
> - **Hiện tượng**: Tạo mới bài tập, check-in hoặc chat nhưng Frontend vẫn hiển thị dữ liệu cũ, chỉ khi mở tab ẩn danh mới thấy đổi.
> - **Cách khắc phục**: Luôn kiểm tra công tắc **Cache** trong tab Reverse Proxy của aaPanel phải ở trạng thái **OFF**.

> [!NOTE]
> **Bẫy 3: Để `Sent Domain` là `127.0.0.1` hoặc `localhost`**
> - **Hiện tượng**: LINE Webhook báo verify thất bại hoặc NestJS redirect sai domain.
> - **Cách khắc phục**: `Sent Domain` trong aaPanel luôn luôn phải là `$host`.

---

## 🐳 BƯỚC 3: Triển khai Docker Container qua aaPanel Web Terminal

Vì cổng SSH 22 đã được tắt để chống brute-force, bạn thực hiện toàn bộ thao tác dòng lệnh trực tiếp qua **Web Terminal** có sẵn trong aaPanel:

1. Trên menu bên trái của aaPanel, bấm vào mục **Terminal**.
2. Đăng nhập với quyền `root` của VPS.
3. Di chuyển vào thư mục chứa mã nguồn backend (ví dụ `/www/wwwroot/gym-management-system/server`):
   ```bash
   cd /www/wwwroot/gym-management-system/server
   ```
4. Kiểm tra file `docker-compose.yml`:
   Đảm bảo cấu hình cổng trỏ đúng cổng host `3001` đã gán cho aaPanel Reverse Proxy:
   ```yaml
   ports:
     - "127.0.0.1:${HOST_PORT:-3001}:3000"
   ```
5. Chỉnh sửa file `.env` của server:
   ```bash
   nano .env
   ```
   **Các biến môi trường bắt buộc phải chính xác:**
   ```env
   NODE_ENV=production
   PORT=3000
   HOST_PORT=3001

   # QUAN TRỌNG: URL của Frontend trên Vercel (bắt buộc đúng để NestJS cho phép CORS và Cookie/Token)
   CLIENT_URL=https://your-frontend-domain.vercel.app

   # Database Supabase / PostgreSQL
   DATABASE_URL=postgresql://postgres.xxx:mypassword@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require&connection_limit=5&pool_timeout=5&connect_timeout=5&application_name=gym-api
   JWT_SECRET=your_super_secret_jwt_key_at_least_32_chars_long
   JWT_EXPIRES_IN=7d

   # Tích hợp LINE & LIFF
   LINE_MOCK_ENABLED=false
   LINE_MESSAGING_ENABLED=true
   LINE_CHANNEL_ID=your_line_login_channel_id
   LINE_CHANNEL_SECRET=your_line_channel_secret
   LINE_CHANNEL_ACCESS_TOKEN=your_line_messaging_channel_access_token
   LINE_LIFF_URL=https://liff.line.me/your_liff_id
   ```
   *(Bấm `Ctrl + O` rồi `Enter` để lưu, `Ctrl + X` để thoát nano)*.

6. Khởi chạy Docker Container:
   ```bash
   docker compose down
   docker compose up -d --build
   ```

7. Kiểm tra trạng thái container và kiểm tra kết nối qua domain:
   ```bash
   docker ps
   # Test nội bộ trong VPS
   curl -I http://127.0.0.1:3001/health/live
   # Test qua Domain HTTPS của aaPanel
   curl -I https://rogym-api.lethanhan01.id.vn/health/live
   ```
   Nếu nhận phản hồi `HTTP/2 200` hoặc `HTTP/1.1 200 OK` là Backend đã hoạt động hoàn hảo!

---

## ⚡ BƯỚC 4: Cấu hình Biến Môi trường trên Vercel cho Frontend

1. Truy cập [Vercel Dashboard](https://vercel.com) → Chọn dự án Frontend của bạn.
2. Vào **Settings** → **Environment Variables**.
3. Cập nhật các biến môi trường sau cho cả **Production** và **Preview**:

| Tên biến | Giá trị chính xác | Ý nghĩa |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://rogym-api.lethanhan01.id.vn/api/v1` | URL REST API trỏ đến Backend VPS qua HTTPS |
| `VITE_WS_URL` | `https://rogym-api.lethanhan01.id.vn` | Base URL cho Socket.IO Chat Realtime |
| `VITE_LIFF_ID` | `2010144670-0RJwlyfv` (ID thật từ LINE Console) | ID ứng dụng LIFF |
| `VITE_LIFF_MOCK` | `false` | Tắt chế độ Mock giả lập |

4. **BẮT BUỘC REDEPLOY TRÊN VERCEL**:
   - Vì React/Vite đóng gói biến môi trường `VITE_*` vào bundle HTML/JS tĩnh trong lúc Build, bạn phải bấm **Redeploy** trên Vercel để các file JS nhận URL mới:
   - Vào tab **Deployments** → bấm biểu tượng dấu ba chấm `...` cạnh lần deploy gần nhất → chọn **Redeploy**.

---

## 📲 BƯỚC 5: Cập nhật LINE Developers Console

1. **LINE Messaging API Channel (Cập nhật Webhook URL)**:
   - Đăng nhập [LINE Developers Console](https://developers.line.biz/).
   - Chọn Channel Messaging API → Tab **Messaging API** → Mục **Webhook settings**.
   - Cập nhật **Webhook URL**:
     ```text
     https://rogym-api.lethanhan01.id.vn/api/v1/line/webhook
     ```
   - Đảm bảo **Use webhook** gạt sang **ON**.
   - Bấm nút **Verify**: Nếu hiện thông báo `Success` màu xanh là LINE đã kết nối thành công tới server VPS của bạn.

2. **LINE Login Channel (Cập nhật LIFF Endpoint)**:
   - Chọn Channel LINE Login → Tab **LIFF** → Chọn LIFF App của bạn.
   - Đảm bảo **Endpoint URL** trỏ chính xác về domain Vercel:
     ```text
     https://your-frontend-domain.vercel.app/liff
     ```

---

## 🚀 6. Quy trình 4 Bước Mở rộng Thêm Container Mới trong Tương lai

Khi bạn phát triển thêm các ứng dụng mới (ví dụ: `shop-api` hoặc `blog-api`):

1. **Bước 1 (Chọn Port)**: Trong file `docker-compose.yml` của dự án mới, chọn 1 cổng chưa dùng (ví dụ: `127.0.0.1:3002:8000`). Khởi chạy container bằng Docker.
2. **Bước 2 (Trỏ DNS)**: Thêm Record A `shop-api` trỏ về IP VPS (hoặc nếu đã tạo Record `*` thì bỏ qua bước này).
3. **Bước 3 (Thêm Site trên aaPanel)**:
   - Vào **Website** → **Add site**: nhập `shop-api.lethanhan01.id.vn`.
   - Cài SSL trong tab **SSL** (1 click Let's Encrypt hoặc chọn Wildcard).
   - Vào tab **Reverse Proxy** → Thêm proxy trỏ tới `http://127.0.0.1:3002`.
4. **Bước 4 (Kết nối FE mới)**: Trỏ biến môi trường ở Frontend mới về `https://shop-api.lethanhan01.id.vn`.

---

## ✅ BƯỚC 7: Bảng Kiểm tra (Verification Checklist)

| Hạng mục | Cách kiểm tra | Kết quả mong đợi |
| :--- | :--- | :--- |
| **Bảo mật Port** | Thử truy cập `http://rogym-api.lethanhan01.id.vn:3001` từ trình duyệt ngoài | Bị chặn / Timeout (Cổng nội bộ được bảo vệ an toàn) |
| **HTTPS Backend** | Truy cập `https://rogym-api.lethanhan01.id.vn/health/live` | Trả về `{"status":"ok"}` có ổ khoá xanh an toàn |
| **REST API từ FE** | Mở F12 trên Vercel, đăng nhập hệ thống | Status 200/201, không bị lỗi CORS hay Mixed Content |
| **WebSocket Chat** | Mở tab Network trên F12, lọc `WS`, vào trang chat | Status `101 Switching Protocols`, tin nhắn gửi/nhận tức thì |
| **Upload Ảnh** | Tải ảnh avatar hội viên hoặc gửi ảnh trong chat | Ảnh lưu vào volume và hiển thị được qua URL `/uploads/...` |
| **LINE Webhook** | Bấm nút **Verify** trong LINE Developer Console | Trả về thông báo `Success` |
