package com.quiz.app.service;

import com.quiz.app.dto.ThongKeTongQuanDTO;
import com.quiz.app.repository.CauHoiRepository;
import com.quiz.app.repository.ChuDeRepository;
import com.quiz.app.repository.KetQuaRepository;
import com.quiz.app.repository.NguoiDungRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ThongKeService {

    private final NguoiDungRepository nguoiDungRepository;
    private final ChuDeRepository chuDeRepository;
    private final CauHoiRepository cauHoiRepository;
    private final KetQuaRepository ketQuaRepository;

    public ThongKeTongQuanDTO layTongQuan() {
        return new ThongKeTongQuanDTO(
                nguoiDungRepository.count(),
                chuDeRepository.count(),
                cauHoiRepository.count(),
                ketQuaRepository.count()
        );
    }
}
