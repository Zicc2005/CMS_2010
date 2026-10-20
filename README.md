# Gift Studio CMS · Quà tặng 20/10

Hệ thống CMS quản lý, tùy biến và đóng gói Website Quà tặng 20/10 độc lập. Chạy **100% Client-Side trên Trình duyệt (Zero-Backend)**, không phụ thuộc vào Python hay máy chủ backend, sẵn sàng triển khai trực tiếp lên **Vercel** hoặc chạy cục bộ trên máy tính.

---

## 🌟 Kiến trúc kỹ thuật: Zero-Backend (Hoàn toàn tĩnh)

Hệ thống đã được thiết kế lại theo tiêu chuẩn Web hiện đại, loại bỏ hoàn toàn rào cản cần cài đặt môi trường backend:

1. **Không cần Python khi deploy Vercel**:
   - Toàn bộ logic CMS (quản trị, chỉnh sửa, xem trước, tải media, đóng gói file ZIP) được thực thi 100% bằng JavaScript chạy trực tiếp trên trình duyệt của người dùng.
   - Vercel chỉ đóng vai trò phân phối các tệp tĩnh (Static Assets), đạt tốc độ tải tức thì và không bao giờ gặp lỗi Serverless/Python build error.

2. **Đóng gói file ZIP trực tiếp trong trình duyệt (JSZip)**:
   - Khi bấm **"Lưu & tải gói ZIP về máy"**, thư viện JSZip sẽ tự động nạp các tệp mẫu, chèn nội dung `site.json` mới, gom toàn bộ ảnh/nhạc bạn đã tải lên, cấu hình Vercel và nén thành 1 tệp `.zip` hoàn chỉnh chỉ trong 1-2 giây.
   - Sử dụng **File System Access API (`showSaveFilePicker`)** cho phép bạn chủ động chọn thư mục lưu file ZIP trên máy tính (có fallback tải về bình thường).

3. **Lưu trữ cục bộ an toàn (LocalStorage & IndexedDB)**:
   - Bản nháp nội dung được lưu tự động vào `localStorage`.
   - Các tệp ảnh, video, bản ghi âm giọng nói tải lên được lưu bền vững vào `IndexedDB` của trình duyệt, không bao giờ bị mất khi F5 tải lại trang.

4. **Trực quan & Đa thiết bị**:
   - Truy cập và tùy biến CMS trên bất kỳ thiết bị nào (máy tính, laptop, máy tính bảng, điện thoại).
   - Tích hợp Microphone thu âm trực tiếp giọng đọc bức thư.
   - Xem trước giao diện người nhận với hiệu ứng Ray chạy 2 chiều và phong thư chuẩn responsive.

---

## 🚀 Triển khai CMS lên Vercel (Dùng trực tiếp trên web)

1. Đẩy mã nguồn repository này lên GitHub cá nhân của bạn: `https://github.com/Zicc2005/CMS_2010`.
2. Truy cập [Vercel](https://vercel.com) → Chọn **Add New...** → **Project**.
3. Chọn repository **CMS_2010**:
   - **Framework Preset**: Chọn `Other` (hoặc để mặc định).
   - **Root Directory**: `./` (mặc định).
   - **Build Command**: Để trống (không cần build).
   - **Output Directory**: `.` (đã được cấu hình trong `vercel.json`).
4. Nhấn **Deploy**.
5. Sau 10-20 giây, bạn sẽ nhận được đường link CMS online (ví dụ: `https://cms-2010.vercel.app/`).
   - Truy cập vào đường link đó để chỉnh sửa món quà bất cứ lúc nào!

---

## 💻 Chạy cục bộ trên máy tính (Offline)

Nếu bạn muốn chạy trên máy tính:
- **Cách 1**: Nhấp đúp chuột vào file `start-cms.cmd` để mở CMS tại `http://127.0.0.1:2010/admin/`.
- **Cách 2**: Chạy lệnh `python -m http.server 2010 --bind 127.0.0.1` trong thư mục `CMS_2010`.

---

## 📦 Quy trình tạo quà và gửi đến người ấy

1. Mở trang CMS (trên Vercel hoặc máy tính).
2. Tùy chỉnh thông tin người nhận, người gửi, lời chúc, ảnh kỷ niệm, nhạc nền hoặc thu âm giọng đọc bức thư.
3. Bấm **Lưu thay đổi**.
4. Bấm **Xem website ↗** để kiểm tra thực tế.
5. Tại mục **05. Mang món quà đến người ấy**:
   - Điền tên gói quà (ví dụ: `mon-qua-tang-mthy`).
   - Bấm **Lưu & tải gói ZIP về máy 💾**. Chọn nơi lưu trên máy tính.
6. **Đưa website quà tặng lên Vercel**:
   - Giải nén file ZIP vừa tải về.
   - Đẩy toàn bộ các tệp bên trong lên một GitHub repository mới (ví dụ: `Mthy` hay `tae2010`).
   - Vào Vercel, chọn **Add New... → Project**, import repository đó và bấm **Deploy**.
   - Gửi đường link Vercel kèm thiệp xem trước xinh xắn đến người ấy!

---

## 📂 Cấu trúc thư mục

```text
CMS_2010/
├── index.html              # Chuyển hướng nhanh tới /admin/
├── vercel.json             # Cấu hình tĩnh chuẩn Vercel (rewrites, cleanUrls, headers)
├── start-cms.cmd           # Shortcut khởi động nhanh CMS cục bộ
├── admin/                  # Giao diện CMS Quản lý quà tặng (100% Client-Side)
│   ├── index.html          # Giao diện Studio
│   ├── app.js              # Logic quản trị, thu âm, lưu trữ IndexedDB, nén JSZip
│   ├── template-manifest.js# Danh mục tệp giao diện mẫu để đóng gói
│   ├── jszip.min.js        # Thư viện đóng gói ZIP trong trình duyệt
│   └── style.css           # Giao diện thanh lịch, hiện đại
├── public/                 # Bộ khung giao diện website món quà gốc
│   ├── index.html          # Trang quà tặng chính (đã tích hợp OpenGraph DLove)
│   ├── runtime.js          # Logic tương tác trang quà
│   ├── letter-experience.js# Trải nghiệm mở phong bì chuẩn Responsive Mobile
│   ├── config.js, style.css, gift/, sound/, uploads/...
└── docs/
    └── DEPLOY.md           # Hướng dẫn chi tiết
```
