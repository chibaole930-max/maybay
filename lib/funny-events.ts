import type { FunnyEventChoice, FunnySituation } from '@/types';

// Mỗi tình huống có 2 phần:
//   t = chuyện xảy ra, viết rõ ràng để hiểu ngay không cần đoán
//   d = câu hỏi đặt ra cho người chơi trả lời
// Mỗi nhóm có bộ lựa chọn riêng, bốc ngẫu nhiên mỗi lần xảy ra
// để người chơi không bao giờ thấy lặp lại đúng một bộ quyết định cũ.
type Item = { t: string; d: string };
type Pool = FunnyEventChoice[];

const make = (group: string, items: Item[]): FunnySituation[] => items.map((item, i) => ({
  id: `${group}-${i + 1}`, group,
  title: item.t,
  description: item.d,
  choices: CHOICE_POOLS[group],
}));

const CHOICE_POOLS: Record<string, Pool> = {
  'Hành khách': [
    { id: 'kheo', label: 'Xử lý nhẹ nhàng', preview: 'Tốn ít tiền, khách hài lòng', cashMin: -7000, cashMax: -2000, reputation: 3 },
    { id: 'mac-ca', label: 'Thương lượng', preview: 'Có thể lời, có thể lỗ', cashMin: -12000, cashMax: 10000, reputation: 0 },
    { id: 'lieu', label: 'Quay video đăng mạng xã hội', preview: 'Nổi tiếng thật, hoặc thành cười cợt', cashMin: -25000, cashMax: 38000, reputation: -3, chain: { id: 'viral', title: 'Video của hãng đang được chia sẻ khắp nơi', durationHours: 6, severity: 2 } },
    { id: 'ghost', label: 'Bỏ qua, không can thiệp', preview: 'Không tốn tiền, cũng chẳng vui', cashMin: -1500, cashMax: 0, reputation: -1 },
    { id: 'nang-cap', label: 'Bù tiền nâng cấp dịch vụ cho khách', preview: 'Đắt nhưng khách nhớ mặt hãng', cashMin: -18000, cashMax: 22000, reputation: 4 },
  ],
  'Nhân sự': [
    { id: 'kheo', label: 'Nói chuyện thân thiện', preview: 'Rẻ, ai cũng vui', cashMin: -6000, cashMax: -1500, reputation: 2 },
    { id: 'mac-ca', label: 'Thương lượng về đãi ngộ', preview: 'Giữ được người giỏi, hoặc mất cả nhóm', cashMin: -14000, cashMax: 12000, reputation: 1 },
    { id: 'lieu', label: 'Chấp nhận mất tiền, giữ người', preview: 'Tốn tiền nhưng xong việc nhanh', cashMin: -30000, cashMax: 40000, reputation: -3, chain: { id: 'burnout', title: 'Cả tổ bay đang quá tải, ai cũng mệt', durationHours: 8, severity: 2 } },
    { id: 'ghost', label: 'Báo lên trên, để công ty xử', preview: 'Không tốn tiền, nhưng không ai vui', cashMin: 0, cashMax: -2000, reputation: -2 },
    { id: 'cong-khai', label: 'Mở cuộc trò chuyện với cả tổ', preview: 'Rẻ, mọi người thấy được quan tâm', cashMin: -9000, cashMax: 8000, reputation: 5 },
  ],
  'Kỹ thuật': [
    { id: 'kheo', label: 'Sửa theo đúng quy trình', preview: 'An toàn, chắc chắn', cashMin: -8000, cashMax: -2500, reputation: 2 },
    { id: 'mac-ca', label: 'Đổi linh kiện, hỏi bảo hành', preview: 'Chờ lâu hơn nhưng ít tốn tiền', cashMin: -11000, cashMax: 6000, reputation: 1 },
    { id: 'lieu', label: 'Tự sửa tạm rồi bay tiếp', preview: 'Nhanh, rẻ, nhưng rủi ro cao', cashMin: -35000, cashMax: 35000, reputation: -2, chain: { id: 'risk', title: 'Máy bay đang bay bằng linh kiện tạm bợ', durationHours: 5, severity: 3 } },
    { id: 'ghost', label: 'Chuyển cho bộ phận khác xử', preview: 'Không tốn tiền, rủi ro cũng chuyển theo', cashMin: -3000, cashMax: 0, reputation: -1 },
    { id: 'sua', label: 'Nâng cấp cả thiết bị bay', preview: 'Đắt nhưng dùng được lâu dài', cashMin: -22000, cashMax: 18000, reputation: 4 },
  ],
  'VIP & động vật': [
    { id: 'kheo', label: 'Đón vip chu đáo', preview: 'Chuẩn mực, chi phí nhẹ', cashMin: -7000, cashMax: -1500, reputation: 3 },
    { id: 'mac-ca', label: 'Mời họ làm đại diện quảng bá', preview: 'Họ nhận tiền, hãng nhận hình ảnh tốt', cashMin: -10000, cashMax: 14000, reputation: 2 },
    { id: 'lieu', label: 'Cho họ dùng khoang hạng nhất', preview: 'Quyết định táo bạo, kết quả khó đoán', cashMin: -28000, cashMax: 45000, reputation: -2, chain: { id: 'filmed', title: 'Cả nhóm khách VIP đang quay cảnh này', durationHours: 4, severity: 2 } },
    { id: 'ghost', label: 'Từ chối rồi đóng cửa cabin', preview: 'Không tốn đồng nào', cashMin: 0, cashMax: -1000, reputation: -3 },
    { id: 'dai', label: 'Mời làm đại diện chính thức của hãng', preview: 'Cần ngân sách, nhưng họ sẽ quay clip khoe', cashMin: -20000, cashMax: 30000, reputation: 5 },
  ],
  'Thời tiết & định mệnh': [
    { id: 'kheo', label: 'Chăm sóc khách chuẩn mực', preview: 'An toàn, hợp lý', cashMin: -7000, cashMax: -2000, reputation: 2 },
    { id: 'mac-ca', label: 'Bù bằng phiếu ăn uống', preview: 'Khách quên luôn chuyện bị trễ', cashMin: -9000, cashMax: 9000, reputation: 1 },
    { id: 'lieu', label: 'Vẫn cất cánh, xem thời tiết thế nào', preview: 'Cảnh đẹp nhất, rủi ro cũng lớn nhất', cashMin: -40000, cashMax: 50000, reputation: -3, chain: { id: 'buzz', title: 'Video bay trong bão đang được chia sẻ khắp nơi', durationHours: 6, severity: 3 } },
    { id: 'ghost', label: 'Tự quay cảnh bên ngoài', preview: 'Không tốn tiền, hơi mất hình tượng', cashMin: -2000, cashMax: 0, reputation: -1 },
    { id: 'care', label: 'Hủy chuyến sớm, bồi thường rõ ràng', preview: 'Mất một chuyến, giữ được lòng khách', cashMin: -24000, cashMax: 4000, reputation: 4 },
  ],
  'Truyền thông': [
    { id: 'kheo', label: 'Phản hồi chuyên nghiệp', preview: 'Ổn, không ai nhớ tới nữa', cashMin: -6000, cashMax: -1000, reputation: 2 },
    { id: 'mac-ca', label: 'Trả lời qua báo chí', preview: 'Có thể đúng hướng, có thể bị bắt lỗi', cashMin: -8000, cashMax: 7000, reputation: 0 },
    { id: 'lieu', label: 'Tự làm video hài rồi đăng', preview: 'Thành công thì nổi tiếng, thất bại thì thành trào', cashMin: -26000, cashMax: 48000, reputation: -2, chain: { id: 'trend', title: 'Đoạn video đang được chia sẻ khắp nơi', durationHours: 5, severity: 3 } },
    { id: 'ghost', label: 'Không trả lời, im lặng', preview: 'Miễn phí, nhưng càng im lặng càng bị đoán', cashMin: 0, cashMax: -2000, reputation: -2 },
    { id: 'colo', label: 'Mở chiến dịch quảng bá', preview: 'Tốn tiền nghiêm túc, hình ảnh sạch', cashMin: -25000, cashMax: 22000, reputation: 4 },
  ],
};

