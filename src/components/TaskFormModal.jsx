import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

export default function TaskFormModal({ isOpen, onClose, onSubmit, initialData, mode }) {
  const [formData, setFormData] = useState({
    content: '',
    desc: '',
    priority: '',
    project: '',
    tags: '',
    status: ''
  });

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        content: initialData.content || '',
        desc: initialData.desc || '',
        priority: initialData.priority || '',
        project: initialData.projectName || initialData.project || '',
        tags: Array.isArray(initialData.tags) ? initialData.tags.join(', ') : '',
        status: initialData.status || 'backlog'
      });
    } else if (isOpen) {
      setFormData({
        content: '',
        desc: '',
        priority: '',
        project: '',
        tags: '',
        status: ''
      });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.content.trim()) {
      alert('任務標題為必填項目');
      return;
    }
    
    // Process tags
    const processedTags = formData.tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    onSubmit({
      ...formData,
      tags: processedTags
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content task-form-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{mode === 'create' ? '新增任務' : '編輯任務'}</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="task-form">
          <div className="form-group">
            <label htmlFor="content">任務標題 <span className="required">*</span></label>
            <input
              type="text"
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="例如：實作登入功能"
              autoFocus
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="priority">優先級</label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="form-select"
            >
              <option value="">無</option>
              <option value="P0">P0 (最高 - Critical)</option>
              <option value="P1">P1 (高 - High)</option>
              <option value="P2">P2 (中 - Medium)</option>
              <option value="P3">P3 (低 - Low)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="project">專案名稱</label>
            <input
              type="text"
              id="project"
              name="project"
              value={formData.project}
              onChange={handleChange}
              placeholder="例如：Kanban App"
              className="form-input"
            />
          </div>

          {mode === 'edit' && (
            <div className="form-group">
              <label htmlFor="status">狀態 (Status)</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="form-select"
              >
                <option value="backlog">BackLog (待討論)</option>
                <option value="todo">Todo (準備中)</option>
                <option value="ongoing">OnGoing (執行階段)</option>
                <option value="review">Review (任務驗收)</option>
                <option value="pending">Pending (有待確認)</option>
                <option value="done">Done (結案)</option>
                <option value="archived">Archive (歷史區)</option>
              </select>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="tags">標籤 (以逗號分隔)</label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="例如：Frontend, Bug, v1.0"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="desc">任務描述</label>
            <textarea
              id="desc"
              name="desc"
              value={formData.desc}
              onChange={handleChange}
              placeholder="詳細說明任務內容..."
              rows={5}
              className="form-textarea"
            />
          </div>

          {mode === 'edit' && initialData?.history && initialData.history.length > 0 && (
            <div className="history-section">
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>操作歷史</h3>
              <div className="history-timeline">
                {initialData.history.sort((a, b) => b.timestamp - a.timestamp).map((record, index) => (
                  <div key={index} className="history-item">
                    {record.snapshot ? (
                      <div className="history-rich-content">
                        <div className="history-header">
                          <span className="history-time">
                            {new Date(record.timestamp).toLocaleString('zh-TW', { hour12: false })}
                          </span>
                          <span className="history-type">
                            ({record.type || 'modify'})
                          </span>
                          <span className="history-user">
                            {record.operator || record.updatedBy || 'Unknown'}
                          </span>
                          {record.field === 'status' ? (
                            <>
                              <span className="arrow">→</span>
                              <span className="old-status">{record.oldValue || 'backlog'}</span>
                              <span className="arrow">→</span>
                              <span className="new-status">{record.newValue}</span>
                            </>
                          ) : (
                            <>
                              <span className="arrow">→</span>
                              <span>{record.newValue}</span>
                            </>
                          )}
                        </div>
                        <div className="history-snapshot">
                          <div className="snapshot-row"><strong>任務主題 :</strong> {record.snapshot.content}</div>
                          <div className="snapshot-row"><strong>任務內容 :</strong> {record.snapshot.desc || '(無)'}</div>
                          <div className="snapshot-row"><strong>優先級 :</strong> {record.snapshot.priority || '(無)'}</div>
                          <div className="snapshot-row"><strong>專案名稱 :</strong> {record.snapshot.projectName || '(無)'}</div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="history-timestamp">
                          {new Date(record.timestamp).toLocaleString('zh-TW', { hour12: false })}
                        </div>
                        <div className="history-content">
                          <div className="history-field">{record.field}</div>
                          <div className="history-change">
                            {record.oldValue && (
                              <>
                                <span className="old-value">{String(record.oldValue)}</span>
                                <span className="arrow">→</span>
                              </>
                            )}
                            <span className="new-value">{String(record.newValue)}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>取消</button>
            <button type="submit" className="btn-primary">
              <Save size={16} /> {mode === 'create' ? '建立' : '儲存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
