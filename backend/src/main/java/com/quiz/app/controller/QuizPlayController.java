package com.quiz.app.controller;

import com.quiz.app.dto.CauHoiChoiDTO;
import com.quiz.app.dto.TraLoiRequestDTO;
import com.quiz.app.dto.TraLoiResponseDTO;
import com.quiz.app.entity.KetQua;
import com.quiz.app.service.QuizPlayService;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/choi")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class QuizPlayController {

    private final QuizPlayService quizPlayService;

    // Lấy danh sách câu hỏi để chơi (không lộ đáp án đúng)
    @GetMapping("/chude/{chuDeId}/cauhoi")
    public ResponseEntity<List<CauHoiChoiDTO>> layCauHoiDeChoi(@PathVariable Long chuDeId) {
        return ResponseEntity.ok(quizPlayService.layCauHoiDeChoi(chuDeId));
    }

    // Gửi đáp án đã chọn, nhận về đúng/sai
    @PostMapping("/traloi")
    public ResponseEntity<TraLoiResponseDTO> traLoi(@RequestBody TraLoiRequestDTO request) {
        return ResponseEntity.ok(
                quizPlayService.kiemTraDapAn(request.getCauHoiId(), request.getDapAnId())
        );
    }

    // Lưu kết quả khi kết thúc lượt chơi (sai hoặc hoàn thành hết)
    @PostMapping("/ketqua")
    public ResponseEntity<KetQua> luuKetQua(@RequestBody LuuKetQuaRequest request) {
        KetQua ketQua = quizPlayService.luuKetQua(
                request.getChuDeId(),
                request.getTenNguoiChoi(),
                request.getUserId(),
                request.getDiemSo(),
                request.getSoCauDaTraLoi()
        );
        return ResponseEntity.ok(ketQua);
    }

    @Getter
    @Setter
    public static class LuuKetQuaRequest {
        private Long chuDeId;
        private String tenNguoiChoi;
        private Long userId;
        private int diemSo;
        private int soCauDaTraLoi;
    }
}
