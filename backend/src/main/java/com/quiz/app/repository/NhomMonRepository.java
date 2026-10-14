package com.quiz.app.repository;
import com.quiz.app.entity.NhomMon;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface NhomMonRepository extends JpaRepository<NhomMon, Long> {
    List<NhomMon> findAllByOrderByThuTuAscIdAsc();
    Optional<NhomMon> findByTenIgnoreCase(String ten);
}
