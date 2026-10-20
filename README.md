# Gift Studio CMS · Quà tặng 20/10

Hệ thống CMS quản lý, tùy biến và đóng gói Website Quà tặng 20/10 độc lập. Tự động xuất và tải về 1 file ZIP hoàn chỉnh về máy tính (cho phép chọn nơi lưu), sẵn sàng triển khai ngay lên GitHub và Vercel.

---

## 🌟 Tính năng nổi bật

1. **Giao diện quản lý CMS trực quan (`/admin`)**:
   - Tùy chỉnh người gửi, người nhận, lời chúc và mật khẩu mở quà 4 chữ số.
   - Quản lý ảnh kỷ niệm (ray chạy vô tận 2 chiều Dual Running Rails, slideshow toàn màn hình, phóng to ảnh sắc nét).
   - Quản lý bộ ảnh bó hoa (ít nhất 6 ảnh độc lập).
   - Âm nhạc & Nền video/ảnh động: Tải lên playlist nhạc, nhạc nền lịch, lời chúc giọng đọc.
   - **Tích hợp Microphone thu âm trực tiếp**: Thu giọng nói gửi gắm cảm xúc vào bức thư.

2. **Bức thư tình cảm chuẩn Responsive (Mobile-First)**:
   - Tối ưu hóa chiều cao lá thư trên màn hình điện thoại (iPhone SE, iPhone 12/13/14/15, Samsung Galaxy, Android...).
   - Bố cục phong bì tự động căn chỉnh, hạ thấp vừa vặn tầm mắt, tiêu đề không bị che khuất, nội dung cuộn cảm ứng siêu mượt (`-webkit-overflow-scrolling: touch`).

3. **Xuất gói ZIP tải trực tiếp về máy (Chọn nơi lưu)**:
   - Sử dụng **File System Access API (`showSaveFilePicker`)** cho phép người dùng mở hộp thoại Save As trên máy tính và chủ động chọn thư mục lưu file ZIP.
   - Tự động fallback sang tải về trình duyệt nếu trình duyệt không hỗ trợ File System API.
   - Không bị giới hạn ghi đè cứng nhắc trên ổ đĩa máy chủ.

4. **Sẵn sàng triển khai Vercel (Zero Configuration)**:
   - Đã chuẩn bị sẵn file cấu hình `vercel.json` chuẩn Static Site (không cần lệnh build).
   - Tự động tối ưu cache header và clean URLs.

---

## 🚀 Hướng dẫn chạy cục bộ

Yêu cầu máy tính đã cài **Python 3.10** trở lên (chỉ dùng thư viện chuẩn Python, không cần cài đặt thêm thư viện ngoài).

### Cách 1: Chạy file shortcut (Windows)
Nhấp đúp chuột vào file `start-cms.cmd`.

### Cách 2: Chạy qua dòng lệnh (Terminal / PowerShell)
```powershell
python cms/server.py --port 2010
```

- **Giao diện quản lý CMS**: [http://127.0.0.1:2010/admin/](http://127.0.0.1:2010/admin/)
- **Xem trước website người nhận**: [http://127.0.0.1:2010/](http://127.0.0.1:2010/)

---

## 📦 Quy trình tạo quà và triển khai lên Vercel

1. Truy cập [http://127.0.0.1:2010/admin/](http://127.0.0.1:2010/admin/).
2. Tùy chỉnh thông tin người nhận, lời chúc, ảnh kỷ niệm, nhạc nền và giọng đọc.
3. Nhấn **Lưu thay đổi**, sau đó mở **Xem website** để kiểm tra trải nghiệm thực tế.
4. Tại mục **05. Mang món quà đến người ấy**:
   - Điền tên gói quà (ví dụ: `mon-qua-tang-ngoc-quynh`).
   - Nhấn **Lưu & tải gói ZIP về máy 💾**.
   - Cửa sổ lưu file sẽ xuất hiện để bạn **chọn thư mục lưu file ZIP** trên máy tính.
5. **Đưa lên Vercel**:
   - Giải nén file ZIP hoặc đẩy toàn bộ code đã giải nén lên một GitHub repository cá nhân.
   - Đăng nhập vào [Vercel](https://vercel.com) → Chọn **Add New...** → **Project**.
   - Chọn repository vừa tạo. Vercel sẽ tự động đọc `vercel.json` đã được cấu hình sẵn.
   - Nhấn **Deploy** để nhận đường link `.vercel.app` gửi đến người ấy!

---

## 📂 Cấu trúc thư mục

```text
CMS_2010/
├── admin/                  # Giao diện quản trị CMS, chỉnh sửa media & xuất ZIP
│   ├── app.js             # Logic CMS, thu âm, File System Access API
│   ├── index.html         # Bố cục dashboard quản lý
│   └── style.css          # Giao diện quản trị hiện đại
├── cms/
│   ├── server.py          # Máy chủ HTTP cục bộ, API lưu/upload/đóng gói ZIP
│   └── schema.py          # Validate dữ liệu và cấu trúc tài nguyên
├── public/                 # Mã nguồn website người nhận quà
│   ├── content/site.json  # Dữ liệu nội dung, lời chúc, cấu hình ảnh/nhạc
│   ├── letter-experience.*# Module phong bì & lá thư (đã tối ưu responsive)
│   ├── gallery-experience.*# Module ảnh kỷ niệm (ray chạy 2 chiều / trình chiếu)
│   ├── gift/              # Hoạt cảnh 3D Three.js: trái tim hoa, vũ trụ, địa cầu
│   └── fonts/             # Phông chữ Việt hóa Noto Sans / Serif
├── docs/                   # Hướng dẫn chi tiết
│   └── DEPLOY.md          # Hướng dẫn chi tiết GitHub & Vercel
├── tests/                  # Bộ kiểm thử tự động
│   └── test_cms.py        # Unit tests kiểm tra CMS API và tính toàn vẹn
├── vercel.json             # Cấu hình sẵn sàng deploy lên Vercel
├── start-cms.cmd           # Shortcut khởi động nhanh CMS trên Windows
└── README.md
```

---

## 🧪 Kiểm tra hệ thống (Tests)

Chạy bộ kiểm thử tự động:

```powershell
python -m unittest discover -s tests -p test_cms.py -v
```
