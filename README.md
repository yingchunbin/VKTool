# VKTool

Trợ thủ đọc dữ liệu runtime của Vạn Kiếp Tu Tiên để tổng hợp sự kiện, địa điểm đặc biệt, dị bảo, vật phẩm, nhiệm vụ và khoảng cách di chuyển.

## Cài nhanh

Mở `index.html` qua GitHub Pages, kéo bookmarklet vào thanh dấu trang hoặc sao chép bookmarklet.

## File chính

- `vk-tro-ly.js`: mã chạy trong trang game.
- `index.html`: trang cài đặt và kiểm tra phiên bản.
- `TODO.md`: tiến độ phát triển.

## Cập nhật

Bookmarklet dùng tham số thời gian để tránh cache. Khi cập nhật, Tool cũ được đóng và giao diện Beta cũ được xóa trước khi nạp bản mới.

## Chẩn đoán

Mở Console và chạy:

```javascript
window.__VK_EVENT_HUNTER__?.inspectReport?.()
```

## Trạng thái

Phiên bản đang phát triển: Beta 34. Xem `TODO.md` để biết phần đã hoàn thành và phần đang triển khai.
