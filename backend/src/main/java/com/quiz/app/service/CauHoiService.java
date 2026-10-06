package com.quiz.app.service;

import com.quiz.app.entity.CauHoi;
import com.quiz.app.entity.ChuDe;
import com.quiz.app.entity.DapAn;
import com.quiz.app.repository.CauHoiRepository;
import com.quiz.app.repository.ChuDeRepository;
import lombok.RequiredArgsConstructor;
import com.quiz.app.dto.CauHoiCreateDTO;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
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

    /**
     * Thêm hàng loạt câu hỏi vào một chủ đề (Bulk Insert).
     *
     * @param chuDeId ID chủ đề cần thêm câu hỏi
     * @param dtos    Danh sách câu hỏi cần thêm
     * @return Danh sách các Entity CauHoi đã được lưu vào CSDL
     */
    @Transactional
    public List<CauHoi> themHangLoat(Long chuDeId, List<CauHoiCreateDTO> dtos) {
        if (dtos == null || dtos.isEmpty()) {
            return Collections.emptyList();
        }

        ChuDe chuDe = chuDeRepository.findById(chuDeId)
                .orElseThrow(() -> new RuntimeException("Chủ đề không tồn tại với ID: " + chuDeId));

        int thuTuHienTai = (int) cauHoiRepository.countByChuDeId(chuDeId);
        List<CauHoi> danhSachCauHoi = new ArrayList<>();

        for (CauHoiCreateDTO dto : dtos) {
            CauHoi cauHoi = new CauHoi();
            cauHoi.setNoiDungCauHoi(dto.getNoiDung().trim());
            cauHoi.setChuDe(chuDe);
            cauHoi.setThuTu(++thuTuHienTai);

            String dapAnDung = dto.getDapAnDung() != null ? dto.getDapAnDung().trim().toUpperCase() : "A";

            List<DapAn> danhSachDapAn = new ArrayList<>();

            DapAn daA = new DapAn();
            daA.setNoiDung(dto.getDapAnA() != null ? dto.getDapAnA().trim() : "");
            daA.setLaDapAnDung("A".equals(dapAnDung));
            daA.setCauHoi(cauHoi);
            danhSachDapAn.add(daA);

            DapAn daB = new DapAn();
            daB.setNoiDung(dto.getDapAnB() != null ? dto.getDapAnB().trim() : "");
            daB.setLaDapAnDung("B".equals(dapAnDung));
            daB.setCauHoi(cauHoi);
            danhSachDapAn.add(daB);

            DapAn daC = new DapAn();
            daC.setNoiDung(dto.getDapAnC() != null ? dto.getDapAnC().trim() : "");
            daC.setLaDapAnDung("C".equals(dapAnDung));
            daC.setCauHoi(cauHoi);
            danhSachDapAn.add(daC);

            DapAn daD = new DapAn();
            daD.setNoiDung(dto.getDapAnD() != null ? dto.getDapAnD().trim() : "");
            daD.setLaDapAnDung("D".equals(dapAnDung));
            daD.setCauHoi(cauHoi);
            danhSachDapAn.add(daD);

            cauHoi.setDanhSachDapAn(danhSachDapAn);
            danhSachCauHoi.add(cauHoi);
        }

        return cauHoiRepository.saveAll(danhSachCauHoi);
    }
}
