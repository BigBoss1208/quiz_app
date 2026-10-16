package com.quiz.app.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.quiz.app.dto.*;
import com.quiz.app.entity.*;
import com.quiz.app.repository.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class BaiLamAdminServiceTest {
    final KetQuaRepository results=mock(KetQuaRepository.class);
    final KetQuaChiTietRepository snapshots=mock(KetQuaChiTietRepository.class);
    final NguoiDungRepository users=mock(NguoiDungRepository.class);
    final BaiLamAdminService service=new BaiLamAdminService(snapshots,results,users,new ObjectMapper().findAndRegisterModules());
    KetQua result() {
        ChuDe topic=new ChuDe();topic.setTenChuDe("Tiếng Trung 中国");
        KetQua r=new KetQua();r.setId(5L);r.setChuDe(topic);r.setTenNguoiChoi("Người thử");r.setDiemSo(100);
        when(results.findById(5L)).thenReturn(Optional.of(r));return r;
    }
    @Test void legacyResultHasMetadataButNoInventedQuestions() {
        result();when(snapshots.findById(5L)).thenReturn(Optional.empty());
        var dto=service.xem(5L);assertFalse(dto.coChiTiet());assertNull(dto.baiLam());assertEquals(100,dto.diemSo());
        verify(snapshots,never()).save(any());
    }
    @Test void snapshotIsDetachedFromLaterQuestionOrTopicChanges() {
        var r=result();var q=new NopBaiResponseDTO.CauHoiReviewDTO();q.setNoiDungCauHoi("Câu gốc 中国");q.setKetQua("DUNG");q.setGiaiThich("Giải thích gốc");
        var review=new NopBaiResponseDTO(5L,100,1,1,0,0,10,List.of(q));service.luu(r,review);
        var captor=ArgumentCaptor.forClass(KetQuaChiTiet.class);verify(snapshots).save(captor.capture());
        when(snapshots.findById(5L)).thenReturn(Optional.of(captor.getValue()));
        q.setNoiDungCauHoi("Đã sửa");r.getChuDe().setTenChuDe("Chủ đề đã sửa");
        var saved=service.xem(5L);assertTrue(saved.coChiTiet());assertEquals("Câu gốc 中国",saved.baiLam().getDanhSachCauHoi().get(0).getNoiDungCauHoi());assertEquals("Tiếng Trung 中国",saved.tenChuDe());
    }
    @Test void missingResultReturns404() { assertEquals(404,assertThrows(ResponseStatusException.class,()->service.xem(999L)).getStatusCode().value()); }
}
