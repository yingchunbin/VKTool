# VKTool — Vạn Kiếp Trợ Thủ

Bookmarklet hỗ trợ người chơi game **Vạn Kiếp Tu Tiên**. Công cụ đọc dữ liệu và dùng chính các hàm tính của game đang chạy để tra cứu, tính toán và tự động hóa, nên khi game cập nhật, phần lớn chức năng tự theo kịp. Đã kiểm tra với game bản **0.3.0**.

## Cài đặt

Mở `index.html` qua GitHub Pages (`https://yingchunbin.github.io/VKTool/`) để có hướng dẫn chi tiết. Tóm tắt:

- **Máy tính:** kéo nút **VKTool** lên thanh dấu trang.
- **iOS (Safari) / Android (Chrome, Firefox):** bấm *Sao chép bookmarklet*, thêm dấu trang của trang này, sửa địa chỉ dấu trang thành đoạn mã vừa sao chép. Khi dùng, gõ tên dấu trang vào thanh địa chỉ và chọn đúng gợi ý.
- Phải đang ở trong một kiếp thì mới nạp được. Mỗi lần tải lại game, bấm lại dấu trang.

Đoạn mã bookmarklet:

```
javascript:(async()=>{try{window.__VKT2__?.destroy?.()}catch{}await import('https://yingchunbin.github.io/VKTool/ToolVKGrok.js?v='+Date.now())})().catch(e=>alert('VKTool: '+(e&&e.message||e)))
```

## Giao diện chung

- Biểu tượng **仙**: mở hoặc thu panel. **⤢** mở rộng, **✕** thu gọn. Kéo thanh tiêu đề để di chuyển, kéo góc dưới phải để đổi cỡ.
- Khi panel thu gọn, công cụ báo bằng thông báo nhỏ và số trên icon 仙 mỗi khi có bí cảnh mở cửa mà bạn tới kịp, hoặc dị bảo vừa xuất hiện.
- Đường đi vẽ lên bản đồ có nhãn nhỏ để xóa. Bộ lọc và lựa chọn được nhớ trong trình duyệt.

## Bán nhanh trong túi đồ

- Trong màn hình **túi đồ** của game, công cụ thêm nút **Bán nhanh** cạnh nút thao tác của túi. Không cần vào cửa hàng.
- Bấm **Bán nhanh**, rồi bấm các ô vật phẩm muốn bán (bấm lại để bỏ chọn). Ô được chọn viền đỏ.
- Nút đổi thành **Bán N món · +X**, tức số món và số linh thạch dự kiến. Bấm nút đó để bán hết, bấm **Esc** hoặc bấm nút khi chưa chọn gì để thoát.
- Bán **trọn cả chồng** của mỗi món đã chọn, giá tính bằng đúng hàm giá bán của game.
- Không bán được: vật đã khóa, lệnh bài, vật phẩm trận phái, vật không có giá, bảo vật Nghịch Thiên. Không bán được khi đang trong trận.
- Nếu trong số chọn có vật phẩm phẩm cao (từ Thiên trở lên) thì hỏi xác nhận trước khi bán.

## Chi tiết từng tab

### 事 Nhiệm vụ

Liệt kê sự kiện và cơ duyên đang có trên bản đồ, cho biết đi tới nơi mất bao lâu và có kịp hay không.

**Tìm và lọc**

- Ô tìm khớp theo tên sự kiện, địa danh, loại, quốc gia và nhãn.
- Hàng nút bấm lọc theo loại sự kiện; nút **Chỉ nơi tới kịp** bật sẵn, tắt đi để xem cả những nơi không kịp.
- Sắp xếp: Khẩn cấp trước (sắp hết hạn lên đầu) · Gần nhất · Theo loại · An toàn trước.

**Mỗi thẻ cho biết**

- Tên, loại, nơi xảy ra, quốc gia, thời gian đi và số dặm.
- Nhãn *Tới kịp* hoặc lý do không kịp; *Còn … khi tới nơi* là thời gian dư sau khi tới.
- Mức nguy hiểm của nơi đó so với cảnh giới của bạn, cảnh báo (nếu có) và các nhãn của sự kiện.

**Nút trên thẻ**

- **Xem bản đồ**: mở bản đồ game tại nơi đó.
- **Đường đi an toàn**: tính đường ngắn nhất tránh nơi hiểm và vẽ lên bản đồ; một nhãn nhỏ cạnh biểu tượng 仙 cho phép xóa đường.

