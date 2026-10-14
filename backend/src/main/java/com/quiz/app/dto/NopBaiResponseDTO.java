package com.quiz.app.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
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
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CauHoiReviewDTO {
        private Long cauHoiId;
        private String noiDungCauHoi;
        private String hinhAnh;
        private String loaiCauHoi; // TRAC_NGHIEM, DIEN_TU, SAP_XEP
        private List<DapAnReviewDTO> danhSachDapAn;
        // TRAC_NGHIEM
        private Long dapAnDaChonId;
        private Long dapAnDungId;
        // DIEN_TU & SAP_XEP
        private String cauTraLoiText;
        private String dapAnDungText;
        private List<Long> thuTuTokenIdsDaChon;
        private List<Long> thuTuTokenIdsDung;

        private String ketQua; // DUNG, SAI, CHUA_TRA_LOI
        private String giaiThich;

        // Constructor tương thích cũ
        public CauHoiReviewDTO(Long cauHoiId, String noiDungCauHoi, String hinhAnh,
                               List<DapAnReviewDTO> danhSachDapAn, Long dapAnDaChonId,
                               Long dapAnDungId, String ketQua, String giaiThich) {
            this.cauHoiId = cauHoiId;
            this.noiDungCauHoi = noiDungCauHoi;
            this.hinhAnh = hinhAnh;
            this.loaiCauHoi = "TRAC_NGHIEM";
            this.danhSachDapAn = danhSachDapAn;
            this.dapAnDaChonId = dapAnDaChonId;
            this.dapAnDungId = dapAnDungId;
            this.ketQua = ketQua;
            this.giaiThich = giaiThich;
        }
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DapAnReviewDTO {
        private Long id;
        private String noiDung;
    }
}
