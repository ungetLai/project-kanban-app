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
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, GripVertical, Save } from 'lucide-react';
import './App.css';

const COLUMNS = [
  { id: 'backlog', title: 'BackLog (待討論)' },
  { id: 'todo', title: 'Todo (準備中)' },
  { id: 'ongoing', title: 'onGoing (執行階段)' },
  { id: 'pending', title: 'Pending (有待確認議題)' },
  { id: 'review', title: 'Review (任務驗收)' },
  { id: 'done', title: 'Done (結案)' },
];

const API_URL = '/api/tasks';

function TaskCard({ task, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="task-card" {...attributes} {...listeners}>
      <div className="task-title">{task.content}</div>
      {task.desc && <div className="task-desc">{task.desc}</div>}
    </div>
  );
}

function Column({ id, title, tasks, onAddTask }) {
  const { setNodeRef } = useSortable({ id });

  return (
    <div className="kanban-column">
      <div className="column-header">
        <span>{title}</span>
        <span className="column-count">{tasks.length}</span>
      </div>
      <div ref={setNodeRef} className="task-list">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>
        <button className="add-task-btn" onClick={() => onAddTask(id)}>
          <Plus size={16} /> 新增任務
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 載入任務
  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL);
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('載入任務失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  // 儲存任務
  const saveTasks = async (newTasks) => {
    try {
      setSaving(true);
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTasks),
      });

      if (response.ok) {
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('儲存任務失敗:', error);
      alert('儲存失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  };

  // 新增任務
  const handleAddTask = (status) => {
    const content = prompt('請輸入任務標題：');
    if (!content) return;

    const desc = prompt('請輸入任務描述（選填）：');
    
    const newTask = {
      id: Date.now().toString(),
      content,
      desc: desc || '',
      status,
    };

    const newTasks = [...tasks, newTask];
    setTasks(newTasks);
    saveTasks(newTasks);
  };

  const onDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const onDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;

    const overId = over.id;
    const overColumn = COLUMNS.find(c => c.id === overId);
    
    if (overColumn) {
      if (activeTask.status !== overId) {
        setTasks(prev => prev.map(t => t.id === active.id ? { ...t, status: overId } : t));
      }
      return;
    }

    const overTask = tasks.find(t => t.id === overId);
    if (overTask && activeTask.status !== overTask.status) {
      setTasks(prev => prev.map(t => t.id === active.id ? { ...t, status: overTask.status } : t));
    }
  };

  const onDragEnd = (event) => {
    const { active, over } = event;
    if (!over) {
      setActiveId(null);
      return;
    }

    let newTasks = tasks;

    if (active.id !== over.id) {
      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over.id);
      
      if (newIndex !== -1) {
        newTasks = arrayMove(tasks, oldIndex, newIndex);
        setTasks(newTasks);
      }
    }

    setActiveId(null);
    
    // 拖曳結束後自動儲存
    saveTasks(newTasks);
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

  return (
    <div className="kanban-container">
      <header className="kanban-header">
        <h1>🦞 專案開發看板 (PARA 擴充版)</h1>
        <div className="save-indicator">
          {saving ? (
            <span>💾 儲存中...</span>
          ) : lastSaved ? (
            <span>✅ 已儲存 ({lastSaved.toLocaleTimeString()})</span>
          ) : null}
        </div>
      </header>

      <div className="kanban-board">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              title={col.title}
              tasks={tasks.filter((t) => t.status === col.id)}
              onAddTask={handleAddTask}
            />
          ))}
          <DragOverlay dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: {
                active: {
                  opacity: '0.5',
                },
              },
            }),
          }}>
            {activeId ? (
              <div className="task-card" style={{ cursor: 'grabbing' }}>
                <div className="task-title">{activeTask?.content}</div>
                {activeTask?.desc && <div className="task-desc">{activeTask?.desc}</div>}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
