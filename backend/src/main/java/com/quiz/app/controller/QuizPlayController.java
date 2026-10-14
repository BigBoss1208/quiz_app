package com.quiz.app.controller;

import com.quiz.app.dto.CauHoiChoiDTO;
import com.quiz.app.dto.NopBaiRequestDTO;
import com.quiz.app.dto.NopBaiResponseDTO;
import com.quiz.app.dto.TraLoiRequestDTO;
import com.quiz.app.dto.TraLoiResponseDTO;
import com.quiz.app.service.QuizPlayService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/choi")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class QuizPlayController {

    private final QuizPlayService quizPlayService;
    private final com.quiz.app.repository.NguoiDungRepository nguoiDungRepository;

    @PostMapping("/luyentap/{id}")
    public QuizPlayService.PracticeReview practice(@PathVariable Long id, @RequestBody NopBaiRequestDTO.CauTraLoiDTO input) {
        return quizPlayService.practice(id, input);
    }

    // Lấy danh sách câu hỏi để chơi (không lộ đáp án đúng)
    @GetMapping("/chude/{chuDeId}/cauhoi")
    public ResponseEntity<List<CauHoiChoiDTO>> layCauHoiDeChoi(@PathVariable Long chuDeId) {
        return ResponseEntity.ok(quizPlayService.layCauHoiDeChoi(chuDeId));
    }

    @PostMapping("/nopbai")
    public ResponseEntity<NopBaiResponseDTO> nopBai(@jakarta.validation.Valid @RequestBody NopBaiRequestDTO request,
                                                 org.springframework.security.core.Authentication authentication) {
        // A client must not be able to write quiz history under another user's ID.
        request.setUserId(null);
        if (authentication != null && authentication.isAuthenticated()) {
            nguoiDungRepository.findByUsername(authentication.getName()).ifPresent(user -> {
                request.setUserId(user.getId());
                request.setTenNguoiChoi(user.getHoTen());
            });
        }
        return ResponseEntity.ok(quizPlayService.nopBai(request));
    }

    // Gửi đáp án đã chọn, nhận về đúng/sai
    @PostMapping("/traloi")
    public ResponseEntity<TraLoiResponseDTO> traLoi(@RequestBody TraLoiRequestDTO request) {
        return ResponseEntity.ok(
                quizPlayService.kiemTraDapAn(request.getCauHoiId(), request.getDapAnId())
        );
    }

    // Ngừng nhận điểm do client tính toán; nộp bài mới sẽ được server chấm.
    @PostMapping("/ketqua")
    public ResponseEntity<String> luuKetQuaTuClient() {
        return ResponseEntity.status(410)
                .body("Endpoint cũ đã ngừng nhận điểm từ client. Hãy nộp bài qua /api/choi/nopbai.");
    }
}
