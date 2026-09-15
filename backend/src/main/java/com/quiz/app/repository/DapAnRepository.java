package com.quiz.app.repository;

import com.quiz.app.entity.DapAn;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DapAnRepository extends JpaRepository<DapAn, Long> {
    List<DapAn> findByCauHoiId(Long cauHoiId);
}
