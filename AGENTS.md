> Global standard: ~/.config/opencode v2026-10-12 — repo delta only.

# Vietnam Airline Tycoon

Game mô phỏng quản lý hãng hàng không Việt Nam (tiếng Việt). Stack: Next.js 14 / React 18 / zustand (persist localStorage) / Leaflet / framer-motion / Recharts.

## Common commands

| Command              | Purpose                                  |
| -------------------- | ---------------------------------------- |
| `npm run dev`        | Dev server (`:3000` trên checkout chính) |
| `npx tsc --noEmit`   | Typecheck                                |
| `npm run build`      | Production build                         |
| `npm run lint`       | ESLint (hiện chỉ còn warning có sẵn)     |

## Directory structure

```
app/                Next.js App Router — mỗi trang game một thư mục
app/v5.css          Layer thiết kế duy nhất (thắng cascade, load cuối)
app/globals.css     Chỉ còn tokens + reset + font (không thêm rule mới vào đây)
components/game-shell.tsx  Shell dùng chung (sidebar/topbar/nav/modals)
components/map/     Bản đồ Leaflet (AirlineMap, AirportPickerMap)
store/useGameStore.ts  Toàn bộ state game (persist key vietnam-airline-tycoon-save)
lib/                Công thức, engine, mock-data, geo, net/server
docs/plans/         Task plan đang chạy (một file cho mỗi task lớn)
```

## Repo-specific rules (R-rules — only the delta from the global standard)

- **R1.** Checkout này có thể có agent khác đang sửa song song. Trước khi sửa file đầu tiên luôn chạy `git status --porcelain`; chỉ commit đúng file của mình (`git commit -- <paths>`, KHÔNG `git add -A`); không đụng vào file đang dở của người khác.
- **R2.** CSS: `app/genz.css` sở hữu toàn bộ giao diện (single light theme).
  Các file legacy (`v5.css`, `v2*.css`, `v3.css`, `v4.css`) đã xóa — không tạo
  lại, không thêm rule vào `globals.css` ngoài tokens/reset.
- **R3.** Không sửa redirect `/onboarding` của `GameShell` khi chưa được duyệt: fresh load nào cũng bounce về đó vì store hydrate sau first render (bug có sẵn, đã ghi trong plan). Harness review điều hướng bằng click trong app để lách.
- **R4.** Review chạy trên bản sao tách biệt (`/tmp/opencode/review/app`, dev `:3100`), không dùng dev `:3000` của checkout chính. Token Telegram và mọi secret chỉ nằm ở scratchpad, KHÔNG vào repo. Webhook của bot thuộc về pcbot — không `deleteWebhook`.
- **R5.** Số tiền animation (`AnimatedMoney`) đổi độ dài chuỗi mỗi frame: mọi hàng chứa nó phải có `min-width: 0` + cắt tràn, không để trang giãn ngang.

## Known traps

- Tick game mỗi giây ghi đè `localStorage`: script review phải rời trang (kill timer) rồi mới sửa save, sau đó reload để store hydrate lại.
- Font mono đổi độ rộng chữ số: đo overflow phải đợi `document.fonts.ready`, nếu không sẽ thấy tràn ma 1–2px.
- `git commit -- <paths>` lỗi pathspec với file đã xóa: stage hết rồi `git commit` thường, sau đó kiểm `git show HEAD --stat`.
- `grep -c` trả về 0 sẽ exit 1 và ngắt chuỗi `&&` — đặt kiểm tra này cuối để chặn push khi commit thiếu nội dung.

## Language

- Docs/comments: tiếng Việt cho UI copy; kỹ thuật giữ nguyên thuật ngữ Anh.
- Commit messages: English, conventional commits (`type(scope): description`).
