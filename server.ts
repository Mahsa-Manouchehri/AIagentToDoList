import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const PORT = 3000;

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("⚠️ Warning: GEMINI_API_KEY environment variable is not defined.");
}

const ai = new GoogleGenAI({
  apiKey: apiKey || "MOCK_KEY",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", usingMockKey: !process.env.GEMINI_API_KEY });
  });

  // Chat parsing endpoint
  app.post("/api/agent/chat", async (req, res) => {
    try {
      const { text, currentDate, currentTasks } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "Text prompt is required." });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.json({
          message: `[Mock Agent Response] I don't have a live Gemini API key, but I parsed your message: "${text}". Please configure GEMINI_API_KEY in Settings > Secrets to enable actual intelligence!`,
          actions: [
            {
              type: "CREATE_TASK",
              title: text.substring(0, 30),
              priority: "medium",
              category: "General",
              status: "todo"
            }
          ]
        });
      }

      const taskContext = currentTasks && currentTasks.length > 0 
        ? `Here are the user's current tasks for context:\n${JSON.stringify(currentTasks, null, 2)}`
        : "The user currently has no tasks.";

      const prompt = `
User prompt: "${text}"
Current reference date: ${currentDate || new Date().toISOString()}

${taskContext}

Analyze the user's natural language request and identify all actions they intend to perform.
For updates, completions, or deletions, try to match the "taskQuery" to the closest existing task title.
If they are requesting a task creation, determine an appropriate priority (high, medium, low) and category (Work, Personal, Wellness, Study, Household, Finance, Shopping, Coding, etc.). If they mention a due date, translate it to a YYYY-MM-DD string based on the current reference date.
If they are just chatting or asking for strategy/advice, set the action type to 'GET_STRATEGY' and provide an encouraging strategy message.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are the brain of the 'AI Agent Todo List' app. Your job is to parse the user's natural language command, identify the actions they want to take, and return a structured JSON response matching the state modification schema. Keep responses friendly, encouraging, and motivational.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              message: {
                type: Type.STRING,
                description: "A conversational, warm, and highly encouraging reply summarizing what you did or offering productivity strategy.",
              },
              actions: {
                type: Type.ARRAY,
                description: "A list of actions to apply to the user's state.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: {
                      type: Type.STRING,
                      enum: ["CREATE_TASK", "UPDATE_TASK", "DELETE_TASK", "COMPLETE_TASK", "UNCOMPLETE_TASK", "GET_STRATEGY"],
                      description: "The structural action requested."
                    },
                    taskQuery: {
                      type: Type.STRING,
                      description: "For updates, completions, or deletions, the keyword/query used to locate the task."
                    },
                    title: {
                      type: Type.STRING,
                      description: "The exact title of the task to be created or updated."
                    },
                    priority: {
                      type: Type.STRING,
                      enum: ["low", "medium", "high"],
                      description: "The recommended or specified priority level."
                    },
                    category: {
                      type: Type.STRING,
                      description: "The category tag (e.g., Work, Personal, Health, Shopping, Coding, Finance, Study, Household)."
                    },
                    dueDate: {
                      type: Type.STRING,
                      description: "The due date in YYYY-MM-DD format."
                    },
                    status: {
                      type: Type.STRING,
                      enum: ["todo", "in_progress", "completed"]
                    }
                  },
                  required: ["type"]
                }
              }
            },
            required: ["message", "actions"]
          }
        }
      });

      const resultText = response.text || "{}";
      const data = JSON.parse(resultText);
      res.json(data);
    } catch (error: any) {
      console.error("Error in /api/agent/chat:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Subtask breakdown endpoint
  app.post("/api/agent/breakdown", async (req, res) => {
    try {
      const { title, description } = req.body;
      
      if (!title) {
        return res.status(400).json({ error: "Task title is required." });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.json({
          subtasks: [
            "Set up standard milestones",
            "Conduct initial evaluation",
            "Complete execution phase",
            "Perform final quality audit"
          ]
        });
      }

      const prompt = `
Break down this task into 3 to 5 realistic, concrete, and highly actionable subtasks/milestones:
Task Title: "${title}"
${description ? `Description: "${description}"` : ""}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an elite productivity strategist. You break down high-level or intimidating tasks into actionable, specific checklist items. Keep items short, punchy, and clear. Respond strictly with a JSON list of strings.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING
            },
            description: "List of 3 to 5 subtask titles."
          }
        }
      });

      const resultText = response.text || "[]";
      const subtasks = JSON.parse(resultText);
      res.json({ subtasks });
    } catch (error: any) {
      console.error("Error in /api/agent/breakdown:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Daily Strategy / Focus Digest Coach endpoint
  app.post("/api/agent/focus-digest", async (req, res) => {
    try {
      const { tasks, currentDate } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.json({
          digest: "Focus on your outstanding high priority items first. Break down any daunting tasks to make rapid, iterative progress!"
        });
      }

      const taskSummary = tasks && tasks.length > 0
        ? JSON.stringify(tasks.map((t: any) => ({
            title: t.title,
            priority: t.priority,
            status: t.status,
            dueDate: t.dueDate,
            category: t.category,
            subtasksCount: t.subtasks?.length || 0,
            completedSubtasks: t.subtasks?.filter((s: any) => s.completed).length || 0
          })), null, 2)
        : "No tasks created yet.";

      const prompt = `
Analyze the user's task ecosystem and compose a concise, personalized daily strategy guide:
Reference Date: ${currentDate || new Date().toISOString()}

Tasks List:
${taskSummary}

Provide a short daily focus digest (2 to 3 sentences maximum) highlighting:
1. Which 1-2 items are absolutely critical to focus on today.
2. A brief tip or encouraging strategy (e.g., matching categories or using task breakdowns).
Keep it conversational, warm, and zero-jargon. Do not print system variables or logs.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are 'Sera', a warm, clear, and incredibly wise focus coach. You inspire actions without sounding clinical. Focus on flow and energy management. Keep it to 2-3 inspiring sentences."
        }
      });

      res.json({ digest: response.text || "Take a deep breath. Start with your most meaningful goal and build positive momentum step-by-step!" });
    } catch (error: any) {
      console.error("Error in /api/agent/focus-digest:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
});
