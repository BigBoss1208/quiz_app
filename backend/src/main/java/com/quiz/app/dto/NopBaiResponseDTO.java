package com.quiz.app.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
public class NopBaiResponseDTO {
    private Long ketQuaId;
    private int diemSo;
    private int tongSoCauHoi;
    private int soCauDung;
    private int soCauSai;
    private int soCauChuaTraLoi;
    private int thoiGianLam;
    private List<CauHoiReviewDTO> danhSachCauHoi;

    @Getter
    @Setter
    @AllArgsConstructor
    public static class CauHoiReviewDTO {
        private Long cauHoiId;
        private String noiDungCauHoi;
        private String hinhAnh;
        private List<DapAnReviewDTO> danhSachDapAn;
        private Long dapAnDaChonId;
        private Long dapAnDungId;
        private String ketQua;
        private String giaiThich;
    }

    @Getter
    @Setter
    @AllArgsConstructor
    public static class DapAnReviewDTO {
        private Long id;
        private String noiDung;
    }
}
