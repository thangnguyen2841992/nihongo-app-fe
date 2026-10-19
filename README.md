# nihongo-app

## Góc tự học tiếng Anh

Sau khi đăng nhập, mở **Học tập → Tiếng Anh cá nhân** (`/user/english`). Trang có
ba đầu sách tham khảo: Essential Grammar in Use, English Vocabulary in Use –
Elementary và Tree or Three?. Các nút tài nguyên dẫn tới Cambridge; ứng dụng chưa
chứa bản PDF/audio đầy đủ của các sách.

- Chọn PDF và audio có quyền sử dụng từ máy để đọc/nghe trong trình duyệt. File
  không được tải lên API, không lưu vào kho nội dung chung và phải chọn lại sau
  khi mở lại trang. Audio hỗ trợ danh sách bản ghi, tốc độ nghe và lặp lại.
- Điền bài đang học, trang đọc, số bài đã học, tổng số bài theo phiên bản sách và
  ghi chú. Bấm **Lưu tiến độ và ghi chú** để lưu sổ tay của cả ba cuốn.
- Ghi chú/tiến độ dùng localStorage theo email tài khoản trên trình duyệt hiện tại;
  chưa đồng bộ giữa thiết bị, không mã hóa và không thay thế kho lưu trữ bảo mật
  trên máy dùng chung. Xóa dữ liệu trình duyệt sẽ xóa các ghi chú này.
- Khi đổi tài khoản, đăng xuất hoặc rời trang, các URL file tạm được thu hồi.

Kiểm tra riêng tính năng:

### Bản học Essential Grammar Anh–Việt

Tại trang tiếng Anh, phần học Anh–Việt hiển thị ngay sau khi đăng nhập, không cần
chọn file. Dữ liệu nằm trong `src/data/essential-grammar-vi.json` và được tải tự động
cùng ứng dụng (khoảng 110 KB, không nhúng PDF). JSON có đủ 115 Unit: công thức,
một ví dụ Anh–Việt, điểm dễ nhầm và một câu trắc nghiệm bổ sung có giải thích.
Mục lục hỗ trợ tìm kiếm tiếng Anh/Việt không dấu; mỗi Unit có nút mở đúng trang
lý thuyết, bài tập và phần đáp án của PDF. Đây là bản hỗ trợ học, không phải bản
dịch nguyên văn toàn bộ sách. Bài trắc nghiệm bổ sung không thay cho bài tập gốc.

PDF gốc vẫn được mở từ máy khi cần đối chiếu. Phần **Tuỳ chọn: nhập gói cá nhân
kèm PDF** nhận file `essential-grammar-vi.english-study.json` tại
`../output/english/` nếu muốn mở đồng thời bài học và PDF. Gói cá nhân được đọc
tại máy và cần chọn lại khi mở lại trang; bài học tích hợp sẵn vẫn luôn hiển thị.
Nút nghe ví dụ dùng giọng tổng hợp của trình duyệt, không
phải bản thu âm của nhà xuất bản.

Tạo lại JSON bài học bằng Python có `pypdf`:

```sh
python scripts/english/build_essential_pack.py --source "/path/to/Essential Grammar - new edition.pdf" --curriculum-only --output "src/data/essential-grammar-vi.json"
```

Tạo gói cá nhân có cả PDF:

```sh
python scripts/english/build_essential_pack.py --source "/path/to/Essential Grammar - new edition.pdf" --output "../output/english/essential-grammar-vi.english-study.json"
```

Tham số `--map` nhận bản đồ trang đã đối chiếu cùng đúng SHA-256 của PDF để mở
thẳng trang bắt đầu đáp án mỗi Unit. Nếu không cung cấp map, nút đáp án mở phần
Key to Exercises để người học tự tìm Unit. Số trang tham chiếu dựa trên đúng bản
PDF Fourth Edition 318 trang đã cung cấp.

```sh
npm run test:unit -- --run src/services/__tests__/englishSelfStudy.spec.ts src/users/__tests__/EnglishSelfStudy.spec.ts
npx playwright test e2e/english-self-study.spec.ts --project=chromium
```

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Run End-to-End Tests with [Playwright](https://playwright.dev)

```sh
# Install browsers for the first run
npx playwright install

# When testing on CI, must build the project first
npm run build

# Runs the end-to-end tests
npm run test:e2e
# Runs the tests only on Chromium
npm run test:e2e -- --project=chromium
# Runs the tests of a specific file
npm run test:e2e -- tests/example.spec.ts
# Runs the tests in debug mode
npm run test:e2e -- --debug
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
