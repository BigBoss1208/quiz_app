package com.quiz.app.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

// DTO trả về khi CHƠI quiz — KHÔNG để lộ đáp án đúng
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CauHoiChoiDTO {
    private Long id;
    private String noiDungCauHoi;
    private String hinhAnh;
    private String loaiCauHoi; // "TRAC_NGHIEM", "DIEN_TU", "SAP_XEP"
    private List<DapAnChoiDTO> danhSachDapAn;

    public CauHoiChoiDTO(Long id, String noiDungCauHoi, String hinhAnh, List<DapAnChoiDTO> danhSachDapAn) {
        this(id, noiDungCauHoi, hinhAnh, "TRAC_NGHIEM", danhSachDapAn);
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DapAnChoiDTO {
        private Long id;
        private String noiDung;
    }
}
