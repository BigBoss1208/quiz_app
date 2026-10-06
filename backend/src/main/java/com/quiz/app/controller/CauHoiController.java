package com.quiz.app.controller;

import com.quiz.app.dto.AiGenerateRequestDTO;
import com.quiz.app.dto.CauHoiCreateDTO;
import com.quiz.app.dto.ImportExcelResultDTO;
import com.quiz.app.entity.CauHoi;
import com.quiz.app.service.AiQuestionService;
import com.quiz.app.service.CauHoiService;
import com.quiz.app.service.ExcelCauHoiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping({"/api/cauhoi", "/admin/cauhoi", "/api/admin/cauhoi"})
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CauHoiController {

    private final CauHoiService cauHoiService;
    private final ExcelCauHoiService excelCauHoiService;
    private final AiQuestionService aiQuestionService;

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

    /**
     * Tải file Excel mẫu (.xlsx) để người dùng điền câu hỏi.
     */
    @GetMapping("/template-excel")
    public ResponseEntity<byte[]> taiTemplateExcel() {
        try {
            byte[] excelContent = excelCauHoiService.taoFileMauExcel();
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"CauHoi_Template.xlsx\"")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(excelContent);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Import câu hỏi hàng loạt từ file Excel và lưu vào CSDL.
     *
     * @param file    File Excel (.xlsx) được gửi lên
     * @param chuDeId ID chủ đề cần thêm câu hỏi vào
     * @return ImportExcelResultDTO chứa số câu thành công và danh sách lỗi từng dòng (nếu có)
     */
    @PostMapping("/import-excel")
    public ResponseEntity<ImportExcelResultDTO> importExcel(
            @RequestParam("file") MultipartFile file,
            @RequestParam("chuDeId") Long chuDeId) {

        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(
                    ImportExcelResultDTO.builder()
                            .soCauThanhCong(0)
                            .danhSachLoi(List.of("Vui lòng chọn file Excel để tải lên."))
                            .build()
            );
        }

        List<String> danhSachLoi = new ArrayList<>();
        try {
            // Đọc dữ liệu từ file Excel
            List<CauHoiCreateDTO> dtos = excelCauHoiService.docFileExcel(file.getInputStream(), danhSachLoi);
            int soCauThanhCong = 0;

            // Nếu có câu hỏi hợp lệ, tiến hành bulk insert
            if (!dtos.isEmpty()) {
                List<CauHoi> saved = cauHoiService.themHangLoat(chuDeId, dtos);
                soCauThanhCong = saved.size();
            }

            return ResponseEntity.ok(ImportExcelResultDTO.builder()
                    .soCauThanhCong(soCauThanhCong)
                    .danhSachLoi(danhSachLoi)
                    .build());
        } catch (Exception e) {
            danhSachLoi.add("Lỗi khi xử lý file Excel: " + e.getMessage());
            return ResponseEntity.badRequest().body(
                    ImportExcelResultDTO.builder()
                            .soCauThanhCong(0)
                            .danhSachLoi(danhSachLoi)
                            .build()
            );
        }
    }

    /**
     * Bulk insert danh sách câu hỏi trực tiếp (Dùng cho lưu sau khi sinh AI hoặc batch khác).
     *
     * @param chuDeId ID chủ đề
     * @param dtos    Danh sách câu hỏi cần lưu
     * @return Số lượng câu hỏi đã được thêm thành công
     */
    @PostMapping("/bulk")
    public ResponseEntity<Integer> themHangLoat(
            @RequestParam("chuDeId") Long chuDeId,
            @RequestBody List<CauHoiCreateDTO> dtos) {
        List<CauHoi> saved = cauHoiService.themHangLoat(chuDeId, dtos);
        return ResponseEntity.ok(saved.size());
    }

    /**
     * Tạo danh sách câu hỏi tự động bằng AI (Prompt Engineering).
     * LƯU Ý: Endpoint này CHỈ trả dữ liệu về để Frontend hiển thị Preview,
     * TUYỆT ĐỐI KHÔNG lưu vào Database.
     *
     * @param request thông tin gồm chủ đề (topic), số lượng câu (count) và độ khó (doKho)
     * @return Danh sách câu hỏi DTO để admin xem trước và sửa trực tiếp trên giao diện
     */
    @PostMapping("/generate-ai")
    public ResponseEntity<List<CauHoiCreateDTO>> generateAi(
            @RequestBody AiGenerateRequestDTO request) {
        List<CauHoiCreateDTO> ketQua = aiQuestionService.generateQuestions(request);
        return ResponseEntity.ok(ketQua);
    }
}
