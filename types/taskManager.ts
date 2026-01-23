import { Task } from "@/types/models";

export interface TaskState {
  task: Task | null;
  date: Date | undefined;
  error: string | null;
  isLoading: boolean;
}

export interface TasksState {
  tasks: Task[];
}

export interface TaskOperations {
  setDate: (date: Date | undefined) => void;
  updateTask: (updates: Partial<Task>) => void;
  saveTask: (taskToSave?: Task) => Promise<void>;
  uploadImage: (file: File) => Promise<void>;
  removeImage: () => Promise<void>;
}

export interface TasksOperations {
  createTask: (
    title: string,
    description: string,
    label: Task["label"] | null,
    dueDate: Date | null
  ) => Promise<Task>;

  deleteTask: (taskId: string) => Promise<void>;
  toggleTaskComplete: (taskId: string, completed: boolean) => Promise<void>;
  refreshTasks: () => Promise<void>;
}
