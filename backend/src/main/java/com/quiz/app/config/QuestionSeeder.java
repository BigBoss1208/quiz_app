package com.quiz.app.config;

import com.quiz.app.entity.CauHoi;
import com.quiz.app.entity.ChuDe;
import com.quiz.app.entity.DapAn;
import com.quiz.app.repository.CauHoiRepository;
import com.quiz.app.repository.ChuDeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class QuestionSeeder implements CommandLineRunner {

    private final ChuDeRepository chuDeRepository;
    private final CauHoiRepository cauHoiRepository;

    // record đơn giản: câu hỏi, 4 đáp án, chỉ số đáp án đúng (0-3)
    private record Q(String noiDung, String[] dapAn, int dungIndex) {}

    @Override
    public void run(String... args) {
        Map<String, List<Q>> boCauHoi = Map.of(
                "toán", cauHoiToanHoc(),
                "hóa", cauHoiHoaHoc(),
                "vật lý", cauHoiVatLy(),
                "văn", cauHoiVanHoc(),
                "âm nhạc", cauHoiAmNhac(),
                "lịch", cauHoiLichSu()
        );

        List<ChuDe> tatCaChuDe = chuDeRepository.findAll();

        boCauHoi.forEach((tuKhoa, danhSachCauHoi) -> {
            Optional<ChuDe> chuDeOpt = tatCaChuDe.stream()
                    .filter(cd -> cd.getTenChuDe() != null &&
                            cd.getTenChuDe().toLowerCase().contains(tuKhoa))
                    .findFirst();

            if (chuDeOpt.isEmpty()) return;
            ChuDe chuDe = chuDeOpt.get();

            long soCauHienCo = cauHoiRepository.countByChuDeId(chuDe.getId());
            if (soCauHienCo >= 5) return; // đã có kha khá câu hỏi rồi thì bỏ qua, tránh chèn trùng

            int thuTu = (int) soCauHienCo;
            for (Q q : danhSachCauHoi) {
                CauHoi cauHoi = new CauHoi();
                cauHoi.setNoiDungCauHoi(q.noiDung());
                cauHoi.setChuDe(chuDe);
                cauHoi.setThuTu(thuTu++);

                List<DapAn> dapAns = new ArrayList<>();
                for (int i = 0; i < q.dapAn().length; i++) {
                    DapAn da = new DapAn();
                    da.setNoiDung(q.dapAn()[i]);
                    da.setLaDapAnDung(i == q.dungIndex());
                    da.setCauHoi(cauHoi);
                    dapAns.add(da);
                }
                cauHoi.setDanhSachDapAn(dapAns);
                cauHoiRepository.save(cauHoi);
            }
            System.out.println(">>> Đã thêm " + danhSachCauHoi.size() + " câu hỏi cho chủ đề: " + chuDe.getTenChuDe());
        });
    }

    private List<Q> cauHoiToanHoc() {
        return List.of(
            new Q("7 x 8 bằng bao nhiêu?", new String[]{"54", "56", "58", "64"}, 1),
            new Q("Căn bậc hai của 144 là bao nhiêu?", new String[]{"10", "11", "12", "14"}, 2),
            new Q("Số nào là số nguyên tố?", new String[]{"9", "15", "17", "21"}, 2),
            new Q("Diện tích hình vuông cạnh 5cm là bao nhiêu?", new String[]{"20 cm²", "25 cm²", "30 cm²", "10 cm²"}, 1),
            new Q("Tổng ba góc trong một tam giác bằng bao nhiêu độ?", new String[]{"90°", "180°", "270°", "360°"}, 1),
            new Q("Số Pi (π) xấp xỉ bằng bao nhiêu?", new String[]{"3,14", "2,71", "1,61", "4,13"}, 0),
            new Q("1/2 + 1/4 bằng bao nhiêu?", new String[]{"1/6", "2/6", "3/4", "1/4"}, 2),
            new Q("Số 0 có phải là số tự nhiên không?", new String[]{"Có", "Không", "Tuỳ trường hợp", "Không xác định"}, 0),
            new Q("10² bằng bao nhiêu?", new String[]{"20", "100", "1000", "10"}, 1),
            new Q("Chu vi hình tròn bán kính r được tính bằng công thức nào?", new String[]{"πr²", "2πr", "πr", "4πr"}, 1),
            new Q("Kết quả của phép tính 15 - 7 x 2 là bao nhiêu?", new String[]{"16", "1", "8", "-1"}, 1),
            new Q("Một tam giác đều có bao nhiêu góc bằng nhau?", new String[]{"0", "1", "2", "3"}, 3),
            new Q("Số nào sau đây là số chẵn?", new String[]{"17", "23", "42", "51"}, 2),
            new Q("Giá trị của 5! (5 giai thừa) là bao nhiêu?", new String[]{"20", "60", "120", "24"}, 2),
            new Q("Hình có 4 cạnh bằng nhau và 4 góc vuông gọi là gì?", new String[]{"Hình chữ nhật", "Hình thoi", "Hình vuông", "Hình bình hành"}, 2),
            new Q("Nếu x + 5 = 12 thì x bằng bao nhiêu?", new String[]{"5", "6", "7", "17"}, 2),
            new Q("Số nào lớn nhất trong các số sau?", new String[]{"0,5", "0,45", "0,54", "0,05"}, 2),
            new Q("Thể tích hình lập phương cạnh a được tính bằng?", new String[]{"a²", "3a", "a³", "6a²"}, 2),
            new Q("20% của 200 là bao nhiêu?", new String[]{"20", "40", "50", "80"}, 1),
            new Q("Trong một phép chia, số bị chia chia cho 0 thì kết quả là?", new String[]{"0", "1", "Không xác định", "Vô cùng"}, 2)
        );
    }

    private List<Q> cauHoiHoaHoc() {
        return List.of(
            new Q("Công thức hóa học của nước là gì?", new String[]{"CO2", "H2O", "NaCl", "O2"}, 1),
            new Q("Nguyên tố nào có ký hiệu hóa học là Fe?", new String[]{"Chì", "Sắt", "Kẽm", "Bạc"}, 1),
            new Q("Khí nào cần thiết cho sự hô hấp của con người?", new String[]{"Nitơ", "Cacbonic", "Oxy", "Heli"}, 2),
            new Q("Axit clohidric có công thức là gì?", new String[]{"HCl", "H2SO4", "HNO3", "NaOH"}, 0),
            new Q("Muối ăn có công thức hóa học là gì?", new String[]{"KCl", "NaCl", "CaCl2", "MgCl2"}, 1),
            new Q("pH của dung dịch trung tính là bao nhiêu?", new String[]{"0", "7", "14", "10"}, 1),
            new Q("Nguyên tố nào phổ biến nhất trong khí quyển Trái Đất?", new String[]{"Oxy", "Nitơ", "Cacbonic", "Argon"}, 1),
            new Q("Kim loại nào nhẹ nhất trong các kim loại sau?", new String[]{"Sắt", "Nhôm", "Chì", "Vàng"}, 1),
            new Q("Phản ứng giữa axit và bazơ tạo ra sản phẩm gì (ngoài nước)?", new String[]{"Muối", "Khí", "Kim loại", "Oxit"}, 0),
            new Q("Ký hiệu hóa học của Vàng là gì?", new String[]{"Ag", "Au", "Fe", "Pb"}, 1),
            new Q("Chất nào có tính axit?", new String[]{"NaOH", "KOH", "H2SO4", "Ca(OH)2"}, 2),
            new Q("Bảng tuần hoàn hóa học được sắp xếp chủ yếu theo?", new String[]{"Khối lượng nguyên tử", "Số proton (số hiệu nguyên tử)", "Màu sắc", "Trạng thái vật lý"}, 1),
            new Q("Khí CO2 còn được gọi là gì?", new String[]{"Khí metan", "Khí cacbonic", "Khí hidro", "Khí clo"}, 1),
            new Q("Nguyên tố nào có số hiệu nguyên tử là 1?", new String[]{"Heli", "Hidro", "Liti", "Cacbon"}, 1),
            new Q("Phản ứng cháy cần chất nào để xảy ra?", new String[]{"Oxy", "Nitơ", "Cacbonic", "Hidro"}, 0),
            new Q("Dung dịch nào có tính bazơ?", new String[]{"HCl", "H2SO4", "NaOH", "CH3COOH"}, 2),
            new Q("Kim cương được cấu tạo từ nguyên tố nào?", new String[]{"Silic", "Cacbon", "Sắt", "Nhôm"}, 1),
            new Q("Chất chống đông trong hệ thống làm mát ô tô thường là?", new String[]{"Etylen glycol", "Nước muối", "Axeton", "Amoniac"}, 0),
            new Q("Số Avogadro xấp xỉ bằng bao nhiêu?", new String[]{"6,02 x 10^23", "3,14 x 10^10", "9,8 x 10^5", "1,6 x 10^19"}, 0),
            new Q("Kim loại nào lỏng ở nhiệt độ phòng?", new String[]{"Sắt", "Thủy ngân", "Chì", "Kẽm"}, 1)
        );
    }

    private List<Q> cauHoiVatLy() {
        return List.of(
            new Q("Đơn vị đo lực trong hệ SI là gì?", new String[]{"Joule", "Newton", "Watt", "Pascal"}, 1),
            new Q("Tốc độ ánh sáng trong chân không xấp xỉ bao nhiêu km/s?", new String[]{"150.000", "300.000", "500.000", "1.000.000"}, 1),
            new Q("Ai là người đề ra ba định luật về chuyển động?", new String[]{"Einstein", "Newton", "Galileo", "Faraday"}, 1),
            new Q("Đơn vị đo công suất là gì?", new String[]{"Watt", "Newton", "Joule", "Volt"}, 0),
            new Q("Âm thanh truyền nhanh nhất trong môi trường nào?", new String[]{"Chân không", "Không khí", "Nước", "Chất rắn"}, 3),
            new Q("Trọng lực trên Trái Đất có gia tốc xấp xỉ bao nhiêu m/s²?", new String[]{"8,9", "9,8", "10,8", "7,8"}, 1),
            new Q("Ánh sáng trắng khi qua lăng kính sẽ tách thành gì?", new String[]{"Một màu", "Hai màu", "Bảy màu (cầu vồng)", "Không đổi"}, 2),
            new Q("Đơn vị đo điện trở là gì?", new String[]{"Ampe", "Volt", "Ohm", "Watt"}, 2),
            new Q("Vật thể nào sau đây là vật dẫn điện tốt?", new String[]{"Gỗ", "Cao su", "Đồng", "Nhựa"}, 2),
            new Q("Hiện tượng nào giải thích việc mái chèo trông như gãy khi nhúng xuống nước?", new String[]{"Phản xạ", "Khúc xạ", "Nhiễu xạ", "Giao thoa"}, 1),
            new Q("Đơn vị đo tần số là gì?", new String[]{"Hertz", "Watt", "Joule", "Newton"}, 0),
            new Q("Nhiệt độ đóng băng của nước là bao nhiêu độ C?", new String[]{"0°C", "32°C", "100°C", "-10°C"}, 0),
            new Q("Định luật bảo toàn năng lượng phát biểu điều gì?", new String[]{"Năng lượng có thể tự sinh ra", "Năng lượng không tự sinh ra hay mất đi, chỉ chuyển hóa", "Năng lượng luôn giảm dần", "Năng lượng luôn tăng dần"}, 1),
            new Q("Con lắc đơn dao động dựa trên nguyên lý nào?", new String[]{"Từ trường", "Trọng lực", "Điện trường", "Áp suất"}, 1),
            new Q("Vật nào sau đây là nguồn sáng tự nhiên?", new String[]{"Mặt Trăng", "Mặt Trời", "Đèn pin", "Gương"}, 1),
            new Q("Đơn vị đo cường độ dòng điện là gì?", new String[]{"Volt", "Ohm", "Ampe", "Watt"}, 2),
            new Q("Hiện tượng nước sôi ở nhiệt độ thấp hơn khi lên núi cao là do?", new String[]{"Nhiệt độ thấp", "Áp suất khí quyển giảm", "Độ ẩm cao", "Gió mạnh"}, 1),
            new Q("Sóng điện từ truyền được trong môi trường chân không không?", new String[]{"Có", "Không", "Chỉ truyền trong nước", "Chỉ truyền trong không khí"}, 0),
            new Q("Máy biến áp dùng để làm gì?", new String[]{"Biến đổi điện áp", "Tạo ra điện", "Lưu trữ điện", "Đo điện áp"}, 0),
            new Q("Vật có khối lượng càng lớn thì lực hấp dẫn nó tạo ra càng?", new String[]{"Nhỏ", "Lớn", "Không đổi", "Bằng 0"}, 1)
        );
    }

    private List<Q> cauHoiVanHoc() {
        return List.of(
            new Q("Tác giả của tác phẩm \"Truyện Kiều\" là ai?", new String[]{"Nguyễn Trãi", "Nguyễn Du", "Hồ Xuân Hương", "Nguyễn Đình Chiểu"}, 1),
            new Q("\"Tắt đèn\" là tác phẩm của nhà văn nào?", new String[]{"Ngô Tất Tố", "Nam Cao", "Vũ Trọng Phụng", "Nguyễn Công Hoan"}, 0),
            new Q("Nhân vật chính trong tác phẩm \"Chí Phèo\" là ai?", new String[]{"Chí Phèo", "Bá Kiến", "Thị Nở", "Lão Hạc"}, 0),
            new Q("\"Nhật ký trong tù\" là tác phẩm của ai?", new String[]{"Tố Hữu", "Hồ Chí Minh", "Xuân Diệu", "Huy Cận"}, 1),
            new Q("Thể loại văn học nào sử dụng vần, nhịp điệu?", new String[]{"Văn xuôi", "Thơ", "Kịch", "Tiểu thuyết"}, 1),
            new Q("Tác phẩm \"Lão Hạc\" là của nhà văn nào?", new String[]{"Nam Cao", "Ngô Tất Tố", "Thạch Lam", "Nguyên Hồng"}, 0),
            new Q("\"Số đỏ\" là tiểu thuyết trào phúng của ai?", new String[]{"Vũ Trọng Phụng", "Nam Cao", "Ngô Tất Tố", "Nguyễn Công Hoan"}, 0),
            new Q("Bài thơ \"Ông đồ\" là sáng tác của ai?", new String[]{"Vũ Đình Liên", "Xuân Diệu", "Huy Cận", "Chế Lan Viên"}, 0),
            new Q("Nguyễn Du sống vào thời kỳ nào?", new String[]{"Thời Lý", "Thời Trần", "Thời Lê - Nguyễn", "Thời Đinh"}, 2),
            new Q("Tác phẩm nào được coi là áng thiên cổ hùng văn?", new String[]{"Bình Ngô đại cáo", "Truyện Kiều", "Chinh phụ ngâm", "Cung oán ngâm khúc"}, 0),
            new Q("\"Dế Mèn phiêu lưu ký\" là tác phẩm của ai?", new String[]{"Tô Hoài", "Nguyễn Nhật Ánh", "Nam Cao", "Nguyên Hồng"}, 0),
            new Q("Thể thơ lục bát có đặc điểm câu chữ như thế nào?", new String[]{"6-8 chữ xen kẽ", "7 chữ mỗi câu", "5 chữ mỗi câu", "Tự do"}, 0),
            new Q("Nhân vật Thúy Kiều xuất hiện trong tác phẩm nào?", new String[]{"Truyện Kiều", "Chinh phụ ngâm", "Lục Vân Tiên", "Tắt đèn"}, 0),
            new Q("\"Vợ nhặt\" là truyện ngắn của ai?", new String[]{"Kim Lân", "Nam Cao", "Ngô Tất Tố", "Nguyên Hồng"}, 0),
            new Q("Phong trào Thơ Mới phát triển mạnh vào giai đoạn nào?", new String[]{"1900-1910", "1932-1945", "1945-1954", "1954-1975"}, 1),
            new Q("Tác giả \"Chinh phụ ngâm\" (bản diễn Nôm nổi tiếng) là ai?", new String[]{"Đoàn Thị Điểm", "Hồ Xuân Hương", "Bà Huyện Thanh Quan", "Nguyễn Du"}, 0),
            new Q("\"Sống chết mặc bay\" là tác phẩm của ai?", new String[]{"Phạm Duy Tốn", "Nguyễn Công Hoan", "Nam Cao", "Ngô Tất Tố"}, 0),
            new Q("Thể loại kịch dân gian truyền thống Việt Nam gọi là gì?", new String[]{"Chèo", "Kịch nói", "Múa rối", "Cải lương"}, 0),
            new Q("\"Truyện Kiều\" viết bằng chữ gì?", new String[]{"Chữ Hán", "Chữ Nôm", "Chữ Quốc ngữ", "Chữ Phạn"}, 1),
            new Q("Nhà thơ nào được mệnh danh là \"Bà chúa thơ Nôm\"?", new String[]{"Hồ Xuân Hương", "Bà Huyện Thanh Quan", "Đoàn Thị Điểm", "Sương Nguyệt Anh"}, 0)
        );
    }

    private List<Q> cauHoiAmNhac() {
        return List.of(
            new Q("Có bao nhiêu nốt nhạc cơ bản trong âm nhạc phương Tây?", new String[]{"5", "6", "7", "8"}, 2),
            new Q("Nhạc cụ nào có 88 phím?", new String[]{"Guitar", "Piano", "Violin", "Sáo"}, 1),
            new Q("Bản \"Tiến quân ca\" - quốc ca Việt Nam - do ai sáng tác?", new String[]{"Văn Cao", "Trịnh Công Sơn", "Phạm Duy", "Văn Ký"}, 0),
            new Q("Nhạc cụ dân tộc nào có hình dáng chữ nhật, dùng que gõ?", new String[]{"Đàn bầu", "Đàn tranh", "Đàn t'rưng", "Sáo trúc"}, 2),
            new Q("Nhịp 4/4 có bao nhiêu phách trong 1 ô nhịp?", new String[]{"2", "3", "4", "6"}, 2),
            new Q("Beethoven là nhà soạn nhạc thuộc quốc gia nào?", new String[]{"Đức", "Áo", "Ý", "Pháp"}, 0),
            new Q("Đàn bầu là nhạc cụ có bao nhiêu dây?", new String[]{"1", "2", "4", "6"}, 0),
            new Q("Ký hiệu \"khóa Sol\" thường dùng cho nhạc cụ/giọng nào?", new String[]{"Giọng trầm", "Giọng cao (nữ, violin...)", "Trống", "Bass"}, 1),
            new Q("Nhạc sĩ Trịnh Công Sơn nổi tiếng với dòng nhạc nào?", new String[]{"Nhạc đỏ", "Nhạc trịnh (nhạc trữ tình)", "Nhạc rock", "Nhạc điện tử"}, 1),
            new Q("Thang âm Đô trưởng bắt đầu từ nốt nào?", new String[]{"Đô (C)", "Rê (D)", "Mi (E)", "Sol (G)"}, 0),
            new Q("Nhạc cụ nào được xem là \"vua của các loại nhạc cụ\"?", new String[]{"Guitar", "Organ/Piano", "Trống", "Sáo"}, 1),
            new Q("Mozart là nhà soạn nhạc thời kỳ nào?", new String[]{"Baroque", "Cổ điển (Classical)", "Lãng mạn", "Hiện đại"}, 1),
            new Q("Đàn t'rưng là nhạc cụ đặc trưng của vùng nào ở Việt Nam?", new String[]{"Đồng bằng sông Hồng", "Tây Nguyên", "Nam Bộ", "Miền Trung"}, 1),
            new Q("Hợp âm trưởng (major chord) thường tạo cảm giác gì?", new String[]{"Buồn", "Vui, sáng", "Căng thẳng", "Bí ẩn"}, 1),
            new Q("Nhạc kịch \"cải lương\" phổ biến ở vùng nào của Việt Nam?", new String[]{"Miền Bắc", "Miền Trung", "Miền Nam", "Tây Bắc"}, 2),
            new Q("Bộ gõ trong dàn nhạc giao hưởng gồm nhạc cụ nào?", new String[]{"Trống, chuông", "Violin, viola", "Sáo, kèn oboe", "Piano, guitar"}, 0),
            new Q("Nốt nhạc nào cao nhất trong 7 nốt cơ bản (Đô Rê Mi Fa Sol La Si)?", new String[]{"Đô", "Fa", "Si", "Sol"}, 2),
            new Q("Nhạc sĩ nào sáng tác \"Diễm xưa\"?", new String[]{"Trịnh Công Sơn", "Văn Cao", "Phạm Duy", "Đoàn Chuẩn"}, 0),
            new Q("Ca trù là loại hình nghệ thuật truyền thống của vùng nào?", new String[]{"Miền Bắc Việt Nam", "Miền Nam Việt Nam", "Tây Nguyên", "Nam Trung Bộ"}, 0),
            new Q("Nhịp điệu nhanh, dồn dập trong âm nhạc thường được gọi là gì?", new String[]{"Adagio (chậm)", "Allegro (nhanh)", "Largo (rất chậm)", "Andante (vừa phải)"}, 1)
        );
    }

    private List<Q> cauHoiLichSu() {
        return List.of(
            new Q("Chiến thắng Điện Biên Phủ diễn ra vào năm nào?", new String[]{"1945", "1954", "1968", "1975"}, 1),
            new Q("Ai là vị vua đầu tiên của nhà Nguyễn?", new String[]{"Gia Long", "Minh Mạng", "Tự Đức", "Bảo Đại"}, 0),
            new Q("Ngày Quốc khánh nước Việt Nam là ngày nào?", new String[]{"30/4", "2/9", "19/8", "1/5"}, 1),
            new Q("Hai Bà Trưng khởi nghĩa chống lại triều đại nào?", new String[]{"Nhà Hán", "Nhà Đường", "Nhà Tống", "Nhà Minh"}, 0),
            new Q("Chiến dịch Hồ Chí Minh kết thúc vào ngày nào?", new String[]{"30/4/1975", "2/9/1945", "7/5/1954", "19/8/1945"}, 0),
            new Q("Vị vua nào đã dời đô từ Hoa Lư về Thăng Long?", new String[]{"Lý Thái Tổ", "Lê Lợi", "Trần Nhân Tông", "Đinh Tiên Hoàng"}, 0),
            new Q("Cách mạng Tháng Tám thành công vào năm nào?", new String[]{"1930", "1945", "1954", "1975"}, 1),
            new Q("Ai là người lãnh đạo cuộc khởi nghĩa Lam Sơn?", new String[]{"Lê Lợi", "Trần Hưng Đạo", "Quang Trung", "Nguyễn Huệ"}, 0),
            new Q("Trận Bạch Đằng năm 938 do ai lãnh đạo, đánh bại quân Nam Hán?", new String[]{"Ngô Quyền", "Đinh Bộ Lĩnh", "Lê Hoàn", "Lý Thường Kiệt"}, 0),
            new Q("Vua Quang Trung có tên thật là gì?", new String[]{"Nguyễn Huệ", "Nguyễn Nhạc", "Nguyễn Ánh", "Nguyễn Lữ"}, 0),
            new Q("Đảng Cộng sản Việt Nam được thành lập vào năm nào?", new String[]{"1925", "1930", "1945", "1954"}, 1),
            new Q("Thành Cổ Loa gắn liền với vị vua nào?", new String[]{"An Dương Vương", "Hùng Vương", "Lý Nam Đế", "Triệu Đà"}, 0),
            new Q("Chủ tịch Hồ Chí Minh đọc bản Tuyên ngôn Độc lập tại đâu?", new String[]{"Quảng trường Ba Đình", "Dinh Độc Lập", "Huế", "Sài Gòn"}, 0),
            new Q("Nhà Trần ba lần đánh thắng quân xâm lược nào?", new String[]{"Nguyên Mông", "Nhà Minh", "Nhà Thanh", "Nhà Tống"}, 0),
            new Q("Hiệp định Genève được ký kết vào năm nào?", new String[]{"1954", "1945", "1968", "1975"}, 0),
            new Q("Ai là người phát hiện ra châu Mỹ?", new String[]{"Christopher Columbus", "Ferdinand Magellan", "Marco Polo", "Vasco da Gama"}, 0),
            new Q("Chiến tranh thế giới thứ hai kết thúc vào năm nào?", new String[]{"1943", "1945", "1950", "1939"}, 1),
            new Q("Kim tự tháp Ai Cập được xây dựng chủ yếu để làm gì?", new String[]{"Lăng mộ Pharaon", "Cung điện", "Đền thờ", "Kho lương thực"}, 0),
            new Q("Cách mạng công nghiệp lần thứ nhất bắt đầu ở quốc gia nào?", new String[]{"Anh", "Pháp", "Đức", "Mỹ"}, 0),
            new Q("Vạn Lý Trường Thành nằm ở quốc gia nào?", new String[]{"Trung Quốc", "Nhật Bản", "Hàn Quốc", "Mông Cổ"}, 0)
        );
    }
}
