# RoGym Frontend Design System

Tài liệu này là chuẩn thiết kế cho toàn bộ frontend RoGym. Nguồn sự thật duy nhất về
màu sắc, typography, motion và style dùng chung là
[`src/styles/globals.css`](./src/styles/globals.css) (import orchestrator).
Component CSS được tổ chức trong [`src/styles/components/`](./src/styles/components/) (12 file).

Tài liệu về cách sử dụng component, hook và layout nằm tại
[`reusable-ui.md`](./reusable-ui.md).

## 1. Nguyên tắc bắt buộc

1. React chịu trách nhiệm cho cấu trúc, dữ liệu và trạng thái. CSS chịu trách nhiệm
   cho giao diện.
2. Không thêm `style={{ ... }}`, thẻ `<style>`, thao tác `element.style` hoặc object
   `React.CSSProperties` trong page/component ứng dụng.
3. Không thêm mã màu, shadow, font hoặc transition mới trực tiếp trong TSX. Hãy dùng
   token hoặc class ngữ nghĩa từ `src/styles/`.
4. Dùng component có sẵn trước khi tạo markup mới cho page header, loading, empty,
   error, form control, modal, badge hoặc card.
5. Trạng thái giao diện phải dùng modifier như `.is-active`, `.is-open` hoặc thuộc
   tính dữ liệu như `data-tone`, `data-status`.
6. Không tạo hoặc sao chép class `.rogym-sx-*`. Đây là class sinh tự động trong quá
   trình chuyển style tĩnh ra khỏi React, không phải public API.
7. Mọi control tương tác phải có trạng thái keyboard focus, disabled và accessible
   name phù hợp.
8. Animation phải tôn trọng `prefers-reduced-motion`.

Các prop style đặc thù của thư viện bên thứ ba chỉ được dùng khi thư viện không hỗ
trợ class CSS. Phần cấu hình đó phải nằm trong shared adapter/component, không lặp
lại tại từng page.

## 2. Kiến trúc CSS

CSS được tổ chức theo ba lớp. `globals.css` là file entry point (import orchestrator) — component CSS thực tế nằm trong `src/styles/components/`:

| Layer | Trách nhiệm |
| --- | --- |
| `@layer base` | Design token, reset, font, focus ring, semantic alias cho shadcn |
| `@layer components` | Class ngữ nghĩa, component skin, modifier và trạng thái |
| `@layer utilities` | Utility nhỏ và class migration được sinh tự động |

Thứ tự ưu tiên khi triển khai UI:

1. Dùng shared component đã có.
2. Dùng class `.rogym-*` đã có.
3. Ghép utility class cho bố cục cục bộ như `flex`, `grid`, `gap-*`, breakpoint.
4. Nếu pattern lặp lại hoặc mang nhận diện sản phẩm, thêm class ngữ nghĩa vào
   file phù hợp trong `src/styles/components/`.

Không dùng arbitrary color như `text-[#...]`, `bg-[rgba(...)]` cho code mới. Nếu
một giá trị có ý nghĩa thiết kế, hãy tạo hoặc tái sử dụng token.

## 3. Design Tokens

### 3.1. Brand

| Token | Vai trò |
| --- | --- |
| `--rogym-green` | Primary action, selected state, progress |
| `--rogym-green-hover` | Hover của primary action |
| `--rogym-teal` | Accent, focus ring, icon nổi bật |
| `--rogym-green-dark` | Text/icon trên nền xanh sáng |
| `--rogym-green-deeper` | Nền hoặc text xanh đậm |

Không dùng green cho mọi nội dung. Green chỉ nên nhấn vào action chính, trạng thái
được chọn, dữ liệu tích cực hoặc điểm nhận diện thương hiệu.

### 3.2. Background

| Token | Vai trò |
| --- | --- |
| `--rogym-bg-base` | Nền ứng dụng |
| `--rogym-bg-deep` | Section sâu, nền tương phản mạnh |
| `--rogym-bg-deep-alt` | Biến thể section sâu |
| `--rogym-bg-card` | Card và panel mặc định |
| `--rogym-bg-card-hover` | Card hover |
| `--rogym-bg-elevated` | Dropdown, popover, modal content |
| `--rogym-bg-elevated-green` | Surface nâng cao có sắc xanh |
| `--rogym-bg-light` | Section sáng |
| `--rogym-bg-glass` | Glass card và auth surface |

### 3.3. Text

