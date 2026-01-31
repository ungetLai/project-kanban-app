import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
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
import { Plus, Save, Pencil, Trash2, Clock, CheckCircle, X, History, Archive, User, Lock } from 'lucide-react';
import './App.css';
import { ALLOWED_USERS } from './AllowedUsers';

// Constants
const API_URL = '/api/tasks';
const REFRESH_INTERVAL = 30000; // 30 seconds

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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="task-card" {...attributes} {...listeners}>
      <div className="task-header">
        <div className="task-title">{task.content}</div>
        <div className="task-actions" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          <button className="task-action-btn" onClick={() => onViewHistory(task)} title="查看歷史">
            <History size={14} />
          </button>
          <button className="task-action-btn" onClick={() => onEdit(task.id)} title="編輯">
            <Pencil size={14} />
          </button>
          <button className="task-action-btn delete" onClick={() => onDelete(task.id)} title="刪除">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {task.desc && <div className="task-desc">{task.desc}</div>}
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
            <TaskCard 
              key={task.id} 
              task={task} 
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onViewHistory={onViewHistory}
            />
          ))}
        </SortableContext>
        <button className="add-task-btn" onClick={() => onAddTask(id)}>
          <Plus size={16} /> 新增任務
        </button>
      </div>
    </div>
  );
}

function FloatingDropZone({ id, icon: Icon, count, onClick, activeId }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `floating-${id}`,
    data: { status: id, type: 'floating' },
  });

  const style = {
    transform: isOver ? 'scale(1.2)' : 'scale(1)',
    backgroundColor: isOver ? '#ef4444' : undefined, // Highlight on hover
  };

  return (
    <button 
      ref={setNodeRef}
      className={`floating-btn floating-btn-${id === 'pending' ? 'left' : id === 'done' ? 'right' : 'archive'}`}
      onClick={onClick}
      style={style}
      title={`查看 ${id}`}
    >
      <Icon size={24} />
      {count > 0 && <span className="badge">{count}</span>}
    </button>
  );
}

