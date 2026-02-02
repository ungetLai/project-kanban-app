import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Save, Pencil, Trash2, Clock, CheckCircle, X, History, Archive, User, Lock, Sun, Moon } from 'lucide-react';
import './App.css';
import { ALLOWED_USERS } from './AllowedUsers';

// Constants
const API_URL = '/api/tasks';
const REFRESH_INTERVAL = 30000;

// Columns
const MAIN_COLUMNS = [
  { id: 'backlog', title: 'BackLog (待討論)' },
  { id: 'todo', title: 'Todo (準備中)' },
  { id: 'ongoing', title: 'onGoing (執行階段)' },
  { id: 'review', title: 'Review (任務驗收)' },
];

const FLOATING_COLUMNS = [
  { id: 'pending', title: 'Pending (有待確認議題)', icon: Clock },
  { id: 'done', title: 'Done (結案)', icon: CheckCircle },
  { id: 'archived', title: 'Archive (歷史區)', icon: Archive },
];

const ALL_COLUMNS = [...MAIN_COLUMNS, ...FLOATING_COLUMNS];

// --- Components ---

function TaskCard({ task, onEdit, onDelete, onViewHistory }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data: { task } });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="task-card" 
      {...attributes} 
      {...listeners}
      onDoubleClick={(e) => { e.stopPropagation(); onEdit(task.id); }}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(task.id); }}
    >
      <div className="task-header">
        <div className="task-title">
          {task.projectName && <span className="project-badge">{task.projectName}</span>}
          {task.priority && <span className={`priority-badge priority-${task.priority}`}>{task.priority}</span>}
          {task.content}
        </div>
        <div className="task-actions" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          <button className="task-action-btn" onClick={() => onViewHistory(task)} title="查看歷史"><History size={14} /></button>
          <button className="task-action-btn" onClick={() => onEdit(task.id)} title="編輯"><Pencil size={14} /></button>
          <button className="task-action-btn delete" onClick={() => onDelete(task.id)} title="刪除"><Trash2 size={14} /></button>
        </div>
      </div>
      {task.desc && <div className="task-desc">{task.desc}</div>}
      {task.tags && Array.isArray(task.tags) && task.tags.length > 0 && (
        <div className="task-tags">
          {task.tags.map((tag, i) => <span key={i} className="task-tag">{tag}</span>)}
        </div>
      )}
      <div className="task-footer" style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
        {task.updatedBy && <span>By {task.updatedBy}</span>}
      </div>
    </div>
  );
}

function Column({ id, title, tasks, onAddTask, onEditTask, onDeleteTask, onViewHistory }) {
  const { setNodeRef } = useSortable({ id, data: { type: 'column', id } });
  return (
    <div className="kanban-column">
      <div className="column-header">
        <span>{title}</span>
        <span className="column-count">{tasks.length}</span>
      </div>
      <div ref={setNodeRef} className="task-list">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={onEditTask} onDelete={onDeleteTask} onViewHistory={onViewHistory} />
          ))}
        </SortableContext>
        <button className="add-task-btn" onClick={() => onAddTask(id)}><Plus size={16} /> 新增任務</button>
      </div>
    </div>
  );
}

function FloatingDropZone({ id, icon: Icon, count, onClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: `floating-${id}`, data: { status: id, type: 'floating' } });
  const style = { transform: isOver ? 'scale(1.2)' : 'scale(1)', backgroundColor: isOver ? '#ef4444' : undefined };
  return (
    <button ref={setNodeRef} className={`floating-btn floating-btn-${id === 'pending' ? 'left' : id === 'done' ? 'right' : 'archive'}`} onClick={onClick} style={style} title={`查看 ${id}`}>
      <Icon size={24} />
      {count > 0 && <span className="badge">{count}</span>}
    </button>
  );
}