### 地 Bản đồ

Tra cứu mọi nơi trên bản đồ, tìm nơi săn hoặc nơi bán một vật phẩm, tìm vùng săn yêu. Dữ liệu lấy từ world của game; lần đầu mở có thể mất vài giây để lập chỉ mục.

**Ba chế độ**

- **Địa danh**: chia nhóm Thành thị (kinh đô, thành) · Thôn trấn · Bí cảnh và di tích · Linh mạch và khoáng mạch · Phường thị, ẩn sĩ, quan ải · Sào huyệt yêu thú.
- **Tìm vật** (nay dò cả kệ hàng thật của mọi tiệm và nhà đấu giá, gõ tên cụ thể như “Hồi Xuân Đan” hay nhóm như “công pháp” đều ra; thẻ hiện danh sách món đang bày thật tại nơi đó; có hàng chip tên trùng, bấm để xem nơi còn hàng; lần đầu dò nền khoảng nửa phút): gõ tên nguyên liệu, linh dược, trứng thú, bí phương, yêu tài… hoặc chọn nhóm vật (Nguyên liệu · Công thức và pháp · Đồ dùng). Kết quả cho biết nơi săn được, nơi bán, nơi có cơ duyên.
- **Săn yêu**: các vùng hoang dã (rừng, núi, cốc, đồng hoang, đầm, hoang mạc, đỉnh). Gõ tên nguyên liệu hoặc thảo dược để tìm vùng có nó; danh sách và tỉ lệ do game tính tại từng ô.

**Bộ lọc và sắp xếp**

- Lọc theo loại nơi, vị trí, quốc gia.
- **Chỉ nơi vừa sức**: bỏ các vùng có độ khó cao hơn bạn quá nửa cảnh giới.
- Với chế độ săn: **Còn lượt săn** (mỗi nơi tối đa 3 lần) và **Có tộc yêu bản địa**.
- Sắp xếp: Gần nhất · Cấp nền thấp đến cao · Cấp nền cao đến thấp · Tên A đến Z.
- Danh sách dài tự chia trang, bấm xem thêm để tải tiếp.

**Mỗi thẻ cho biết**

- Biểu tượng đúng như Chú giải của game, loại nơi, quốc gia, cấp nền, địa hình, thời gian đi.
- Nút **Xem bản đồ** và **Đường đi an toàn** như tab Nhiệm vụ.

### 秘 Bí cảnh & Dị bảo

Ba mục con, chọn ở hàng nút trên cùng.

**Bí cảnh**

- Xếp theo giờ mở cửa; tiêu đề cho biết tổng số và số bí cảnh đang mở.
- Mỗi thẻ: cảnh giới vào được, mỗi lần mở bao lâu, chu kỳ mở, và có tới kịp không (nên khởi hành sau bao lâu để tới đúng lúc mở).
- Khi thu gọn panel, công cụ vẫn báo (thông báo nhỏ và số trên icon 仙) mỗi khi có bí cảnh mở cửa mà bạn tới kịp.

**Dị bảo**

- **Dị bảo đang xuất hiện**: nơi xuất hiện, dị bảo gì, kẻ canh giữ, cảnh giới đề xuất (đánh dấu nếu ngoài tầm: game vẫn cho vào nhưng kẻ canh giữ rất khó), điều kiện cần, tỉ lệ xuất hiện mỗi lần, hồi chiêu mấy năm, cách lấy.
- **Các dị bảo khác**: những dị bảo đang chờ xuất hiện.
- Dị bảo mới xuất hiện cũng được báo khi bạn đang thu gọn panel.

**Bảo lục Nghịch Thiên**

- Toàn bộ vật Nghịch Thiên trong game, kèm số bạn đã có (tính qua các kiếp, hiện dạng đã có/tổng).
- Cho biết nguồn cố định nếu có; vật chưa có nguồn cố định vẫn có thể rơi từ thủ lĩnh Hóa Thần cuối cảnh hoặc ở Vô Nhai Uyên. Game ưu tiên rơi vật bạn chưa từng có.

### 自 Auto Farm

Tự đi quanh vùng: săn yêu, làm việc trên bản đồ, ghé nơi gần có việc, xử lý sự kiện. Bấm **Bắt đầu** thì panel thu lại; nút tạm dừng và dừng nằm cạnh biểu tượng 仙.