const pax: Item[] = [
  { t: 'Cụ bà mang 20kg sầu riêng lên cabin', d: 'Bà bảo mang cho cháu ăn. Bạn xử lý thế nào?' },
  { t: 'Khách đòi mở cửa sổ khi đang ở 10.000m', d: 'Khách nói ngủ sẽ ngon hơn khi có gió. Bạn xử lý thế nào?' },
  { t: 'Em bé khóc suốt cả chuyến bay', d: 'Cả khoang không ai ngủ được. Bạn xử lý thế nào?' },
  { t: 'Khách mang nồi lẩu lên máy bay', d: 'Không nồi nào được phép mang lên, nhưng khách vẫn mang. Bạn xử lý thế nào?' },
  { t: 'Khách hỏi có bán vé ngắm mây theo giờ không', d: 'Dịch vụ này không tồn tại, nhưng khách rất muốn có. Bạn trả lời thế nào?' },
  { t: 'Khách mang gà trống và đòi làm thủ tục riêng cho gà', d: 'Bạn xử lý thế nào?' },
  { t: 'Khách mở loa ngoài gọi cả họ hàng', d: 'Cả khoang đang nghe, không ai dám mắc. Bạn xử lý thế nào?' },
  { t: 'Khách xếp hàng ở cửa tà bay khi máy bay còn đang bay', d: 'Bạn xử lý thế nào?' },
  { t: 'Khách đặt ba chuyến bay trùng nhau để chụp ảnh check-in', d: 'Ba người giống nhau, ba chuyến bay. Bạn xử lý thế nào?' },
  { t: 'Nhầm vali có gia đình tám người ở trong', d: 'Toàn bộ vali là ảnh gia đình. Bạn xử lý thế nào?' },
  { t: 'Khách đặt nhầm vé sang một hãng khác', d: 'Khách vẫn hỏi chuyện kiếp sau. Bạn xử lý thế nào?' },
  { t: 'Khách quay livestream trước khi cửa tà bay đóng', d: 'Bạn xử lý thế nào?' },
  { t: 'Khách phàn nộ máy bay không có wifi', d: 'Khách nói đây là vi phạm nhân quyền. Bạn xử lý thế nào?' },
  { t: 'Khách muốn tôm đông lạnh đi trước', d: 'Sản phẩm này không phù hợp bay. Bạn xử lý thế nào?' },
];