function Unauthorized() {
  return (
    <div className="unauthorized-container">
      <div className="unauthorized-card">
        <div className="error-status">
          <Lock size={48} color="#ef4444" />
          <h1>401 Unauthorized</h1>
        </div>
        <div className="recruit-banner">
          <h2>🦞 龍蝦幫招募令 🦞</h2>
          <div className="recruit-content">
            <p>看來你還沒拿到入幫許可證，或者身分驗證失敗了！</p>
            <p>我們在尋找志同道合的夥伴，一同在開發的江湖中闖蕩。</p>
            <p>如果你有熱忱、有義氣，歡迎聯絡幫主申請入幫！</p>
          </div>
          <div className="contact-info">
            聯絡人：<a href="https://t.me/ungetLai" target="_blank" rel="noopener noreferrer">龍蝦幫幫主</a>
          </div>
        </div>
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
  const [selectedTask, setSelectedTask] = useState(null);
  const [currentUser, setCurrentUser] = useState('');
  const [autoRefreshTime, setAutoRefreshTime] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // --- Identity & Loading ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tid = params.get('tid');
    const uname = params.get('uname');

    const user = ALLOWED_USERS.find(u => u.id === tid && u.username === uname);
    if (user) {
      setIsAuthorized(true);
      setCurrentUser(uname || 'Unknown');
      loadAllTasks(tid, uname);
    } else {
      setIsAuthorized(false);
      setLoading(false);
    }
  }, []);

  const fetchTasks = async (query = '?status=all') => {
    const params = new URLSearchParams(window.location.search);
    const tid = params.get('tid');
    const uname = params.get('uname');
    
    const connector = query.includes('?') ? '&' : '?';
    const res = await fetch(`${API_URL}${query}${connector}tid=${tid}&uname=${uname}`);
    return res.json();
  };

  const loadAllTasks = async (tid, uname) => {
    try {
      setLoading(true);
      const data = await fetchTasks('?status=all');
      
      // Auto Archive Check
      const now = Date.now();
      const TWELVE_HOURS = 12 * 60 * 60 * 1000;
      let updates = [];

      if (Array.isArray(data)) {
        data.forEach(task => {
          if (task.status === 'done' && task.updatedAt && (now - task.updatedAt > TWELVE_HOURS)) {
             updates.push({ ...task, status: 'archived', archivedAt: now, updatedBy: 'System' });
          }
        });

        if (updates.length > 0) {
          await Promise.all(updates.map(t => 
               fetch(`${API_URL}?id=${t.id}&tid=${tid}&uname=${uname}`, { 
                   method: 'PUT', 
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify(t) 
               })
          ));
          const newData = await fetchTasks('?status=all');
          setTasks(newData);
        } else {
          setTasks(data);
        }
      }
      setAutoRefreshTime(new Date());
    } catch (error) {
      console.error('Load Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- Effects ---
  // Auto Refresh
  useEffect(() => {
    if (!isAuthorized) return;
    
    const interval = setInterval(() => {
      if (!activeId && !openModal) { // Don't refresh if dragging or modal open
        const params = new URLSearchParams(window.location.search);
        loadAllTasks(params.get('tid'), params.get('uname'));
      }
    }, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [activeId, openModal, isAuthorized]);


  // --- Handlers ---
  
  const handleAddTask = async (status) => {
    const content = prompt('請輸入任務標題：');
    if (!content) return;
    const desc = prompt('請輸入任務描述（選填）：');
    
    const now = Date.now();
    const newTask = {
      id: now.toString(),
      content,
      desc: desc || '',
      status,
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser,
      updatedBy: currentUser,
      history: [{
        timestamp: now,
        field: 'created',
        oldValue: null,
        newValue: `任務建立於 ${status} by ${currentUser}`,
      }],
    };

    // Optimistic Update
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
      alert('儲存失敗');
      const params = new URLSearchParams(window.location.search);
      loadAllTasks(params.get('tid'), params.get('uname')); // Revert
    } finally {
      setSaving(false);
    }
  };

  const updateTask = async (updatedTask) => {
      // Optimistic
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
          const params = new URLSearchParams(window.location.search);
          loadAllTasks(params.get('tid'), params.get('uname'));
      } finally {
          setSaving(false);
      }
  };

  const handleEditTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const content = prompt('修改任務標題：', task.content);
    if (content === null) return;
    const desc = prompt('修改任務描述：', task.desc || '');
    if (desc === null) return;

    if (content === task.content && desc === task.desc) return;

    let history = task.history || [];
    if (content !== task.content) history = addHistory(history, 'content', task.content, content);
    if (desc !== task.desc) history = addHistory(history, 'desc', task.desc, desc);

    const updatedTask = {
        ...task,
        content,
        desc,
        updatedAt: Date.now(),
        updatedBy: currentUser,
        history
    };
    updateTask(updatedTask);
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
        const params = new URLSearchParams(window.location.search);
        loadAllTasks(params.get('tid'), params.get('uname'));
    } finally {
        setSaving(false);
    }
  };

  const addHistory = (history, field, oldValue, newValue) => {
    return [
      {
        timestamp: Date.now(),
        field,
        oldValue,
        newValue,
        operator: currentUser
      },
      ...history,
    ].slice(0, 50);
  };

  // --- DND Handlers ---
  const onDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const onDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;

    const overId = over.id;
    if (overId.startsWith('floating-')) return;

    const overColumnId = ALL_COLUMNS.find(c => c.id === overId)?.id;
    
    if (overColumnId && activeTask.status !== overColumnId) {
       setTasks(prev => prev.map(t => t.id === active.id ? { ...t, status: overColumnId } : t));
    } else {
       const overTask = tasks.find(t => t.id === overId);
       if (overTask && activeTask.status !== overTask.status) {
           setTasks(prev => prev.map(t => t.id === active.id ? { ...t, status: overTask.status } : t));
       }
    }
  };

  const onDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    let targetStatus = null;

    if (over.id.startsWith('floating-')) {
        targetStatus = over.data.current.status;
    } else {
        const overColumn = ALL_COLUMNS.find(c => c.id === over.id);
        if (overColumn) {
            targetStatus = overColumn.id;
        } else {
            const overTask = tasks.find(t => t.id === over.id);
            if (overTask) targetStatus = overTask.status;
        }
    }

    if (!targetStatus) return;

    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;

    if (activeTask.status !== targetStatus) {
        const history = addHistory(activeTask.history || [], 'status', activeTask.status, targetStatus);
        const updatedTask = {
            ...activeTask,
            status: targetStatus,
            updatedAt: Date.now(),
            updatedBy: currentUser,
            history
        };
        updateTask(updatedTask);
    } 
    else if (active.id !== over.id && !over.id.startsWith('floating-')) {
        const oldIndex = tasks.findIndex(t => t.id === active.id);
        const newIndex = tasks.findIndex(t => t.id === over.id);
        if (newIndex !== -1) {
             setTasks((items) => arrayMove(items, oldIndex, newIndex));
        }
    }
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  if (loading) {
    return (
      <div className="kanban-container">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          載入中... 🦞
        </div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return <Unauthorized />;
  }

  return (
    <div className="kanban-container">
      <header className="kanban-header">
        <h1>🦞 專案看板</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div className="current-user" style={{ fontSize: '0.9rem', color: 'var(--accent-color)', fontWeight: 'bold' }}>
              👤 {currentUser}
            </div>
            <div className="save-indicator">
            {saving ? <span>💾...</span> : lastSaved ? <span>✅ {lastSaved.toLocaleTimeString()}</span> : null}
            {autoRefreshTime && <span title="上次自動重整">🔄 {autoRefreshTime.toLocaleTimeString()}</span>}
            </div>
        </div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="kanban-board">
          {MAIN_COLUMNS.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              title={col.title}
              tasks={tasks.filter((t) => t.status === col.id)}
              onAddTask={handleAddTask}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onViewHistory={(t) => { setSelectedTask(t); setOpenModal('history'); }}
            />
          ))}
        </div>

        <FloatingDropZone 
            id="pending" 
            icon={Clock} 
            count={tasks.filter(t => t.status === 'pending').length}
            onClick={() => setOpenModal('pending')}
            activeId={activeId}
        />
        <FloatingDropZone 
            id="done" 
            icon={CheckCircle} 
            count={tasks.filter(t => t.status === 'done').length}
            onClick={() => setOpenModal('done')}
            activeId={activeId}
        />
        <FloatingDropZone 
            id="archived" 
            icon={Archive} 
            count={tasks.filter(t => t.status === 'archived').length}
            onClick={() => setOpenModal('archived')}
            activeId={activeId}
        />

        {/* Modals */}
        {openModal && (
            <div className="modal-overlay" onClick={() => setOpenModal(null)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2>
                            {openModal === 'pending' && <Clock size={20} />}
                            {openModal === 'done' && <CheckCircle size={20} />}
                            {openModal === 'archived' && <Archive size={20} />}
                            {openModal === 'history' && <History size={20} />}
                            <span style={{marginLeft: 8}}>
                                {ALL_COLUMNS.find(c => c.id === openModal)?.title || '任務歷史'}
                            </span>
                        </h2>
                        <button className="modal-close" onClick={() => setOpenModal(null)}><X size={20} /></button>
                    </div>
                    <div className="modal-body">
                        {openModal === 'history' && selectedTask ? (
                            <>
                                <div className="history-task-info">
                                    <h3>{selectedTask.content}</h3>
                                    {selectedTask.desc && <p className="task-desc">{selectedTask.desc}</p>}
                                </div>
                                <div className="history-timeline">
                                    {(selectedTask.history || []).map((r, i) => (
                                        <div key={i} className="history-item">
                                            <div className="history-timestamp">
                                                {new Date(r.timestamp).toLocaleString('zh-TW')}
                                            </div>
                                            <div className="history-content">
                                                <div className="history-field">
                                                    {r.field} {r.operator ? `by ${r.operator}` : ''}
                                                </div>
                                                <div className="history-change">
                                                    <span className="old-value">{r.oldValue}</span> → <span className="new-value">{r.newValue}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <SortableContext 
                                items={tasks.filter(t => t.status === openModal).map(t => t.id)} 
                                strategy={verticalListSortingStrategy}
                            >
                                {tasks.filter(t => t.status === openModal).map((task) => (
                                    <TaskCard 
                                        key={task.id} 
                                        task={task} 
                                        onEdit={handleEditTask}
                                        onDelete={handleDeleteTask}
                                        onViewHistory={(t) => { setSelectedTask(t); setOpenModal('history'); }}
                                    />
                                ))}
                                {openModal !== 'archived' && (
                                    <button className="add-task-btn" onClick={() => handleAddTask(openModal)}>
                                        <Plus size={16} /> 新增
                                    </button>
                                )}
                            </SortableContext>
                        )}
                    </div>
                </div>
            </div>
        )}

        <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
          {activeTask ? (
            <div className="task-card" style={{ cursor: 'grabbing' }}>
              <div className="task-title">{activeTask.content}</div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
