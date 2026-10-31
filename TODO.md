# VKTool - Master To-do List

Cập nhật: 2026-10-31

## Quy ước
- [x] Hoàn thành và đã kiểm tra tĩnh
- [~] Đã triển khai, đang chờ kiểm thử runtime trong game
- [ ] Chưa triển khai

## Giai đoạn 0 - Phát hành và quản lý phiên bản
- [x] Chuẩn hóa file chạy chính `vk-tro-ly.js`
- [x] Tạo lại `index.html` cho GitHub Pages
- [x] Tạo `README.md`
- [x] Tạo `TODO.md` theo dõi tiến độ
- [x] Bookmarklet có cache-busting
- [x] Bookmarklet đóng và loại bỏ giao diện Beta cũ trước khi nạp
- [ ] Tạo `CHANGELOG.md`
- [ ] Tạo quy trình Stable / Beta / Development
- [ ] Gắn commit/build ID tự động
- [ ] Tạo GitHub Release và rollback

## Giai đoạn 1 - Ổn định lõi runtime
- [x] Xác nhận `run.nodes` là object trong phiên bản game hiện tại
- [x] Adapter đọc `Object.entries(run.nodes || {})`
- [x] Phân biệt node encounter và node vị trí
- [x] Không coi node chỉ có slot là encounter
- [x] Sửa `inspectReport()` đếm node object
- [x] Thống kê encounter không tồn tại và slot không tồn tại
- [x] Thống kê các địa điểm đặc biệt
- [~] Kiểm thử Beta 34 trực tiếp trong game
- [ ] Kiểm thử nhiều save và nhiều cảnh giới
- [ ] Chuẩn hóa toàn bộ runtime adapter
- [ ] Chế độ debug có namespace

## Giai đoạn 2 - Model dữ liệu chuẩn
- [x] Xác định cần tách Place khỏi Encounter
- [ ] Tạo `PlaceRecord`
- [ ] Tạo `EncounterRecord`
- [ ] Tạo `QuestRecord`
- [ ] Tạo `PersonRecord`
- [ ] Tạo `ItemRecord`
- [ ] Registry nguồn dữ liệu
- [ ] Chống trùng record giữa các tab

## Giai đoạn 3 - Địa điểm đặc biệt
- [x] Nhận diện `diaDanh.loai === sao_huyet`
- [x] Nhận diện `diaDanh.loai === di_tich`
- [x] Nhận diện `diaDanh.loai === khoang_mach`
- [x] Không nhận nhầm Bí cảnh có địa hình `di_tich`
- [~] Hiển thị địa điểm đặc biệt đang có node trong Beta 34
- [ ] Renderer riêng cho Place
- [ ] Gộp `suKien` và `gan` vào một card địa điểm
- [ ] Hiển thị tộc yêu, yêu khí, quốc gia, thế lực
- [ ] Bộ lọc riêng Sào huyệt / Di tích / Khoáng mạch
- [ ] Trạng thái khám phá và khả dụng

## Giai đoạn 4 - Thời hạn và vòng đời
- [x] Xác định các trường cần inspect: `hetHanNam`, `namSinh`, `han`, `namLamMoi`, `moLai`, `biDiet`
- [ ] Xác định trường thời hạn thật của Sào huyệt
- [ ] Đối chiếu chính xác popup bản đồ theo tháng
- [ ] Xác định ý nghĩa `biDiet`
- [ ] Xác định ý nghĩa `namLamMoi`
- [ ] Xác định ý nghĩa `moLai`
- [ ] Tạo `TimeState`
- [ ] Đến kịp / Không kịp theo thời hạn thật

## Giai đoạn 5 - Condition Engine
- [x] Có engine điều kiện nền tảng
- [ ] Hoàn thiện điều kiện nhân vật
- [ ] Hoàn thiện điều kiện thế giới
- [ ] Hoàn thiện logic lồng nhau
- [ ] Cooldown và `cach_nam`
- [ ] Điều kiện tông môn, cấp bậc, phái sơn môn
- [ ] Kết quả đạt / không đạt / chưa biết có giải thích

## Giai đoạn 6 - Phần thưởng và rủi ro
- [x] Có bộ quét effect nền tảng
- [ ] Resolver biến encounter
- [ ] Phân tích chắc chắn / ngẫu nhiên / phụ thuộc thắng
- [ ] Phân tích nhánh nhiều tầng
- [ ] Chi phí thời gian
- [ ] Danh vọng, quan hệ, Đạo tâm, nhân quả, phúc phần
- [ ] Điểm lợi ích và điểm rủi ro

