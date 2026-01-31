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
import { Plus, GripVertical, Save, Pencil, Trash2, Clock, CheckCircle, X, History, Archive } from 'lucide-react';
import './App.css';

// 主版面顯示的四個欄位
const MAIN_COLUMNS = [
  { id: 'backlog', title: 'BackLog (待討論)' },
  { id: 'todo', title: 'Todo (準備中)' },
  { id: 'ongoing', title: 'onGoing (執行階段)' },
  { id: 'review', title: 'Review (任務驗收)' },
];

// 懸浮區塊（不在主版面顯示）
const FLOATING_COLUMNS = [
  { id: 'pending', title: 'Pending (有待確認議題)', icon: Clock },
  { id: 'done', title: 'Done (結案)', icon: CheckCircle },
  { id: 'archived', title: 'Archive (歷史區)', icon: Archive },
];

// 所有欄位（用於拖放）
const ALL_COLUMNS = [...MAIN_COLUMNS, ...FLOATING_COLUMNS];

const API_URL = '/api/tasks';

function TaskCard({ task, onEdit, onDelete, onViewHistory }) {
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
      <div className="task-header">
        <div className="task-title">{task.content}</div>
        <div className="task-actions" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          <button 
            className="task-action-btn" 
            onClick={() => onViewHistory(task)} 
            title="查看歷史"
          >
            <History size={14} />
          </button>
          <button 
            className="task-action-btn" 
            onClick={() => onEdit(task.id)} 
            title="編輯"
          >
            <Pencil size={14} />
          </button>
          <button 
            className="task-action-btn delete" 
            onClick={() => onDelete(task.id)} 
            title="刪除"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {task.desc && <div className="task-desc">{task.desc}</div>}
    </div>
  );
}

