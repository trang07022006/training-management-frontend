import React, { useState } from 'react';

export interface Subject {
  id: string;
  name: string;
  prerequisiteId?: string;
}

export interface ProgramSubject {
  subjectId: string;
  order: number;
}

export const ProgramManagement = () => {
  // 1. Kho môn học của hệ thống
  const [allSubjects, setAllSubjects] = useState<Subject[]>([
    { id: '1', name: 'Lập trình C cơ bản' },
    { id: '2', name: 'Cấu trúc dữ liệu & Giải thuật', prerequisiteId: '1' },
    { id: '3', name: 'Lập trình Web với React', prerequisiteId: '2' },
  ]);

  // 2. Danh sách môn học ĐÃ GẮN vào chương trình đào tạo
  const [programSubjects, setProgramSubjects] = useState<ProgramSubject[]>([
    { subjectId: '1', order: 1 },
    { subjectId: '2', order: 2 },
  ]);

  // States hỗ trợ form
  const [newSubjectName, setNewSubjectName] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedPrereqId, setSelectedPrereqId] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // --- THAO TÁC 1: KHAI BÁO & QUẢN LÝ MÔN HỌC ---
  const handleCreateSubject = () => {
    if (!newSubjectName.trim()) return;
    const newSub: Subject = {
      id: Date.now().toString(),
      name: newSubjectName,
      prerequisiteId: selectedPrereqId || undefined,
    };
    setAllSubjects([...allSubjects, newSub]);
    setNewSubjectName('');
    setSelectedPrereqId('');
  };

  // --- THAO TÁC 2: GẮN MÔN VÀO CHƯƠNG TRÌNH ---
  const handleAddSubjectToProgram = () => {
    if (!selectedSubjectId) return;
    const isExist = programSubjects.some((ps) => ps.subjectId === selectedSubjectId);
    if (isExist) {
      alert('Môn học này đã có trong chương trình đào tạo!');
      return;
    }
    const newProgramSub: ProgramSubject = {
      subjectId: selectedSubjectId,
      order: programSubjects.length + 1,
    };
    setProgramSubjects([...programSubjects, newProgramSub]);
    setSelectedSubjectId('');
  };

  // --- THAO TÁC 3: GỠ MÔN KHỎI CHƯƠNG TRÌNH ---
  const handleRemoveFromProgram = (subjectId: string) => {
    const filtered = programSubjects.filter((ps) => ps.subjectId !== subjectId);
    const reordered = filtered.map((item, index) => ({
      ...item,
      order: index + 1,
    }));
    setProgramSubjects(reordered);
  };

  // --- THAO TÁC 4: KÉO THẢ ĐỔI THỨ TỰ (DRAG & DROP) ---
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
  };

  const handleDrop = (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const updated = [...programSubjects];
    const [draggedItem] = updated.splice(draggedIndex, 1);
    updated.splice(dropIndex, 0, draggedItem);

    const reordered = updated.map((item, idx) => ({ ...item, order: idx + 1 }));
setProgramSubjects(reordered);
    setDraggedIndex(null);
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'Arial, sans-serif', maxWidth: '850px', margin: '0 auto' }}>
      <h2>Quản lý chương trình đào tạo</h2>

      {/* KHU VỰC 1: KHAI BÁO MÔN HỌC & MÔN TIÊN QUYẾT */}
      <div style={{ backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #e9ecef' }}>
        <h4 style={{ marginTop: 0 }}>1. Khai báo môn học mới & Môn tiên quyết</h4>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Tên môn học mới"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            style={{ padding: '8px', flex: 1, borderRadius: '4px', border: '1px solid #ccc' }}
          />

          <select
            value={selectedPrereqId}
            onChange={(e) => setSelectedPrereqId(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="">-- Môn tiên quyết (Nếu có) --</option>
            {allSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleCreateSubject}
            style={{ padding: '8px 16px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Khai báo môn
          </button>
        </div>
      </div>

      {/* KHU VỰC 2: GẮN MÔN VÀO CHƯƠNG TRÌNH */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <select
          value={selectedSubjectId}
          onChange={(e) => setSelectedSubjectId(e.target.value)}
          style={{ padding: '8px', flex: 1, borderRadius: '4px', border: '1px solid #ccc' }}
        >
          <option value="">-- Chọn môn để gắn vào chương trình --</option>
          {allSubjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleAddSubjectToProgram}
          style={{ padding: '8px 16px', backgroundColor: '#0052CC', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Gắn vào chương trình
        </button>
      </div>

      {/* KHU VỰC 3: BẢNG DANH SÁCH MÔN (HỖ TRỢ KÉO THẢ & GỠ MÔN) */}
      <h4>2. Lộ trình môn học (Kéo thả để sắp xếp thứ tự)</h4>
      <table border={1} cellPadding={10} style={{ width: '100%', borderCollapse: 'collapse', borderColor: '#de350b22' }}>
        <thead>
          <tr style={{ backgroundColor: '#f4f5f7' }}>
            <th style={{ width: '40px' }}>Kéo</th>
<th style={{ width: '60px' }}>STT</th>
            <th>Tên môn học</th>
            <th>Môn tiên quyết</th>
            <th style={{ width: '120px' }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {programSubjects.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', color: '#888' }}>
                Chưa có môn học nào được gắn vào chương trình.
              </td>
            </tr>
          ) : (
            programSubjects.map((item, index) => {
              const subjectDetail = allSubjects.find((s) => s.id === item.subjectId);
              const prereqDetail = allSubjects.find((s) => s.id === subjectDetail?.prerequisiteId);

              return (
                <tr
                  key={item.subjectId}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(index)}
                  style={{
                    cursor: 'grab',
                    backgroundColor: draggedIndex === index ? '#e6f7ff' : '#fff',
                  }}
                >
                  <td style={{ textAlign: 'center', color: '#888' }}>☰</td>
                  <td style={{ textAlign: 'center' }}><strong>{item.order}</strong></td>
                  <td><strong>{subjectDetail?.name}</strong></td>
                  <td>{prereqDetail ? <span style={{ color: '#0052cc' }}>{prereqDetail.name}</span> : <em>Không</em>}</td>
                  <td style={{ textAlign: 'center' }}>
                    {/* NÚT GỠ MÔN KHỎI CHƯƠNG TRÌNH */}
                    <button
                      onClick={() => handleRemoveFromProgram(item.subjectId)}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#ff4d4f',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                      }}
                    >
                      Gỡ môn
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ProgramManagement;