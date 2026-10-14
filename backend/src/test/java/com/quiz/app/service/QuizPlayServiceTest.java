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
        CauHoi correctQuestion = question(101L, topic, CauHoi.LoaiCauHoi.TRAC_NGHIEM,
                answer(1001L, true), answer(1002L, false));
        CauHoi wrongQuestion = question(102L, topic, CauHoi.LoaiCauHoi.TRAC_NGHIEM,
                answer(1003L, true), answer(1004L, false));
        CauHoi skippedQuestion = question(103L, topic, CauHoi.LoaiCauHoi.TRAC_NGHIEM,
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
    void nopBaiGradesFillInTheBlankQuestionsWithUnicodeAndNormalization() {
        ChuDe topic = new ChuDe();
        topic.setId(2L);

        // Đáp án đúng là "Hà Nội"
        DapAn da1 = new DapAn(201L, "Hà Nội", true, null, null);
        DapAn da2 = new DapAn(202L, "TP Hà Nội", true, null, null);
        CauHoi fillQuestion = question(200L, topic, CauHoi.LoaiCauHoi.DIEN_TU, da1, da2);

        when(chuDeRepository.findById(2L)).thenReturn(Optional.of(topic));
        when(cauHoiRepository.findByChuDeIdOrderByThuTuAsc(2L)).thenReturn(List.of(fillQuestion));
        when(ketQuaRepository.save(any(KetQua.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Người dùng nhập thừa khoảng trắng và chữ thường: "   hà   nội  "
        NopBaiRequestDTO.CauTraLoiDTO traLoi = new NopBaiRequestDTO.CauTraLoiDTO();
        traLoi.setCauHoiId(200L);
        traLoi.setCauTraLoiText("   hà   nội  ");
        traLoi.setThoiGianTraLoi(10);

        NopBaiRequestDTO request = new NopBaiRequestDTO(2L, "Học viên", null, 10, List.of(traLoi));

        NopBaiResponseDTO result = service.nopBai(request);

        assertEquals(1, result.getSoCauDung());
        assertEquals(0, result.getSoCauSai());
        assertEquals("DUNG", result.getDanhSachCauHoi().get(0).getKetQua());
        assertEquals("DIEN_TU", result.getDanhSachCauHoi().get(0).getLoaiCauHoi());
    }

    @Test
    void nopBaiGradesReorderQuestionsByTokenIds() {
        ChuDe topic = new ChuDe();
        topic.setId(3L);

        // Thứ tự đúng: "Tôi" (301) -> "yêu" (302) -> "Việt Nam" (303)
        DapAn da1 = new DapAn(301L, "Tôi", true, 0, null);
        DapAn da2 = new DapAn(302L, "yêu", true, 1, null);
        DapAn da3 = new DapAn(303L, "Việt Nam", true, 2, null);
        CauHoi reorderQuestion = question(300L, topic, CauHoi.LoaiCauHoi.SAP_XEP, da1, da2, da3);

        when(chuDeRepository.findById(3L)).thenReturn(Optional.of(topic));
        when(cauHoiRepository.findByChuDeIdOrderByThuTuAsc(3L)).thenReturn(List.of(reorderQuestion));
        when(ketQuaRepository.save(any(KetQua.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Người dùng xếp đúng thứ tự ID: [301, 302, 303]
        NopBaiRequestDTO.CauTraLoiDTO traLoi = new NopBaiRequestDTO.CauTraLoiDTO();
        traLoi.setCauHoiId(300L);
        traLoi.setThuTuTokenIds(List.of(301L, 302L, 303L));
        traLoi.setThoiGianTraLoi(5);

        NopBaiRequestDTO request = new NopBaiRequestDTO(3L, "Học viên", null, 5, List.of(traLoi));

        NopBaiResponseDTO result = service.nopBai(request);

        assertEquals(1, result.getSoCauDung());
        assertEquals("DUNG", result.getDanhSachCauHoi().get(0).getKetQua());
        assertEquals("SAP_XEP", result.getDanhSachCauHoi().get(0).getLoaiCauHoi());
        assertEquals("Tôi yêu Việt Nam", result.getDanhSachCauHoi().get(0).getDapAnDungText());
    }

    @Test
    void nopBaiRejectsAnswersThatDoNotBelongToTheTopic() {
        ChuDe topic = new ChuDe();
        topic.setId(1L);
        CauHoi question = question(101L, topic, CauHoi.LoaiCauHoi.TRAC_NGHIEM, answer(1001L, true), answer(1002L, false));
        when(chuDeRepository.findById(1L)).thenReturn(Optional.of(topic));
        when(cauHoiRepository.findByChuDeIdOrderByThuTuAsc(1L)).thenReturn(List.of(question));

        NopBaiRequestDTO request = new NopBaiRequestDTO(
                1L, "Người học", null, 10,
                List.of(new NopBaiRequestDTO.CauTraLoiDTO(999L, 1001L, 2)));

        assertThrows(ResponseStatusException.class, () -> service.nopBai(request));
        verify(ketQuaRepository, never()).save(any(KetQua.class));
    }

    private static CauHoi question(Long id, ChuDe topic, CauHoi.LoaiCauHoi loai, DapAn... answers) {
        CauHoi q = new CauHoi();
        q.setId(id);
        q.setNoiDungCauHoi("Question " + id);
        q.setThuTu(1);
        q.setLoaiCauHoi(loai);
        q.setChuDe(topic);
        q.setDanhSachDapAn(List.of(answers));
        return q;
    }

    private static DapAn answer(Long id, boolean correct) {
        return new DapAn(id, "Option " + id, correct, null, null);
    }
}
