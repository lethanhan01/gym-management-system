# RoGym Design System & Token Portability Contract

Tài liệu hướng dẫn về kiến trúc Design Tokens và quy tắc tái sử dụng các component thuộc `src/components/ui`.

---

## 1. Kiến trúc Single Source of Truth

Hệ thống token tuân thủ phân lớp nghiêm ngặt:

1. **`tokens.css`** là **Single Source of Truth**:
   - Định nghĩa toàn bộ color palette, backgrounds, text colors, borders, shadows, typography và motion variables dưới dạng CSS custom properties (`--rogym-*`).
2. **`tailwind.config.js`** là **Alias Layer**:
   - Ánh xạ các `--rogym-*` solid color tokens sang namespace `colors.rogym.*` cho Tailwind CSS utilities.
   - Cung cấp font family aliases (`body`, `display`, `vietnam`, `anton`).
3. **`token-values.ts`** là **JS Consumer Layer**:
   - Cung cấp giá trị hex tương ứng cho các thư viện render JS/Canvas (như Recharts) mà không thể consume CSS variables trực tiếp.
4. **UI Components (`src/components/ui/*`)**:
   - Chỉ tham chiếu token qua `var(--rogym-*)` hoặc Tailwind classes chuẩn.
   - Không chứa hardcoded hex hay raw fallback hex.

---

## 2. Danh sách Required Tokens

Để các UI components hoạt động độc lập ở ứng dụng khác hoặc môi trường mới, file `tokens.css` cần cung cấp tối thiểu:

### Brand & Accents
- `--rogym-green`: Màu chủ đạo (#06c384)
- `--rogym-green-hover`: Trạng thái hover của brand green
- `--rogym-green-dark`, `--rogym-green-deeper`: Các sắc độ đậm
- `--rogym-teal`: Màu highlight / accent teal (#42e09e)
- `--rogym-error`: Màu báo lỗi

### Backgrounds
- `--rogym-bg-base`: Nền chính ứng dụng (#080e0b)
- `--rogym-bg-deep`, `--rogym-bg-deep-alt`: Nền tối sâu
- `--rogym-bg-card`: Nền thẻ / container (#0f1c16)
- `--rogym-bg-card-hover`: Trạng thái hover của thẻ (#132218)
- `--rogym-bg-card-darker`: Nền thẻ tối đặc biệt (#0b1610)
- `--rogym-bg-elevated`, `--rogym-bg-elevated-green`: Các lớp nền nổi bật

### Text & Foreground
- `--rogym-text-primary`: Chữ chính (trắng)
- `--rogym-text-secondary`: Chữ phụ (#bbcabf)
- `--rogym-text-muted`: Chữ giảm độ tương phản (#8ab89c)
- `--rogym-text-dim`: Chữ mờ (`rgba(255, 255, 255, 0.45)`)

### Shadows & Glows
- `--rogym-shadow-tone-sm`: Glow nhỏ (`0 0 12px rgba(6, 195, 132, 0.35)`)
- `--rogym-shadow-tone-md`: Glow vừa (`0 0 15px rgba(6, 195, 132, 0.40)`)

---

## 3. Quy tắc Override với `--rogym-tone` Hook

Các component như `Alert`, `Accordion`, `Tabs`, `Stepper`, `ProgressBar`, `Avatar` hỗ trợ CSS variable hook `--rogym-tone` để component cha hoặc trang có thể ghi đè màu chủ đạo cục bộ mà không cần can thiệp logic nội bộ:

### Cú pháp nội bộ trong UI component
```tsx
// Fallback luôn trỏ về token --rogym-green (không có khoảng trắng trong Tailwind arbitrary value)
className="text-[var(--rogym-tone,var(--rogym-green))] focus-visible:ring-[var(--rogym-tone,var(--rogym-green))]"
```

### Cách consumer override
```tsx
// Ghi đè màu sang Amber cho một Alert cụ thể
<Alert
  tone="success"
  style={{ '--rogym-tone': '#f59e0b' } as React.CSSProperties}
  title="Cảnh báo quan trọng"
>
  Nội dung thông báo
</Alert>
```

---

## 4. Lưu ý khi viết Tailwind Arbitrary Values (Tailwind v3)

Trong Tailwind v3.4.x, JIT compiler phân tích chuỗi theo dấu cách. **Tuyệt đối không để khoảng trắng** sau dấu phẩy trong các arbitrary value class:

- ✅ **Đúng**: `text-[var(--rogym-tone,var(--rogym-green))]`
- ❌ **Sai**: `text-[var(--rogym-tone, var(--rogym-green))]` *(JIT sẽ bị ngắt quãng và drop class silently)*
