package com.quiz.app.repository;

import com.quiz.app.entity.CauHoi;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CauHoiRepository extends JpaRepository<CauHoi, Long> {
    List<CauHoi> findByChuDeIdOrderByThuTuAsc(Long chuDeId);
    long countByChuDeId(Long chuDeId);
}
