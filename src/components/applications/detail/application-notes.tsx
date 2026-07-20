import { Pencil, StickyNote, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const notes = [
  {
    id: "interview-preparation",
    content:
      "Recruiter mentioned that the technical interview will focus on React, TypeScript and API design.",
    date: "July 19, 2026",
    dateTime: "2026-07-19",
  },
  {
    id: "company-research",
    content:
      "Review Kron products and prepare questions about their engineering culture.",
    date: "July 17, 2026",
    dateTime: "2026-07-17",
  },
] as const;

export function ApplicationNotes() {
  return (
    <Card size="sm" className="border border-slate-200 bg-white shadow-none ring-0">
      <CardHeader className="border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <StickyNote className="size-3.5" aria-hidden="true" />
          </span>
          <div>
            <CardTitle className="text-slate-950">Application Notes</CardTitle>
            <p className="mt-0.5 text-xs text-slate-500">Keep interview details in one place.</p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label htmlFor="application-note" className="text-xs font-medium text-slate-700">
            Add Note
          </label>
          <textarea
            id="application-note"
            name="application-note"
            rows={3}
            placeholder="Add a note about this application..."
            className="mt-2 block w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-900 shadow-none outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <div className="mt-2 flex justify-end">
            <Button type="button" size="sm" className="rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
              Save Note
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-2.5" aria-label="Saved notes">
          {notes.map((note) => (
            <article key={note.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-medium text-slate-600">
                  You
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium text-slate-900">You</p>
                      <time dateTime={note.dateTime} className="mt-0.5 block text-[11px] text-slate-400">
                        {note.date}
                      </time>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Edit note from ${note.date}`}
                        title="Edit note"
                        className="text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Delete note from ${note.date}`}
                        title="Delete note"
                        className="text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-600">{note.content}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
