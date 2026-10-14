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
public class NopBaiRequestDTO {
    private Long chuDeId;
    @jakarta.validation.constraints.Size(max=255)
    private String tenNguoiChoi;
    private Long userId;
    private int thoiGianLam;
    @jakarta.validation.constraints.Size(max=1000)
    private List<CauTraLoiDTO> danhSachTraLoi;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CauTraLoiDTO {
        private Long cauHoiId;
        // Dành cho TRAC_NGHIEM
        private Long dapAnId;
        // Dành cho DIEN_TU
        private String cauTraLoiText;
        // Dành cho SAP_XEP: danh sách ID của token theo thứ tự người chơi sắp xếp
        private List<Long> thuTuTokenIds;
        private int thoiGianTraLoi;

        public CauTraLoiDTO(Long cauHoiId, Long dapAnId, int thoiGianTraLoi) {
            this.cauHoiId = cauHoiId;
            this.dapAnId = dapAnId;
            this.thoiGianTraLoi = thoiGianTraLoi;
        }

        public CauTraLoiDTO(Long cauHoiId, String cauTraLoiText, int thoiGianTraLoi) {
            this.cauHoiId = cauHoiId;
            this.cauTraLoiText = cauTraLoiText;
            this.thoiGianTraLoi = thoiGianTraLoi;
        }

        public CauTraLoiDTO(Long cauHoiId, List<Long> thuTuTokenIds, int thoiGianTraLoi) {
            this.cauHoiId = cauHoiId;
            this.thuTuTokenIds = thuTuTokenIds;
            this.thoiGianTraLoi = thoiGianTraLoi;
        }
    }
}
