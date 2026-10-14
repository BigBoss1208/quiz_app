package com.quiz.app.service;

import com.quiz.app.entity.*;
import com.quiz.app.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@Service @RequiredArgsConstructor
public class NhomMonService {
    private final NhomMonRepository groups;
    private final ChuDeRepository topics;
    public List<NhomMon> list(boolean admin) {
        return groups.findAllByOrderByThuTuAscIdAsc().stream().filter(g -> admin || g.isHienThi()).toList();
    }
    @Transactional
    public NhomMon save(Long id, NhomMon input) {
        String name = input.getTen() == null ? "" : input.getTen().trim();
        if (name.isEmpty() || name.length() > 50 || name.equalsIgnoreCase("Tất cả") || input.getThuTu() < 0)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên nhóm/thứ tự không hợp lệ; Tất cả là bộ lọc");
        groups.findByTenIgnoreCase(name).ifPresent(existing -> {
            if (!Objects.equals(existing.getId(), id)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Tên nhóm đã tồn tại");
        });
        NhomMon group = id == null ? new NhomMon() : groups.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        group.setTen(name); group.setHienThi(input.isHienThi()); group.setThuTu(input.getThuTu());
        groups.save(group);
        // Keep the legacy category field synchronized for existing clients.
        for (ChuDe topic : topics.findAll()) {
            if (topic.getNhomMon() != null && Objects.equals(topic.getNhomMon().getId(), id)) topic.setDanhMuc(name);
        }
        return group;
    }
    @Transactional
    public void delete(Long id) {
        if (topics.findAll().stream().anyMatch(t -> t.getNhomMon() != null && Objects.equals(t.getNhomMon().getId(), id)))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Nhóm đang có chủ đề; hãy chuyển chủ đề trước");
        groups.delete(groups.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND)));
    }
    public void link(ChuDe topic) {
        NhomMon group;
        if (topic.getNhomMon() != null && topic.getNhomMon().getId() != null)
            group = groups.findById(topic.getNhomMon().getId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nhóm không tồn tại"));
        else group = groups.findByTenIgnoreCase(topic.getDanhMuc() == null ? "" : topic.getDanhMuc().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chọn nhóm môn hợp lệ"));
        topic.setNhomMon(group); topic.setDanhMuc(group.getTen());
    }
}
