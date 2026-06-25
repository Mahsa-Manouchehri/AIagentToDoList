export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in_progress' | 'completed';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: string;
  dueDate?: string; // ISO String (date only or datetime)
  subtasks: Subtask[];
  createdAt: string; // ISO String
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  actionsApplied?: {
    type: 'CREATE_TASK' | 'UPDATE_TASK' | 'DELETE_TASK' | 'COMPLETE_TASK' | 'UNCOMPLETE_TASK';
    taskTitle: string;
    details?: string;
  }[];
}

// Structured actions the agent can perform on the tasks
export type AgentActionType = 'CREATE_TASK' | 'UPDATE_TASK' | 'DELETE_TASK' | 'COMPLETE_TASK' | 'UNCOMPLETE_TASK' | 'GET_STRATEGY';

export interface AgentAction {
  type: AgentActionType;
  // For matches/updates
  taskQuery?: string;
  // Properties for creating or updating
  title?: string;
  priority?: TaskPriority;
  category?: string;
  dueDate?: string;
  status?: TaskStatus;
}

export interface AgentChatResponse {
  message: string;
  actions: AgentAction[];
}
