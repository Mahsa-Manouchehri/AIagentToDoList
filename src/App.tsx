import React, { useState, useEffect } from "react";
import { Sparkles, LayoutGrid, CheckSquare, MessageSquare, Menu, X, ArrowLeft, Terminal } from "lucide-react";
import { Task, ChatMessage, AgentAction, AgentChatResponse, TaskPriority, TaskStatus, Subtask } from "./types";
import ChatPanel from "./components/ChatPanel";
import TaskDashboard from "./components/TaskDashboard";

const WELCOME_MSG = "Hello, I am Sera, your AI productivity agent. You can tell me to create tasks, modify priority levels, complete items, or simply ask me for a daily focus strategy review! Try typing: 'Add a high priority task to finish the TypeScript backend refactor under Coding'.";

// Helper to find the best matching task by keywords
const findMatchingTask = (query: string, currentTasks: Task[]): Task | null => {
  if (!query) return null;
  const lowercaseQuery = query.toLowerCase().trim();
  
  // Try exact match first
  let match = currentTasks.find(t => t.title.toLowerCase() === lowercaseQuery);
  if (match) return match;

  // Try partial match (query inside title)
  match = currentTasks.find(t => t.title.toLowerCase().includes(lowercaseQuery));
  if (match) return match;

  // Try partial match (title inside query)
  match = currentTasks.find(t => lowercaseQuery.includes(t.title.toLowerCase()));
  if (match) return match;

  // Word-by-word intersection match
  let highestScore = 0;
  let bestMatch: Task | null = null;
  const queryWords = lowercaseQuery.split(/\s+/).filter(w => w.length > 2); // filter out short words
  
  for (const task of currentTasks) {
    const taskWords = task.title.toLowerCase().split(/\s+/);
    const intersection = queryWords.filter(w => taskWords.includes(w));
    if (intersection.length > highestScore) {
      highestScore = intersection.length;
      bestMatch = task;
    }
  }

  if (highestScore > 0) return bestMatch;
  
  // Last ditch: pick the absolute first match with any overlap
  return currentTasks.find(t => {
    return lowercaseQuery.split(" ").some(word => word.length > 3 && t.title.toLowerCase().includes(word));
  }) || null;
};

