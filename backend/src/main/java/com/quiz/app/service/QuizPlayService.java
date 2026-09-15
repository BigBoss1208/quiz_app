package com.quiz.app.service;

import com.quiz.app.dto.CauHoiChoiDTO;
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

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QuizPlayService {

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
    public TraLoiResponseDTO kiemTraDapAn(Long cauHoiId, Long dapAnDaChonId) {
        CauHoi cauHoi = cauHoiRepository.findById(cauHoiId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy câu hỏi"));

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

    // Lưu kết quả sau khi người chơi dừng lại (trả lời sai hoặc đã hoàn thành hết câu hỏi)
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
