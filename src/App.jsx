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
import { 
  Trello, 
  Calendar, 
  Moon, 
  Sun, 
  Inbox, 
  CircleDashed, 
  Loader, 
  Eye, 
  CircleCheck, 
  Hourglass, 
  XCircle, 
  Archive, 
  Plus, 
  Pencil, 
  History, 
  Trash2, 
  X, 
  LockOpen, 
  ArrowLeft,
  CircleAlert
} from 'lucide-react';
import './App.css';
import { ALLOWED_USERS } from './AllowedUsers';
import TaskFormModal from './components/TaskFormModal';
import './components/TaskFormModal.css';

// Constants
const API_URL = '/api/tasks';
const REFRESH_INTERVAL = 30000;

// Columns
const MAIN_COLUMNS = [
  { id: 'backlog', title: 'BackLog (待討論)', icon: <Inbox size={20} color="#6B7280" /> },
  { id: 'todo', title: 'Todo (準備中)', icon: <CircleDashed size={20} color="#3B82F6" /> },
  { id: 'ongoing', title: 'onGoing (執行階段)', icon: <Loader size={20} color="#F59E0B" /> },
  { id: 'review', title: 'Review (任務驗收)', icon: <Eye size={20} color="#8B5CF6" /> },
];

const STATUS_BAR_ITEMS = [
  { id: 'done', label: 'Done 完成', icon: <CircleCheck size={18} color="var(--accent-success)" />, colorClass: 'success' },
  { id: 'pending', label: 'Pending 待處理', icon: <Hourglass size={18} color="var(--accent-warning)" />, colorClass: 'warning' },
  { id: 'failed', label: 'Failed 驗收失敗', icon: <XCircle size={18} color="var(--accent-danger)" />, colorClass: 'danger' },
  { id: 'archived', label: 'Archive 封存', icon: <Archive size={18} color="#6B7280" />, colorClass: 'tertiary' },
];

const ALL_COLUMNS = [...MAIN_COLUMNS, ...STATUS_BAR_ITEMS];

// --- Components ---

function Header({ theme, onToggleTheme, currentUser, saving, lastSaved, autoRefreshTime }) {
  return (
    <header className="header">
      <div className="header-left">
        <Trello className="logo-icon" size={32} />
        <h1 className="logo-text">專案看板</h1>
      </div>
      <div className="header-right">
        <div className="time-info">
          <Calendar size={16} />
          <span>{new Date().toLocaleTimeString('zh-TW')}</span>
        </div>
        <div className="save-indicator" style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
          {saving ? <span>💾...</span> : lastSaved ? <span>✅ {lastSaved.toLocaleTimeString()}</span> : null}
        </div>
        <button className="theme-toggle" onClick={onToggleTheme}>
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <div className="user-avatar" title={currentUser}>
          <span>{currentUser ? currentUser.charAt(0).toUpperCase() : 'U'}</span>
        </div>
      </div>
    </header>
  );
}

function StatusButton({ id, icon, label, count, colorClass, onClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: `floating-${id}`, data: { status: id, type: 'floating' } });
  const style = { 
    transform: isOver ? 'scale(1.05)' : 'scale(1)', 
    borderColor: isOver ? 'var(--accent-primary)' : 'var(--border)',
    backgroundColor: isOver ? 'var(--bg-glass)' : 'var(--bg-secondary)'
  };
  
  return (
    <button ref={setNodeRef} className="status-button" onClick={onClick} style={style}>
      {icon}
      <span className="status-label">{label}</span>
      <div className={`status-badge ${colorClass}`}>
        <span>{count}</span>
      </div>
    </button>
  );
}