**Tùy chọn chạy**

- Hết thuốc chữa thương mà bị thương từ mức đã chọn (mặc định Thương nặng) thì Auto tự **bế quan đúng số năm để thương thế lành hẳn** (bế quan lành nhanh ×1,5 và còn được tu vi), không phải ở lại chỗ săn yêu chờ lành. Nếu nơi đó không cho bế quan, thiếu linh thạch hoặc thọ quá ít thì quay về cách cũ (dừng). Hộp chọn: Chỉ săn yêu · Ưu tiên nơi gần · Ghé thành thị hoặc trấn gần · Việc trên bản đồ · Săn yêu hoang dã · Hái thuốc dại · Tốc chiến (khi game cho phép) · Tránh tử địa hoặc khó thắng · Tự chọn lựa chọn · Tự dùng thuốc chữa thương · Dừng nếu hết thuốc (từ thương nặng) · Bản đồ tự dõi theo nhân vật.
- **Xử trí kẻ bại**: Tha mạng · Tự động (kết liễu lấy đồ nếu game không cảnh báo) · Kết liễu · Phế tu vi · Sưu hồn (nếu có).
- **Ưu tiên khi chọn lựa chọn**: Cân bằng · Tu vi và lịch luyện · Tài nguyên (linh thạch, đồ) · Chỉ số (thần thức, khí vận, đạo tâm…).
- **Lùng con đầu đàn**: Săn thường trước, hiểm mới lùng đầu đàn · Không bao giờ · Ưu tiên lùng đầu đàn.
- **Né săn quái**: nhập tên yêu thú cần tránh, cách nhau dấu phẩy.
- **Dừng khi thọ nguyên còn ≤ N năm** (mặc định 3).
- **Đuổi theo hay buông tha** kẻ bỏ chạy: Buông tha · Đuổi theo · Tự động (tha nếu đang bị thương).

**Tự bán đồ**

- Dùng đúng chức năng **Bán nhanh** của game (xem trước rồi bán hàng loạt). Tick **loại** và **phẩm** nào thì tự bán loại đó, có nút Chọn tất cả và Bỏ chọn. Game tự bỏ qua món đã khóa, di vật và món tiệm không thu.
- Bán **khi túi nhiều đồ** (từ N loại vật phẩm hoặc có đồ chờ cất) hoặc **mỗi lần ghé nơi có tiệm**. Có thể bật tự đi tới tiệm thu mua gần nhất trong số năm đường đã đặt, bán xong Auto Farm tiếp tục như cũ.
- Tùy chọn: giữ lại N món mỗi loại, không bán đan chữa thương, chỉ bán món đúng ngành của tiệm (giá cao). Tiệm chỉ trả tới hết quỹ của nó nên tool ghé lần lượt mọi tiệm thu mua tại nơi đó. Nút **Bán ngay tại đây** để thử.

**Chính sách lựa chọn**

- Trong một sự kiện, Auto **không** chọn lựa chọn có hệ quả mà bạn chưa cho phép (đọc từ hiệu ứng thật của game, kể cả khi thất bại). Nếu mọi cửa đều trái chính sách thì bấm Thoát.
- Các mục cho phép: Tâm ma tăng · Gieo oán, đắc tội người · Có thể trọng thương · Tốn linh thạch hoặc công hiến · Mất vật phẩm · Hao thọ nguyên · Gia nhập hoặc rời môn phái, thế lực · Sát nhân, diệt khẩu.
- Mẫu nhanh: Chính đạo an toàn · Ma tu, tà đạo · Liều lĩnh (trừ trọng thương).

**Nhóm sự kiện**

- Bật hoặc tắt từng nhóm (và nhóm con) mà Auto sẽ làm: Săn yêu và thú dữ · Hoang dã và thám hiểm · Bí cảnh, dị bảo, di tích · Biến cố dọc đường · Thành trấn và phong thổ · Nhân mạch và duyên · Nghề và ngự linh · Treo thưởng và nhiệm vụ · Quản lý, thế lực, gia tộc · Danh tiếng và đạo thống · Tông môn · Tà đạo và tâm ma · Khác. Toàn bộ sự kiện của game đều đã được phân nhóm.
- Các việc tông môn tuyển đồ, đại bỉ, công phá sơn môn mặc định không tham gia.

