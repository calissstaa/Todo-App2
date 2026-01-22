import { useState, useEffect } from "react";
import { Task } from "@/types/models";
import { createBrowserClient } from "@supabase/ssr";
import {
  TaskState,
  TasksState,
  TaskOperations,
  TasksOperations,
} from "@/types/taskManager";

const AI_ENABLED = false;
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

interface UseTaskManagerReturn
  extends TaskState,
    TasksState,
    TaskOperations,
    TasksOperations {}

export function useTaskManager(taskId?: string): UseTaskManagerReturn {
  // ─────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────
  const [task, setTask] = useState<Task | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ─────────────────────────────────────────────
  // FETCH SINGLE TASK
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!taskId) return;

    const fetchTask = async () => {
      try {
        const { data, error } = await supabase
          .from("tasks")
          .select("*")
          .eq("task_id", taskId)
          .single();

        if (error) throw error;

        setTask(data);
        setDate(data.due_date ? new Date(data.due_date) : undefined);
      } catch (err: any) {
        console.error("Error fetching task:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTask();
  }, [taskId]);

  // ─────────────────────────────────────────────
  // FETCH ALL TASKS
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (taskId) return;
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTasks(data || []);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching tasks:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // SINGLE TASK OPERATIONS
  // ─────────────────────────────────────────────
  const updateTask = (updates: Partial<Task>) => {
    setTask((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const saveTask = async (taskToSave?: Task) => {
    try {
      const taskData = taskToSave || task;
      if (!taskData) throw new Error("No task data to save");

      const { error } = await supabase
        .from("tasks")
        .update({
          ...taskData,
          due_date: date ? date.toISOString() : null, // ✅ KEEP TIME
          updated_at: new Date().toISOString(),
        })
        .eq("task_id", taskData.task_id);

      if (error) throw error;
    } catch (err: any) {
      console.error("Error saving task:", err);
      setError(err.message);
      throw err;
    }
  };

  // ─────────────────────────────────────────────
  // CREATE TASK (WITH LABEL + DATETIME)
  // ─────────────────────────────────────────────
  const createTask = async (
    title: string,
    description: string,
    label: Task["label"] | null,
    dueDate: Date | null
  ) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          user_id: session.user.id,
          title,
          description,
          label,
          due_date: dueDate ? dueDate.toISOString() : null,
          completed: false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setTasks((prev) => [data, ...prev]);
      return data;
    } catch (err: any) {
      console.error("Error creating task:", err);
      setError(err.message);
      throw err;
    }
  };

  // ─────────────────────────────────────────────
  // DELETE TASK
  // ─────────────────────────────────────────────
  const deleteTask = async (taskIdToDelete: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("task_id", taskIdToDelete);

      if (error) throw error;

      setTasks((prev) =>
        prev.filter((t) => t.task_id !== taskIdToDelete)
      );
    } catch (err: any) {
      console.error("Error deleting task:", err);
      setError(err.message);
      throw err;
    }
  };

  // ─────────────────────────────────────────────
  // TOGGLE COMPLETE
  // ─────────────────────────────────────────────
  const toggleTaskComplete = async (
    taskIdToToggle: string,
    completed: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ completed })
        .eq("task_id", taskIdToToggle);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((t) =>
          t.task_id === taskIdToToggle ? { ...t, completed } : t
        )
      );
    } catch (err: any) {
      console.error("Error toggling task:", err);
      setError(err.message);
      throw err;
    }
  };

  // ─────────────────────────────────────────────
  // IMAGE UPLOAD
  // ─────────────────────────────────────────────
  const uploadImage = async (file: File) => {
    try {
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("File size must be less than 1MB");
      }

      if (!task) throw new Error("No task found");

      const fileExt = file.name.split(".").pop();
      const fileName = `${task.user_id}/${task.task_id}.${fileExt}`;

      const { error } = await supabase.storage
        .from("task-attachments")
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type,
        });

      if (error) throw error;

      const updatedTask = { ...task, image_url: fileName };
      setTask(updatedTask);
      await saveTask(updatedTask);
    } catch (err: any) {
      console.error("Error uploading image:", err);
      setError(err.message);
      throw err;
    }
  };

  const removeImage = async () => {
    try {
      if (!task?.image_url) return;

      const { error } = await supabase.storage
        .from("task-attachments")
        .remove([task.image_url]);

      if (error) throw error;

      const updatedTask = { ...task, image_url: null };
      setTask(updatedTask);
      await saveTask(updatedTask);
    } catch (err: any) {
      console.error("Error removing image:", err);
      setError(err.message);
      throw err;
    }
  };

  // ─────────────────────────────────────────────
  // REFRESH
  // ─────────────────────────────────────────────
  const refreshTasks = async () => {
    setIsLoading(true);
    await fetchTasks();
  };

  return {
    task,
    tasks,
    date,
    error,
    isLoading,

    setDate,
    updateTask,
    saveTask,
    uploadImage,
    removeImage,

    createTask,
    deleteTask,
    toggleTaskComplete,
    refreshTasks,
  };
}
