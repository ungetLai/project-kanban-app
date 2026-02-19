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
  GitBranch,
  Layers,
  Calendar,
  Moon,
  Sun,
  Inbox,
  CircleDashed,
  Loader,
  CheckCircle2,
  XCircle,
  Archive,
  Plus,
  History,
  ArrowLeft,
  MoreHorizontal,
  ListTodo
} from 'lucide-react';
import './App.css';
import { ALLOWED_USERS } from './AllowedUsers';
import TaskFormModal from './components/TaskFormModal';
import './components/TaskFormModal.css';
import Unauthorized from './components/Unauthorized';

// Constants
const API_URL = '/api/tasks';
const REFRESH_INTERVAL = 30000;

// Columns Configuration
const MAIN_COLUMNS = [
  { id: 'backlog', title: 'Backlog', icon: <Inbox size={18} />, color: 'var(--text-secondary)' },
  { id: 'todo', title: 'Todo', icon: <CircleDashed size={18} />, color: 'var(--accent)' },
  { id: 'ongoing', title: 'Ongoing', icon: <Loader size={18} />, color: '#4CAF50' },
  { id: 'review', title: 'Review', icon: <ListTodo size={18} />, color: '#7C4DFF' },
];

const HIDDEN_COLUMNS = [
  { id: 'done', title: 'Done', icon: <CheckCircle2 size={18} />, color: 'var(--stage-done)' },
  { id: 'failed', title: 'Failed', icon: <XCircle size={18} />, color: 'var(--stage-failed)' },
  { id: 'pending', title: 'Pending', icon: <Loader size={18} />, color: 'var(--stage-warning)' },
  { id: 'archived', title: 'Archive', icon: <Archive size={18} />, color: 'var(--text-tertiary)' },
];

// --- Components ---

function Header({ theme, onToggleTheme, currentUser, showHidden, setShowHidden, archiveCount }) {
  return (
    <header className="header">
      <div className="header-left">
        <div className="logo-mark">
          <span className="logo-letter">K</span>
        </div>
        <h1 className="logo-text">KANBAN</h1>
        {showHidden && (
          <>
            <div className="divider-bar"></div>
            <span className="page-title">Archive & History</span>
          </>
        )}
      </div>

      {!showHidden ? (
        <div className="header-center">
          <div className="theme-toggle-group" onClick={onToggleTheme}>
            {theme === 'light' ? <Sun size={18} className="theme-icon" /> : <Moon size={18} className="theme-icon" />}
            <span className="theme-label">{theme === 'light' ? 'Light' : 'Dark'}</span>
          </div>
          <div className="divider-bar"></div>
          <div className="date-group">
            <Calendar size={16} className="text-secondary" />
            <span className="date-text">{new Date().toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}</span>
          </div>
          <div className="divider-bar"></div>
          <button className="archive-nav-btn" onClick={() => setShowHidden(true)}>
            <Archive size={14} className="text-muted" />
            <span>Archive</span>
            <div className="archive-badge">
              <span>{archiveCount}</span>
            </div>
          </button>
          <div className="divider-bar"></div>
          <div className="user-section">
            <div className="user-avatar">
              <span>{currentUser ? currentUser.charAt(0).toUpperCase() : 'U'}</span>
            </div>
            <span className="user-name">{currentUser || 'User'}</span>
          </div>
        </div>
      ) : (
        <button className="back-btn" onClick={() => setShowHidden(false)}>
          <ArrowLeft size={14} />
          <span>Back to Board</span>
        </button>
      )}
    </header>
  );
}

function TaskCard({ task, onEdit, isOverlay = false }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
    disabled: isOverlay
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityColorVar = `var(--p${(task.priority || 'P3').replace('P', '')}-color)`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="task-card"
      {...attributes}
      {...listeners}
      onClick={() => onEdit(task.id)}
    >
      <div className="card-header">
        <div className="priority-badge" style={{ backgroundColor: priorityColorVar }}>
          <span className="priority-text">{task.priority || 'P3'}</span>
        </div>
        {task.projectName && (
          <div className="repo-frame">
            <GitBranch size={12} className="repo-icon" />
            <span className="repo-text">{task.projectName}</span>
          </div>
        )}
      </div>

      <h3 className="card-title">{task.content}</h3>
      <p className="card-content">{task.desc || 'No description provided.'}</p>

      <div className="divider-line"></div>

      <div className="card-footer">
        <div className="tags-row">
          {(task.tags || []).map((tag, i) => (
            <div key={i} className="tag">
              <span className="tag-text">{tag}</span>
            </div>
          ))}
        </div>
        <div className="stage-frame">
          <Layers size={12} className="stage-icon" />
          <span className="stage-text">{task.status}</span>
        </div>
      </div>
    </div>
  );
}