const crew: Item[] = [
  { t: 'Phi công bật nhầm chế độ phát nhạc', d: 'Khoang lái phát Bolero. Bạn xử lý thế nào?' },
  { t: 'Tiếp viên trưởng xin nghỉ đúng ngày cao điểm', d: 'Vì ngày đó là đám cưới của người yêu cũ. Bạn xử lý thế nào?' },
  { t: 'Cơ trưởng và cơ phó cãi nhau về phở', d: 'Hai người đang tranh luận lúc bay. Bạn xử lý thế nào?' },
  { t: 'Nhân viên dán nhầm nhãn "hàng dễ vỡ"', d: 'Nhãn được dán lên một chiếc vali rỗng. Bạn xử lý thế nào?' },
  { t: 'Phi công thông báo nhầm giờ địa phương', d: 'Cả chuyến bay tưởng đã tới nơi. Bạn xử lý thế nào?' },
  { t: 'Tiếp viên tổ chức sinh nhật cho khách sinh nhật tuần trước', d: 'Khách hơi bất ngờ. Bạn xử lý thế nào?' },
  { t: 'Kỹ sư tìm thấy chiếc tua vít cuối cùng trong ngăn bánh mì', d: 'Cả bộ dụng cụ nằm trong một chiếc bánh mì. Bạn xử lý thế nào?' },
  { t: 'Cả tổ bay mặc đồng phục lệch màu', d: 'Máy giặt đã giặt sai. Bạn xử lý thế nào?' },
  { t: 'Nhân viên muốn làm bốn ngày, nghỉ ba ngày', d: 'Yêu cầu này là đề đặt. Bạn xử lý thế nào?' },
  { t: 'Mẹ chồng của nhân viên nhờ lên chuyến bay đi công tác', d: 'Cô ấy không có vé. Bạn xử lý thế nào?' },
  { t: 'Phi công livestream giới thiệu máy bay lúc chuẩn bị cất cánh', d: 'Bạn xử lý thế nào?' },
  { t: 'Nhân viên mới nhầm cửa xoay cười là cửa sự sống', d: 'Có người quay video lại. Bạn xử lý thế nào?' },
  { t: 'Tổ bay đề nghị họp năm phút không dùng điện thoại', d: 'Bạn có thành lập không?' },
  { t: 'Nhân viên công nghệ sửa nhầm bảng lương', d: 'Cả bảng lương đều bị đổi tên. Bạn xử lý thế nào?' },
];

