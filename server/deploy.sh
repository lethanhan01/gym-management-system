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

echo "🔄 Khởi động lại container..."
docker compose up -d gym-server

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

# 4. Dọn dẹp an toàn Docker host để chống phình đĩa
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

# 5. Báo cáo tình trạng ổ đĩa Docker
echo "📊 Tình trạng dung lượng Docker trên VPS:"
docker system df

echo "=================================================="
echo "🎉 DEPLOY HOÀN TẤT THÀNH CÔNG!"
echo "=================================================="
