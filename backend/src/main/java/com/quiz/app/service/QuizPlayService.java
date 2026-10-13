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
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
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

    // Lấy toàn bộ câu hỏi của 1 chủ đề để chơi — KHÔNG kèm đáp án đúng
    public List<CauHoiChoiDTO> layCauHoiDeChoi(Long chuDeId) {
        List<CauHoi> danhSach = cauHoiRepository.findByChuDeIdOrderByThuTuAsc(chuDeId);

        return danhSach.stream().map(cauHoi -> {
            List<CauHoiChoiDTO.DapAnChoiDTO> dapAnDTO = cauHoi.getDanhSachDapAn().stream()
                    .map(da -> new CauHoiChoiDTO.DapAnChoiDTO(da.getId(), da.getNoiDung()))
                    .collect(Collectors.toList());
            return new CauHoiChoiDTO(cauHoi.getId(), cauHoi.getNoiDungCauHoi(), cauHoi.getHinhAnh(), dapAnDTO);
        }).collect(Collectors.toList());
    }

    // Kiểm tra 1 đáp án được chọn — trả về đúng/sai + id đáp án đúng (để hiển thị khi sai)
    // + cho biết đây có phải câu hỏi cuối cùng của chủ đề hay không
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

        long tongSoCauHoi = cauHoiRepository.countByChuDeId(cauHoi.getChuDe().getId());
        List<CauHoi> danhSachSapXep = cauHoiRepository.findByChuDeIdOrderByThuTuAsc(cauHoi.getChuDe().getId());
        boolean laCauCuoi = !danhSachSapXep.isEmpty()
                && danhSachSapXep.get(danhSachSapXep.size() - 1).getId().equals(cauHoiId);

        return new TraLoiResponseDTO(dung, dapAnDung.getId(), laCauCuoi);
    }

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
        List<NopBaiResponseDTO.CauHoiReviewDTO> review = new java.util.ArrayList<>();

        for (CauHoi cauHoi : cauHoiList) {
            NopBaiRequestDTO.CauTraLoiDTO traLoi = traLoiTheoCauHoi.remove(cauHoi.getId());
            Long dapAnDaChonId = traLoi != null ? traLoi.getDapAnId() : null;
            DapAn dapAnDung = cauHoi.getDanhSachDapAn().stream()
                    .filter(da -> Boolean.TRUE.equals(da.getLaDapAnDung()))
                    .findFirst()
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.CONFLICT, "Một câu hỏi chưa được cấu hình đáp án đúng."));

            String ketQua;
            if (dapAnDaChonId == null) {
                soCauChuaTraLoi++;
                ketQua = "CHUA_TRA_LOI";
            } else {
                DapAn dapAnDaChon = cauHoi.getDanhSachDapAn().stream()
                        .filter(da -> da.getId().equals(dapAnDaChonId))
                        .findFirst()
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.BAD_REQUEST, "Đáp án đã chọn không thuộc câu hỏi."));
                if (Boolean.TRUE.equals(dapAnDaChon.getLaDapAnDung())) {
                    soCauDung++;
                    ketQua = "DUNG";
                    int thoiGianTraLoi = traLoi == null ? THOI_GIAN_MOI_CAU_GIAY
                            : Math.max(0, Math.min(THOI_GIAN_MOI_CAU_GIAY, traLoi.getThoiGianTraLoi()));
                    diemSo += DIEM_MOI_CAU_DUNG
                            + (THOI_GIAN_MOI_CAU_GIAY - thoiGianTraLoi) * DIEM_THUONG_MOI_GIAY;
                } else {
                    soCauSai++;
                    ketQua = "SAI";
                }
            }

            List<NopBaiResponseDTO.DapAnReviewDTO> dapAnReview = cauHoi.getDanhSachDapAn().stream()
                    .map(da -> new NopBaiResponseDTO.DapAnReviewDTO(da.getId(), da.getNoiDung()))
                    .collect(Collectors.toList());
            review.add(new NopBaiResponseDTO.CauHoiReviewDTO(
                    cauHoi.getId(),
                    cauHoi.getNoiDungCauHoi(),
                    cauHoi.getHinhAnh(),
                    dapAnReview,
                    dapAnDaChonId,
                    dapAnDung.getId(),
                    ketQua,
                    null
            ));
        }

        if (!traLoiTheoCauHoi.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Có câu trả lời không thuộc chủ đề.");
        }

        int answeredCount = soCauDung + soCauSai;
        String tenNguoiChoi = request.getTenNguoiChoi() == null || request.getTenNguoiChoi().isBlank()
                ? "Khách" : request.getTenNguoiChoi().trim();
        KetQua ketQua = luuKetQua(chuDe.getId(), tenNguoiChoi, request.getUserId(),
                diemSo, answeredCount);

        return new NopBaiResponseDTO(
                ketQua.getId(),
                diemSo,
                cauHoiList.size(),
                soCauDung,
                soCauSai,
                soCauChuaTraLoi,
                Math.max(0, request.getThoiGianLam()),
                review
        );
    }

    // Lưu kết quả đã được server chấm sau khi người chơi nộp bài.
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