const tech: Item[] = [
  { t: 'Chim đâm vào động cơ, hiệp hội gửi thư đòi bồi thường', d: 'Trong thư có kèm hóa đơn. Bạn xử lý thế nào?' },
  { t: 'Điều hòa hỏng, khoang lái nóng như phòng xông hơi', d: 'Phi công chịu nóng. Bạn xử lý thế nào?' },
  { t: 'Cảm biến phát hiện một ổ bánh mì rơi trong khoang', d: 'Máy bay báo lỗi liên tục. Bạn xử lý thế nào?' },
  { t: 'Xe kéo hành lý đến muộn vì tài xế dừng chỉ đường', d: 'Chuyến bay sắp bị trễ. Bạn xử lý thế nào?' },
  { t: 'Hệ thống giải trí chỉ phát được một bài hát', d: 'Cả chuyến bay nghe đi nghe lại. Bạn xử lý thế nào?' },
  { t: 'Tìm thấy một chiếc ốc vít trong khoang hành lý', d: 'Không ai biết nó ở đó từ bao giờ. Bạn xử lý thế nào?' },
  { t: 'Cửa khoang hành lý báo đóng nhưng thực tế không kín', d: 'Hành lý có thể rơi ra. Bạn xử lý thế nào?' },
  { t: 'Máy quét an ninh tìm thấy vali chứa toàn vali nhỏ hơn', d: 'Không biết có nguy hiểm hay không. Bạn xử lý thế nào?' },
  { t: 'Phần mềm tính tiếp liệu báo động', d: 'Một người nhập số liệu theo thứ tự cảm xúc. Bạn xử lý thế nào?' },
  { t: 'Cửa khoang lái không nhận tín hiệu', d: 'Phi công bỏ quên bao tay khi bấm nút. Bạn xử lý thế nào?' },
  { t: 'Trợ lý giọng nói tự phát nhạc lúc hạ cánh', d: 'Không ai bật, nhạc vẫn phát. Bạn xử lý thế nào?' },
  { t: 'Máy phát điện báo giảm áp suất', d: 'Cả khoang hành lý đang chất đồ nặng. Bạn xử lý thế nào?' },
  { t: 'Wifi trên máy bay nhanh hơn wifi ở văn phòng', d: 'Nhân viên bắt đầu đăng video bay. Bạn xử lý thế nào?' },
  { t: 'Khách hỏi máy bay có chế độ ngủ không', d: 'Dịch vụ chưa có, nhưng khách muốn có. Bạn trả lời thế nào?' },
];

