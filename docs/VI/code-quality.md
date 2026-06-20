# Code quality và coverage

Dự án dùng ba lớp kiểm tra trong workflow `.github/workflows/ci.yml`:

- **cloc** thống kê số file, dòng trống, dòng comment và dòng code theo ngôn ngữ.
- **Jest** chạy unit test backend, sinh coverage và áp dụng coverage threshold hiện có.
- **SonarQube Cloud (SonarCloud)** phân tích bug, code smell, duplicated code, maintainability, security issue và tổng hợp coverage từ Jest.

ESLint và build của `client`/`server` vẫn được chạy như các quality gate cơ bản. Hiện tại frontend chưa có test runner hoặc test files; Sonar vẫn phân tích toàn bộ `client/src`, nhưng LCOV hiện chỉ được sinh từ Jest của backend.

## Chạy local

### Đếm codebase với cloc

Cài `cloc` trên máy, đứng tại thư mục gốc của repository và chạy:

```bash
cloc . --exclude-dir=node_modules,dist,build,coverage,.next,.git,.cache --not-match-f='^generated\.css$'
```

Lệnh loại trừ dependencies, build output, coverage, Git metadata, cache và file CSS được sinh tự động.

### Jest coverage cho backend

```bash
cd server
npm ci
npm run test:cov -- --runInBand
```

Jest in bảng coverage trong terminal và tạo:

- `server/coverage/lcov.info`: đầu vào cho SonarQube Cloud.
- `server/coverage/lcov-report/index.html`: báo cáo HTML để mở local.
- `server/coverage/coverage-summary.json`: dữ liệu tổng hợp dạng JSON.

Coverage threshold nằm trong phần `jest.coverageThreshold` của `server/package.json`. Lệnh trả về mã lỗi nếu test thất bại hoặc coverage thấp hơn ngưỡng.

### Các kiểm tra còn lại

```bash
cd client
npm ci
npm run lint
npm run build
```

```bash
cd server
npm run lint
npm run build
```

## GitHub Actions

Workflow chạy khi push, tạo/cập nhật pull request, hoặc chạy thủ công:

- Job **Codebase metrics (cloc)** hiển thị thống kê trực tiếp trong log của step `Count files and lines by language`.
- Job **Client** chạy lint và build frontend.
- Job **Server** chạy lint, Jest coverage gate, xác nhận `coverage/lcov.info`, phân tích SonarQube Cloud và build backend.
- Coverage backend được lưu thành artifact `server-coverage` trong 7 ngày, kể cả khi một bước sau đó thất bại.

SonarQube Cloud vẫn được chạy khi Jest đã tạo LCOV nhưng coverage gate không đạt, giúp kết quả quality không bị mất vì một gate trước đó. Scan chờ Quality Gate và làm workflow thất bại nếu Quality Gate không đạt.

Nếu chưa cấu hình SonarQube Cloud, workflow ghi một notice và bỏ qua riêng bước scan; cloc, lint, test, coverage và build vẫn chạy bình thường. Pull request từ fork cũng có thể bị bỏ qua scan vì GitHub không cấp repository secrets cho workflow không tin cậy.

## Cấu hình SonarQube Cloud

1. Đăng nhập SonarQube Cloud và import GitHub repository này.
2. Ghi lại **Organization Key** và **Project Key** của project.
3. Nếu project đang bật Automatic Analysis, tắt tính năng này để tránh xung đột với CI-based analysis.
4. Tạo token phân tích trong SonarQube Cloud.
5. Trong GitHub repository, mở **Settings > Secrets and variables > Actions** và thêm:
   - Repository secret `SONAR_TOKEN`: token phân tích; không commit token vào source code.
   - Repository variable `SONAR_ORGANIZATION`: Organization Key.
   - Repository variable `SONAR_PROJECT_KEY`: Project Key.
6. Push commit mới, mở pull request, hoặc chạy workflow `CI` thủ công.

`sonar-project.properties` đã cấu hình source, test, exclusions, TypeScript config và đường dẫn LCOV. Project/organization key được truyền từ GitHub Variables để file cấu hình không chứa giá trị chưa biết của tài khoản SonarQube Cloud.

Kết quả chi tiết được xem trong project trên SonarQube Cloud. GitHub Actions log cho biết scan thành công, thất bại Quality Gate, hoặc bị bỏ qua do thiếu cấu hình.
