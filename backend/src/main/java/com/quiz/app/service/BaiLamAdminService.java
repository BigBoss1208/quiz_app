package com.quiz.app.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quiz.app.dto.*;
import com.quiz.app.entity.*;
import com.quiz.app.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class BaiLamAdminService {
    private final KetQuaChiTietRepository snapshots;
    private final KetQuaRepository results;
    private final NguoiDungRepository users;
    private final ObjectMapper mapper;

    // MANDATORY ensures score and snapshot either both commit or both roll back.
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
    public void luu(KetQua result, NopBaiResponseDTO review) {
        KetQuaChiTiet snapshot = new KetQuaChiTiet();
        snapshot.setKetQua(result);
        try {
            snapshot.setSnapshotJson(mapper.writeValueAsString(metadata(result, true, review)));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Không thể lưu chi tiết bài làm", e);
        }
        snapshots.save(snapshot);
    }

    @Transactional(readOnly = true)
    public BaiLamAdminDTO xem(Long id) {
        KetQua result = results.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy kết quả"));
        return snapshots.findById(id).map(snapshot -> {
            try {
                return mapper.readValue(snapshot.getSnapshotJson(), BaiLamAdminDTO.class);
            } catch (JsonProcessingException e) {
                throw new IllegalStateException("Không đọc được bản lưu bài làm", e);
            }
        }).orElseGet(() -> metadata(result, false, null));
    }

    private BaiLamAdminDTO metadata(KetQua r, boolean available, NopBaiResponseDTO review) {
        NguoiDung user = r.getUserId() == null ? null : users.findById(r.getUserId()).orElse(null);
        return new BaiLamAdminDTO(r.getId(), r.getUserId(), r.getTenNguoiChoi(),
                user == null ? null : user.getUsername(), user == null ? null : user.getHoTen(),
                r.getChuDe().getTenChuDe(), r.getThoiGianLam(), r.getDiemSo(), available, review);
    }
}
