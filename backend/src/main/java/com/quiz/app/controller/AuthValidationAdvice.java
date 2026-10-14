package com.quiz.app.controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import java.util.Map;
@RestControllerAdvice(assignableTypes=AuthController.class)
public class AuthValidationAdvice {
    // Never echo or log rejected password values from Bean Validation exceptions.
    @ExceptionHandler({MethodArgumentNotValidException.class,HttpMessageNotReadableException.class})
    public ResponseEntity<Map<String,String>> invalidRequest(Exception ignored) {
        return ResponseEntity.badRequest().body(Map.of("message","Dữ liệu đăng nhập/đăng ký không hợp lệ"));
    }
}
