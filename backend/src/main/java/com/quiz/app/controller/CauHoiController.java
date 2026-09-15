package com.quiz.app.controller;

import com.quiz.app.entity.CauHoi;
import com.quiz.app.service.CauHoiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cauhoi")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CauHoiController {

    private final CauHoiService cauHoiService;

    @GetMapping
    public ResponseEntity<List<CauHoi>> layTatCa() {
        return ResponseEntity.ok(cauHoiService.layTatCa());
    }

    // Dùng cho trang admin "Quản lý câu hỏi" khi lọc theo chủ đề
    @GetMapping("/chude/{chuDeId}")
    public ResponseEntity<List<CauHoi>> layTheoChuDe(@PathVariable Long chuDeId) {
        return ResponseEntity.ok(cauHoiService.layTheoChuDe(chuDeId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CauHoi> layTheoId(@PathVariable Long id) {
        return ResponseEntity.ok(cauHoiService.layTheoId(id));
    }

    @PostMapping
    public ResponseEntity<CauHoi> them(@RequestBody CauHoi cauHoi) {
        return ResponseEntity.ok(cauHoiService.them(cauHoi));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CauHoi> capNhat(@PathVariable Long id, @RequestBody CauHoi cauHoi) {
        return ResponseEntity.ok(cauHoiService.capNhat(id, cauHoi));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> xoa(@PathVariable Long id) {
        cauHoiService.xoa(id);
        return ResponseEntity.noContent().build();
    }
}
