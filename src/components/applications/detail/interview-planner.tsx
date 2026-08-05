"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import {
  AlarmClock,
  CalendarClock,
  CalendarPlus,
  Check,
  CircleX,
  Clock3,
  ExternalLink,
  LoaderCircle,
  MapPin,
  Pencil,
  RotateCcw,
  Trash2,
  UserRound,
  Video,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  createApplicationInterview,
  deleteApplicationInterview,
  setApplicationInterviewStatus,
  updateApplicationInterview,
} from "@/src/server/actions/applications/application-interviews";
import type {
  ApplicationDetailInterview,
  ApplicationInterviewStatus,
} from "@/src/types/application";

type InterviewForm = {
  title: string;
  roundNumber: string;
  scheduledAt: string;
  durationMinutes: string;
  interviewerName: string;
  interviewerRole: string;
  location: string;
  meetingUrl: string;
  reminderMinutesBefore: string;
};

function emptyForm(roundNumber: number): InterviewForm {
  return {
    title: "Technical interview",
    roundNumber: String(roundNumber),
    scheduledAt: "",
    durationMinutes: "60",
    interviewerName: "",
    interviewerRole: "",
    location: "",
    meetingUrl: "",
    reminderMinutesBefore: "1440",
  };
}

function toLocalDateTime(value: string): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formFromInterview(interview: ApplicationDetailInterview): InterviewForm {
  return {
    title: interview.title,
    roundNumber: String(interview.roundNumber),
    scheduledAt: toLocalDateTime(interview.scheduledAt),
    durationMinutes: String(interview.durationMinutes),
    interviewerName: interview.interviewerName ?? "",
    interviewerRole: interview.interviewerRole ?? "",
    location: interview.location ?? "",
    meetingUrl: interview.meetingUrl ?? "",
    reminderMinutesBefore:
      interview.reminderMinutesBefore === null
        ? "none"
        : String(interview.reminderMinutesBefore),
  };
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const statusMeta: Record<
  ApplicationInterviewStatus,
  { label: string; className: string }
> = {
  SCHEDULED: { label: "Scheduled", className: "bg-indigo-50 text-indigo-700" },
  COMPLETED: { label: "Completed", className: "bg-emerald-50 text-emerald-700" },
  CANCELLED: { label: "Cancelled", className: "bg-slate-100 text-slate-500" },
};

export function InterviewPlanner({
  slug,
  company,
  role,
  interviews,
}: {
  slug: string;
  company: string;
  role: string;
  interviews: readonly ApplicationDetailInterview[];
}) {
  const router = useRouter();
  const nextRound = Math.max(0, ...interviews.map((item) => item.roundNumber)) + 1;
  const [showForm, setShowForm] = useState(interviews.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<InterviewForm>(() => emptyForm(nextRound));
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const upcoming = interviews.filter((item) => item.status === "SCHEDULED");
  const history = interviews.filter((item) => item.status !== "SCHEDULED");

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm(nextRound));
    setShowForm(false);
  }

  function setField(field: keyof InterviewForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function runMutation(
    id: string,
    mutation: () => Promise<{ success: boolean; formError?: string }>,
    onSuccess?: () => void,
  ) {
    if (isPending) return;
    setError(null);
    setActiveId(id);
    startTransition(async () => {
      try {
        const result = await mutation();
        if (!result.success) {
          setError(result.formError ?? "The interview update could not be completed.");
          return;
        }
        onSuccess?.();
        router.refresh();
      } catch {
        setError("The interview update could not be completed. Please try again.");
      } finally {
        setActiveId(null);
      }
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const scheduledAt = new Date(form.scheduledAt);
    if (!form.scheduledAt || Number.isNaN(scheduledAt.getTime())) {
      setError("Choose a valid interview date and time.");
      return;
    }
    const payload = {
      slug,
      title: form.title,
      roundNumber: Number(form.roundNumber),
      scheduledAt: scheduledAt.toISOString(),
      durationMinutes: Number(form.durationMinutes),
      interviewerName: form.interviewerName,
      interviewerRole: form.interviewerRole,
      location: form.location,
      meetingUrl: form.meetingUrl,
      reminderMinutesBefore:
        form.reminderMinutesBefore === "none"
          ? null
          : Number(form.reminderMinutesBefore),
    };

    runMutation(editingId ?? "new-interview", () =>
      editingId
        ? updateApplicationInterview({ ...payload, interviewId: editingId })
        : createApplicationInterview(payload), resetForm);
  }

  function editInterview(interview: ApplicationDetailInterview) {
    setEditingId(interview.id);
    setForm(formFromInterview(interview));
    setShowForm(true);
    window.requestAnimationFrame(() => {
      document.getElementById("interview-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function updateStatus(id: string, status: ApplicationInterviewStatus) {
    runMutation(id, () =>
      setApplicationInterviewStatus({ slug, interviewId: id, status }),
    );
  }

  return (
    <div className="space-y-4">
      <Card size="sm" className="border border-slate-200 shadow-none ring-0">
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <CalendarClock className="size-3.5" aria-hidden="true" />
              </span>
              <div>
                <CardTitle>Interview Planner</CardTitle>
                <p className="mt-0.5 text-xs text-slate-500">
                  Schedule every round for {role} at {company}.
                </p>
              </div>
            </div>
            {!showForm ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setForm(emptyForm(nextRound));
                  setEditingId(null);
                  setShowForm(true);
                }}
              >
                <CalendarPlus aria-hidden="true" /> Schedule interview
              </Button>
            ) : null}
          </div>
        </CardHeader>
        {showForm ? (
          <CardContent id="interview-form">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="interview-title">Interview title</Label>
                  <Input id="interview-title" maxLength={160} value={form.title} onChange={(event) => setField("title", event.target.value)} placeholder="Technical interview" disabled={isPending} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="interview-round">Round</Label>
                  <Input id="interview-round" type="number" min={1} max={20} value={form.roundNumber} onChange={(event) => setField("roundNumber", event.target.value)} disabled={isPending} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="interview-duration">Duration</Label>
                  <select id="interview-duration" value={form.durationMinutes} onChange={(event) => setField("durationMinutes", event.target.value)} disabled={isPending} className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700">
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes</option>
                    <option value="90">90 minutes</option>
                    <option value="120">120 minutes</option>
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="interview-date">Date and time</Label>
                  <Input id="interview-date" type="datetime-local" value={form.scheduledAt} onChange={(event) => setField("scheduledAt", event.target.value)} disabled={isPending} />
                  <p className="text-[11px] text-slate-400">Saved in UTC and displayed in your current timezone.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="interviewer-name">Interviewer</Label>
                  <Input id="interviewer-name" maxLength={160} value={form.interviewerName} onChange={(event) => setField("interviewerName", event.target.value)} placeholder="Name" disabled={isPending} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="interviewer-role">Interviewer role</Label>
                  <Input id="interviewer-role" maxLength={160} value={form.interviewerRole} onChange={(event) => setField("interviewerRole", event.target.value)} placeholder="Engineering Manager" disabled={isPending} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="interview-location">Location / platform</Label>
                  <Input id="interview-location" maxLength={300} value={form.location} onChange={(event) => setField("location", event.target.value)} placeholder="Google Meet, Zoom, office…" disabled={isPending} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="interview-url">Meeting link</Label>
                  <Input id="interview-url" type="url" maxLength={2048} value={form.meetingUrl} onChange={(event) => setField("meetingUrl", event.target.value)} placeholder="https://meet.google.com/…" disabled={isPending} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="interview-reminder">Reminder</Label>
                  <select id="interview-reminder" value={form.reminderMinutesBefore} onChange={(event) => setField("reminderMinutesBefore", event.target.value)} disabled={isPending} className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700">
                    <option value="none">No automatic reminder</option>
                    <option value="15">15 minutes before</option>
                    <option value="60">1 hour before</option>
                    <option value="1440">1 day before</option>
                    <option value="2880">2 days before</option>
                    <option value="10080">1 week before</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" disabled={isPending} onClick={resetForm}><X aria-hidden="true" /> Cancel</Button>
                <Button type="submit" disabled={isPending || !form.title.trim() || !form.scheduledAt}>
                  {activeId === (editingId ?? "new-interview") ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <CalendarPlus aria-hidden="true" />}
                  {editingId ? "Save changes" : "Schedule interview"}
                </Button>
              </div>
            </form>
          </CardContent>
        ) : null}
      </Card>

      {error ? (
        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>
      ) : null}

      <section aria-labelledby="scheduled-interviews-title">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 id="scheduled-interviews-title" className="text-sm font-semibold text-slate-900">Scheduled interviews</h2>
          <span className="text-xs text-slate-400">{upcoming.length} rounds</span>
        </div>
        <div className="space-y-3">
          {upcoming.map((interview) => {
            const pastDue = new Date(interview.scheduledAt) < new Date();
            return (
              <Card key={interview.id} size="sm" className={cn("border shadow-none ring-0", pastDue ? "border-amber-200 bg-amber-50/30" : "border-slate-200")}>
                <CardContent>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-indigo-50 text-indigo-700">Round {interview.roundNumber}</Badge>
                        {pastDue ? <Badge className="bg-amber-50 text-amber-700">Past due</Badge> : null}
                        {interview.reminderId ? <span className="inline-flex items-center gap-1 text-[11px] text-slate-400"><AlarmClock className="size-3" /> Reminder active</span> : null}
                      </div>
                      <h3 className="mt-2 text-sm font-semibold text-slate-950">{interview.title}</h3>
                      <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                        <p className="flex items-center gap-2"><CalendarClock className="size-3.5 text-slate-400" /> {formatDateTime(interview.scheduledAt)}</p>
                        <p className="flex items-center gap-2"><Clock3 className="size-3.5 text-slate-400" /> {interview.durationMinutes} minutes</p>
                        {interview.interviewerName || interview.interviewerRole ? <p className="flex items-center gap-2"><UserRound className="size-3.5 text-slate-400" /> {[interview.interviewerName, interview.interviewerRole].filter(Boolean).join(" · ")}</p> : null}
                        {interview.location ? <p className="flex items-center gap-2"><MapPin className="size-3.5 text-slate-400" /> {interview.location}</p> : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {interview.meetingUrl ? <Button variant="outline" size="sm" nativeButton={false} render={<a href={interview.meetingUrl} target="_blank" rel="noreferrer" />}><Video aria-hidden="true" /> Join call <ExternalLink aria-hidden="true" /></Button> : null}
                      <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => editInterview(interview)}><Pencil aria-hidden="true" /> Edit</Button>
                      <Button type="button" size="sm" disabled={isPending} onClick={() => updateStatus(interview.id, "COMPLETED")}>{activeId === interview.id ? <LoaderCircle className="animate-spin" /> : <Check />} Complete</Button>
                      <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={() => updateStatus(interview.id, "CANCELLED")}><CircleX aria-hidden="true" /> Cancel</Button>
                      <Button type="button" variant="ghost" size="icon-sm" className="text-slate-400 hover:bg-rose-50 hover:text-rose-600" disabled={isPending} aria-label="Delete interview" onClick={() => { if (window.confirm("Delete this interview and its automatic reminder?")) runMutation(interview.id, () => deleteApplicationInterview({ slug, interviewId: interview.id })); }}><Trash2 aria-hidden="true" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {upcoming.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center"><CalendarClock className="mx-auto size-6 text-slate-300" /><p className="mt-2 text-sm font-medium text-slate-700">No scheduled interviews</p><p className="mt-1 text-xs text-slate-500">Add the next round when the recruiter confirms it.</p></div> : null}
        </div>
      </section>

      {history.length ? (
        <section aria-labelledby="interview-history-title">
          <h2 id="interview-history-title" className="mb-2 text-sm font-semibold text-slate-900">Interview history</h2>
          <div className="space-y-2">
            {history.map((interview) => {
              const meta = statusMeta[interview.status];
              return <article key={interview.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge className={meta.className}>{meta.label}</Badge><span className="text-[11px] text-slate-400">Round {interview.roundNumber}</span></div><p className="mt-1.5 text-sm font-medium text-slate-800">{interview.title}</p><p className="mt-1 text-xs text-slate-500">{formatDateTime(interview.scheduledAt)}</p></div><div className="flex gap-1.5"><Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => updateStatus(interview.id, "SCHEDULED")}><RotateCcw aria-hidden="true" /> Restore</Button><Button type="button" variant="ghost" size="icon-sm" className="text-slate-400 hover:bg-rose-50 hover:text-rose-600" disabled={isPending} aria-label="Delete interview" onClick={() => { if (window.confirm("Delete this interview?")) runMutation(interview.id, () => deleteApplicationInterview({ slug, interviewId: interview.id })); }}><Trash2 aria-hidden="true" /></Button></div></article>;
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
