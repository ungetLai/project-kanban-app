import React, { useState } from 'react';
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
import { Plus, GripVertical } from 'lucide-react';
import './App.css';

const COLUMNS = [
  { id: 'backlog', title: 'Backlog (待討論)' },
  { id: 'todo', title: 'Todo (準備中)' },
  { id: 'ongoing', title: 'Ongoing (執行中)' },
  { id: 'pending', title: 'Pending (待定)' },
  { id: 'review', title: 'Review (回顧)' },
  { id: 'done', title: 'Done (完成)' },
];

const INITIAL_TASKS = [
  { id: '1', content: '設計看板架構', desc: '定義六個主要流程階段', status: 'done' },
  { id: '2', content: '部署到 GitHub', desc: '建立 Repository 並上傳初步代碼', status: 'ongoing' },
  { id: '3', content: '整合 PARA 系統', desc: '讓看板任務可以自動歸類到 Archives', status: 'todo' },
];

function TaskCard({ task }) {
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

function Column({ id, title, tasks }) {
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
        <button className="add-task-btn">
          <Plus size={16} /> 新增任務
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [activeId, setActiveId] = useState(null);

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

  const onDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const onDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;

    // Check if dragging over a column or another task
    const overId = over.id;
    const overColumn = COLUMNS.find(c => c.id === overId);
    
    if (overColumn) {
      // Dropping directly onto an empty column
      if (activeTask.status !== overId) {
        setTasks(prev => prev.map(t => t.id === active.id ? { ...t, status: overId } : t));
      }
      return;
    }

    const overTask = tasks.find(t => t.id === overId);
    if (overTask && activeTask.status !== overTask.status) {
      // Dragging over a task in a different column
      setTasks(prev => prev.map(t => t.id === active.id ? { ...t, status: overTask.status } : t));
    }
  };

  const onDragEnd = (event) => {
    const { active, over } = event;
    if (!over) {
      setActiveId(null);
      return;
    }

    if (active.id !== over.id) {
      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over.id);
      
      if (newIndex !== -1) {
        setTasks((items) => arrayMove(items, oldIndex, newIndex));
      }
    }

    setActiveId(null);
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  return (
    <div className="kanban-container">
      <header className="kanban-header">
        <h1>🦞 專案開發看板 (PARA 擴充版)</h1>
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
