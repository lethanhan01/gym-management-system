#!/usr/bin/env bash
set -euo pipefail

echo "=================================================="
echo "🚀 BẮT ĐẦU QUY TRÌNH DEPLOY GYM-SERVER TRÊN VPS"
echo "=================================================="

# 1. Kiểm tra file .env
if [ ! -f .env ]; then
  echo "❌ Lỗi: Không tìm thấy file .env tại thư mục $(pwd)!"
  exit 1
fi

DEPLOY_MODE="${DEPLOY_MODE:-pull}"
RUN_PRISMA_PUSH="${RUN_PRISMA_PUSH:-true}"
TARGET_IMAGE="${SERVER_IMAGE:-ghcr.io/lethanhan01/gym-management-system/server:latest}"

echo "⚙️ Chế độ deploy: $DEPLOY_MODE"
echo "🎯 Target image: $TARGET_IMAGE"

# Lưu lại Image ID hiện tại để phục vụ rollback nếu deploy gặp sự cố
PREV_IMAGE_ID=$(docker inspect --format='{{.Image}}' gym-server 2>/dev/null || true)
if [ -n "$PREV_IMAGE_ID" ]; then
  echo "📸 Đã ghi nhận image hiện tại để rollback nếu cần: $PREV_IMAGE_ID"
fi

# Hàm thực hiện Rollback khi có sự cố
rollback() {
  echo ""
  echo "🚨 PHÁT HIỆN SỰ CỐ TRONG QUÁ TRÌNH DEPLOY!"
  if [ -n "$PREV_IMAGE_ID" ]; then
    echo "⏪ Đang tiến hành tự động Rollback về image trước đó: $PREV_IMAGE_ID..."
    docker tag "$PREV_IMAGE_ID" "$TARGET_IMAGE" || true
    docker compose up -d --force-recreate gym-server
    echo "⚠️ Đã khôi phục container về phiên bản trước!"
  else
    echo "⚠️ Không tìm thấy phiên bản container trước đó để rollback."
  fi
  exit 1
}

# 2. Đồng bộ Schema Prisma Database (nếu được bật)
if [ "$RUN_PRISMA_PUSH" = "true" ]; then
  echo "🔄 Đang chạy đồng bộ lược đồ cơ sở dữ liệu (prisma db push)..."
  if command -v npx >/dev/null 2>&1; then
    # Load .env và thực thi prisma db push
    if npx prisma db push --skip-generate; then
      echo "✅ Đồng bộ Prisma schema thành công!"
    else
      echo "❌ Lỗi: Đồng bộ Prisma schema thất bại!"
      exit 1
    fi
  else
    echo "⚠️ Không tìm thấy lệnh npx trên VPS host, bỏ qua bước prisma db push."
  fi
fi

# 3. Kéo (Pull) hoặc Build container
if [ "$DEPLOY_MODE" = "pull" ]; then
  echo "📥 Đang kéo image mới nhất từ GitHub Container Registry..."
  docker compose pull gym-server
else
  echo "📦 Đang build container gym-server tại chỗ..."
  docker compose build --pull gym-server
fi

# 4. Khởi động lại container
echo "🔄 Khởi động lại container gym-server..."
docker compose up -d --force-recreate gym-server

# 5. Đợi container khởi động và kiểm tra Healthcheck (Liveness)
echo "⏳ Đang kiểm tra trạng thái sức khỏe container (tối đa 45s)..."
RETRIES=15
HEALTH_OK=false
until [ "$RETRIES" -le 0 ]; do
  STATUS=$(docker inspect --format='{{json .State.Health.Status}}' gym-server 2>/dev/null || echo '"starting"')
  if [ "$STATUS" = '"healthy"' ]; then
    echo "✅ Container gym-server đã HEALTHY và sẵn sàng!"
    HEALTH_OK=true
    break
  fi
  echo "   Đang chờ container ready... ($STATUS) còn $RETRIES lần thử"
  sleep 3
  RETRIES=$((RETRIES - 1))
done

if [ "$HEALTH_OK" = false ]; then
  echo "❌ Lỗi: Container không đạt trạng thái healthy sau 45s. Chi tiết logs gần nhất:"
  docker compose logs --tail=50 gym-server
  rollback
fi

# 6. Kiểm tra Database Readiness & Prisma Engine probe
echo "🔍 Đang kiểm tra kết nối Database & Prisma Engine (/health/ready)..."
READY_RETRIES=10
READY_OK=false
until [ "$READY_RETRIES" -le 0 ]; do
  if docker compose exec -T gym-server node -e "fetch('http://127.0.0.1:3000/health/ready').then(r => { if (!r.ok) process.exit(1); return r.json(); }).then(data => { if (data.status === 'ok') process.exit(0); else process.exit(1); }).catch(() => process.exit(1))" 2>/dev/null; then
    echo "✅ Database & Prisma Engine đã sẵn sàng (/health/ready: OK)!"
    READY_OK=true
    break
  fi
  echo "   Đang chờ Database probe sẵn sàng... còn $READY_RETRIES lần thử"
  sleep 3
  READY_RETRIES=$((READY_RETRIES - 1))
done

if [ "$READY_OK" = false ]; then
  echo "❌ Lỗi: Database hoặc Prisma Engine không phản hồi sẵn sàng sau deploy. Chi tiết logs:"
  docker compose logs --tail=50 gym-server
  rollback
fi

# 7. Dọn dẹp an toàn Docker host để chống tràn đĩa VPS (4GB VPS protection)
echo "🧹 Đang dọn dẹp image rác và BuildKit cache thừa..."
docker image prune -f

if docker builder prune -f --keep-storage 2GB 2>/dev/null; then
  echo "✅ Đã dọn dẹp BuildKit cache (giữ lại max 2GB)."
else
  docker builder prune -f --filter "until=48h" 2>/dev/null || true
  echo "✅ Đã dọn dẹp BuildKit cache cũ hơn 48h."
fi

# 8. Báo cáo tình trạng ổ đĩa Docker
echo "📊 Tình trạng dung lượng Docker trên VPS:"
docker system df

echo "=================================================="
echo "🎉 DEPLOY HOÀN TẤT THÀNH CÔNG TRÊN VPS!"
echo "=================================================="
