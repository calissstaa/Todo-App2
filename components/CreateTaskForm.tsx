"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import { Task } from "@/types/models";

interface CreateTaskFormProps {
  onSubmit: (
    title: string,
    description: string,
    label: Task["label"] | null,
    dueDate: Date | null
  ) => Promise<void>;
}

export function CreateTaskForm({ onSubmit }: CreateTaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [label, setLabel] = useState<Task["label"] | null>(null);

  // 🔑 UI state uses undefined (NOT null)
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit(
        title,
        description,
        label,
        dueDate ?? null // 🔥 convert undefined → null for backend
      );

      // Reset form
      setTitle("");
      setDescription("");
      setLabel(null);
      setDueDate(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <Label>Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter task title"
          required
        />
      </div>

      {/* Description */}
      <div>
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter task description"
          rows={3}
        />
      </div>

      {/* Label */}
      <div>
        <Label>Label</Label>
        <Select
          value={label ?? ""}
          onValueChange={(value) =>
            setLabel(value as Task["label"])
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a label" />
          </SelectTrigger>
          <SelectContent>
            {labels.map((l) => (
              <SelectItem key={l.value} value={l.value}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Due Date */}
      <div>
        <Label>Due Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !dueDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dueDate ? format(dueDate, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dueDate}
              onSelect={(day) => setDueDate(day)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Submit */}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Creating..." : "Create Task"}
      </Button>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </form>
  );
}