function Unauthorized() {
  return (
    <div className="unauthorized-container">
      <div className="unauthorized-card">
        <div className="error-status"><Lock size={48} color="#ef4444" /><h1>401 Unauthorized</h1></div>
        <div className="recruit-banner">
          <h2>🦞 龍蝦幫招募令 🦞</h2>
          <div className="recruit-content">
            <p>看來你還沒拿到入幫許可證，或者身分驗證失敗了！</p>
            <p>我們在尋找志同道合的夥伴，一同在開發的江湖中闖蕩。</p>
            <p>如果你有熱忱、有義氣，歡迎聯絡幫主申請入幫！</p>
          </div>
          <div className="contact-info">聯絡人：<a href="https://t.me/ungetLai" target="_blank" rel="noopener noreferrer">龍蝦幫幫主</a></div>
        </div>
      </div>
    </div>
  );
}

import TaskFormModal from './components/TaskFormModal';
import './components/TaskFormModal.css';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [openModal, setOpenModal] = useState(null); 
  const [formMode, setFormMode] = useState('create'); // 'create' or 'edit'
  const [targetColumn, setTargetColumn] = useState('backlog');
  const [selectedTask, setSelectedTask] = useState(null);
  const [currentUser, setCurrentUser] = useState('');
  const [autoRefreshTime, setAutoRefreshTime] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(null);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // --- API ---
  const fetchTasks = useCallback(async (query = '?status=all') => {
    const params = new URLSearchParams(window.location.search);
    const tid = params.get('tid');
    const uname = params.get('uname');
    const connector = query.includes('?') ? '&' : '?';
    const res = await fetch(`${API_URL}${query}${connector}tid=${tid}&uname=${uname}`);
    if (res.status === 401) return { error: 'Unauthorized', status: 401 };
    const data = await res.json();
    return { data, status: res.status };
  }, []);

  const loadAllTasks = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const { data, status } = await fetchTasks('?status=all');
      if (status === 401) {
        setIsAuthorized(false);
        return;
      }
      if (Array.isArray(data)) {
        setTasks(data);
        setAutoRefreshTime(new Date());
        console.log('[Debug] Tasks Loaded:', data);
      }
    } catch (error) {
      console.error('Load Error:', error);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [fetchTasks]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tid = params.get('tid');
    const uname = params.get('uname');
    const user = ALLOWED_USERS.find(u => u.id === tid && u.username === (uname || '').trim());
    if (user) {
      setIsAuthorized(true);
      setCurrentUser(uname);
      loadAllTasks(true);
    } else {
      setIsAuthorized(false);
      setLoading(false);
    }
  }, [loadAllTasks]);

  useEffect(() => {
    if (!isAuthorized) return;
    const interval = setInterval(() => {
      if (!activeId && !openModal) loadAllTasks(false);
    }, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [activeId, openModal, isAuthorized, loadAllTasks]);

  // --- Handlers ---
  const updateTask = async (updatedTask) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    try {
      setSaving(true);
      const params = new URLSearchParams(window.location.search);
      await fetch(`${API_URL}?id=${updatedTask.id}&tid=${params.get('tid')}&uname=${params.get('uname')}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask)
      });
      setLastSaved(new Date());
    } catch (err) {
      console.error(err);
      loadAllTasks(false);
    } finally {
      setSaving(false);
    }
  };

  const handleAddTask = async (status) => {
    setTargetColumn(status);
    setFormMode('create');
    setSelectedTask(null);
    setOpenModal('form');
  };

  const onFormSubmit = async (formData) => {
    if (formMode === 'create') {
      const now = Date.now();
      const normalizedStatus = targetColumn.toLowerCase().trim();
      const newTask = {
        id: now.toString(),
        content: formData.content,
        desc: formData.desc || '',
        priority: formData.priority || '',
        projectName: formData.project || '',
        tags: formData.tags || [],
        status: normalizedStatus,
        createdAt: now,
        updatedAt: now,
        createdBy: currentUser,
        updatedBy: currentUser,
        history: [{ timestamp: now, field: 'created', oldValue: null, newValue: `建立於 ${normalizedStatus} by ${currentUser}` }]
      };
      setTasks(prev => [...prev, newTask]);
      try {
        setSaving(true);
        const params = new URLSearchParams(window.location.search);
        await fetch(`${API_URL}?tid=${params.get('tid')}&uname=${params.get('uname')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTask)
        });
        setLastSaved(new Date());
      } catch (err) {
        console.error(err);
        loadAllTasks(false);
      } finally {
        setSaving(false);
      }
    } else if (formMode === 'edit' && selectedTask) {
      const task = selectedTask;
      // Check changes
      const isChanged = formData.content !== task.content || 
                        formData.desc !== task.desc || 
                        formData.priority !== task.priority || 
                        formData.project !== (task.projectName || '') ||
                        formData.status !== task.status ||
                        JSON.stringify(formData.tags) !== JSON.stringify(task.tags || []);
      
      if (!isChanged) return;

      const history = [{ timestamp: Date.now(), field: 'edit', oldValue: 'details', newValue: 'updated', operator: currentUser }, ...(task.history || [])].slice(0, 50);
      updateTask({ 
        ...task, 
        content: formData.content, 
        desc: formData.desc, 
        priority: formData.priority, 
        projectName: formData.project,
        tags: formData.tags, 
        status: formData.status,
        updatedAt: Date.now(), 
        updatedBy: currentUser, 
        history 
      });
    }
  };

  const handleEditTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    setSelectedTask(task);
    setFormMode('edit');
    setOpenModal('form');
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('確定要刪除此任務嗎？')) return;
    setTasks(prev => prev.filter(t => t.id !== taskId));
    try {
      setSaving(true);
      const params = new URLSearchParams(window.location.search);
      await fetch(`${API_URL}?id=${taskId}&tid=${params.get('tid')}&uname=${params.get('uname')}`, { method: 'DELETE' });
      setLastSaved(new Date());
    } catch (err) {
      console.error(err);
      loadAllTasks(false);
    } finally {
      setSaving(false);
    }
  };

  // --- DND ---
  const onDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    // Haptic & Audio Feedback
    if (navigator.vibrate) navigator.vibrate(50);
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch (e) { /* ignore */ }

    let targetStatus = null;
    if (over.id.startsWith('floating-')) {
      targetStatus = (over.data.current.status || '').toLowerCase().trim();
    } else {
      const overColumn = ALL_COLUMNS.find(c => c.id === over.id);
      if (overColumn) targetStatus = overColumn.id;
      else {
        const overTask = tasks.find(t => t.id === over.id);
        if (overTask) targetStatus = (overTask.status || '').toLowerCase().trim();
      }
    }
    if (!targetStatus) return;
    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;
    if ((activeTask.status || '').toLowerCase().trim() !== targetStatus) {
      updateTask({ ...activeTask, status: targetStatus, updatedAt: Date.now(), updatedBy: currentUser });
    } else if (active.id !== over.id && !over.id.startsWith('floating-')) {
      const oldIndex = tasks.findIndex(t => t.id === active.id);
      const newIndex = tasks.findIndex(t => t.id === over.id);
      if (newIndex !== -1) setTasks((items) => arrayMove(items, oldIndex, newIndex));
    }
  };

  // --- Filter Helpers ---
  const getTasksByStatus = useCallback((statusId) => {
    const filtered = tasks.filter(t => (t.status || '').toLowerCase().trim() === statusId.toLowerCase().trim());
    return filtered;
  }, [tasks]);

  const taskCounts = useMemo(() => {
    const counts = {};
    ALL_COLUMNS.forEach(col => {
      counts[col.id] = getTasksByStatus(col.id).length;
    });
    console.log('[Debug] Task Counts:', counts);
    return counts;
  }, [getTasksByStatus]);

  if (loading) return <div className="kanban-container"><div style={{ textAlign: 'center', padding: '2rem' }}>載入中... 🦞</div></div>;
  if (isAuthorized === false) return <Unauthorized />;

  return (
    <div className="kanban-container">
      <header className="kanban-header">
        <h1>🦞 專案看板</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button className="dark-toggle" onClick={() => setDarkMode(!darkMode)} title="切換主題">
            {darkMode ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <div className="current-user" style={{ fontSize: '0.9rem', color: 'var(--accent-color)', fontWeight: 'bold' }}>👤 {currentUser}</div>
          <div className="save-indicator">
            {saving ? <span>💾...</span> : lastSaved ? <span>✅ {lastSaved.toLocaleTimeString()}</span> : null}
            {autoRefreshTime && <span title="上次自動重整">🔄 {autoRefreshTime.toLocaleTimeString()}</span>}
          </div>
        </div>
      </header>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e) => setActiveId(e.active.id)} onDragEnd={onDragEnd}>
        <div className="kanban-board">
          {MAIN_COLUMNS.map((col) => (
            <Column key={col.id} id={col.id} title={col.title} tasks={getTasksByStatus(col.id)} onAddTask={handleAddTask} onEditTask={handleEditTask} onDeleteTask={handleDeleteTask} onViewHistory={(t) => { setSelectedTask(t); setOpenModal('history'); }} />
          ))}
        </div>

        <FloatingDropZone id="pending" icon={Clock} count={taskCounts['pending']} onClick={() => setOpenModal('pending')} />
        <FloatingDropZone id="done" icon={CheckCircle} count={taskCounts['done']} onClick={() => setOpenModal('done')} />
        <FloatingDropZone id="archived" icon={Archive} count={taskCounts['archived']} onClick={() => setOpenModal('archived')} />

        <TaskFormModal 
          isOpen={openModal === 'form'} 
          onClose={() => setOpenModal(null)} 
          onSubmit={onFormSubmit}
          initialData={selectedTask}
          mode={formMode}
        />

        {openModal && openModal !== 'form' && (
          <div className="modal-overlay" onClick={() => setOpenModal(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>
                  {openModal === 'pending' && <Clock size={20} />}
                  {openModal === 'done' && <CheckCircle size={20} />}
                  {openModal === 'archived' && <Archive size={20} />}
                  {openModal === 'history' && <History size={20} />}
                  <span style={{marginLeft: 8}}>{ALL_COLUMNS.find(c => c.id === openModal)?.title || '任務歷史'}</span>
                </h2>
                <button className="modal-close" onClick={() => setOpenModal(null)}><X size={20} /></button>
              </div>
              <div className="modal-body">
                {openModal === 'history' && selectedTask ? (
                  <div className="history-timeline">
                    {(selectedTask.history || []).map((r, i) => (
                      <div key={i} className="history-item">
                        <div className="history-timestamp">{new Date(r.timestamp).toLocaleString('zh-TW')}</div>
                        <div className="history-content">
                          <div className="history-field">{r.field} {r.operator ? `by ${r.operator}` : ''}</div>
                          <div className="history-change"><span className="old-value">{r.oldValue}</span> → <span className="new-value">{r.newValue}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <SortableContext items={getTasksByStatus(openModal).map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {getTasksByStatus(openModal).map((task) => (
                      <TaskCard key={task.id} task={task} onEdit={handleEditTask} onDelete={handleDeleteTask} onViewHistory={(t) => { setSelectedTask(t); setOpenModal('history'); }} />
                    ))}
                    {openModal !== 'archived' && <button className="add-task-btn" onClick={() => handleAddTask(openModal)}><Plus size={16} /> 新增</button>}
                  </SortableContext>
                )}
              </div>
            </div>
          </div>
        )}
        <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
          {activeId && tasks.find(t => t.id === activeId) ? <div className="task-card" style={{ cursor: 'grabbing' }}><div className="task-title">{tasks.find(t => t.id === activeId).content}</div></div> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