const vip: Item[] = [
  { t: 'Mèo của chủ tịch đòi ngồi ghế hạng thương gia', d: 'Nhưng chú mèo sợ tiếng còi cất cánh. Bạn xử lý thế nào?' },
  { t: 'Đoàn khách mặc đồng phục in nhầm tên hãng đối thủ', d: 'Họ đến khánh thành chuyến bay của bạn. Bạn xử lý thế nào?' },
  { t: 'Chó nghiệp vụ từ chối quét mã', d: 'Chú đang trong giờ nghỉ trưa. Bạn xử lý thế nào?' },
  { t: 'VIP muốn đặt tên chuyến bay theo con cá vàng', d: 'Bạn xử lý thế nào?' },
  { t: 'Đại sứ quên gửi lồng chim công đến quầy vé', d: 'Có kèm thư từ rất nghiêm túc. Bạn xử lý thế nào?' },
  { t: 'Khách VIP muốn máy bay chờ', d: 'Vì họ đang tìm một chiếc kính mát trên đầu. Bạn xử lý thế nào?' },
  { t: 'Cả đội bóng mang giải to hơn khoang hành lý', d: 'Không nhét vừa. Bạn xử lý thế nào?' },
  { t: 'Chú dê làm linh vật ăn mất banner', d: 'Cả tấm banner, không phải một mảnh. Bạn xử lý thế nào?' },
  { t: 'VIP đặt vé sang hỏi cabin có wifi 5G không', d: 'Câu trả lời là không. Bạn xử lý thế nào?' },
  { t: 'Con rắn được gửi trong hành lý kèm thư', d: 'Thư viết: "quý khách đồng hành yêu thương". Bạn xử lý thế nào?' },
  { t: 'Trưởng tùy tùng muốn dọn ghế thành sân khấu', d: 'Để livestream một đêm. Bạn xử lý thế nào?' },
  { t: 'Hai con ngỗng trời bị nhầm là khách quý', d: 'Chúng được đón tận cửa. Bạn xử lý thế nào?' },
  { t: 'Mèo review khoang hạng sang rồi đăng ảnh', d: 'Bài đăng được chấm bốn phẩy chín sao. Bạn xử lý thế nào?' },
  { t: 'VIP hỏi có bán vé cho cả đội tuyển không', d: 'Câu trả lời là không. Bạn xử lý thế nào?' },
];

const weather: Item[] = [
  { t: 'Phi công xin bay vòng thêm để khách ngắm mây', d: 'Trời hôm nay đẹp. Bạn xử lý thế nào?' },
  { t: 'Sét đánh trúng cột thu lôi, chuyến bay bị trễ', d: 'Nhân viên chạy ra xem mấy tiếng rồi mới vào làm việc. Bạn xử lý thế nào?' },
  { t: 'Gió đổi chiều liên tục', d: 'Phi công bảo không biết hướng nào đúng. Bạn xử lý thế nào?' },
  { t: 'Mưa lớn biến đường băng thành mặt hồ', d: 'Không ai lấn xe được. Bạn xử lý thế nào?' },
  { t: 'Sương mù dày đến mức không thấy bảng chỉ dẫn', d: 'Sân bay phải dùng đèn. Bạn xử lý thế nào?' },
  { t: 'Nắng đẹp bất thường, cả khoang xin ghế cạnh cửa sổ', d: 'Chỉ còn vài ghế trống. Bạn xử lý thế nào?' },
  { t: 'Gió mạnh cuốn mất chiếc nón của trưởng sân bay', d: 'Cả đội đang tìm khắp khu bay. Bạn xử lý thế nào?' },
  { t: 'Dự báo ghi "có thể có mưa"', d: 'Không ai biết có mưa hay không. Bạn xử lý thế nào?' },
  { t: 'Ngoài trời nóng hơn trong cabin, khách xin mở điều hòa sớm', d: 'Chưa đến giờ nhưng rất khó chịu. Bạn xử lý thế nào?' },
  { t: 'Gió xoáy tạo hình dáng kỳ lạ trên màn hình radar', d: 'Cả sân bay đang xem và không ai nói gì. Bạn xử lý thế nào?' },
  { t: 'Mưa đá đúng lúc khách vừa bước xuống xe', d: 'Hành khách ướt hết một nửa. Bạn xử lý thế nào?' },
  { t: 'Trời đẹp, phi công bay thêm hai mươi phút', d: 'Cả hành khách đồng ý, nhưng sẽ trễ giờ hẹn ở điểm đến. Bạn xử lý thế nào?' },
];

