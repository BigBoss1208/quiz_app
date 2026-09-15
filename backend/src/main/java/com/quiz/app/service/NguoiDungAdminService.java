package com.quiz.app.service;

import com.quiz.app.dto.NguoiDungAdminDTO;
import com.quiz.app.entity.KetQua;
import com.quiz.app.entity.NguoiDung;
import com.quiz.app.repository.KetQuaRepository;
import com.quiz.app.repository.NguoiDungRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NguoiDungAdminService {

    private final NguoiDungRepository nguoiDungRepository;
    private final KetQuaRepository ketQuaRepository;

    public List<NguoiDungAdminDTO.DanhSach> layDanhSachNguoiDung() {
        return nguoiDungRepository.findAll().stream()
                .map(this::chuyenThanhDTO)
                .collect(Collectors.toList());
    }

    private NguoiDungAdminDTO.DanhSach chuyenThanhDTO(NguoiDung nd) {
        List<KetQua> ketQuaList = ketQuaRepository.findByUserIdOrderByThoiGianLamDesc(nd.getId());

        long tongLuotChoi = ketQuaList.size();
        long tongDiem = ketQuaList.stream().mapToLong(KetQua::getDiemSo).sum();
        int diemCaoNhat = ketQuaList.stream().mapToInt(KetQua::getDiemSo).max().orElse(0);

        return new NguoiDungAdminDTO.DanhSach(
                nd.getId(), nd.getUsername(), nd.getHoTen(), nd.getVaiTro().name(),
                tongLuotChoi, tongDiem, diemCaoNhat
        );
    }

    public List<NguoiDungAdminDTO.LichSuChoi> layLichSuChoi(Long userId) {
        return ketQuaRepository.findByUserIdOrderByThoiGianLamDesc(userId).stream()
                .map(kq -> new NguoiDungAdminDTO.LichSuChoi(
                        kq.getId(),
                        kq.getChuDe() != null ? kq.getChuDe().getTenChuDe() : "(đã xoá)",
                        kq.getDiemSo(),
                        kq.getSoCauDaTraLoi(),
                        kq.getThoiGianLam()
                ))
                .collect(Collectors.toList());
    }
}