function TaskCard({ task, onEdit, onDelete, onViewHistory, isOverlay = false }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: task.id, 
    data: { task },
    disabled: isOverlay
  });
  
  const style = { 
    transform: CSS.Transform.toString(transform), 
    transition, 
    opacity: isDragging ? 0.5 : 1,
    borderLeft: isOverlay ? 'none' : `4px solid var(--priority-${task.priority?.toLowerCase() || 'p3'})`
  };

  const priorityColors = {
    P0: 'var(--priority-p0)',
    P1: 'var(--priority-p1)',
    P2: 'var(--priority-p2)',
    P3: 'var(--priority-p3)',
  };

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
      <div className="card-header">
        <div 
          className="priority-badge" 
          style={{ backgroundColor: priorityColors[task.priority] || 'var(--text-tertiary)' }}
        >
          <CircleAlert size={12} color="#FFFFFF" />
          <span>{task.priority || 'P3'}</span>
        </div>
        {task.projectName && (
          <div className="project-tag">
            <span>{task.projectName}</span>
          </div>
        )}
      </div>
      <h3 className="card-title">{task.content}</h3>
      {task.desc && <p className="card-desc">{task.desc}</p>}
      <div className="card-footer">
        <div className="tags-container">
          {(task.tags || []).map((tag, index) => (
            <div key={index} className="tag" style={{ backgroundColor: index === 0 ? 'var(--accent-primary)' : '#6B7280' }}>
              <span>{tag}</span>
            </div>
          ))}
        </div>
        <div className="action-buttons" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          <button className="icon-btn" onClick={() => onViewHistory(task)} title="查看歷史"><History size={14} /></button>
          <button className="icon-btn" onClick={() => onEdit(task.id)} title="編輯"><Pencil size={14} /></button>
          <button className="icon-btn delete" onClick={() => onDelete(task.id)} title="封存"><Trash2 size={14} /></button>
        </div>
      </div>
    </div>
  );
}