**Nhật ký và mục tiêu**

- **Nhật ký sự kiện**: mỗi sự kiện gặp được ghi nhóm, nội dung, mọi lựa chọn (rủi ro, lý do bị loại), lựa chọn đã bấm, kết quả. Có nút Tải JSON, Copy bản đọc, Xóa.
- **Nhật ký chạy** (hệ thống) và nút **Xuất log** để gửi khi gặp lỗi; thống kê OK, bỏ, lỗi, số lần chữa.
- **Mục tiêu gần đến xa**: danh sách điểm săn kèm thời gian đi, mức nguy hiểm, số lần săn còn lại (x/3), nhãn Việc gấp; nút Xem và Đường.
- Khi túi đầy, đồ đang chờ được tự cất vào khi có chỗ; Auto **không bao giờ tự vứt đồ**. Nếu bị thương mà túi không có đan chữa, công cụ nhắc mua Hồi Xuân Đan, Kim Sang Dược hoặc Sinh Cơ Đan.

### 賞 Treo thưởng

Các việc treo thưởng bạn đã nhận.

- Nhận việc ở bảng treo thưởng của thôn, trấn, thành, kinh đô hoặc điện nhiệm vụ tông môn, rồi quay lại tab này.
- Việc có nơi làm rõ ràng hiện thẻ giống tab Nhiệm vụ (thời gian đi, tới kịp hay không, nút Xem bản đồ và Đường đi an toàn). Việc chưa rõ nơi hiện nhãn *Chưa rõ nơi làm việc*.
- Sắp xếp: Khẩn cấp trước · Gần nhất · Theo loại · An toàn trước.

### 人 Nhân mạch

Danh sách NPC bạn biết, kèm việc có thể làm với từng người.

**Tìm và lọc**

- Ô tìm theo tên, danh hiệu, quan hệ, nơi ở, cảnh giới.
- Sắp xếp: Có thể gặp trước · Gần nhất · Hảo cảm cao · Theo tên.
- Lọc: còn sống hoặc đã khuất; giới; quan hệ (quen biết, đối thủ, bằng hữu, hiềm khích, kẻ thù, tử thù, tri kỷ, huynh đệ kết nghĩa, đạo lữ, sư phụ, kẻ phản bội); vị trí (ở cùng nơi, đang xuất hiện, biết nơi ở, chưa rõ tung tích).
- Lọc theo việc: **Có thể tặng quà ngay · Kẻ thù truy tìm được · Mời tới được · Thải bổ được · Song tu được**.

**Trong mỗi thẻ NPC**

- Nơi ở gốc (thế lực, động phủ, quê nhà, nơi gặp gần nhất), tình trạng (trọng thương, đang đồng hành, nợ, có tình ý, kẻ thù).
- **Tặng quà**: món họ ưa, năm nay đã tặng chưa (mỗi năm một lần), cần ở cùng nơi.
- **Mời tới chỗ ta**: bao lâu họ sẽ tới và vật phẩm cần.
- **Thải bổ, Song tu** với đạo lữ (cách nhau tối thiểu 5 năm) kèm lợi ích dự kiến.
- **Kết giao, Tỏ lòng, Ngỏ ý kết đạo lữ**: nút hiện khi NPC đang ở cùng nơi và game cho phép, kèm lý do nếu chưa thể. Với NPC ở xa, công cụ dẫn đường tới thăm.
- **Dò căn cốt** của NPC.
- Nút Xem bản đồ và Đường đi an toàn tới nơi họ ở.

### 宗 Tông môn

Tra cứu tông môn trong thế giới game, và khi bạn đã vào tông thì xem đủ tình trạng của mình ở đó.

**Sơn môn của bạn (khi đã vào tông)**

- Cấp bậc, công tích, cống hiến; bậc kế cần thêm gì; lý do chưa lên được Trưởng lão (nếu có); đặc ân và lối tu của tông.
- **Bổng lộc** đang chờ lĩnh (linh thạch, cống hiến) · giá đổi vật phẩm bằng cống hiến theo cấp bậc · tỉ lệ quyên linh thạch và số đã quyên trong năm · giá linh mạch của tông · phí xuống núi · số ô kho tông.
- **Luật tông**: tội danh đang mang (và tội chưa bị phát giác), ngưỡng bị triệu tập, đang chịu xử, nhiệm vụ hay thư của tông, phần thưởng chờ chọn.
- **Đặc quyền**: hầu cận, phong riêng, điện đang theo, tiến cử đồng môn.
- **Bí cảnh của tông**: đang mở hay còn bao lâu nữa mở, bạn có suất không, loại bí cảnh; **đoàn thám hiểm** có thể cử đi.
- Mọi số liệu lấy thẳng từ hàm của game, không tự tính.