function Column({ id, title, tasks, onAddTask, onEditTask, onDeleteTask, onViewHistory }) {
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

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [openModal, setOpenModal] = useState(null); // 'pending' 或 'done' 或 'history'
  const [selectedTask, setSelectedTask] = useState(null); // 用於查看歷史的任務

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
        let data = await response.json();
        
        // 自動歸檔：檢查 Done 任務是否超過 12 小時
        const now = Date.now();
        const TWELVE_HOURS = 12 * 60 * 60 * 1000;
        let needsSave = false;
        
        data = data.map(task => {
          if (task.status === 'done' && task.updatedAt) {
            const timeSinceUpdate = now - task.updatedAt;
            if (timeSinceUpdate > TWELVE_HOURS) {
              needsSave = true;
              return {
                ...task,
                status: 'archived',
                archivedAt: now,
              };
            }
          }
          return task;
        });
        
        setTasks(data);
        
        // 如果有任務被歸檔，自動儲存
        if (needsSave) {
          await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
        }
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
    
    const now = Date.now();
    const newTask = {
      id: now.toString(),
      content,
      desc: desc || '',
      status,
      createdAt: now,
      updatedAt: now,
      history: [{
        timestamp: now,
        field: 'created',
        oldValue: null,
        newValue: `任務建立於 ${status}`,
      }],
    };

    const newTasks = [...tasks, newTask];
    setTasks(newTasks);
    saveTasks(newTasks);
  };

  // 添加歷史記錄
  const addHistory = (task, field, oldValue, newValue) => {
    const history = task.history || [];
    const newHistory = [
      {
        timestamp: Date.now(),
        field,
        oldValue,
        newValue,
      },
      ...history, // 新的在前面
    ].slice(0, 50); // 保留最近 50 筆
    
    return newHistory;
  };

  // 修改任務
  const handleEditTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const content = prompt('修改任務標題：', task.content);
    if (content === null) return;

    const desc = prompt('修改任務描述：', task.desc || '');
    if (desc === null) return;

    let history = task.history || [];
    
    // 標題變更
    if (content !== task.content) {
      history = addHistory(task, 'content', task.content, content);
    }
    
    // 描述變更
    if (desc !== task.desc) {
      history = addHistory({ ...task, history }, 'desc', task.desc || '', desc);
    }

    const newTasks = tasks.map(t => 
      t.id === taskId ? { 
        ...t, 
        content, 
        desc,
        updatedAt: Date.now(),
        history,
      } : t
    );
    setTasks(newTasks);
    saveTasks(newTasks);
  };

  // 刪除任務
  const handleDeleteTask = (taskId) => {
    if (!confirm('確定要刪除此任務嗎？')) return;
    
    const newTasks = tasks.filter(t => t.id !== taskId);
    setTasks(newTasks);
    saveTasks(newTasks);
  };

  // 查看任務歷史
  const handleViewHistory = (task) => {
    setSelectedTask(task);
    setOpenModal('history');
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
    const overColumn = ALL_COLUMNS.find(c => c.id === overId);
    
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
    const activeTask = tasks.find(t => t.id === active.id);

    if (active.id !== over.id) {
      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over.id);
      
      if (newIndex !== -1) {
        newTasks = arrayMove(tasks, oldIndex, newIndex);
      }
    }

    // 檢查狀態是否變更
    const finalTask = newTasks.find(t => t.id === active.id);
    if (finalTask && activeTask && finalTask.status !== activeTask.status) {
      const history = addHistory(
        finalTask,
        'status',
        activeTask.status,
        finalTask.status
      );
      
      newTasks = newTasks.map(t => 
        t.id === active.id ? {
          ...t,
          updatedAt: Date.now(),
          history,
        } : t
      );
    }

    setTasks(newTasks);
    setActiveId(null);
    
    // 拖曳結束後自動儲存
    saveTasks(newTasks);
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  // 計算 Pending、Done 和 Archived 的任務數量
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;
  const archivedCount = tasks.filter(t => t.status === 'archived').length;

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
          {MAIN_COLUMNS.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              title={col.title}
              tasks={tasks.filter((t) => t.status === col.id)}
              onAddTask={handleAddTask}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onViewHistory={handleViewHistory}
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

      {/* 懸浮按鈕 - Pending (左下角) */}
      <button 
        className="floating-btn floating-btn-left"
        onClick={() => setOpenModal('pending')}
        title="查看 Pending 任務"
      >
        <Clock size={24} />
        {pendingCount > 0 && <span className="badge">{pendingCount}</span>}
      </button>

      {/* 懸浮按鈕 - Done (右下角) */}
      <button 
        className="floating-btn floating-btn-right"
        onClick={() => setOpenModal('done')}
        title="查看 Done 任務"
      >
        <CheckCircle size={24} />
        {doneCount > 0 && <span className="badge">{doneCount}</span>}
      </button>

      {/* 懸浮按鈕 - Archive (右下角第二個) */}
      <button 
        className="floating-btn floating-btn-archive"
        onClick={() => setOpenModal('archived')}
        title="查看歷史區"
      >
        <Archive size={24} />
        {archivedCount > 0 && <span className="badge">{archivedCount}</span>}
      </button>

      {/* Modal - Pending */}
      {openModal === 'pending' && (
        <div className="modal-overlay" onClick={() => setOpenModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <Clock size={20} />
                Pending (有待確認議題)
              </h2>
              <button className="modal-close" onClick={() => setOpenModal(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
              >
                <SortableContext 
                  items={tasks.filter(t => t.status === 'pending').map(t => t.id)} 
                  strategy={verticalListSortingStrategy}
                >
                  {tasks.filter(t => t.status === 'pending').map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                      onViewHistory={handleViewHistory}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              {tasks.filter(t => t.status === 'pending').length === 0 && (
                <div className="empty-state">目前沒有 Pending 任務</div>
              )}
              <button className="add-task-btn" onClick={() => handleAddTask('pending')}>
                <Plus size={16} /> 新增任務
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Done */}
      {openModal === 'done' && (
        <div className="modal-overlay" onClick={() => setOpenModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <CheckCircle size={20} />
                Done (結案)
              </h2>
              <button className="modal-close" onClick={() => setOpenModal(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
              >
                <SortableContext 
                  items={tasks.filter(t => t.status === 'done').map(t => t.id)} 
                  strategy={verticalListSortingStrategy}
                >
                  {tasks.filter(t => t.status === 'done').map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                      onViewHistory={handleViewHistory}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              {tasks.filter(t => t.status === 'done').length === 0 && (
                <div className="empty-state">目前沒有 Done 任務</div>
              )}
              <button className="add-task-btn" onClick={() => handleAddTask('done')}>
                <Plus size={16} /> 新增任務
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - History */}
      {openModal === 'history' && selectedTask && (
        <div className="modal-overlay" onClick={() => setOpenModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <History size={20} />
                任務歷史記錄
              </h2>
              <button className="modal-close" onClick={() => setOpenModal(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="history-task-info">
                <h3>{selectedTask.content}</h3>
                {selectedTask.desc && <p className="task-desc">{selectedTask.desc}</p>}
              </div>
              
              <div className="history-timeline">
                {selectedTask.history && selectedTask.history.length > 0 ? (
                  selectedTask.history.map((record, index) => (
                    <div key={index} className="history-item">
                      <div className="history-timestamp">
                        {new Date(record.timestamp).toLocaleString('zh-TW', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <div className="history-content">
                        <div className="history-field">
                          {record.field === 'created' && '📝 任務建立'}
                          {record.field === 'content' && '✏️ 標題修改'}
                          {record.field === 'desc' && '📄 描述修改'}
                          {record.field === 'status' && '🔄 狀態變更'}
                        </div>
                        {record.oldValue !== null && (
                          <div className="history-change">
                            <span className="old-value">{record.oldValue}</span>
                            <span className="arrow">→</span>
                            <span className="new-value">{record.newValue}</span>
                          </div>
                        )}
                        {record.oldValue === null && (
                          <div className="history-note">{record.newValue}</div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">此任務尚無歷史記錄</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Archive */}
      {openModal === 'archived' && (
        <div className="modal-overlay" onClick={() => setOpenModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <Archive size={20} />
                Archive (歷史區)
              </h2>
              <button className="modal-close" onClick={() => setOpenModal(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {tasks.filter(t => t.status === 'archived').map((task) => (
                <div key={task.id} className="archived-task-card">
                  <div className="task-header">
                    <div className="task-title">{task.content}</div>
                    <button 
                      className="restore-btn"
                      onClick={() => {
                        const newTasks = tasks.map(t => 
                          t.id === task.id ? { ...t, status: 'done', updatedAt: Date.now() } : t
                        );
                        setTasks(newTasks);
                        saveTasks(newTasks);
                      }}
                      title="恢復至 Done"
                    >
                      恢復
                    </button>
                  </div>
                  {task.desc && <div className="task-desc">{task.desc}</div>}
                  <div className="archive-meta">
                    {task.archivedAt && (
                      <span>📦 歸檔於 {new Date(task.archivedAt).toLocaleString('zh-TW')}</span>
                    )}
                  </div>
                </div>
              ))}
              {tasks.filter(t => t.status === 'archived').length === 0 && (
                <div className="empty-state">歷史區目前沒有任務</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