const media: Item[] = [
  { t: 'Video của khách chê suất ăn lên hai triệu lượt xem', d: 'Đang được chia sẻ khắp nơi. Bạn xử lý thế nào?' },
  { t: 'Báo đăng tin hãng dùng máy bay làm từ carton', d: 'Tin đồn có hình ảnh đi kèm. Bạn xử lý thế nào?' },
  { t: 'Bài khen ghế rộng bị hiểu nhầm là bán ghế sofa', d: 'Đang bán rất chạy. Bạn xử lý thế nào?' },
  { t: 'Phóng viên hỏi máy bay có chạy bằng nước mắt không', d: 'Câu hỏi được đăng nguyên văn. Bạn trả lời thế nào?' },
  { t: 'Gió xoay biển quảng cáo thành câu khẩu hiệu lạ', d: 'Không ai biết mình nói gì. Bạn xử lý thế nào?' },
  { t: 'Người nổi tiếng check-in nhầm sân bay', d: 'Họ lại đeo thẻ tên hãng của bạn. Bạn xử lý thế nào?' },
  { t: 'Tin đồn hãng tặng vé miễn phí lan nhanh', d: 'Quầy vé kín khách hỏi lại. Bạn xử lý thế nào?' },
  { t: 'Ảnh máy bay đậu cạnh xe bánh mì lên trang nhất', d: 'Cả xe bánh mì cũng nổi tiếng. Bạn xử lý thế nào?' },
  { t: 'Bài review gọi hãng là "công ty không có chiến lược"', d: 'Vẫn review đầy đủ các chuyến bay. Bạn xử lý thế nào?' },
  { t: 'Một lượt khen dịch vụ bị hỏi có nhận sinh hoạt không', d: 'Bình luận có hàng nghìn lượt thích. Bạn xử lý thế nào?' },
  { t: 'Tên hãng bị một tài khoản quảng bá spam', d: 'Đội truyền thông không xử lý kịp. Bạn xử lý thế nào?' },
  { t: 'Báo chí đưa tin chuyến bay chậm do lười của phi công', d: 'Họ không nói tên phi công. Bạn xử lý thế nào?' },
];

const randomOf = <T,>(items: T[], random: () => number): T => items[Math.floor(random() * items.length)];

const shuffle = <T,>(items: T[], random: () => number): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export const funnySituations: FunnySituation[] = [
  ...make('Hành khách', pax),
  ...make('Nhân sự', crew),
  ...make('Kỹ thuật', tech),
  ...make('VIP & động vật', vip),
  ...make('Thời tiết & định mệnh', weather),
  ...make('Truyền thông', media),
];

// Bốc 3-4 lựa chọn ngẫu nhiên từ kho riêng của nhóm, nên không lặp bộ cũ.
export function pickFunnySituation(random = Math.random): FunnySituation {
  const item = randomOf(funnySituations, random);
  const pool = CHOICE_POOLS[item.group] || CHOICE_POOLS['Hành khách'];
  const count = 3 + (random() < 0.45 ? 1 : 0);
  const choices = shuffle(pool, random).slice(0, count).map((choice) => ({
    ...choice,
    chain: choice.chain ? { ...choice.chain, id: `${item.id}-${choice.chain.id}` } : undefined,
  }));
  return { ...item, choices };
}