function Column({ id, title, icon, color, tasks, onAddTask, showAddBtn }) {
  const { setNodeRef } = useDroppable({ id, data: { type: 'column', id } });

  return (
    <div className="kanban-column" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="column-header">
        <div className="header-left">
          <div className="status-dot" style={{ backgroundColor: color }}></div>
          <h2 className="column-title">{title}</h2>
          <div className="count-badge">
            <span>{tasks.length}</span>
          </div>
        </div>
        {showAddBtn && (
          <button className="add-btn" onClick={() => onAddTask(id)}>
            <Plus size={14} />
          </button>
        )}
      </div>

      <div ref={setNodeRef} className="card-list">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={() => onAddTask(null, task)} />
          ))}
        </SortableContext>
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
  const [isAuthorized, setIsAuthorized] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [showHidden, setShowHidden] = useState(false);

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

  const handleAddTask = (status, taskToEdit = null) => {
    if (taskToEdit) {
      setSelectedTask(taskToEdit);
      setFormMode('edit');
    } else {
      setTargetColumn(status);
      setFormMode('create');
      setSelectedTask(null);
    }
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
          newValue: `Created in ${normalizedStatus}`,
          snapshot: { ...formData, projectName: formData.project }
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
      const now = Date.now();
      // Simple history tracking for demo
      const newHistory = [...(task.history || [])];
      if (formData.status !== task.status) {
        newHistory.unshift({
          timestamp: now, type: 'modify', field: 'status', operator: currentUser,
          oldValue: task.status, newValue: formData.status, snapshot: { ...formData }
        });
      }
      updateTask({
        ...task, ...formData, projectName: formData.project, updatedAt: now, updatedBy: currentUser, history: newHistory
      });
    }
  };

  const onDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    let targetStatus = null;
    const allCols = [...MAIN_COLUMNS, ...HIDDEN_COLUMNS];

    // Check if over a column
    const overColumn = allCols.find(c => c.id === over.id);
    if (overColumn) {
      targetStatus = overColumn.id;
    } else {
      // Check if over a task
      const overTask = tasks.find(t => t.id === over.id);
      if (overTask) targetStatus = (overTask.status || '').toLowerCase().trim();
    }

    if (!targetStatus) return;

    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;

    if ((activeTask.status || '').toLowerCase().trim() !== targetStatus) {
      const oldStatus = activeTask.status;
      const historyRecord = {
        timestamp: Date.now(), type: 'modify', field: 'status', operator: currentUser,
        oldValue: oldStatus, newValue: targetStatus, snapshot: { ...activeTask }
      };
      const newHistory = [historyRecord, ...(activeTask.history || [])].slice(0, 50);
      updateTask({ ...activeTask, status: targetStatus, updatedAt: Date.now(), updatedBy: currentUser, history: newHistory });
    } else if (active.id !== over.id) {
      // Reordering logic if needed
      const oldIndex = tasks.findIndex(t => t.id === active.id);
      const newIndex = tasks.findIndex(t => t.id === over.id);
      if (newIndex !== -1) setTasks((items) => arrayMove(items, oldIndex, newIndex));
    }
  };

  const getTasksByStatus = useCallback((statusId) => {
    return tasks.filter(t => (t.status || '').toLowerCase().trim() === statusId.toLowerCase().trim());
  }, [tasks]);

  const archiveCount = useMemo(() => {
    return HIDDEN_COLUMNS.reduce((acc, col) => acc + getTasksByStatus(col.id).length, 0);
  }, [tasks, getTasksByStatus]);

  if (loading) return <div className="kanban-container"><div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div></div>;
  if (isAuthorized === false) return <Unauthorized />;

  const visibleColumns = showHidden ? HIDDEN_COLUMNS : MAIN_COLUMNS;

  return (
    <div className="kanban-container">
      <Header
        theme={theme}
        onToggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
        currentUser={currentUser}
        showHidden={showHidden}
        setShowHidden={setShowHidden}
        archiveCount={archiveCount}
      />

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e) => setActiveId(e.active.id)} onDragEnd={onDragEnd}>
        <main className="board-container">
          {visibleColumns.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              title={col.title}
              icon={col.icon}
              color={col.color}
              tasks={getTasksByStatus(col.id)}
              onAddTask={handleAddTask}
              showAddBtn={!showHidden}
            />
          ))}
        </main>

        <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
          {activeId && tasks.find(t => t.id === activeId) ? (
            <TaskCard task={tasks.find(t => t.id === activeId)} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskFormModal isOpen={openModal === 'form'} onClose={() => setOpenModal(null)} onSubmit={onFormSubmit} initialData={selectedTask} mode={formMode} />
    </div>
  );
}
