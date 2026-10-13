package com.quiz.app.service;

import com.quiz.app.dto.NopBaiRequestDTO;
import com.quiz.app.dto.NopBaiResponseDTO;
import com.quiz.app.entity.CauHoi;
import com.quiz.app.entity.ChuDe;
import com.quiz.app.entity.DapAn;
import com.quiz.app.entity.KetQua;
import com.quiz.app.repository.CauHoiRepository;
import com.quiz.app.repository.ChuDeRepository;
import com.quiz.app.repository.DapAnRepository;
import com.quiz.app.repository.KetQuaRepository;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class QuizPlayServiceTest {

    private final ChuDeRepository chuDeRepository = mock(ChuDeRepository.class);
    private final CauHoiRepository cauHoiRepository = mock(CauHoiRepository.class);
    private final DapAnRepository dapAnRepository = mock(DapAnRepository.class);
    private final KetQuaRepository ketQuaRepository = mock(KetQuaRepository.class);
    private final QuizPlayService service = new QuizPlayService(
            chuDeRepository, cauHoiRepository, dapAnRepository, ketQuaRepository);

    @Test
    void nopBaiGradesAllQuestionsAndReturnsReviewOnlyAfterSubmission() {
        ChuDe topic = new ChuDe();
        topic.setId(1L);
        CauHoi correctQuestion = question(101L, topic,
                answer(1001L, true), answer(1002L, false));
        CauHoi wrongQuestion = question(102L, topic,
                answer(1003L, true), answer(1004L, false));
        CauHoi skippedQuestion = question(103L, topic,
                answer(1005L, true), answer(1006L, false));

        when(chuDeRepository.findById(1L)).thenReturn(Optional.of(topic));
        when(cauHoiRepository.findByChuDeIdOrderByThuTuAsc(1L))
                .thenReturn(List.of(correctQuestion, wrongQuestion, skippedQuestion));
        when(ketQuaRepository.save(any(KetQua.class))).thenAnswer(invocation -> {
            KetQua saved = invocation.getArgument(0);
            saved.setId(9L);
            return saved;
        });

        NopBaiRequestDTO request = new NopBaiRequestDTO(
                1L,
                "Người học",
                5L,
                47,
                List.of(
                        new NopBaiRequestDTO.CauTraLoiDTO(101L, 1001L, 4),
                        new NopBaiRequestDTO.CauTraLoiDTO(102L, 1004L, 12)
                )
        );

        NopBaiResponseDTO result = service.nopBai(request);

        assertEquals(9L, result.getKetQuaId());
        assertEquals(260, result.getDiemSo());
        assertEquals(3, result.getTongSoCauHoi());
        assertEquals(1, result.getSoCauDung());
        assertEquals(1, result.getSoCauSai());
        assertEquals(1, result.getSoCauChuaTraLoi());
        assertEquals(47, result.getThoiGianLam());
        assertEquals("DUNG", result.getDanhSachCauHoi().get(0).getKetQua());
        assertEquals("SAI", result.getDanhSachCauHoi().get(1).getKetQua());
        assertEquals("CHUA_TRA_LOI", result.getDanhSachCauHoi().get(2).getKetQua());
        assertEquals(1001L, result.getDanhSachCauHoi().get(0).getDapAnDungId());
        verify(ketQuaRepository).save(any(KetQua.class));
    }

    @Test
    void nopBaiRejectsAnswersThatDoNotBelongToTheTopic() {
        ChuDe topic = new ChuDe();
        topic.setId(1L);
        CauHoi question = question(101L, topic, answer(1001L, true), answer(1002L, false));
        when(chuDeRepository.findById(1L)).thenReturn(Optional.of(topic));
        when(cauHoiRepository.findByChuDeIdOrderByThuTuAsc(1L)).thenReturn(List.of(question));

        NopBaiRequestDTO request = new NopBaiRequestDTO(
                1L, "Người học", null, 10,
                List.of(new NopBaiRequestDTO.CauTraLoiDTO(999L, 1001L, 2)));

        assertThrows(ResponseStatusException.class, () -> service.nopBai(request));
        verify(ketQuaRepository, never()).save(any(KetQua.class));
    }

    private static CauHoi question(Long id, ChuDe topic, DapAn... answers) {
        return new CauHoi(id, "Question " + id, null, 1, topic, List.of(answers));
    }

    private static DapAn answer(Long id, boolean correct) {
        return new DapAn(id, "Option " + id, correct, null);
    }
}