## Giai đoạn 7 - Chiến đấu
- [x] Có nhận diện combat nền tảng
- [ ] Phân tích boss, tinh anh, số lượng và đội hình kèm
- [ ] Phân tích chiến lực người chơi
- [ ] Dự báo dễ / cân bằng / nguy hiểm
- [ ] Giải thích dự báo

## Giai đoạn 8 - Sự kiện ngẫu nhiên
- [x] Đọc encounter trong `run.nodes`
- [ ] `run.bienCo`
- [ ] `lookupMarks`
- [ ] `seeds`
- [ ] NPC ghé qua
- [ ] Hạt nhân quả đang trổ
- [ ] Chống trùng nhiều nguồn

## Giai đoạn 9 - Nhiệm vụ và tông môn
- [x] Đọc nhiệm vụ đã nhận, treo thưởng và Ngọc giản nền tảng
- [ ] Renderer nhiệm vụ riêng
- [ ] Thời hạn, mục tiêu, phần thưởng
- [ ] Đánh giá hiệu quả nhiệm vụ
- [ ] Tiện ích tông môn đầy đủ

## Giai đoạn 10 - Nhân mạch
- [ ] Danh sách NPC
- [ ] Vị trí, khoảng cách, quan hệ, cảnh giới
- [ ] Quà yêu thích
- [ ] NPC liên quan nhiệm vụ
- [ ] Nút xem bản đồ

## Giai đoạn 11 - Dị bảo và vật phẩm
- [x] Dị bảo nền tảng
- [x] Tìm vật phẩm và nguồn nhận nền tảng
- [x] Kiểm tra túi đồ và chống trùng nền tảng
- [ ] Hoàn thiện xác suất và điều kiện nguồn nhận
- [ ] Phân biệt mọi vị trí lưu trữ
- [ ] Tích hợp nguồn chế tạo và nghề

## Giai đoạn 12 - Tư vấn
- [ ] Lựa chọn an toàn nhất
- [ ] Lựa chọn lợi ích cao nhất
- [ ] Phù hợp chỉ số hiện tại
- [ ] Ưu tiên sự kiện
- [ ] Giải thích và trọng số tùy chỉnh

## Giai đoạn 13 - Lộ trình
- [x] Khoảng cách và thời gian di chuyển một điểm
- [ ] Bộ lọc nâng cao
- [ ] Sắp xếp giá trị trên mỗi năm
- [ ] Chọn nhiều điểm
- [ ] Tối ưu lộ trình
- [ ] Loại điểm không đến kịp

## Giai đoạn 14 - UI và hiệu năng
- [x] Giao diện desktop/mobile nền tảng
- [x] Kéo, thu nhỏ, lưu vị trí
- [ ] Tab Địa điểm riêng
- [ ] Tab Chẩn đoán
- [ ] Cài đặt
- [ ] Cache dữ liệu tĩnh
- [ ] Cập nhật phần thay đổi thay vì quét lại toàn bộ
- [ ] Kiểm tra hiệu năng trên 1.677 slot

## Giai đoạn 15 - Diagnostics
- [x] `inspectReport()` nền tảng
- [x] Script Console xuất JSON
- [ ] Nút xuất JSON trong Tool
- [ ] Báo cáo rút gọn theo nhóm
- [ ] Log lỗi tải xuống được
- [ ] Phiên bản schema báo cáo

## Giai đoạn 16 - Đồng bộ Extension
- [x] Inspect dữ liệu Extension hiện tại
- [ ] Pipeline trích xuất tự động
- [ ] Diff encounter / item / slot / schema
- [ ] Build Extension, userscript và VKTool cùng phiên bản
- [ ] Changelog tự động

## Giai đoạn 17 - Kiểm thử
- [x] `node --check`
- [x] Parse toàn bộ bằng Acorn
- [ ] Unit test condition/effect/time/place
- [ ] Fixture Sào huyệt / Di tích / Khoáng mạch / Bí cảnh
- [ ] Test UI thủ công có checklist
- [ ] Regression test

## Giai đoạn 18 - Phát hành
- [ ] Release Candidate
- [ ] Freeze tính năng
- [ ] Kiểm thử đa save
- [ ] Kiểm thử mobile
- [ ] Rollback ổn định
- [ ] Version 1.0

## Việc đang thực hiện
1. [~] Kiểm thử Beta 34 runtime.
2. [ ] Tạo PlaceRecord và renderer riêng trong Beta 35.
3. [ ] Inspect thời hạn thật để làm Beta 36.
