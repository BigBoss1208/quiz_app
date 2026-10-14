package com.quiz.app.service;

import com.quiz.app.dto.CauHoiChoiDTO;
import com.quiz.app.dto.NopBaiRequestDTO;
import com.quiz.app.dto.NopBaiResponseDTO;
import com.quiz.app.dto.TraLoiResponseDTO;
import com.quiz.app.entity.CauHoi;
import com.quiz.app.entity.ChuDe;
import com.quiz.app.entity.DapAn;
import com.quiz.app.entity.KetQua;
import com.quiz.app.repository.CauHoiRepository;
import com.quiz.app.repository.ChuDeRepository;
import com.quiz.app.repository.DapAnRepository;
import com.quiz.app.repository.KetQuaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QuizPlayService {

    private static final int DIEM_MOI_CAU_DUNG = 100;
    private static final int DIEM_THUONG_MOI_GIAY = 10;
    private static final int THOI_GIAN_MOI_CAU_GIAY = 20;

    private final ChuDeRepository chuDeRepository;
    private final CauHoiRepository cauHoiRepository;
    private final DapAnRepository dapAnRepository;
    private final KetQuaRepository ketQuaRepository;

    public record PracticeReview(boolean dung, String dapAnDungText, String giaiThich) {}

    @Transactional(readOnly = true)
    public PracticeReview practice(Long id, NopBaiRequestDTO.CauTraLoiDTO input) {
        CauHoi q = cauHoiRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!Boolean.TRUE.equals(q.getChuDe().getChoPhepXemDapAn()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Đề không cho xem đáp án từng câu");
        List<DapAn> correct = q.getDanhSachDapAn().stream()
                .filter(a -> q.getLoaiCauHoi() == CauHoi.LoaiCauHoi.SAP_XEP || Boolean.TRUE.equals(a.getLaDapAnDung()))
                .sorted(Comparator.comparing(a -> a.getThuTu() == null ? 0 : a.getThuTu())).toList();
        if (q.getLoaiCauHoi() == CauHoi.LoaiCauHoi.DIEN_TU && correct.isEmpty()) correct = q.getDanhSachDapAn();
        boolean valid = switch (q.getLoaiCauHoi()) {
            case TRAC_NGHIEM -> correct.stream().anyMatch(a -> a.getId().equals(input.getDapAnId()));
            case DIEN_TU -> correct.stream().anyMatch(a -> normalizeText(a.getNoiDung()).equalsIgnoreCase(normalizeText(input.getCauTraLoiText())));
            case SAP_XEP -> correct.stream().map(DapAn::getId).toList().equals(input.getThuTuTokenIds());
        };
        return new PracticeReview(valid, correct.stream().map(DapAn::getNoiDung).collect(Collectors.joining(q.getLoaiCauHoi() == CauHoi.LoaiCauHoi.SAP_XEP ? " " : " / ")), q.getGiaiThich());
    }

    // Lấy toàn bộ câu hỏi của 1 chủ đề để chơi — BẢO VỆ ĐÁP ÁN: KHÔNG kèm đáp án đúng
    public List<CauHoiChoiDTO> layCauHoiDeChoi(Long chuDeId) {
        List<CauHoi> danhSach = cauHoiRepository.findByChuDeIdOrderByThuTuAsc(chuDeId);

        ChuDe config = danhSach.isEmpty() ? null : danhSach.get(0).getChuDe();
        if (config != null && Boolean.TRUE.equals(config.getXaoTronCauHoi())) {
            danhSach = new ArrayList<>(danhSach);
            Collections.shuffle(danhSach);
        }
        return danhSach.stream().map(cauHoi -> {
            CauHoi.LoaiCauHoi loai = cauHoi.getLoaiCauHoi();
            List<CauHoiChoiDTO.DapAnChoiDTO> dapAnDTO;

            if (loai == CauHoi.LoaiCauHoi.DIEN_TU) {
                // Với câu điền từ: TUYỆT ĐỐI không trả danh sách đáp án để tránh lộ từ khóa
                dapAnDTO = Collections.emptyList();
            } else if (loai == CauHoi.LoaiCauHoi.SAP_XEP) {
                // Với câu sắp xếp: trả token đã XÁO TRỘN, chỉ có id và nội dung, KHÔNG có thứ tự đúng
                List<CauHoiChoiDTO.DapAnChoiDTO> tokens = cauHoi.getDanhSachDapAn().stream()
                        .map(da -> new CauHoiChoiDTO.DapAnChoiDTO(da.getId(), da.getNoiDung()))
                        .collect(Collectors.toList());
                // Xáo trộn token
                Collections.shuffle(tokens);
                dapAnDTO = tokens;
            } else {
                // Với trắc nghiệm: trả các phương án A/B/C/D
                dapAnDTO = cauHoi.getDanhSachDapAn().stream()
                        .map(da -> new CauHoiChoiDTO.DapAnChoiDTO(da.getId(), da.getNoiDung()))
                        .collect(Collectors.toList());
            }

            if (loai == CauHoi.LoaiCauHoi.TRAC_NGHIEM && Boolean.TRUE.equals(cauHoi.getChuDe().getXaoTronLuaChon())) Collections.shuffle(dapAnDTO);
            return new CauHoiChoiDTO(
                    cauHoi.getId(),
                    cauHoi.getNoiDungCauHoi(),
                    cauHoi.getHinhAnh(),
                    loai.name(),
                    dapAnDTO
            );
        }).collect(Collectors.toList());
    }

    // Kiểm tra 1 đáp án được chọn (chỉ khả dụng khi đề cho phép xem đáp án ngay)
    @Transactional(readOnly = true)
    public TraLoiResponseDTO kiemTraDapAn(Long cauHoiId, Long dapAnDaChonId) {
        CauHoi cauHoi = cauHoiRepository.findById(cauHoiId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy câu hỏi"));

        if (!Boolean.TRUE.equals(cauHoi.getChuDe().getChoPhepXemDapAn())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Chủ đề này không cho xem đáp án trong khi đang làm bài.");
        }

        DapAn dapAnDung = cauHoi.getDanhSachDapAn().stream()
                .filter(DapAn::getLaDapAnDung)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Câu hỏi chưa có đáp án đúng"));

        boolean dung = dapAnDung.getId().equals(dapAnDaChonId);

        List<CauHoi> danhSachSapXep = cauHoiRepository.findByChuDeIdOrderByThuTuAsc(cauHoi.getChuDe().getId());
        boolean laCauCuoi = !danhSachSapXep.isEmpty()
                && danhSachSapXep.get(danhSachSapXep.size() - 1).getId().equals(cauHoiId);

        return new TraLoiResponseDTO(dung, dapAnDung.getId(), laCauCuoi);
    }

    // Chấm điểm và nộp bài thi
    @Transactional
    public NopBaiResponseDTO nopBai(NopBaiRequestDTO request) {
        if (request == null || request.getChuDeId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu chủ đề cần nộp.");
        }

        ChuDe chuDe = chuDeRepository.findById(request.getChuDeId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chủ đề."));
        List<CauHoi> cauHoiList = cauHoiRepository.findByChuDeIdOrderByThuTuAsc(chuDe.getId());
        Map<Long, NopBaiRequestDTO.CauTraLoiDTO> traLoiTheoCauHoi = new HashMap<>();

        if (request.getDanhSachTraLoi() != null) {
            for (NopBaiRequestDTO.CauTraLoiDTO traLoi : request.getDanhSachTraLoi()) {
                if (traLoi == null || traLoi.getCauHoiId() == null
                        || traLoiTheoCauHoi.putIfAbsent(traLoi.getCauHoiId(), traLoi) != null) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Danh sách câu trả lời không hợp lệ.");
                }
            }
        }

        int diemSo = 0;
        int soCauDung = 0;
        int soCauSai = 0;
        int soCauChuaTraLoi = 0;
        List<NopBaiResponseDTO.CauHoiReviewDTO> review = new ArrayList<>();

        for (CauHoi cauHoi : cauHoiList) {
            NopBaiRequestDTO.CauTraLoiDTO traLoi = traLoiTheoCauHoi.remove(cauHoi.getId());
            CauHoi.LoaiCauHoi loai = cauHoi.getLoaiCauHoi();

            String ketQua;
            Long dapAnDaChonId = null;
            Long dapAnDungId = null;
            String cauTraLoiText = null;
            String dapAnDungText = null;
            List<Long> thuTuTokenIdsDaChon = null;
            List<Long> thuTuTokenIdsDung = null;

            int thoiGianTraLoi = traLoi == null ? THOI_GIAN_MOI_CAU_GIAY
                    : Math.max(0, Math.min(THOI_GIAN_MOI_CAU_GIAY, traLoi.getThoiGianTraLoi()));

            if (loai == CauHoi.LoaiCauHoi.DIEN_TU) {
                // ===== CHẤM ĐIỂM CÂU ĐIỀN TỪ =====
                List<DapAn> dapAnDungList = cauHoi.getDanhSachDapAn().stream()
                        .filter(da -> Boolean.TRUE.equals(da.getLaDapAnDung()))
                        .toList();
                if (dapAnDungList.isEmpty()) {
                    dapAnDungList = cauHoi.getDanhSachDapAn();
                }
                dapAnDungText = dapAnDungList.stream().map(DapAn::getNoiDung).collect(Collectors.joining(" / "));

                String userRaw = traLoi != null ? traLoi.getCauTraLoiText() : null;
                String normalizedUser = normalizeText(userRaw);
                cauTraLoiText = userRaw != null ? userRaw.trim() : null;

                if (normalizedUser.isEmpty()) {
                    soCauChuaTraLoi++;
                    ketQua = "CHUA_TRA_LOI";
                } else {
                    boolean isCorrect = dapAnDungList.stream().anyMatch(da -> {
                        String normalizedCorrect = normalizeText(da.getNoiDung());
                        return normalizedUser.equalsIgnoreCase(normalizedCorrect);
                    });

                    if (isCorrect) {
                        soCauDung++;
                        ketQua = "DUNG";
                        diemSo += DIEM_MOI_CAU_DUNG + (THOI_GIAN_MOI_CAU_GIAY - thoiGianTraLoi) * DIEM_THUONG_MOI_GIAY;
                    } else {
                        soCauSai++;
                        ketQua = "SAI";
                    }
                }

            } else if (loai == CauHoi.LoaiCauHoi.SAP_XEP) {
                // ===== CHẤM ĐIỂM CÂU SẮP XẾP TOKEN =====
                List<DapAn> tokensSorted = cauHoi.getDanhSachDapAn().stream()
                        .sorted(Comparator.comparing(da -> da.getThuTu() != null ? da.getThuTu() : 0))
                        .toList();
                thuTuTokenIdsDung = tokensSorted.stream().map(DapAn::getId).toList();
                dapAnDungText = tokensSorted.stream().map(DapAn::getNoiDung).collect(Collectors.joining(" "));

                Map<Long, String> tokenMap = cauHoi.getDanhSachDapAn().stream()
                        .collect(Collectors.toMap(DapAn::getId, DapAn::getNoiDung, (v1, v2) -> v1));

                List<Long> userTokenIds = traLoi != null ? traLoi.getThuTuTokenIds() : null;
                thuTuTokenIdsDaChon = userTokenIds;

                if (userTokenIds == null || userTokenIds.isEmpty()) {
                    soCauChuaTraLoi++;
                    ketQua = "CHUA_TRA_LOI";
                } else {
                    cauTraLoiText = userTokenIds.stream()
                            .map(id -> tokenMap.getOrDefault(id, ""))
                            .collect(Collectors.joining(" "));

                    // Kiểm tra token có hợp lệ (đủ số lượng, không trùng, đúng ID)
                    Set<Long> uniqueIds = new HashSet<>(userTokenIds);
                    boolean validTokens = userTokenIds.size() == thuTuTokenIdsDung.size()
                            && uniqueIds.size() == userTokenIds.size()
                            && thuTuTokenIdsDung.containsAll(userTokenIds);

                    if (validTokens && userTokenIds.equals(thuTuTokenIdsDung)) {
                        soCauDung++;
                        ketQua = "DUNG";
                        diemSo += DIEM_MOI_CAU_DUNG + (THOI_GIAN_MOI_CAU_GIAY - thoiGianTraLoi) * DIEM_THUONG_MOI_GIAY;
                    } else {
                        soCauSai++;
                        ketQua = "SAI";
                    }
                }

            } else {
                // ===== CHẤM ĐIỂM CÂU TRẮC NGHIỆM TRUYỀN THỐNG =====
                dapAnDaChonId = traLoi != null ? traLoi.getDapAnId() : null;
                DapAn dapAnDung = cauHoi.getDanhSachDapAn().stream()
                        .filter(da -> Boolean.TRUE.equals(da.getLaDapAnDung()))
                        .findFirst()
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.CONFLICT, "Một câu hỏi chưa được cấu hình đáp án đúng."));
                dapAnDungId = dapAnDung.getId();
                dapAnDungText = dapAnDung.getNoiDung();

                if (dapAnDaChonId == null) {
                    soCauChuaTraLoi++;
                    ketQua = "CHUA_TRA_LOI";
                } else {
                    final Long selectedId = dapAnDaChonId;
                    DapAn dapAnDaChon = cauHoi.getDanhSachDapAn().stream()
                            .filter(da -> da.getId().equals(selectedId))
                            .findFirst()
                            .orElseThrow(() -> new ResponseStatusException(
                                    HttpStatus.BAD_REQUEST, "Đáp án đã chọn không thuộc câu hỏi."));
                    cauTraLoiText = dapAnDaChon.getNoiDung();

                    if (Boolean.TRUE.equals(dapAnDaChon.getLaDapAnDung())) {
                        soCauDung++;
                        ketQua = "DUNG";
                        diemSo += DIEM_MOI_CAU_DUNG + (THOI_GIAN_MOI_CAU_GIAY - thoiGianTraLoi) * DIEM_THUONG_MOI_GIAY;
                    } else {
                        soCauSai++;
                        ketQua = "SAI";
                    }
                }
            }

            List<NopBaiResponseDTO.DapAnReviewDTO> dapAnReview = cauHoi.getDanhSachDapAn().stream()
                    .map(da -> new NopBaiResponseDTO.DapAnReviewDTO(da.getId(), da.getNoiDung()))
                    .collect(Collectors.toList());

            NopBaiResponseDTO.CauHoiReviewDTO itemReview = new NopBaiResponseDTO.CauHoiReviewDTO();
            itemReview.setCauHoiId(cauHoi.getId());
            itemReview.setNoiDungCauHoi(cauHoi.getNoiDungCauHoi());
            itemReview.setHinhAnh(cauHoi.getHinhAnh());
            itemReview.setLoaiCauHoi(loai.name());
            itemReview.setDanhSachDapAn(dapAnReview);
            itemReview.setDapAnDaChonId(dapAnDaChonId);
            itemReview.setDapAnDungId(dapAnDungId);
            itemReview.setCauTraLoiText(cauTraLoiText);
            itemReview.setDapAnDungText(dapAnDungText);
            itemReview.setThuTuTokenIdsDaChon(thuTuTokenIdsDaChon);
            itemReview.setThuTuTokenIdsDung(thuTuTokenIdsDung);
            itemReview.setKetQua(ketQua);
            itemReview.setGiaiThich(cauHoi.getGiaiThich());

            review.add(itemReview);
        }

        if (!traLoiTheoCauHoi.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Có câu trả lời không thuộc chủ đề.");
        }

        int answeredCount = soCauDung + soCauSai;
        String tenNguoiChoi = request.getTenNguoiChoi() == null || request.getTenNguoiChoi().isBlank()
                ? "Khách" : request.getTenNguoiChoi().trim();
        KetQua ketQua = luuKetQua(chuDe.getId(), tenNguoiChoi, request.getUserId(), diemSo, answeredCount);

        return new NopBaiResponseDTO(
                ketQua.getId(),
                diemSo,
                cauHoiList.size(),
                soCauDung,
                soCauSai,
                soCauChuaTraLoi,
                Math.max(0, request.getThoiGianLam()),
                Boolean.FALSE.equals(chuDe.getHienDapAnSauNop()) ? Collections.emptyList() : review
        );
    }

    // Chuẩn hóa văn bản điền từ: Unicode NFC, bỏ khoảng trắng thừa, giữ nguyên dấu tiếng Việt & thanh điệu Pinyin
    public static String normalizeText(String text) {
        if (text == null) return "";
        String normalized = Normalizer.normalize(text, Normalizer.Form.NFC);
        return normalized.trim().replaceAll("\\s+", " ");
    }

    // Lưu kết quả đã được server chấm sau khi người chơi nộp bài
    public KetQua luuKetQua(Long chuDeId, String tenNguoiChoi, Long userId, int diemSo, int soCauDaTraLoi) {
        ChuDe chuDe = chuDeRepository.findById(chuDeId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chủ đề"));

        KetQua ketQua = new KetQua();
        ketQua.setChuDe(chuDe);
        ketQua.setTenNguoiChoi(tenNguoiChoi);
        ketQua.setUserId(userId);
        ketQua.setDiemSo(diemSo);
        ketQua.setSoCauDaTraLoi(soCauDaTraLoi);

        return ketQuaRepository.save(ketQua);
    }
}
