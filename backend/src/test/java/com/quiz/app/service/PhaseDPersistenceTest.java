package com.quiz.app.service;

import com.quiz.app.entity.*;
import com.quiz.app.repository.*;
import com.quiz.app.controller.QuestionImportController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import jakarta.persistence.EntityManager;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest(properties={"spring.jpa.hibernate.ddl-auto=create-drop","spring.jpa.show-sql=false","logging.level.root=WARN"})
@Import({CauHoiService.class,QuestionImportController.class,QuestionImportService.class,ExcelCauHoiService.class,NhomMonService.class,ChuDeService.class})
class PhaseDPersistenceTest {
    @Autowired CauHoiService questions;
    @Autowired CauHoiRepository repository;
    @Autowired ChuDeRepository topics;
    @Autowired NhomMonRepository groups;
    @Autowired NhomMonService groupService;
    @Autowired QuestionImportController imports;
    @Autowired EntityManager em;
    ChuDe topic() {
        NhomMon group=new NhomMon();group.setTen("Nhóm "+UUID.randomUUID());group=groups.save(group);
        ChuDe topic=new ChuDe();topic.setTenChuDe("Unicode 中国");topic.setNhomMon(group);topic.setDanhMuc(group.getTen());return topics.save(topic);
    }
    CauHoi question(Long topicId,CauHoi.LoaiCauHoi type) {
        CauHoi q=new CauHoi();ChuDe topic=new ChuDe();topic.setId(topicId);q.setChuDe(topic);q.setLoaiCauHoi(type);q.setNoiDungCauHoi("中国 nghĩa là gì?");q.setGiaiThich("Giải thích tiếng Việt");
        List<DapAn> answers=new ArrayList<>();for(int i=0;i<(type==CauHoi.LoaiCauHoi.TRAC_NGHIEM?4:2);i++)answers.add(new DapAn(null,"Đáp án 中国 "+i,type==CauHoi.LoaiCauHoi.DIEN_TU||i==0,i,null));q.setDanhSachDapAn(answers);return q;
    }
    @Test void updateTypeReplacesOrphansAndDeleteCascades() {
        ChuDe topic=topic();CauHoi q=questions.them(question(topic.getId(),CauHoi.LoaiCauHoi.TRAC_NGHIEM));Long id=q.getId();em.flush();em.clear();
        questions.capNhat(id,question(topic.getId(),CauHoi.LoaiCauHoi.DIEN_TU));em.flush();em.clear();
        CauHoi updated=questions.layTheoId(id);assertEquals(CauHoi.LoaiCauHoi.DIEN_TU,updated.getLoaiCauHoi());assertEquals(2,updated.getDanhSachDapAn().size());
        assertEquals(2L,em.createQuery("select count(a) from DapAn a",Long.class).getSingleResult());
        questions.xoa(id);em.flush();assertEquals(0L,em.createQuery("select count(a) from DapAn a",Long.class).getSingleResult());
    }
    @Test void renameGroupPersistsLegacyCategoryAndHidingKeepsTopicRelation() {
        ChuDe topic=topic();Long groupId=topic.getNhomMon().getId();NhomMon update=new NhomMon();update.setTen("Xã hội "+UUID.randomUUID().toString().substring(0,6));update.setHienThi(false);update.setThuTu(5);
        groupService.save(groupId,update);em.flush();em.clear();assertEquals(update.getTen(),topics.findById(topic.getId()).orElseThrow().getDanhMuc());assertTrue(groupService.list(false).stream().noneMatch(g->g.getId().equals(groupId)));
    }
    @Test @Transactional(propagation=Propagation.NOT_SUPPORTED)
    void confirmIsAtomicWhenLaterTopicDoesNotExist() {
        ChuDe topic=topic();Long groupId=topic.getNhomMon().getId();long before=repository.count();
        assertThrows(RuntimeException.class,()->imports.confirm(List.of(question(topic.getId(),CauHoi.LoaiCauHoi.DIEN_TU),question(Long.MAX_VALUE,CauHoi.LoaiCauHoi.SAP_XEP))));
        assertEquals(before,repository.count());
        assertThrows(ResponseStatusException.class,()->imports.confirm(List.of(question(topic.getId(),CauHoi.LoaiCauHoi.DIEN_TU),new CauHoi())));
        assertEquals(before,repository.count());topics.deleteById(topic.getId());groups.deleteById(groupId);
    }
}
