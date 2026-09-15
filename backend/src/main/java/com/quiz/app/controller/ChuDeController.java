package com.quiz.app.controller;

import com.quiz.app.dto.ChuDeThongKeDTO;
import com.quiz.app.entity.ChuDe;
import com.quiz.app.service.ChuDeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chude")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ChuDeController {

    private final ChuDeService chuDeService;

    @GetMapping
    public ResponseEntity<List<ChuDe>> layTatCa() {
        return ResponseEntity.ok(chuDeService.layTatCa());
    }

    // Dùng cho trang "Vào chơi" — kèm số câu hỏi, lượt chơi, top 3 điểm cao
    @GetMapping("/thongke")
    public ResponseEntity<List<ChuDeThongKeDTO>> layDanhSachThongKe() {
        return ResponseEntity.ok(chuDeService.layDanhSachThongKe());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ChuDe> layTheoId(@PathVariable Long id) {
        return ResponseEntity.ok(chuDeService.layTheoId(id));
    }

    @GetMapping("/{id}/thongke")
    public ResponseEntity<ChuDeThongKeDTO> layThongKeTheoId(@PathVariable Long id) {
        return ResponseEntity.ok(chuDeService.layThongKeTheoId(id));
    }

    @PostMapping
    public ResponseEntity<ChuDe> them(@RequestBody ChuDe chuDe) {
        return ResponseEntity.ok(chuDeService.them(chuDe));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ChuDe> capNhat(@PathVariable Long id, @RequestBody ChuDe chuDe) {
        return ResponseEntity.ok(chuDeService.capNhat(id, chuDe));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> xoa(@PathVariable Long id) {
        chuDeService.xoa(id);
        return ResponseEntity.noContent().build();
    }
}
