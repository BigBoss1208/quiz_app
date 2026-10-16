package com.quiz.app.dto;

import java.time.LocalDateTime;

public record BaiLamAdminDTO(
        Long ketQuaId, Long userId, String tenNguoiChoi, String username, String hoTen,
        String tenChuDe, LocalDateTime thoiGianNop, int diemSo,
        boolean coChiTiet, NopBaiResponseDTO baiLam) {}