**Danh sách tông môn**

- Ô tìm theo tên tông môn, chưởng môn, hệ, quốc gia.
- Lọc: lối tu (có mục *Lối đang theo ở Kinh mạch* để chỉ thấy tông môn hợp lối bạn đang xếp) · quy mô (đại tông môn, tông môn, môn phái) · chính hoặc ma · hệ ngũ hành · ẩn các tông môn đã diệt.
- Sắp xếp: Gần nhất · Quy mô lớn trước · Đang tuyển đồ trước · Theo tên.
- Mỗi thẻ: tên và chữ Hán, quy mô, quốc gia, hệ, chưởng môn, cấp bậc của bạn nếu đã vào, còn bao năm thì hết kỳ tuyển đồ, thời gian đi tới đó, nút Xem bản đồ và Đường đi an toàn.

### 破 Đột phá

Tính thọ nguyên và đột phá bằng đúng hàm của game. Lần đầu mở cần chuẩn bị phép tính trong giây lát.

- **Tu vi & kế hoạch**: tiểu cảnh hiện tại, tu vi còn thiếu, thọ nguyên còn lại, bế quan tại nơi đang đứng cần bao lâu và có kịp thọ hay không.
- **Bình cảnh**: giải thích phần tu vi dư dồn vào bình cảnh; liệt kê đan phá chướng từng cảnh giới, mỗi món có mô tả, giá, số đang có và công dụng.
- **Đột phá lên cảnh giới kế**: tỉ lệ không dùng gì chia theo từng khoản (gốc cảnh giới, linh khí, phẩm chất, linh căn, phản phệ, độ khó); nơi đột phá (linh khí, độ yên, nguy cơ bị quấy rầy, thuê linh mạch); cầu phẩm; thiêu đốt thọ nguyên; phương án tốt nhất với đồ đang có. Nếu chưa tới Đại viên mãn, tab dự tính như thể đã tới.
- **Đan và linh quả hỗ trợ đột phá**: bấm từng món để xem mô tả, +tỉ lệ, giảm tâm ma, tăng phẩm, cảnh giới áp dụng, giá, số đang có, và lý do game không cho dùng nếu có.
- **Chấn tổn đột phá**, **Ôn dưỡng phẩm chất**, **Đan tăng tu vi & luyện hóa**, **Giảm tâm ma**, **Thọ nguyên**: mỗi nhóm liệt kê đủ vật phẩm, công dụng theo chính hàm mô tả của game, kèm dược kháng hiện tại của bạn.
- Ở cảnh giới cao nhất game có, tab báo không còn cảnh giới để đột phá nhưng vẫn liệt kê các nhóm vật phẩm.

### 脈 Kinh mạch

Tự xếp đồ lên lưới kinh mạch, tính theo luật của game (màu ô, số huyệt phủ, sinh khắc giữa mảnh kề, phẩm so với cảnh giới, bộ đồ, kháng tâm ma).

**Thiết lập**

- **Lối build**: Tự do hoặc một lối tu (kiếm tu, thể tu, phật tu, ma tu, độc cổ, hợp hoan, luyện thi, quỷ tu, ngự thú, khôi lỗi, phù, trận, đan, luyện bảo, các lối hệ…). Tab gợi ý ba lối hợp nhất với nhân vật.
- **Mức ưu tiên lối**: Không theo lối (chỉ xét sức mạnh) · Ưu tiên đồ của lối · Ưu tiên mạnh · Chỉ dùng đồ của lối.
- **Mức tính**: Nhanh · Cân bằng · Tính kỹ · Rất kỹ (càng kỹ càng lâu, thường từ khoảng một đến vài phút).
- **Lấp hố**: Sát phẩm (−1) · −2 phẩm (mặc định) · −3 phẩm · Không giới hạn. Đồ thấp phẩm hơn mức này (so với phẩm chuẩn của cảnh giới) không được nhét chỉ để lấp ô trống.
- Khung *Thông số đang áp dụng* hiện cảnh giới, thể chất, linh căn, hệ chính và phụ, lối xếp và số bộ kinh mạch đang mở.

