import React, { useState, useRef } from "react";
import { 
  Plus, Trash2, Search, Calendar, Tag, CheckCircle2, Circle, 
  Sparkles, Edit3, Check, X, UploadCloud, ChevronDown, ChevronUp, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Task, TaskPriority, TaskStatus, Subtask } from "../types";

interface TaskDashboardProps {
  tasks: Task[];
  onAddTask: (task: Partial<Task>) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onTriggerBreakdown: (taskId: string) => Promise<void>;
  isBreakdownLoading: Record<string, boolean>;
  onImportTasks: (imported: Partial<Task>[]) => void;
}

export default function TaskDashboard({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onTriggerBreakdown,
  isBreakdownLoading,
  onImportTasks
}: TaskDashboardProps) {
  // Filter and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'all' | 'todo' | 'in_progress' | 'completed'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  
  // New Task form state
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("medium");
  const [newCategory, setNewCategory] = useState("Work");
  const [newDueDate, setNewDueDate] = useState("");
  
  // Editing state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Subtask manual input states
  const [newSubtaskTexts, setNewSubtaskTexts] = useState<Record<string, string>>({});

  // Expanded details states for subtask panels
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});

  // File drag & drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive available categories
  const categories = ["All", ...Array.from(new Set(tasks.map(t => t.category).filter(Boolean)))];

  // Filters logic
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (task.category && task.category.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesTab = activeTab === 'all' || task.status === activeTab;
    const matchesCategory = selectedCategory === "All" || task.category === selectedCategory;

    return matchesSearch && matchesTab && matchesCategory;
  });

  // Task stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const todoTasks = tasks.filter(t => t.status === 'todo').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Task submission handler
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    
    onAddTask({
      title: newTitle.trim(),
      priority: newPriority,
      category: newCategory.trim() || "Work",
      dueDate: newDueDate || undefined,
      status: "todo",
      subtasks: []
    });

    setNewTitle("");
    setNewDueDate("");
  };

  // Toggle single task completed status
  const handleToggleTask = (task: Task) => {
    const nextStatus: TaskStatus = task.status === 'completed' ? 'todo' : 'completed';
    onUpdateTask(task.id, { status: nextStatus });
  };

  // Toggle single subtask
  const handleToggleSubtask = (task: Task, subtaskId: string) => {
    const nextSubtasks = task.subtasks.map(sub => {
      if (sub.id === subtaskId) {
        return { ...sub, completed: !sub.completed };
      }
      return sub;
    });

    onUpdateTask(task.id, { subtasks: nextSubtasks });
  };

  // Trigger manual subtask addition
  const handleAddSubtask = (taskId: string) => {
    const text = newSubtaskTexts[taskId]?.trim();
    if (!text) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newSub: Subtask = {
      id: crypto.randomUUID(),
      title: text,
      completed: false
    };

    onUpdateTask(taskId, {
      subtasks: [...task.subtasks, newSub]
    });

    setNewSubtaskTexts(prev => ({ ...prev, [taskId]: "" }));
  };

  // Start inline renaming
  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
  };

  // Save inline renaming
  const saveEditing = (taskId: string) => {
    if (!editingTitle.trim()) return;
    onUpdateTask(taskId, { title: editingTitle.trim() });
    setEditingTaskId(null);
  };

  // Toggle expand view
  const toggleExpand = (taskId: string) => {
    setExpandedTaskIds(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  // Parse and import from dropped/selected file
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        let importedList: Partial<Task>[] = [];

        // Attempt JSON first
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            importedList = parsed.map((item: any) => ({
              title: item.title || "Untitled Task",
              priority: (item.priority === 'high' || item.priority === 'medium' || item.priority === 'low') ? item.priority : 'medium',
              category: item.category || 'Imported',
              status: item.status || 'todo',
              dueDate: item.dueDate || undefined,
              subtasks: Array.isArray(item.subtasks) ? item.subtasks.map((s: any) => ({
                id: s.id || crypto.randomUUID(),
                title: s.title || String(s),
                completed: !!s.completed
              })) : []
            }));
          } else {
            alert("JSON file must contain an array of tasks.");
            return;
          }
        } else {
          // Fallback to lines (TXT/CSV style)
          const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
          importedList = lines.map(line => ({
            title: line,
            priority: 'medium',
            category: 'Imported',
            status: 'todo',
            subtasks: []
          }));
        }

        if (importedList.length > 0) {
          onImportTasks(importedList);
        }
      } catch (err) {
        alert("Failed to parse file. Make sure it is plain text or valid JSON.");
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0d16] text-slate-100 p-6 overflow-y-auto font-sans">
      
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#111827]/80 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <span className="text-[11px] font-mono text-slate-400">TOTAL TASKS</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-white">{totalTasks}</span>
            <span className="text-xs text-slate-500">items</span>
          </div>
        </div>

        <div className="bg-[#111827]/80 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <span className="text-[11px] font-mono text-emerald-400">COMPLETED</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-emerald-400">{completedTasks}</span>
            <span className="text-xs text-emerald-600">/{totalTasks} completed</span>
          </div>
        </div>

        <div className="bg-[#111827]/80 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <span className="text-[11px] font-mono text-amber-400">IN PROGRESS</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-amber-400">{inProgressTasks}</span>
            <span className="text-xs text-slate-500">active status</span>
          </div>
        </div>

        {/* Dynamic progression */}
        <div className="bg-[#111827]/80 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-mono text-indigo-400">PROGRESSION</span>
            <span className="text-xs font-mono font-bold text-white">{completionRate}%</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-1.5 mt-3 overflow-hidden border border-slate-800">
            <motion.div 
              className="bg-emerald-500 h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${completionRate}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* Task Creation & Import Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Creation Box */}
        <form onSubmit={handleCreateTask} className="lg:col-span-2 bg-[#111827]/50 border border-slate-800/80 p-4 rounded-xl space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Plus className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-mono font-semibold text-slate-300">ADD DIRECTIVE MANUAL ENTRY</h2>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="E.g., Prepare quarterly financial spreadsheets..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 transition-all"
            />
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-4">
              {/* Priority */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-slate-400">PRIORITY:</span>
                <select 
                  value={newPriority} 
                  onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                  className="bg-slate-950 border border-slate-800 text-[11px] text-slate-300 rounded px-1.5 py-1 focus:outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              {/* Category */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-slate-400">CATEGORY:</span>
                <input
                  type="text"
                  placeholder="Category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-[11px] text-slate-300 rounded px-2 py-1 focus:outline-none max-w-[100px]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold px-4 py-2 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Item</span>
            </button>
          </div>
        </form>

        {/* Drag & Drop Import File Box */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`bg-[#111827]/40 border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDragging 
              ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" 
              : "border-slate-800 hover:border-slate-700 text-slate-400 hover:bg-slate-900/30"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            accept=".json,.txt"
            className="hidden"
          />
          <UploadCloud className="w-8 h-8 mb-2 text-indigo-400" />
          <h3 className="text-xs font-mono font-medium text-slate-300">IMPORT BATCH FILE</h3>
          <p className="text-[10px] text-slate-500 mt-1">
            Drag & drop .txt (one task per line) or .json array of tasks here
          </p>
        </div>

      </div>

      {/* Filter Options bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-slate-900/30 border border-slate-800 p-3 rounded-xl mb-4">
        
        {/* Status Tabs */}
        <div className="flex border border-slate-800 bg-slate-950/80 p-0.5 rounded-lg overflow-hidden">
          {(['all', 'todo', 'in_progress', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                activeTab === tab 
                  ? "bg-slate-800 text-white shadow-sm" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab === 'all' && 'All'}
              {tab === 'todo' && 'Todo'}
              {tab === 'in_progress' && 'In Progress'}
              {tab === 'completed' && 'Completed'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex items-center md:max-w-xs w-full">
          <Search className="absolute left-3 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search keywords or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>

      {/* Category Pills Filters */}
      <div className="flex flex-wrap items-center gap-1.5 mb-6">
        <span className="text-[10px] font-mono text-slate-500 uppercase mr-1">Categories:</span>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`text-[11px] px-2.5 py-1 rounded-full font-mono transition-all border cursor-pointer ${
              selectedCategory === cat
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                : "bg-[#111827]/40 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Task List Workspace */}
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => {
              const isExpanded = !!expandedTaskIds[task.id];
              const isBreaking = !!isBreakdownLoading[task.id];
              const completedSubs = task.subtasks.filter(s => s.completed).length;
              const totalSubs = task.subtasks.length;
              const progressPct = totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : 0;

              return (
                <motion.div
                  key={task.id}
                  layoutId={`task-card-${task.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className={`border rounded-xl transition-all ${
                    task.status === 'completed'
                      ? "bg-slate-950/40 border-slate-900/60 opacity-70"
                      : "bg-[#111827]/60 border-slate-800/80 hover:border-slate-700/80"
                  }`}
                >
                  {/* Task Card Header Area */}
                  <div className="p-4 flex items-start gap-3 justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      
                      {/* Checkbox */}
                      <button 
                        onClick={() => handleToggleTask(task)}
                        className="mt-1 cursor-pointer hover:text-emerald-400 transition-colors text-slate-500"
                      >
                        {task.status === 'completed' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-500/10" />
                        ) : (
                          <Circle className="w-5 h-5 hover:scale-105 transition-transform" />
                        )}
                      </button>

                      {/* Main Info */}
                      <div className="flex-1 min-w-0">
                        {editingTaskId === task.id ? (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              className="bg-slate-950 border border-slate-800 text-xs text-white rounded px-2 py-1 focus:outline-none focus:border-emerald-500 w-full"
                              autoFocus
                            />
                            <button 
                              onClick={() => saveEditing(task.id)}
                              className="p-1 rounded bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={() => setEditingTaskId(null)}
                              className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <h3 
                            className={`text-sm font-semibold truncate ${
                              task.status === 'completed' ? "text-slate-500 line-through" : "text-white"
                            }`}
                          >
                            {task.title}
                          </h3>
                        )}

                        {/* Badges / Meta row */}
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          {/* Priority Selector */}
                          <button
                            onClick={() => {
                              const priorities: TaskPriority[] = ['low', 'medium', 'high'];
                              const nextIdx = (priorities.indexOf(task.priority) + 1) % priorities.length;
                              onUpdateTask(task.id, { priority: priorities[nextIdx] });
                            }}
                            className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold transition-all ${
                              task.priority === 'high' 
                                ? "bg-rose-500/15 border border-rose-500/30 text-rose-400" 
                                : task.priority === 'medium'
                                ? "bg-amber-500/15 border border-amber-500/30 text-amber-400"
                                : "bg-slate-500/15 border border-slate-500/30 text-slate-400"
                            }`}
                          >
                            {task.priority} Priority
                          </button>

                          {/* Category Tag */}
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1">
                            <Tag className="w-2.5 h-2.5 text-slate-400" />
                            {task.category}
                          </span>

                          {/* Due Date */}
                          {task.dueDate && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5 text-indigo-400" />
                              Due {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}

                          {/* Status cycle helper */}
                          <button
                            onClick={() => {
                              const nextStatus: TaskStatus = 
                                task.status === 'todo' ? 'in_progress' : 
                                task.status === 'in_progress' ? 'completed' : 'todo';
                              onUpdateTask(task.id, { status: nextStatus });
                            }}
                            className="text-[9px] font-mono border border-slate-800 bg-slate-950 px-2 py-0.5 rounded text-slate-400 hover:text-white"
                          >
                            Status: {task.status.replace('_', ' ')}
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* Actions Buttons Column */}
                    <div className="flex items-center gap-1">
                      
                      {/* AI breakdown generator */}
                      <button
                        onClick={() => onTriggerBreakdown(task.id)}
                        disabled={isBreaking || task.status === 'completed'}
                        className={`p-1.5 rounded-md border flex items-center gap-1 text-[11px] font-mono font-medium transition-all cursor-pointer ${
                          task.status === 'completed'
                            ? "opacity-30 border-slate-800 text-slate-500"
                            : isBreaking
                            ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                            : "bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/30 text-indigo-400 hover:text-indigo-300"
                        }`}
                        title="Deconstruct into AI steps"
                      >
                        <Sparkles className={`w-3 h-3 ${isBreaking ? 'animate-spin' : ''}`} />
                        <span>{isBreaking ? 'Formulating...' : 'AI Breakdown'}</span>
                      </button>

                      {/* Manual renaming toggle */}
                      <button
                        onClick={() => startEditing(task)}
                        className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white"
                        title="Rename task"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>

                      {/* Trash bin */}
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1.5 rounded bg-rose-950/20 border border-rose-900/30 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 transition-colors"
                        title="Delete task"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      {/* Expand list toggle */}
                      <button
                        onClick={() => toggleExpand(task.id)}
                        className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white ml-1"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                    </div>
                  </div>

                  {/* Nested Subtask Panel */}
                  <AnimatePresence>
                    {(isExpanded || totalSubs > 0 || isBreaking) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-slate-900 bg-slate-950/50 overflow-hidden"
                      >
                        <div className="p-4 space-y-3">
                          {totalSubs > 0 && (
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-mono text-slate-400">SUBTASK ACTION PLAN:</span>
                              <span className="text-[10px] font-mono text-emerald-400">{completedSubs}/{totalSubs} COMPLETED ({progressPct}%)</span>
                            </div>
                          )}

                          {/* Subtasks listing */}
                          {totalSubs > 0 ? (
                            <div className="space-y-1.5 pl-2 border-l border-slate-800">
                              {task.subtasks.map((sub) => (
                                <div key={sub.id} className="flex items-center gap-2 group">
                                  <button
                                    onClick={() => handleToggleSubtask(task, sub.id)}
                                    className="cursor-pointer text-slate-500 hover:text-slate-300 transition-colors"
                                  >
                                    {sub.completed ? (
                                      <span className="text-emerald-400 font-bold text-xs">✔</span>
                                    ) : (
                                      <span className="inline-block w-3 h-3 border border-slate-600 rounded"></span>
                                    )}
                                  </button>
                                  <span 
                                    className={`text-xs ${
                                      sub.completed ? "text-slate-500 line-through" : "text-slate-300"
                                    }`}
                                  >
                                    {sub.title}
                                  </span>
                                  
                                  {/* Delete subtask button */}
                                  <button
                                    onClick={() => {
                                      const filtered = task.subtasks.filter(s => s.id !== sub.id);
                                      onUpdateTask(task.id, { subtasks: filtered });
                                    }}
                                    className="text-[10px] text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            !isBreaking && (
                              <p className="text-[11px] font-mono text-slate-500 italic pl-2">
                                No subtask milestones currently calculated.
                              </p>
                            )
                          )}

                          {/* Adding a manual subtask */}
                          <div className="flex items-center gap-2 pt-2">
                            <input
                              type="text"
                              placeholder="Insert custom milestone step..."
                              value={newSubtaskTexts[task.id] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setNewSubtaskTexts(prev => ({ ...prev, [task.id]: val }));
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleAddSubtask(task.id);
                                }
                              }}
                              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
                            />
                            <button
                              onClick={() => handleAddSubtask(task.id)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] px-2.5 py-1 rounded-lg font-medium cursor-pointer"
                            >
                              Add Step
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </motion.div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center p-8 bg-[#111827]/30 border border-dashed border-slate-800 rounded-xl text-center">
              <AlertCircle className="w-8 h-8 text-slate-500 mb-2" />
              <h3 className="text-sm font-semibold text-slate-300">No matching directives found</h3>
              <p className="text-xs text-slate-500 mt-1">
                Try writing a natural language command to Sera Copilot to initiate your workflow.
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
