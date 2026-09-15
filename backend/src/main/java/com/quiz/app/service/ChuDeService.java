package com.quiz.app.service;

import com.quiz.app.dto.ChuDeThongKeDTO;
import com.quiz.app.entity.ChuDe;
import com.quiz.app.entity.KetQua;
import com.quiz.app.repository.CauHoiRepository;
import com.quiz.app.repository.ChuDeRepository;
import com.quiz.app.repository.KetQuaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChuDeService {

    private final ChuDeRepository chuDeRepository;
    private final CauHoiRepository cauHoiRepository;
    private final KetQuaRepository ketQuaRepository;

    public List<ChuDe> layTatCa() {
        return chuDeRepository.findAll();
    }

    public ChuDe layTheoId(Long id) {
        return chuDeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chủ đề với id: " + id));
    }

    public ChuDe them(ChuDe chuDe) {
        return chuDeRepository.save(chuDe);
    }

    public ChuDe capNhat(Long id, ChuDe duLieu) {
        ChuDe chuDe = layTheoId(id);
        chuDe.setTenChuDe(duLieu.getTenChuDe());
        chuDe.setHinhAnh(duLieu.getHinhAnh());
        chuDe.setMoTa(duLieu.getMoTa());
        chuDe.setDoKho(duLieu.getDoKho());
        chuDe.setDanhMuc(duLieu.getDanhMuc());
        return chuDeRepository.save(chuDe);
    }

    public void xoa(Long id) {
        chuDeRepository.deleteById(id);
    }

    // Danh sách chủ đề kèm thống kê: số câu hỏi, lượt chơi, top 3 điểm cao
    public List<ChuDeThongKeDTO> layDanhSachThongKe() {
        return chuDeRepository.findAll().stream()
                .map(this::chuyenThanhThongKeDTO)
                .collect(Collectors.toList());
    }

    public ChuDeThongKeDTO layThongKeTheoId(Long id) {
        return chuyenThanhThongKeDTO(layTheoId(id));
    }

    private ChuDeThongKeDTO chuyenThanhThongKeDTO(ChuDe chuDe) {
        long soCauHoi = cauHoiRepository.countByChuDeId(chuDe.getId());
        long luotChoi = ketQuaRepository.countByChuDeId(chuDe.getId());

        List<KetQua> topKetQua = ketQuaRepository
                .findByChuDeIdOrderByDiemSoDescThoiGianLamAsc(chuDe.getId(), PageRequest.of(0, 3));

        List<ChuDeThongKeDTO.TopDiemDTO> topDiem = topKetQua.stream()
                .map(kq -> new ChuDeThongKeDTO.TopDiemDTO(kq.getTenNguoiChoi(), kq.getDiemSo()))
                .collect(Collectors.toList());

        return new ChuDeThongKeDTO(
                chuDe.getId(),
                chuDe.getTenChuDe(),
                chuDe.getHinhAnh(),
                chuDe.getMoTa(),
                chuDe.getDoKho(),
                chuDe.getDanhMuc(),
                soCauHoi,
                luotChoi,
                topDiem
        );
    }
}
