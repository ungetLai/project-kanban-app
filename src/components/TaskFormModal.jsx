import React, { useState, useEffect } from 'react';
import { X, Save, Clock, Tag, Briefcase, AlertCircle, AlignLeft, Layers } from 'lucide-react';

export default function TaskFormModal({ isOpen, onClose, onSubmit, initialData, mode }) {
  const [formData, setFormData] = useState({
    content: '',
    desc: '',
    priority: 'P3',
    project: '',
    tags: '',
    status: 'backlog'
  });

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        content: initialData.content || '',
        desc: initialData.desc || '',
        priority: initialData.priority || 'P3',
        project: initialData.projectName || initialData.project || '',
        tags: Array.isArray(initialData.tags) ? initialData.tags.join(', ') : '',
        status: initialData.status || 'backlog'
      });
    } else if (isOpen) {
      setFormData({
        content: '',
        desc: '',
        priority: 'P3',
        project: '',
        tags: '',
        status: 'backlog'
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
      alert('Task title is required');
      return;
    }

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
          <div className="modal-header-left">
            <h2 className="modal-title">{mode === 'create' ? 'Create New Task' : 'Edit Task Details'}</h2>
            <span className="modal-subtitle">
              {mode === 'create' ? 'Add a new card to your board' : `Task ID: ${initialData?.id || 'Unknown'}`}
            </span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="task-form">
          <div className="form-grid">
            {/* Full Width Title */}
            <div className="form-group full-width">
              <label htmlFor="content">Task Title <span className="required">*</span></label>
              <input
                type="text"
                id="content"
                name="content"
                value={formData.content}
                onChange={handleChange}
                placeholder="What needs to be done?"
                autoFocus
                className="form-input title-input"
              />
            </div>

            {/* Left Column - Priority & Project */}
            <div className="form-group">
              <label htmlFor="priority"><AlertCircle size={14} /> Priority</label>
              <div className="select-wrapper">
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="P0">P0 - Critical</option>
                  <option value="P1">P1 - High</option>
                  <option value="P2">P2 - Medium</option>
                  <option value="P3">P3 - Low</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="project"><Briefcase size={14} /> Project</label>
              <input
                type="text"
                id="project"
                name="project"
                value={formData.project}
                onChange={handleChange}
                placeholder="Project Name"
                className="form-input"
              />
            </div>

            {/* Right Column - Status & Tags */}
            <div className="form-group">
              <label htmlFor="status"><Layers size={14} /> Status</label>
              <div className="select-wrapper">
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="form-select"
                  disabled={mode === 'create'} // Optional: lock status on create if desired, or keep editable
                >
                  <option value="backlog">Backlog</option>
                  <option value="todo">Todo</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="review">Review</option>
                  <option value="pending">Pending</option>
                  <option value="done">Done</option>
                  <option value="failed">Failed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="tags"><Tag size={14} /> Tags</label>
              <input
                type="text"
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="e.g. Frontend, Bug"
                className="form-input"
              />
            </div>

            {/* Full Width Description */}
            <div className="form-group full-width">
              <label htmlFor="desc"><AlignLeft size={14} /> Description</label>
              <textarea
                id="desc"
                name="desc"
                value={formData.desc}
                onChange={handleChange}
                placeholder="Add detailed description..."
                rows={6}
                className="form-textarea"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <Save size={16} />
              {mode === 'create' ? 'Create Task' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