| Token | Vai trò |
| --- | --- |
| `--rogym-text-primary` | Heading, dữ liệu chính |
| `--rogym-text-secondary` | Body text, label phụ |
| `--rogym-text-muted` | Metadata và icon phụ |
| `--rogym-text-dim` | Hint, empty metadata |
| `--rogym-text-faint` | Decoration hoặc nội dung rất nhẹ |
| `--rogym-text-on-light` | Text chính trên nền sáng |
| `--rogym-text-on-light-muted` | Text phụ trên nền sáng |
| `--rogym-error` | Lỗi và destructive feedback |

### 3.4. Border và shadow

| Nhóm | Token |
| --- | --- |
| Border nhẹ | `--rogym-border-subtle`, `--rogym-border-section` |
| Border trắng | `--rogym-border-white-dim`, `--rogym-border-white-button` |
| Border accent | `--rogym-border-teal-dim`, `--rogym-border-teal-hover`, `--rogym-border-teal-focus` |
| Shadow | `--rogym-shadow-primary`, `--rogym-shadow-card`, `--rogym-shadow-glass` |

### 3.5. Typography, layout và motion

| Token | Giá trị sử dụng |
| --- | --- |
| `--rogym-font-body` | Be Vietnam Pro cho nội dung và control |
| `--rogym-font-display` | Anton cho display heading và logo |
| `--rogym-container-width` | Chiều rộng nội dung tối đa |
| `--rogym-container-padding` | Padding ngang responsive |
| `--rogym-section-padding` | Khoảng cách section |
| `--rogym-ease-standard` | Easing mặc định |
| `--rogym-duration-button` | Motion của button |
| `--rogym-duration-link` | Motion của link |
| `--rogym-duration-image` | Motion của ảnh/card media |

Các token layout và duration được giảm ở màn hình nhỏ hoặc khi người dùng bật
reduced motion.

## 4. Typography

### Font

- Body, form, bảng và dữ liệu: `var(--rogym-font-body)`.
- Hero heading, logo hoặc con số display: `var(--rogym-font-display)`.
- Không dùng Anton cho đoạn văn dài, button nhỏ hoặc form label.

### Class công khai

| Class | Mục đích |
| --- | --- |
| `.rogym-display` | Display heading |
| `.rogym-logo` | Wordmark |
| `.rogym-eyebrow` | Nhãn section viết hoa |
| `.rogym-body` | Body copy chuẩn |
| `.rogym-muted` | Nội dung phụ |
| `.rogym-text-primary` | Text chính |
| `.rogym-text-secondary` | Text thứ cấp |
| `.rogym-text-muted` | Text muted |
| `.rogym-text-dim` | Hint, empty metadata |
| `.rogym-text-faint` | Decoration hoặc nội dung rất nhẹ |
| `.rogym-text-accent` | Text accent (teal) |
| `.rogym-text-green` | Text màu primary action |
| `.rogym-text-green-dark` | Text tối trên nền xanh sáng |
| `.rogym-text-base` | Text tối dùng trên nền màu (teal, green) |
| `.rogym-section-title` | Dashboard section heading |
| `.rogym-brand-text` | Sidebar brand name |

Page heading trong khu vực dashboard nên đi qua `PageHeader` để giữ hierarchy và
spacing đồng nhất.

## 5. Layout và spacing

### Public page

```tsx
<div className="rogym-page">
  <section className="rogym-section rogym-section--dark">
    <div className="rogym-container">{children}</div>
  </section>
</div>
```

Các class nền:

- `.rogym-page`: root của trang public.
- `.rogym-container`: container responsive tối đa 1280px.
- `.rogym-section`: spacing dọc chuẩn.
- `.rogym-section--dark`, `--deep`, `--light`: surface theo ngữ cảnh.

### Dashboard page

Các trang member, trainer, staff và owner dùng `DashboardLayout`, sau đó dùng
`Page`/alias tương ứng:

```tsx
<TrainerPage>
  <TrainerPageHeader title="Lịch dạy" />
  <section className="grid gap-4 lg:grid-cols-3">{content}</section>
</TrainerPage>
```

Không tự tạo thêm `max-width`, padding root hoặc topbar/sidebar trong từng page.

### Quy tắc spacing

- Dùng spacing scale của Tailwind cho bố cục cục bộ.
- Dùng `gap` thay cho margin giữa các phần tử cùng nhóm.
- Card thông thường dùng `.rogym-card`; không lặp border, background và radius.
- Pattern spacing xuất hiện từ hai nơi trở lên nên được đóng gói thành component
  hoặc class ngữ nghĩa.

## 6. Component styles

### 6.1. Button

Button luôn có base class `.rogym-btn` và một variant:

| Variant | Khi dùng |
| --- | --- |
| `.rogym-btn--primary` | Action chính |
| `.rogym-btn--outline-white` | Action phụ trên nền tối |
| `.rogym-btn--outline-green` | Action phụ mang accent |
| `.rogym-btn--outline-green-light` | Action trên nền sáng |
| `.rogym-btn--danger` | Destructive action |
| `.rogym-btn--dark` | Action trên surface xanh/sáng |
| `.rogym-btn--elevated` | Control trên panel nâng cao |
| `.rogym-btn--icon` | Icon-only button |
| `.rogym-btn--nav` | Button trong navbar |
| `.rogym-btn--wide`, `.rogym-btn--hero` | Modifier kích thước |

```tsx
<button type="submit" className="rogym-btn rogym-btn--primary">
  Lưu thay đổi
</button>
```

Không mô phỏng button bằng `div`. Icon-only button phải có `aria-label`.

Sweep animation được áp dụng tự động cho tất cả `<button>`. Để tắt trên một button
cụ thể (ví dụ khi cần dùng Tailwind `transition-*`), thêm `data-no-sweep`:

```tsx
<button data-no-sweep className="transition-colors rogym-btn rogym-btn--outline-white">
  Hủy
</button>
```

### 6.2. Link

| Class | Khi dùng |
| --- | --- |
| `.rogym-text-link` | Text action mặc định |
| `.rogym-text-link--muted` | Action thứ cấp |
| `.rogym-text-link--accent` | Action nhấn mạnh |
| `.rogym-text-link--nav` | Navigation link |

Active navigation dùng `aria-current="page"` hoặc state class đã có, không đổi màu
bằng inline style.

### 6.3. Form

| Class/component | Mục đích |
| --- | --- |
| `.rogym-field-label` | Label |
| `.rogym-input` | Input, textarea hoặc trigger có skin input |
| `<Select>` | Select dùng Radix UI |
| `<DatePickerInput>` | Chọn ngày `yyyy-MM-dd` |
| `<DateTimePickerInput>` | Chọn ngày giờ `yyyy-MM-ddTHH:mm` |

```tsx
<label className="block space-y-2">
  <span className="rogym-field-label">Họ tên</span>
  <input className="rogym-input" name="fullName" />
</label>
```

Error text dùng `--rogym-error`; không chỉ biểu đạt lỗi bằng màu, hãy kèm nội dung
hoặc icon.

### 6.4. Card và surface

| Class | Mục đích |
| --- | --- |
| `.rogym-card` | Card mặc định |
| `.rogym-card--compact` | Radius/padding gọn |
| `.rogym-card--md` | Kích thước trung bình |
| `.rogym-card--glass` | Glass surface |
| `.rogym-card--interactive` | Card có hover tương tác |
| `.rogym-mini-card` | Feature card nhỏ |
| `.rogym-media-card` | Card có ảnh |
| `.rogym-pricing-card` | Pricing/package card |

Interactive card vẫn cần phần tử `button` hoặc `a` thật nếu toàn bộ card có thể
click.

### 6.5. Badge, status và progress

Badge tổng quát:

```tsx
<span className="rogym-tone-badge" data-tone="warning">
  Chờ xử lý
</span>
```

Các tone được hỗ trợ: `success`, `warning`, `danger`, `info`, `purple`, `low`,
`medium`, `high`. Dùng `.is-compact` hoặc `.is-large` khi cần.

Session dùng `data-status`:

```tsx
<span className="rogym-session-status is-pill" data-status="completed">
  Hoàn thành
</span>
```

Progress:

```tsx
<progress className="rogym-progress is-warning" value={75} max={100} />
```

### 6.6. Filter, selection và pagination

- `.rogym-choice-chip`, `.rogym-filter-chip`, `.rogym-range-chip`: option nhỏ.
- `.rogym-selectable-card`, `.rogym-severity-option`: lựa chọn dạng card.
- `.rogym-pagination-button`: nút phân trang.
- `.rogym-island-option`, `.rogym-history-tab`: segmented/tab control.
- `.is-active`: trạng thái được chọn.

State class phải được tính từ dữ liệu:

```tsx
<button
  className={cn('rogym-filter-chip', selected && 'is-active')}
  aria-pressed={selected}
>
  Đang hoạt động
</button>
```

## 7. Pattern theo miền nghiệp vụ

Các nhóm class dưới đây có phạm vi hẹp. Chỉ dùng ngoài miền hiện tại khi semantics
thực sự giống nhau:

| Nhóm | Prefix/class |
| --- | --- |
| Dashboard shell | `.rogym-dashboard-*`, `.rogym-sidebar*`, `.rogym-topbar*` |
| Auth | `.rogym-auth-*`, `.rogym-otp-input`, `.rogym-quick-role*` |
| Payment | `.rogym-payment-*`, `.rogym-checkout-*` |
| Workout | `.rogym-plan-*`, `.rogym-exercise-*`, `.rogym-workout-*` |
| Session/calendar | `.rogym-session-*`, `.rogym-calendar-*`, `.rogym-upcoming-session` |
| Package | `.rogym-package-*`, `.rogym-package-picker*` |

Không dùng class theo miền chỉ vì nó có màu hoặc border gần giống. Nếu visual
pattern thực sự dùng chung, hãy tách thành class semantic tổng quát.

## 8. Trạng thái và naming

### Quy ước tên

- Component: `.rogym-card`
- Element: `.rogym-select__item`
- Variant: `.rogym-card--compact`
- Boolean state: `.is-active`, `.is-open`, `.is-visible`, `.is-selected`
- Semantic state: `[data-tone='danger']`, `[data-status='completed']`

### Dynamic values

Không sinh CSS string động cho màu. Chọn một tập state hữu hạn:

```tsx
<div className="rogym-tone-text" data-tone={tone}>
  {label}
</div>
```

Nếu giá trị thật sự liên tục, ví dụ phần trăm tiến độ, dùng phần tử native
`<progress value max>` thay vì width inline.

## 9. Responsive và accessibility

- Thiết kế từ màn hình nhỏ trước; breakpoint chỉ bổ sung layout khi có đủ chỗ.
- Root hỗ trợ tối thiểu 320px.
- Vùng click nên đạt gần 44x44px, đặc biệt với icon button.
- Dùng `focus-visible`; không xóa outline mà không có focus ring thay thế.
- Modal cần `role="dialog"`, `aria-modal="true"` và tên truy cập được.
- Loading cần text/`aria-label`; form error nên liên kết bằng `aria-describedby`.
- Ảnh nội dung phải có `alt`; ảnh trang trí dùng `alt=""`.
- Hover không được là cách duy nhất để xem nội dung quan trọng.

`globals.css` đã giảm motion trong `prefers-reduced-motion`. Animation mới cũng
phải nằm trong rule này.

## 10. Class migration `.rogym-sx-*`

File [`src/styles/generated.css`](./src/styles/generated.css) chứa các class hash đã được tạo để loại
bỏ style tĩnh khỏi React mà không thay đổi giao diện.

Quy tắc:

1. Không dùng `.rogym-sx-*` trong code mới.
2. Không đổi tên thủ công nếu chưa kiểm tra tất cả nơi đang dùng.
3. Khi một class hash được lặp lại hoặc cần chỉnh sửa theo semantics, chuyển nó
   thành class có tên rõ ràng trong `@layer components` tại file phù hợp ở
   `src/styles/components/`.
4. Xóa class hash chỉ sau khi `rg` xác nhận không còn reference.

## 11. Thêm pattern mới

Trước khi thêm CSS:

1. Tìm component/class hiện có bằng `rg`.
2. Xác định pattern là global, shared hay chỉ thuộc một miền.
3. Tái sử dụng token hiện có; chỉ thêm token khi giá trị có ý nghĩa hệ thống.
4. Đặt class trong `@layer components` tại file phù hợp ở `src/styles/components/`.
5. Thêm modifier/state thay vì tạo nhiều class gần giống nhau.
6. Cập nhật tài liệu này, `reusable-ui.md` hoặc
   [`src/styles/CONVENTIONS.md`](./src/styles/CONVENTIONS.md) nếu API mới được dùng chung.

Ví dụ cấu trúc khi bổ sung class mới, trong đó `rogym-summary-card` là tên minh
họa và chưa phải API hiện có:

```css
@layer components {
  .rogym-summary-card {
    border: 1px solid var(--rogym-border-subtle);
    border-radius: 1rem;
    background: var(--rogym-bg-card);
  }

  .rogym-summary-card.is-active {
    border-color: var(--rogym-border-teal-hover);
    background: var(--rogym-bg-card-hover);
  }
}
```

## 12. Checklist review UI

- Không có style trực tiếp trong React.
- Không có màu/font/shadow tùy ý mới trong TSX.
- Đã ưu tiên shared component và class semantic.
- Có loading, empty, error và disabled state.
- Active state có `aria-current` hoặc `aria-pressed` khi phù hợp.
- Keyboard focus nhìn thấy rõ.
- Mobile layout không overflow.
- Motion tôn trọng reduced motion.
- Không tạo thêm `.rogym-sx-*`.
- Chạy `npm run lint` và `npm run build` trong thư mục `client`.
