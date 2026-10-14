package com.quiz.app.controller;
import com.quiz.app.entity.NhomMon;
import com.quiz.app.service.NhomMonService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequiredArgsConstructor
public class NhomMonController {
    private final NhomMonService service;
    @GetMapping("/api/nhom-mon") public List<NhomMon> publicList() { return service.list(false); }
    @GetMapping("/api/admin/nhom-mon") public List<NhomMon> adminList() { return service.list(true); }
    @PostMapping("/api/admin/nhom-mon") public NhomMon create(@RequestBody NhomMon g) { return service.save(null,g); }
    @PutMapping("/api/admin/nhom-mon/{id}") public NhomMon update(@PathVariable Long id,@RequestBody NhomMon g) { return service.save(id,g); }
    @DeleteMapping("/api/admin/nhom-mon/{id}") public void delete(@PathVariable Long id) { service.delete(id); }
}
