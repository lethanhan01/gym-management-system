#!/usr/bin/env bash
set -euo pipefail

echo "=================================================="
echo "🚀 BẮT ĐẦU QUY TRÌNH DEPLOY GYM-SERVER TRÊN VPS"
echo "=================================================="

# 1. Kiểm tra file .env
if [ ! -f .env ]; then
  echo "❌ Lỗi: Không tìm thấy file .env tại thư mục hiện tại!"
  exit 1
fi

# 2. Build và khởi động lại container
echo "📦 Đang build container gym-server..."
docker compose build --pull gym-server

echo "🔄 Khởi động lại container (buộc tạo mới container với config mới nhất)..."
docker compose up -d --force-recreate gym-server

# 3. Đợi container khởi động và kiểm tra Healthcheck
echo "⏳ Đang kiểm tra trạng thái sức khỏe container (tối đa 45s)..."
RETRIES=15
until [ "$RETRIES" -le 0 ]; do
  STATUS=$(docker inspect --format='{{json .State.Health.Status}}' gym-server 2>/dev/null || echo '"starting"')
  if [ "$STATUS" = '"healthy"' ]; then
    echo "✅ Container gym-server đã HEALTHY và sẵn sàng!"
    break
  fi
  echo "   Đang chờ container ready... ($STATUS) còn $RETRIES lần thử"
  sleep 3
  RETRIES=$((RETRIES - 1))
done

if [ "$RETRIES" -le 0 ]; then
  echo "⚠️ Cảnh báo: Container chưa đạt trạng thái healthy sau 45s. Kiểm tra logs:"
  docker compose logs --tail=50 gym-server
  exit 1
fi

# 4. Kiểm tra Database Readiness & Prisma Engine probe
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
  exit 1
fi

# 5. Dọn dẹp an toàn Docker host để chống phình đĩa
echo "🧹 Đang dọn dẹp image rác và BuildKit cache thừa..."
# Xóa các image cũ bị thay thế (<none>:<none>)
docker image prune -f

# Dọn dẹp BuildKit cache (giữ lại tối đa 2GB cache cần thiết)
if docker builder prune -f --keep-storage 2GB 2>/dev/null; then
  echo "✅ Đã dọn dẹp BuildKit cache (giữ lại max 2GB)."
else
  docker builder prune -f --filter "until=48h" 2>/dev/null || true
  echo "✅ Đã dọn dẹp BuildKit cache cũ hơn 48h."
fi

# 6. Báo cáo tình trạng ổ đĩa Docker
echo "📊 Tình trạng dung lượng Docker trên VPS:"
docker system df

echo "=================================================="
echo "🎉 DEPLOY HOÀN TẤT THÀNH CÔNG!"
echo "=================================================="