**Xếp tối ưu (dùng đồ trong túi)**

- Bấm **Xếp kinh mạch tối ưu**: công cụ xếp ba hướng, **Chiến đấu** (tối ưu số trận thắng trên trận mẫu tinh anh và boss), **Tu luyện** (bắt buộc đột phá công pháp đến trần 12%, dồn thêm tốc độ tu luyện và kháng tâm ma, không để điểm nghịch), **Cân bằng** (thắng ở mức khá, vẫn có đột phá và tốc độ tu luyện).
- Mỗi kết quả hiện lưới xếp, danh sách mảnh (hệ, cảnh giới, hệ số), kháng tâm ma thật, bộ đồ đang kích hoạt (ví dụ Bộ X 2/3), đột phá, điểm nghịch.
- Bấm **Xếp vào bộ 1/2/3** hoặc **Xếp cả 3 bộ** để áp dụng ngay (cần mở đủ số bộ kinh mạch). Túi đầy thì công cụ báo món nào bị kẹt, không tự vứt đồ.

**Phân tích giả định**

- Chế độ **Giả định** dùng cùng thuật toán nhưng chọn từ toàn bộ đồ trong game phù hợp cảnh giới, để biết bộ lý tưởng.
- Hai nút **Thực tế / Giả định** chuyển qua lại giữa hai kết quả.
- Món còn thiếu hiện kèm nút **Đặt hàng** (xem tab Vật phẩm). Món đã về túi tự biến mất khỏi danh sách thiếu.
- Nút **Tìm nơi bán** trên từng món thiếu: tự nhảy sang **tab Bản đồ**, dò kệ hàng của các tiệm ở thành, trấn, thôn và các nhà đấu giá trên toàn bản đồ bằng đúng hàm của game, tính theo **năm bạn tới nơi** (kệ đổi hàng mỗi năm) và đã trừ hàng đã bị mua hết. Kết quả hiện bên dưới bằng thẻ địa điểm của tab Bản đồ (có nút **Quay lại Kinh mạch**), xếp theo gần nhất, kèm tên tiệm, số còn lại, thời gian đi, mức nguy hiểm, nút Xem bản đồ và Đường đi an toàn. Món không nơi nào bày thì báo rõ, kèm các tiệm có thể bày vào năm khác. Quét **toàn bộ thế giới** (hơn 1.600 nơi, kể cả nơi chưa khám phá, tông môn ẩn, động phủ, ngoài hải), chia 3 nhóm: **chắc chắn còn hàng** (tiệm cố định, chợ phiên, nhà đấu giá), **đang có sự kiện bày hàng** (đại hội đấu giá, gánh hàng rong, chợ đêm đã xuất hiện sẵn) và **có thể gặp ngẫu nhiên** (kèm tỉ lệ ước tính theo đúng điều kiện và trọng số của game). Có thêm nhóm **phiên đấu giá khác**: đấu giá kỳ sau của nhà đấu giá thường và đấu giá lâu, đại hội đấu giá đang diễn ra nhưng không kịp tới, và đại hội sắp mở theo lịch của game (món có thể lệch chút). Gánh hàng rong dọc đường là sự kiện ngẫu nhiên lúc đi đường nên không chỉ ra được nơi cụ thể. Lần dò đầu mất khoảng nửa phút, các món sau chỉ vài giây.

**Danh mục đồ gợi ý**

- Theo lối đã chọn, liệt kê đồ nên lắp ở cảnh giới hiện tại theo nhóm (tâm pháp, ngũ linh, công pháp, pháp khí, đồ phụ…), đánh dấu món bạn đã có, kèm giá.

### 輪 Luân hồi

Theo dõi thành tựu và điểm của các kiếp.

- Đầu tab: kiếp hiện tại, điểm thành tựu đã có trên tổng, điểm luân hồi hiện có, và số vật Nghịch Thiên trong Bảo lục.
- Thành tựu xếp theo nhóm; có tùy chọn hiện cả thành tựu đã đạt.
- Truyền thuyết chưa tìm ra được giấu nội dung để khỏi lộ cốt truyện, chỉ hiện số mảnh còn thiếu.

