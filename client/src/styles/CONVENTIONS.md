# CSS State Conventions — client/src/styles

## State patterns

Ba pattern được dùng trong codebase. Chọn theo nguồn gốc của state:

### 1. `.is-*` class — JavaScript-managed state
Dùng khi JavaScript thêm/xóa class để thể hiện UI state.
State không phải từ data attribute của HTML.

Ví dụ:
```
  <div class="rogym-sidebar is-expanded">
  <button class="rogym-filter-chip is-active">
```
### 2. `[data-state="*"]` — Radix UI / Headless UI state
Dùng KHI VÀ CHỈ KHI thư viện component (Radix, Headless) đặt
data-state attribute. Đây là convention của Radix UI.

Ví dụ:
  .rogym-select[data-state="open"]
  .rogym-select__item[data-highlighted]
  .rogym-select__item[data-state="checked"]

### 3. `[data-*]` custom attribute — Semantic/data-driven state
Dùng khi state phản ánh data domain (tone, severity, status),
không phải UI state. Giá trị đến từ dữ liệu (API response, prop).

Ví dụ:
  [data-tone='success']    ← từ prop tone="success"
  [data-status='completed'] ← từ API status field

## Quy tắc chọn

| State đến từ đâu | Dùng pattern |
|------------------|--------------|
| JS class toggle | .is-* |
| Radix UI / Headless UI | [data-state] |
| Data/API field | [data-*] custom |

## Naming: BEM + is-*

Cấu trúc class:
  .rogym-{component}                    Block
  .rogym-{component}__{element}         Element
  .rogym-{component}--{modifier}        Static modifier (design variant)
  .rogym-{component}.is-{state}         Dynamic state

Không trộn modifier và state:
  OK:  .rogym-btn--danger.is-active
  NOK: .rogym-btn--is-active
