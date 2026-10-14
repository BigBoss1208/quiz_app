package com.quiz.app.controller;
import com.quiz.app.entity.CauHoi;
import com.quiz.app.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.*;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.io.IOException;
@RestController @RequestMapping("/api/admin/import") @RequiredArgsConstructor
public class QuestionImportController {
    private final QuestionImportService imports;
    private final CauHoiService questions;
    @PostMapping("/preview") public QuestionImportService.Preview preview(@RequestParam MultipartFile file,@RequestParam Long chuDeId) {return imports.preview(file,chuDeId);}
    @PostMapping("/confirm") @Transactional public int confirm(@RequestBody List<CauHoi> input) {
        if(input==null || input.isEmpty() || input.size()>1000) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST,"Cần 1–1000 câu hỏi");
        input.forEach(QuestionValidator::validate);
        input.forEach(questions::them); return input.size();
    }
    @GetMapping("/template") public ResponseEntity<byte[]> template(@RequestParam String format,@RequestParam String type) throws IOException {
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=questions-"+type+"."+format).contentType(MediaType.APPLICATION_OCTET_STREAM).body(imports.template(format,type));
    }
}