export default function App() {
  // Persistence state loaders
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem("sera_tasks");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    // Default initial tasks
    return [
      {
        id: "task-1",
        title: "Finish the structural PRD document for AI Agent Todo List",
        status: "completed",
        priority: "high",
        category: "Product",
        subtasks: [
          { id: "sub-1-1", title: "Complete Objectives & Personas", completed: true },
          { id: "sub-1-2", title: "Add LLM Integration Schema", completed: true },
          { id: "sub-1-3", title: "Review non-functional specs", completed: true }
        ],
        createdAt: new Date().toISOString()
      },
      {
        id: "task-2",
        title: "Install base Node dependencies and test typescript build system",
        status: "todo",
        priority: "medium",
        category: "Infrastructure",
        subtasks: [
          { id: "sub-2-1", title: "Expose dev environment via express", completed: true },
          { id: "sub-2-2", title: "Validate vite/esbuild production script", completed: false }
        ],
        createdAt: new Date().toISOString()
      }
    ];
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem("sera_messages");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: "msg-welcome",
        sender: "agent",
        text: WELCOME_MSG,
        timestamp: new Date().toISOString()
      }
    ];
  });

  const [focusDigest, setFocusDigest] = useState<string | null>(() => {
    return localStorage.getItem("sera_focus_digest") || 
      "Keep an eye on High Priority infrastructure milestones today to build momentum.";
  });

  // UI responsive toggle (Mobile views)
  const [mobileView, setMobileView] = useState<'dashboard' | 'chat'>('dashboard');

  // Loaders
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isDigestLoading, setIsDigestLoading] = useState(false);
  const [isBreakdownLoading, setIsBreakdownLoading] = useState<Record<string, boolean>>({});

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem("sera_tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("sera_messages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (focusDigest) {
      localStorage.setItem("sera_focus_digest", focusDigest);
    }
  }, [focusDigest]);

  // Handle direct modifications
  const handleAddTask = (fields: Partial<Task>) => {
    const newTask: Task = {
      id: `task-${crypto.randomUUID()}`,
      title: fields.title || "Untitled Task",
      status: fields.status || "todo",
      priority: fields.priority || "medium",
      category: fields.category || "General",
      dueDate: fields.dueDate,
      subtasks: fields.subtasks || [],
      createdAt: new Date().toISOString()
    };
    setTasks(prev => [newTask, ...prev]);
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleImportTasks = (imported: Partial<Task>[]) => {
    const formatted = imported.map(item => ({
      id: `task-${crypto.randomUUID()}`,
      title: item.title || "Imported Task",
      status: item.status || "todo",
      priority: item.priority || "medium",
      category: item.category || "Imported",
      dueDate: item.dueDate,
      subtasks: item.subtasks || [],
      createdAt: new Date().toISOString()
    }));
    setTasks(prev => [...formatted, ...prev]);
  };

  // Conversational Assistant Handler
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${crypto.randomUUID()}`,
      sender: "user",
      text,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          currentDate: new Date().toISOString(),
          currentTasks: tasks.map(t => ({
            title: t.title,
            priority: t.priority,
            category: t.category,
            status: t.status
          }))
        })
      });

      if (!response.ok) {
        throw new Error("Sera is temporarily unavailable. Verify server connection.");
      }

      const data: AgentChatResponse = await response.json();
      
      // Keep track of what we mutations apply
      const mutationsApplied: NonNullable<ChatMessage["actionsApplied"]> = [];
      let nextTasks = [...tasks];
      let triggeredStrategyRefresh = false;

      // Apply any structural mutations returned by Gemini
      if (data.actions && data.actions.length > 0) {
        data.actions.forEach((act: AgentAction) => {
          if (act.type === "CREATE_TASK" && act.title) {
            const newT: Task = {
              id: `task-${crypto.randomUUID()}`,
              title: act.title,
              status: act.status || "todo",
              priority: act.priority || "medium",
              category: act.category || "General",
              dueDate: act.dueDate,
              subtasks: [],
              createdAt: new Date().toISOString()
            };
            nextTasks = [newT, ...nextTasks];
            mutationsApplied.push({
              type: "CREATE_TASK",
              taskTitle: act.title,
              details: `Created task "${act.title}" (${act.priority || "medium"} priority, Category: ${act.category || "General"})`
            });
          } else if (act.type === "UPDATE_TASK" && act.taskQuery) {
            const target = findMatchingTask(act.taskQuery, nextTasks);
            if (target) {
              const updates: Partial<Task> = {};
              if (act.title) updates.title = act.title;
              if (act.priority) updates.priority = act.priority;
              if (act.category) updates.category = act.category;
              if (act.dueDate) updates.dueDate = act.dueDate;
              if (act.status) updates.status = act.status;
              
              nextTasks = nextTasks.map(t => t.id === target.id ? { ...t, ...updates } : t);
              mutationsApplied.push({
                type: "UPDATE_TASK",
                taskTitle: target.title,
                details: `Updated "${target.title}" properties`
              });
            }
          } else if (act.type === "COMPLETE_TASK" && act.taskQuery) {
            const target = findMatchingTask(act.taskQuery, nextTasks);
            if (target) {
              nextTasks = nextTasks.map(t => t.id === target.id ? { ...t, status: "completed" } : t);
              mutationsApplied.push({
                type: "COMPLETE_TASK",
                taskTitle: target.title,
                details: `Marked "${target.title}" as completed`
              });
            }
          } else if (act.type === "UNCOMPLETE_TASK" && act.taskQuery) {
            const target = findMatchingTask(act.taskQuery, nextTasks);
            if (target) {
              nextTasks = nextTasks.map(t => t.id === target.id ? { ...t, status: "todo" } : t);
              mutationsApplied.push({
                type: "UNCOMPLETE_TASK",
                taskTitle: target.title,
                details: `Re-opened "${target.title}"`
              });
            }
          } else if (act.type === "DELETE_TASK" && act.taskQuery) {
            const target = findMatchingTask(act.taskQuery, nextTasks);
            if (target) {
              nextTasks = nextTasks.filter(t => t.id !== target.id);
              mutationsApplied.push({
                type: "DELETE_TASK",
                taskTitle: target.title,
                details: `Deleted task "${target.title}"`
              });
            }
          } else if (act.type === "GET_STRATEGY") {
            triggeredStrategyRefresh = true;
          }
        });

        setTasks(nextTasks);
      }

      // Append agent's conversation response
      const agentMsg: ChatMessage = {
        id: `msg-${crypto.randomUUID()}`,
        sender: "agent",
        text: data.message,
        timestamp: new Date().toISOString(),
        actionsApplied: mutationsApplied.length > 0 ? mutationsApplied : undefined
      };

      setMessages(prev => [...prev, agentMsg]);

      if (triggeredStrategyRefresh) {
        triggerFocusDigestUpdate(nextTasks);
      }

    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-${crypto.randomUUID()}`,
        sender: "agent",
        text: `Error processing request: ${err.message || "Something went wrong"}. Make sure the API service is alive.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Daily focus digest fetcher
  const triggerFocusDigestUpdate = async (currentTasksList = tasks) => {
    setIsDigestLoading(true);
    try {
      const response = await fetch("/api/agent/focus-digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: currentTasksList,
          currentDate: new Date().toISOString()
        })
      });
      if (response.ok) {
        const data = await response.json();
        setFocusDigest(data.digest);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDigestLoading(false);
    }
  };

  // AI-Powered subtask breakdown
  const handleTriggerBreakdown = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setBreakdownLoading(taskId, true);
    try {
      const response = await fetch("/api/agent/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: task.title,
          description: task.description
        })
      });

      if (!response.ok) throw new Error("Subtask service overloaded.");

      const data = await response.json();
      if (data.subtasks && Array.isArray(data.subtasks)) {
        const formattedSubtasks: Subtask[] = data.subtasks.map((title: string) => ({
          id: `sub-${crypto.randomUUID()}`,
          title,
          completed: false
        }));

        handleUpdateTask(taskId, {
          subtasks: [...task.subtasks, ...formattedSubtasks]
        });
      }
    } catch (err) {
      alert("Failed to compute subtasks. Verify Gemini integration.");
    } finally {
      setBreakdownLoading(taskId, false);
    }
  };

  const setBreakdownLoading = (taskId: string, loading: boolean) => {
    setIsBreakdownLoading(prev => ({ ...prev, [taskId]: loading }));
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#06080e] overflow-hidden text-slate-100 font-sans">
      
      {/* Top Banner Navigation (Universal Header) */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#090d16] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 p-[1px] flex items-center justify-center">
            <div className="w-full h-full rounded-xl bg-slate-950 flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
              <span>AI Agent Todo List</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">v1.2</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-mono">WORKSPACE_ID: ais-preview-dev-3000</p>
          </div>
        </div>

        {/* Responsive buttons for smaller displays */}
        <div className="flex lg:hidden border border-slate-800 bg-slate-950 p-0.5 rounded-lg">
          <button
            onClick={() => setMobileView('dashboard')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              mobileView === 'dashboard' ? 'bg-slate-800 text-white' : 'text-slate-400'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => setMobileView('chat')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              mobileView === 'chat' ? 'bg-slate-800 text-white' : 'text-slate-400'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Sera Copilot</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* Left Side: Copilot Panel (shown on large screen, or when toggled in mobile) */}
        <div className={`w-full lg:w-[380px] xl:w-[420px] shrink-0 h-full ${
          mobileView === 'chat' ? 'block' : 'hidden lg:block'
        }`}>
          <ChatPanel 
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isChatLoading}
            focusDigest={focusDigest}
            onRefreshDigest={() => triggerFocusDigestUpdate()}
            isDigestLoading={isDigestLoading}
          />
        </div>

        {/* Right Side: Interactive Task Workspace */}
        <div className={`flex-1 h-full min-w-0 ${
          mobileView === 'dashboard' ? 'block' : 'hidden lg:block'
        }`}>
          <TaskDashboard 
            tasks={tasks}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onTriggerBreakdown={handleTriggerBreakdown}
            isBreakdownLoading={isBreakdownLoading}
            onImportTasks={handleImportTasks}
          />
        </div>

      </div>

    </div>
  );
}
