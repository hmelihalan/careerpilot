"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellRing,
  Check,
  CircleCheck,
  LoaderCircle,
  Pencil,
  RotateCcw,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createApplicationNote,
  deleteApplicationNote,
  updateApplicationNote,
} from "@/src/server/actions/applications/application-notes";
import {
  createApplicationReminder,
  deleteApplicationReminder,
  setApplicationReminderCompletion,
} from "@/src/server/actions/applications/application-reminders";
import type {
  ApplicationDetailNote,
  ApplicationDetailReminder,
} from "@/src/types/application";

const mockNotes: readonly ApplicationDetailNote[] = [
  {
    id: "interview-preparation",
    content:
      "Recruiter mentioned that the technical interview will focus on React, TypeScript and API design.",
    createdAt: "2026-07-19T09:30:00.000Z",
    updatedAt: "2026-07-19T09:30:00.000Z",
  },
  {
    id: "company-research",
    content: "Review company products and prepare questions about engineering culture.",
    createdAt: "2026-07-17T12:00:00.000Z",
    updatedAt: "2026-07-17T12:00:00.000Z",
  },
];

const mockReminders: readonly ApplicationDetailReminder[] = [
  {
    id: "follow-up",
    title: "Send recruiter follow-up",
    remindAt: "2026-08-05T09:00:00.000Z",
    completedAt: null,
    createdAt: "2026-08-01T09:00:00.000Z",
    updatedAt: "2026-08-01T09:00:00.000Z",
  },
];

