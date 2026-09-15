package com.quiz.app.controller;

import com.quiz.app.dto.NguoiDungAdminDTO;
import com.quiz.app.dto.ThongKeTongQuanDTO;
import com.quiz.app.service.NguoiDungAdminService;
import com.quiz.app.service.ThongKeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AdminController {

    private final NguoiDungAdminService nguoiDungAdminService;
    private final ThongKeService thongKeService;

    @GetMapping("/nguoidung")
    public ResponseEntity<List<NguoiDungAdminDTO.DanhSach>> layDanhSachNguoiDung() {
        return ResponseEntity.ok(nguoiDungAdminService.layDanhSachNguoiDung());
    }

    @GetMapping("/nguoidung/{id}/lichsu")
    public ResponseEntity<List<NguoiDungAdminDTO.LichSuChoi>> layLichSuChoi(@PathVariable Long id) {
        return ResponseEntity.ok(nguoiDungAdminService.layLichSuChoi(id));
    }

    @GetMapping("/thongke")
    public ResponseEntity<ThongKeTongQuanDTO> layThongKeTongQuan() {
        return ResponseEntity.ok(thongKeService.layTongQuan());
    }
}
