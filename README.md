# VKTool — Vạn Kiếp Trợ Thủ

Bookmarklet hỗ trợ người chơi game **Vạn Kiếp Tu Tiên**. Công cụ đọc dữ liệu và dùng chính các hàm tính của game đang chạy để tra cứu, tính toán và tự động hóa, nên khi game cập nhật, phần lớn chức năng tự theo kịp. Đã kiểm tra với game bản **0.3.0**.

## Cài đặt

Mở `index.html` qua GitHub Pages (`https://yingchunbin.github.io/VKTool/`) để có hướng dẫn chi tiết cho máy tính, iPhone/iPad và Android. Tóm tắt:

- **Máy tính:** kéo nút **VKTool** lên thanh dấu trang.
- **iOS (Safari) / Android (Chrome, Firefox):** bấm *Sao chép bookmarklet*, thêm dấu trang của trang này, sửa địa chỉ dấu trang thành đoạn mã vừa sao chép. Khi dùng, gõ tên dấu trang vào thanh địa chỉ và chọn đúng gợi ý.
- Phải đang ở trong một kiếp thì mới nạp được. Mỗi lần tải lại game, bấm lại dấu trang.
- Bookmarklet nạp `ToolVKGrok.js` kèm mã chống cache và tự đóng bản cũ.

Đoạn mã bookmarklet:

```
javascript:(async()=>{try{window.__VKT2__?.destroy?.()}catch{}await import('https://yingchunbin.github.io/VKTool/ToolVKGrok.js?v='+Date.now())})().catch(e=>alert('VKTool: '+(e&&e.message||e)))
```

## Các tab

| Tab | Làm gì |
|---|---|
| Nhiệm vụ | Sự kiện và việc đang có, quãng đường, thời gian còn lại, có kịp không; vẽ đường tới nơi cần đến |
| Bản đồ | Tra cứu mọi địa danh, lọc theo loại hoặc quốc gia, điểm săn yêu, vẽ đường |
| Bí cảnh & Dị bảo | Bí cảnh và cảnh giới đề xuất; Bảo lục Nghịch Thiên, cách có được, dị bảo đang xuất hiện |
| Auto Farm | Tự săn yêu, làm việc, xử lý sự kiện theo chính sách từng nhóm; tự cất đồ chờ, không tự vứt đồ |
| Treo thưởng | Theo dõi việc treo thưởng đã nhận và nơi làm |
| Nhân mạch | Danh sách NPC, quan hệ, bộ lọc; nút Kết giao, Tỏ lòng, Ngỏ ý kết đạo lữ, Dò căn cốt |
| Tông môn | Tra cứu tông môn theo lối tu, chính/ma, hệ, quốc gia |
| Đột phá | Thọ nguyên, tu vi còn thiếu, tỉ lệ đột phá và tổ hợp đan theo hàm của game |
| Kinh mạch | Tự xếp đồ lên kinh mạch tối ưu (danh, tu luyện, cân bằng), xếp giả định, đặt mua món thiếu, bộ đồ, kháng tâm ma |
| Luân hồi | Thành tựu theo nhóm, điểm đã nhận và còn thiếu |
| Dịch Dung | Đổi tên và diện mạo, hiện chi phí |
| Vật phẩm | Tra cứu, đặt mua với tiền cọc, thanh toán khi hàng về |
| Kiểm tra | Đối chiếu công cụ với bản game, sao chép báo cáo khi có lỗi |

## Kinh mạch: ghi chú kỹ thuật

- Sức mạnh một mảnh = màu ô × số huyệt phủ × sinh khắc từ mảnh kề × nội tại × kinh lộ. Điểm cuối do hàm `tinhKinhMach` của game tính.
- Bộ đồ chỉ tính cho món đặt trên kinh mạch; hiệu ứng giảm theo món yếu nhất trong bộ.
- Phẩm chuẩn theo cảnh giới (cảnh 5 là Thần phẩm), không vượt phẩm cao nhất đang có trong túi. Món thấp hơn mức cho phép ("Lấp hố": −1, −2 mặc định, −3, không giới hạn) không được nhét chỉ để lấp ô trống.
- Quy trình: tham lam → quy hoạch động → mô phỏng luyện kim ×2 → tinh chỉnh → thử ghép bộ đồ → lấp ô. Điểm ước lượng bằng 60 trận mẫu (12 loài quái × 5 cấp).

## Giao diện

- Biểu tượng **仙**: mở hoặc thu panel; **⤢** mở rộng; **✕** thu gọn.
- Kéo thanh tiêu đề để di chuyển, kéo góc dưới phải để đổi cỡ.
- Bộ lọc và lựa chọn được nhớ trong trình duyệt.

## Chẩn đoán

Khi game cập nhật mà chức năng nào không chạy, mở tab **Kiểm tra**, bấm kiểm tra lại rồi sao chép báo cáo.

## Tệp trong repo

- `index.html`: trang cài đặt và hướng dẫn.
- `ToolVKGrok.js`: công cụ chính (bản build ghi trong tab Kiểm tra).
- `vk-dump.js`: tập lệnh trích dữ liệu game để đối chiếu.
- `TODO.md`: tiến độ.