type ApplicationNotesProps =
  | { demo: true; slug?: never; notes?: never; reminders?: never }
  | {
      demo?: false;
      slug: string;
      notes: readonly ApplicationDetailNote[];
      reminders: readonly ApplicationDetailReminder[];
    };

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ApplicationNotes(props: ApplicationNotesProps) {
  const demo = props.demo === true;
  const notes = demo ? mockNotes : props.notes;
  const reminders = demo ? mockReminders : props.reminders;
  const slug = demo ? "" : props.slug;
  const router = useRouter();
  const [noteContent, setNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string>();
  const [editingContent, setEditingContent] = useState("");
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [formError, setFormError] = useState<string>();
  const [activeRecordId, setActiveRecordId] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function runMutation(recordId: string, mutation: () => Promise<{ success: boolean; formError?: string }>, onSuccess?: () => void) {
    if (demo || isPending) return;
    setFormError(undefined);
    setActiveRecordId(recordId);

    startTransition(async () => {
      try {
        const result = await mutation();
        if (!result.success) {
          setFormError(result.formError ?? "The update could not be completed.");
          return;
        }

        onSuccess?.();
        router.refresh();
      } catch {
        setFormError("The update could not be completed. Please try again.");
      } finally {
        setActiveRecordId(undefined);
      }
    });
  }

  function handleCreateNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runMutation("new-note", () => createApplicationNote({ slug, content: noteContent }), () => {
      setNoteContent("");
    });
  }

  function handleUpdateNote(event: FormEvent<HTMLFormElement>, noteId: string) {
    event.preventDefault();
    runMutation(noteId, () =>
      updateApplicationNote({ slug, noteId, content: editingContent }), () => {
        setEditingNoteId(undefined);
        setEditingContent("");
      });
  }

  function handleCreateReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const remindAt = new Date(reminderDate);
    if (!reminderDate || Number.isNaN(remindAt.getTime())) {
      setFormError("Choose a valid reminder date and time.");
      return;
    }

    runMutation(
      "new-reminder",
      () =>
        createApplicationReminder({
          slug,
          title: reminderTitle,
          remindAt: remindAt.toISOString(),
        }),
      () => {
        setReminderTitle("");
        setReminderDate("");
      },
    );
  }

  return (
    <div className="space-y-3">
      {formError ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
        >
          {formError}
        </p>
      ) : null}
      <div className="grid items-start gap-4 xl:grid-cols-2">
      <Card size="sm" className="border border-slate-200 bg-white shadow-none ring-0">
        <CardHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <StickyNote className="size-3.5" aria-hidden="true" />
            </span>
            <div>
              <CardTitle className="text-slate-950">Application Notes</CardTitle>
              <p className="mt-0.5 text-xs text-slate-500">
                {demo ? "Preview notes are read-only." : "Keep context, contacts, and next steps together."}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleCreateNote} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <label htmlFor="application-note" className="text-xs font-medium text-slate-700">
              Add note
            </label>
            <Textarea
              id="application-note"
              name="application-note"
              rows={3}
              maxLength={5_000}
              value={noteContent}
              onChange={(event) => setNoteContent(event.target.value)}
              placeholder={demo ? "Sign in to save notes." : "Interview details, recruiter feedback, or research…"}
              disabled={demo || isPending}
              className="mt-2 bg-white text-xs leading-5"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">{noteContent.length}/5000</span>
              <Button type="submit" size="sm" disabled={demo || isPending || !noteContent.trim()}>
                {activeRecordId === "new-note" ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
                Save note
              </Button>
            </div>
          </form>

          <div className="mt-4 space-y-2.5" aria-label="Saved notes">
            {notes.length > 0 ? notes.map((note) => {
              const editing = editingNoteId === note.id;
              return (
                <article key={note.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  {editing ? (
                    <form onSubmit={(event) => handleUpdateNote(event, note.id)}>
                      <Textarea
                        aria-label="Edit note"
                        rows={4}
                        maxLength={5_000}
                        value={editingContent}
                        onChange={(event) => setEditingContent(event.target.value)}
                        disabled={isPending}
                        autoFocus
                        className="text-xs leading-5"
                      />
                      <div className="mt-2 flex justify-end gap-1.5">
                        <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => setEditingNoteId(undefined)}>
                          <X aria-hidden="true" /> Cancel
                        </Button>
                        <Button type="submit" size="sm" disabled={isPending || !editingContent.trim()}>
                          {activeRecordId === note.id ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
                          Save
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-start gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-medium text-slate-600">You</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <time dateTime={note.createdAt} className="text-[11px] text-slate-400">
                            {formatDateTime(note.createdAt)}{note.updatedAt !== note.createdAt ? " · edited" : ""}
                          </time>
                          <div className="flex shrink-0 items-center gap-0.5">
                            <Button type="button" variant="ghost" size="icon-xs" disabled={demo || isPending} aria-label="Edit note" onClick={() => { setEditingNoteId(note.id); setEditingContent(note.content); }}>
                              <Pencil aria-hidden="true" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon-xs" disabled={demo || isPending} aria-label="Delete note" className="text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => {
                              if (window.confirm("Delete this note?")) {
                                runMutation(note.id, () => deleteApplicationNote({ slug, noteId: note.id }));
                              }
                            }}>
                              {activeRecordId === note.id ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
                            </Button>
                          </div>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{note.content}</p>
                      </div>
                    </div>
                  )}
                </article>
              );
            }) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                <p className="text-sm font-medium text-slate-700">No notes yet</p>
                <p className="mt-1 text-xs text-slate-500">Add context you will want before the next conversation.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card size="sm" className="border border-slate-200 bg-white shadow-none ring-0">
        <CardHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <BellRing className="size-3.5" aria-hidden="true" />
            </span>
            <div>
              <CardTitle className="text-slate-950">Follow-up Reminders</CardTitle>
              <p className="mt-0.5 text-xs text-slate-500">
                {demo ? "Preview reminders are read-only." : "Schedule the next action and mark it complete."}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleCreateReminder} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <label htmlFor="reminder-title" className="text-xs font-medium text-slate-700">Reminder</label>
            <Input id="reminder-title" maxLength={200} value={reminderTitle} onChange={(event) => setReminderTitle(event.target.value)} placeholder="Send recruiter follow-up" disabled={demo || isPending} className="mt-2 bg-white text-xs" />
            <label htmlFor="reminder-date" className="mt-3 block text-xs font-medium text-slate-700">Date and time</label>
            <Input id="reminder-date" type="datetime-local" value={reminderDate} onChange={(event) => setReminderDate(event.target.value)} disabled={demo || isPending} className="mt-2 bg-white text-xs" />
            <div className="mt-2 flex justify-end">
              <Button type="submit" size="sm" disabled={demo || isPending || !reminderTitle.trim() || !reminderDate}>
                {activeRecordId === "new-reminder" ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Bell aria-hidden="true" />}
                Set reminder
              </Button>
            </div>
          </form>

          <div className="mt-4 space-y-2.5" aria-label="Application reminders">
            {reminders.length > 0 ? reminders.map((reminder) => {
              const completed = reminder.completedAt !== null;
              const overdue = !completed && new Date(reminder.remindAt) < new Date();
              return (
                <article key={reminder.id} className={`rounded-xl border p-3 ${completed ? "border-slate-200 bg-slate-50" : overdue ? "border-red-200 bg-red-50/40" : "border-amber-200 bg-amber-50/40"}`}>
                  <div className="flex items-start gap-3">
                    <button type="button" disabled={demo || isPending} aria-label={completed ? "Mark reminder incomplete" : "Mark reminder complete"} onClick={() => runMutation(reminder.id, () => setApplicationReminderCompletion({ slug, reminderId: reminder.id, completed: !completed }))} className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed ${completed ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-slate-300 bg-white text-transparent hover:border-emerald-300 hover:text-emerald-500"}`}>
                      {activeRecordId === reminder.id ? <LoaderCircle className="size-3.5 animate-spin text-slate-500" aria-hidden="true" /> : <Check className="size-3.5" aria-hidden="true" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`text-xs font-medium ${completed ? "text-slate-500 line-through" : "text-slate-900"}`}>{reminder.title}</p>
                          <time dateTime={reminder.remindAt} className={`mt-1 block text-[11px] ${overdue ? "font-medium text-red-600" : "text-slate-500"}`}>
                            {overdue ? "Overdue · " : ""}{formatDateTime(reminder.remindAt)}
                          </time>
                        </div>
                        <div className="flex shrink-0 gap-0.5">
                          {completed ? (
                            <Button type="button" variant="ghost" size="icon-xs" disabled={demo || isPending} aria-label="Restore reminder" onClick={() => runMutation(reminder.id, () => setApplicationReminderCompletion({ slug, reminderId: reminder.id, completed: false }))}>
                              <RotateCcw aria-hidden="true" />
                            </Button>
                          ) : null}
                          <Button type="button" variant="ghost" size="icon-xs" disabled={demo || isPending} aria-label="Delete reminder" className="text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => {
                            if (window.confirm("Delete this reminder?")) {
                              runMutation(reminder.id, () => deleteApplicationReminder({ slug, reminderId: reminder.id }));
                            }
                          }}>
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            }) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                <CircleCheck className="mx-auto size-5 text-slate-400" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-slate-700">Nothing to follow up</p>
                <p className="mt-1 text-xs text-slate-500">Set a reminder for the next recruiter or interview action.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
