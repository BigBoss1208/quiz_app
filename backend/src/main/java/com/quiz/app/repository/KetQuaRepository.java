package com.quiz.app.repository;

import com.quiz.app.entity.KetQua;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface KetQuaRepository extends JpaRepository<KetQua, Long> {

    long countByChuDeId(Long chuDeId);

    List<KetQua> findByChuDeIdOrderByDiemSoDescThoiGianLamAsc(Long chuDeId, Pageable pageable);

    List<KetQua> findByUserIdOrderByThoiGianLamDesc(Long userId);
}
