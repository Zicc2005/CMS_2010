# Đưa món quà lên GitHub và Vercel

Thư mục xuất chứa website tĩnh hoàn chỉnh. Không cần Python, CMS, cơ sở dữ liệu hay khóa API để chạy bản này.

1. Giải nén ZIP. Mở thư mục mang tên món quà; `index.html` phải nằm ngay trong thư mục này.
2. Tạo một repository mới trên GitHub. Đưa **nội dung bên trong** thư mục món quà lên repository, gồm các thư mục ảnh/nhạc, `content/site.json` và `vercel.json`.
3. Trong Vercel, chọn **Add New → Project → Import Git Repository**, rồi chọn repository vừa tạo.
4. Chọn **Framework Preset: Other**. Root Directory là thư mục có `index.html`. Không có Install Command hoặc Build Command. Output Directory là `.`. Bản xuất đã có `vercel.json` tương ứng.
5. Deploy. Vercel cấp địa chỉ dạng `ten-du-an.vercel.app` và triển khai lại khi có commit mới trên nhánh chính.
6. Nếu bạn có tên miền riêng, vào **Project Settings → Domains → Add**, nhập tên miền và thiết lập DNS theo chỉ dẫn Vercel.

Nếu dùng Git từ terminal, chạy bên trong thư mục món quà:

```powershell
git init
git add .
git commit -m "Publish personal gift website"
git branch -M main
git remote add origin https://github.com/TEN-TAI-KHOAN/TEN-REPOSITORY.git
git push -u origin main
```

Thay URL bằng repository thật của bạn. Nếu repository đã có sẵn, dùng quy trình commit/push của repository đó.

Muốn sửa nội dung: trở về Gift Studio, đổi ảnh/nhạc/lời chúc, xuất với một tên mới, rồi cập nhật các tệp trong repository của website. CMS không tự đăng nhập hoặc push GitHub/Vercel.

Mật khẩu 4 số là màn mở quà mang tính trải nghiệm; dữ liệu và tệp của website tĩnh vẫn có thể được tải trực tiếp. Không dùng nó để bảo vệ thông tin bí mật.

Tài liệu chính thức: [Cấu hình bản dựng](https://vercel.com/docs/builds/configure-a-build), [Kết nối Git](https://vercel.com/docs/git), [Thêm tên miền](https://vercel.com/docs/domains/working-with-domains/add-a-domain).