function Column({ id, title, icon, tasks, onAddTask, onEditTask, onDeleteTask, onViewHistory }) {
  const { setNodeRef } = useSortable({ id, data: { type: 'column', id } });
  return (
    <div className="kanban-column">
      <div className="column-header">
        <div className="header-left-group">
          <div className="column-icon-wrapper">
            {icon}
            <h2 className="column-title">{title}</h2>
          </div>
          <div className="column-count">
            <span>{tasks.length}</span>
          </div>
        </div>
        {['backlog', 'todo'].includes(id) && (
          <button className="add-button" onClick={() => onAddTask(id)}>
            <Plus size={16} />
          </button>
        )}
      </div>
      <div ref={setNodeRef} className="task-list">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={onEditTask} onDelete={onDeleteTask} onViewHistory={onViewHistory} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

function Unauthorized() {
  return (
    <div className="unauthorized-container">
      <div className="unauthorized-card">
        <LockOpen size={64} className="error-icon" />
        <h1 className="error-title">401 Unauthorized</h1>
        <div className="divider"></div>
        <div className="recruit-header">
          <span className="lobster">🦞</span>
          <h2 className="recruit-title">龍蝦幫招募令</h2>
          <span className="lobster">🦞</span>
        </div>
        <div className="desc-container">
          <p className="desc-text">看來你還沒拿到入幫許可證，或者身分驗證失敗了！</p>
          <p className="desc-text">我們在尋找志同道合的夥伴，一同在開發的江湖中闖蕩。</p>
          <p className="desc-text">如果你有熱忱、有義氣，歡迎聯絡幫主申請入幫！</p>
        </div>
        <div className="divider"></div>
        <div className="contact-info">
          <span className="contact-label">聯絡人：</span>
          <span className="contact-name">龍蝦幫幫主</span>
        </div>
        <button className="back-button" onClick={() => window.location.href = 'https://t.me/ungetLai'}>
          <ArrowLeft size={18} />
          <span>前往聯絡幫主</span>
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [openModal, setOpenModal] = useState(null); 
  const [formMode, setFormMode] = useState('create'); 
  const [targetColumn, setTargetColumn] = useState('backlog');
  const [selectedTask, setSelectedTask] = useState(null);
  const [currentUser, setCurrentUser] = useState('');
  const [autoRefreshTime, setAutoRefreshTime] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(null);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [theme]);

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

  const handleAddTask = (status) => {
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
        history: [{ 
          timestamp: now, 
          type: 'created', 
          field: 'created', 
          operator: currentUser,
          oldValue: null, 
          newValue: `建立於 ${normalizedStatus}`,
          snapshot: {
            content: formData.content,
            desc: formData.desc,
            priority: formData.priority,
            projectName: formData.project
          }
        }]
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
      const isChanged = formData.content !== task.content || 
                        formData.desc !== task.desc || 
                        formData.priority !== task.priority || 
                        formData.project !== (task.projectName || '') ||
                        formData.status !== task.status ||
                        JSON.stringify(formData.tags) !== JSON.stringify(task.tags || []);
      
      if (!isChanged) return;
      const newHistory = [];
      const now = Date.now();
      if (formData.status !== task.status) {
         newHistory.push({
            timestamp: now, type: 'modify', field: 'status', operator: currentUser,
            oldValue: task.status, newValue: formData.status, snapshot: { ...formData, projectName: formData.project }
         });
      }
      if (formData.content !== task.content || formData.desc !== task.desc || formData.priority !== task.priority || formData.project !== (task.projectName || '') || JSON.stringify(formData.tags) !== JSON.stringify(task.tags || [])) {
         if (newHistory.length === 0 || (formData.content !== task.content || formData.desc !== task.desc)) {
            newHistory.push({
                timestamp: now, type: 'modify', field: 'details', operator: currentUser,
                oldValue: 'details', newValue: 'updated', snapshot: { ...formData, projectName: formData.project }
            });
         }
      }
      const history = [...newHistory, ...(task.history || [])].slice(0, 50);
      updateTask({ 
        ...task, ...formData, projectName: formData.project, updatedAt: now, updatedBy: currentUser, history 
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
    if (!confirm('確定要封存此任務嗎？')) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const now = Date.now();
    const historyRecord = {
      timestamp: now, type: 'modify', field: 'status', operator: currentUser,
      oldValue: task.status, newValue: 'archived', snapshot: { ...task }
    };
    const newHistory = [historyRecord, ...(task.history || [])].slice(0, 50);
    const updatedTask = { ...task, status: 'archived', updatedAt: now, updatedBy: currentUser, history: newHistory };
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
    try {
      setSaving(true);
      const params = new URLSearchParams(window.location.search);
      await fetch(`${API_URL}?id=${taskId}&tid=${params.get('tid')}&uname=${params.get('uname')}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedTask)
      });
      setLastSaved(new Date());
    } catch (err) {
      console.error(err);
      loadAllTasks(false);
    } finally {
      setSaving(false);
    }
  };

  const onDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    let targetStatus = null;
    if (over.id.startsWith('floating-')) {
      targetStatus = (over.data.current.status || '').toLowerCase().trim();
    } else {
      const overColumn = MAIN_COLUMNS.find(c => c.id === over.id);
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
      const oldStatus = (activeTask.status || '').toLowerCase().trim();
      const historyRecord = {
        timestamp: Date.now(), type: 'modify', field: 'status', operator: currentUser,
        oldValue: oldStatus, newValue: targetStatus, snapshot: { ...activeTask }
      };
      const newHistory = [historyRecord, ...(activeTask.history || [])].slice(0, 50);
      updateTask({ ...activeTask, status: targetStatus, updatedAt: Date.now(), updatedBy: currentUser, history: newHistory });
    } else if (active.id !== over.id && !over.id.startsWith('floating-')) {
      const oldIndex = tasks.findIndex(t => t.id === active.id);
      const newIndex = tasks.findIndex(t => t.id === over.id);
      if (newIndex !== -1) setTasks((items) => arrayMove(items, oldIndex, newIndex));
    }
  };

  const getTasksByStatus = useCallback((statusId) => {
    return tasks.filter(t => (t.status || '').toLowerCase().trim() === statusId.toLowerCase().trim());
  }, [tasks]);

  const taskCounts = useMemo(() => {
    const counts = {};
    ALL_COLUMNS.forEach(col => { counts[col.id] = getTasksByStatus(col.id).length; });
    return counts;
  }, [getTasksByStatus]);

  if (loading) return <div className="kanban-container"><div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-primary)' }}>載入中... 🦞</div></div>;
  if (isAuthorized === false) return <Unauthorized />;

  return (
    <div className="kanban-container">
      <Header theme={theme} onToggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')} currentUser={currentUser} saving={saving} lastSaved={lastSaved} autoRefreshTime={autoRefreshTime} />

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e) => setActiveId(e.active.id)} onDragEnd={onDragEnd}>
        <div className="status-bar">
          {STATUS_BAR_ITEMS.map(item => (
            <StatusButton key={item.id} id={item.id} icon={item.icon} label={item.label} count={taskCounts[item.id]} colorClass={item.colorClass} onClick={() => setOpenModal(item.id)} />
          ))}
        </div>

        <main className="board-container">
          {MAIN_COLUMNS.map((col) => (
            <Column key={col.id} id={col.id} title={col.title} icon={col.icon} tasks={getTasksByStatus(col.id)} onAddTask={handleAddTask} onEditTask={handleEditTask} onDeleteTask={handleDeleteTask} onViewHistory={(t) => { setSelectedTask(t); setOpenModal('history'); }} />
          ))}
        </main>

        <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
          {activeId && tasks.find(t => t.id === activeId) ? (
             <TaskCard task={tasks.find(t => t.id === activeId)} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskFormModal isOpen={openModal === 'form'} onClose={() => setOpenModal(null)} onSubmit={onFormSubmit} initialData={selectedTask} mode={formMode} />

      {openModal && !['form', 'history'].includes(openModal) && (
        <div className="modal-overlay" onClick={() => setOpenModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                {STATUS_BAR_ITEMS.find(i => i.id === openModal)?.icon}
                <h2 className="column-title" style={{fontSize: '22px'}}>{STATUS_BAR_ITEMS.find(i => i.id === openModal)?.label}</h2>
                <div className="modal-count-badge">{taskCounts[openModal]} 個任務</div>
              </div>
              <button className="modal-close" onClick={() => setOpenModal(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <SortableContext items={getTasksByStatus(openModal).map(t => t.id)} strategy={verticalListSortingStrategy}>
                {getTasksByStatus(openModal).map((task) => (
                  <TaskCard key={task.id} task={task} onEdit={handleEditTask} onDelete={handleDeleteTask} onViewHistory={(t) => { setSelectedTask(t); setOpenModal('history'); }} />
                ))}
              </SortableContext>
            </div>
          </div>
        </div>
      )}

      {openModal === 'history' && selectedTask && (
        <div className="modal-overlay" onClick={() => setOpenModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <History size={24} color="var(--accent-primary)" />
                <h2 className="column-title" style={{fontSize: '22px'}}>任務歷史回溯</h2>
              </div>
              <button className="modal-close" onClick={() => setOpenModal(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
               <div className="history-timeline">
                {(selectedTask.history || []).map((r, i) => (
                  <div key={i} className="history-item">
                    <div className="history-timestamp">{new Date(r.timestamp).toLocaleString('zh-TW')}</div>
                    <div className="history-content">
                      <div className="history-field">{r.field} {r.operator ? `by ${r.operator}` : ''}</div>
                      <div className="history-change">
                        {r.oldValue && <><span className="old-value">{r.oldValue}</span> <ArrowLeft size={14} style={{transform: 'rotate(180deg)'}} /></>}
                        <span className="new-value">{r.newValue}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
