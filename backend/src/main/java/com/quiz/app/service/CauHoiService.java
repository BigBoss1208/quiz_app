package com.quiz.app.service;

import com.quiz.app.entity.CauHoi;
import com.quiz.app.entity.ChuDe;
import com.quiz.app.entity.DapAn;
import com.quiz.app.repository.CauHoiRepository;
import com.quiz.app.repository.ChuDeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CauHoiService {

    private final CauHoiRepository cauHoiRepository;
    private final ChuDeRepository chuDeRepository;

    public List<CauHoi> layTatCa() {
        return cauHoiRepository.findAll();
    }

    public List<CauHoi> layTheoChuDe(Long chuDeId) {
        return cauHoiRepository.findByChuDeIdOrderByThuTuAsc(chuDeId);
    }

    public CauHoi layTheoId(Long id) {
        return cauHoiRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy câu hỏi với id: " + id));
    }

    // duLieu.chuDe chỉ cần chứa id, danhSachDapAn chứa các DapAn (chưa gắn cauHoi ngược)
    public CauHoi them(CauHoi duLieu) {
        ChuDe chuDe = chuDeRepository.findById(duLieu.getChuDe().getId())
                .orElseThrow(() -> new RuntimeException("Chủ đề không tồn tại"));
        duLieu.setChuDe(chuDe);

        if (duLieu.getDanhSachDapAn() != null) {
            for (DapAn dapAn : duLieu.getDanhSachDapAn()) {
                dapAn.setCauHoi(duLieu);
            }
        }
        return cauHoiRepository.save(duLieu);
    }

    public CauHoi capNhat(Long id, CauHoi duLieu) {
        CauHoi cauHoi = layTheoId(id);
        cauHoi.setNoiDungCauHoi(duLieu.getNoiDungCauHoi());
        cauHoi.setHinhAnh(duLieu.getHinhAnh());
        cauHoi.setThuTu(duLieu.getThuTu());

        if (duLieu.getChuDe() != null && duLieu.getChuDe().getId() != null) {
            ChuDe chuDe = chuDeRepository.findById(duLieu.getChuDe().getId())
                    .orElseThrow(() -> new RuntimeException("Chủ đề không tồn tại"));
            cauHoi.setChuDe(chuDe);
        }

        // Thay toàn bộ đáp án cũ bằng đáp án mới (orphanRemoval = true sẽ tự xóa cái cũ)
        cauHoi.getDanhSachDapAn().clear();
        if (duLieu.getDanhSachDapAn() != null) {
            for (DapAn dapAn : duLieu.getDanhSachDapAn()) {
                dapAn.setCauHoi(cauHoi);
                cauHoi.getDanhSachDapAn().add(dapAn);
            }
        }

        return cauHoiRepository.save(cauHoi);
    }

    public void xoa(Long id) {
        cauHoiRepository.deleteById(id);
    }
}