### 容 Dịch Dung

Dịch Dung Quán: đổi tên và diện mạo, người cũ coi như không quen.

- Hiện tên hiện tại, ô nhập tên mới (tối đa 24 ký tự) và nút **Đổi tên** kèm phí 10.000 linh thạch mỗi lần.
- Báo rõ khi không đủ linh thạch. Tên mới hiện ở mọi nơi trong game, kể cả Thiên Kiều Bảng.

### 寶 Vật phẩm

Ba mục con: Danh sách · Tìm theo hình · Đơn hàng.

**Danh sách**

- Toàn bộ vật phẩm của game. Mỗi món có mục **Chi tiết vật phẩm** dùng đúng thẻ của game (chỉ số, tác dụng, yêu cầu, nguyên liệu, thành phẩm); bấm nút **Thu gọn chi tiết / Mở chi tiết** trên đầu để gập hoặc mở hết, hoặc bấm riêng từng món. Hình vật phẩm lấy từ game; Công pháp và Bí phương (game không có ảnh riêng) được ghép bằng đúng bộ dựng của game: nền cuộn theo phẩm cấp kèm biểu tượng chiêu thức hoặc ảnh thành phẩm. Ô tìm và lọc theo loại (công pháp, pháp khí, đan dược, linh dược, nguyên liệu, yêu tài, phù lục, trận bàn, đơn phương, dụng cụ…), theo phẩm; riêng công pháp và pháp khí lọc thêm theo hệ.
- Mỗi vật cho biết phẩm, hệ, từ cảnh giới nào dùng được, giá, số đang có trong túi và số đang chờ cất; nhãn *Bộ X* nếu thuộc bộ đồ (đủ 2 món trở lên trên kinh mạch thì có hiệu ứng bộ).
- Nút đặt hàng ngay trên vật phẩm.

**Tìm theo hình**

- Chấm hoặc kéo chuột để vẽ hình các ô; kết quả lọc ngay trong lúc vẽ. Hình xoay 90° vẫn khớp, có tùy chọn cho lật gương.
- Ba cách khớp: **cùng hình** · **mảnh nhỏ hơn đặt lọt trong hình vẽ** · **mảnh lớn hơn chứa trọn hình vẽ**. Lọc theo Công pháp và Pháp khí, chỉ công pháp, chỉ pháp khí, theo phẩm.
- Dùng khi cần tìm mảnh vừa một chỗ trống trên lưới kinh mạch.

**Đơn hàng**

- Đặt mua vật phẩm bằng linh thạch, thay cho việc thêm thẳng vào túi. Mọi vật đều đặt được trừ dị bảo (Nghịch Thiên) và vật không có giá.
- Cọc 30% khi đặt. Giá = giá gốc × hệ số theo phẩm (Phàm ×1, Hoàng ×2, Huyền ×3, Địa ×4, Thiên ×5, Tiên ×7, Thần ×10). Số lượng tối đa mỗi đơn giảm dần theo phẩm (Phàm 15 … Thiên trở lên 1).
- Hàng về sau 0,5 đến 5 năm tùy phẩm. Khi hàng về, trả nốt phần còn lại để nhận vào túi (tab báo bao nhiêu đơn đã về).
- Được giữ hàng 5 năm. Chưa đủ tiền có thể **Giữ thêm** một lần với phí 10% giá đơn. Quá hạn thì mất hàng và mất cả tiền cọc.
- Túi đầy thì chưa nhận được, không mất linh thạch; hãy bán hoặc vứt bớt rồi thanh toán lại.

### 察 Kiểm tra

Đối chiếu công cụ với bản game đang chạy.

- Hiện số mục khớp và chưa khớp, chia theo nhóm (✔ khớp, ✘ chưa khớp, kèm ghi chú), và số bản của công cụ.
- Có nhóm kiểm tra riêng cho các tính năng mới của game 0.3.0 (kết giao, dò căn cốt, cất đồ chờ, bộ đồ, kháng tâm ma).
- Nút chuẩn bị lại phép tính của game, và nút **sao chép báo cáo** để gửi cho người làm khi game vừa cập nhật mà có chức năng không chạy.

## Chẩn đoán

Khi game cập nhật mà chức năng nào không chạy, mở tab **Kiểm tra**, bấm kiểm tra lại rồi sao chép báo cáo.
