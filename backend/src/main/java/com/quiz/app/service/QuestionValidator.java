package com.quiz.app.service;

import com.quiz.app.entity.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

public final class QuestionValidator {
    private QuestionValidator() {}
    public static void validate(CauHoi q) {
        if (q == null || q.getNoiDungCauHoi() == null || q.getNoiDungCauHoi().isBlank()) fail("Thiếu nội dung câu hỏi");
        if (q.getChuDe() == null || q.getChuDe().getId() == null) fail("Thiếu chủ đề");
        List<DapAn> answers = q.getDanhSachDapAn();
        if (answers == null || answers.isEmpty() || answers.size() > 100) fail("Cần từ 1 đến 100 đáp án/token");
        for (DapAn a : answers) {
            if (a == null || a.getNoiDung() == null || a.getNoiDung().isBlank() || a.getNoiDung().length() > 500) fail("Đáp án/token phải có nội dung, tối đa 500 ký tự");
        }
        if (q.getThuTu() != null && q.getThuTu() < 0) fail("Thứ tự không được âm");
        switch (q.getLoaiCauHoi()) {
            case TRAC_NGHIEM -> {
                if (answers.size() != 4 || answers.stream().noneMatch(a -> Boolean.TRUE.equals(a.getLaDapAnDung()))) fail("Trắc nghiệm cần 4 lựa chọn và ít nhất 1 đáp án đúng");
            }
            case DIEN_TU -> {
                if (answers.stream().anyMatch(a -> !Boolean.TRUE.equals(a.getLaDapAnDung()))) fail("Mọi đáp án điền từ phải là đáp án được chấp nhận");
            }
            case SAP_XEP -> {
                if (answers.size() < 2) fail("Sắp xếp cần ít nhất 2 token");
                Set<Integer> orders = new HashSet<>();
                for (DapAn a : answers) {
                    if (a.getThuTu() == null || a.getThuTu() < 0 || a.getThuTu() >= answers.size() || !orders.add(a.getThuTu())) fail("Thứ tự token phải liên tục từ 0 và không trùng");
                }
            }
        }
    }
    private static void fail(String message) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }

    public static Set<String> parseCorrectLetters(String value) {
        String normalized = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        if (!normalized.matches("[A-D](?:\\s*[,;|]\\s*[A-D])*")) {
            fail("Đáp án đúng phải là A/B/C/D; nhiều đáp án dùng A,C");
        }
        List<String> letters = Arrays.asList(normalized.split("\\s*[,;|]\\s*"));
        Set<String> result = new LinkedHashSet<>(letters);
        if (result.size() != letters.size()) fail("Đáp án đúng không được trùng");
        return result;
    }
}
