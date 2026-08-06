"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import {
  AlarmClock,
  CheckCircle2,
  ExternalLink,
  History,
  Link2,
  LoaderCircle,
  Mail,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  createApplicationContact,
  deleteApplicationContact,
  logApplicationContact,
  updateApplicationContact,
} from "@/src/server/actions/applications/application-contacts";
import type {
  ApplicationContactType,
  ApplicationDetailContact,
} from "@/src/types/application";

type ContactForm = {
  name: string;
  contactType: ApplicationContactType;
  role: string;
  email: string;
  linkedinUrl: string;
  lastContactedAt: string;
  nextFollowUpAt: string;
};

const contactTypeMeta: Record<ApplicationContactType, string> = {
  RECRUITER: "Recruiter",
  HIRING_MANAGER: "Hiring manager",
  INTERVIEWER: "Interviewer",
  REFERRAL: "Referral",
  OTHER: "Other",
};

const emptyForm: ContactForm = {
  name: "",
  contactType: "RECRUITER",
  role: "",
  email: "",
  linkedinUrl: "",
  lastContactedAt: "",
  nextFollowUpAt: "",
};

function toLocalDateTime(value: string): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formFromContact(contact: ApplicationDetailContact): ContactForm {
  return {
    name: contact.name,
    contactType: contact.contactType,
    role: contact.role ?? "",
    email: contact.email ?? "",
    linkedinUrl: contact.linkedinUrl ?? "",
    lastContactedAt: contact.lastContactedAt
      ? toLocalDateTime(contact.lastContactedAt)
      : "",
    nextFollowUpAt: contact.nextFollowUpAt
      ? toLocalDateTime(contact.nextFollowUpAt)
      : "",
  };
}

function toIsoOrNull(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ContactCrm({
  slug,
  company,
  contacts,
}: {
  slug: string;
  company: string;
  contacts: readonly ApplicationDetailContact[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(contacts.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function setField<Key extends keyof ContactForm>(
    field: Key,
    value: ContactForm[Key],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
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
          setError(result.formError ?? "The contact update could not be completed.");
          return;
        }
        onSuccess?.();
        router.refresh();
      } catch {
        setError("The contact update could not be completed. Please try again.");
      } finally {
        setActiveId(null);
      }
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      slug,
      name: form.name,
      contactType: form.contactType,
      role: form.role,
      email: form.email,
      linkedinUrl: form.linkedinUrl,
      lastContactedAt: toIsoOrNull(form.lastContactedAt),
      nextFollowUpAt: toIsoOrNull(form.nextFollowUpAt),
    };

    runMutation(
      editingId ?? "new-contact",
      () =>
        editingId
          ? updateApplicationContact({ ...payload, contactId: editingId })
          : createApplicationContact(payload),
      resetForm,
    );
  }

  function startEditing(contact: ApplicationDetailContact) {
    setEditingId(contact.id);
    setForm(formFromContact(contact));
    setShowForm(true);
    window.requestAnimationFrame(() => {
      document.getElementById("contact-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function removeContact(contact: ApplicationDetailContact) {
    if (!window.confirm(`Delete ${contact.name} from this application?`)) return;
    runMutation(contact.id, () =>
      deleteApplicationContact({ slug, contactId: contact.id }),
    );
  }

  return (
    <div className="space-y-4">
      <Card size="sm" className="border border-slate-200 shadow-none ring-0">
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <UsersRound className="size-3.5" aria-hidden="true" />
              </span>
              <div>
                <CardTitle>Contact & Recruiter CRM</CardTitle>
                <p className="mt-0.5 text-xs text-slate-500">
                  Keep every relationship for {company} in one place.
                </p>
              </div>
            </div>
            {!showForm ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                  setShowForm(true);
                }}
              >
                <Plus aria-hidden="true" /> Add contact
              </Button>
            ) : null}
          </div>
        </CardHeader>

        {showForm ? (
          <CardContent id="contact-form">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="contact-name">Name</Label>
                  <Input
                    id="contact-name"
                    maxLength={160}
                    value={form.name}
                    onChange={(event) => setField("name", event.target.value)}
                    placeholder="Alex Morgan"
                    autoComplete="name"
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact-type">Contact type</Label>
                  <select
                    id="contact-type"
                    value={form.contactType}
                    onChange={(event) =>
                      setField(
                        "contactType",
                        event.target.value as ApplicationContactType,
                      )
                    }
                    disabled={isPending}
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700"
                  >
                    {Object.entries(contactTypeMeta).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact-role">Role / title</Label>
                  <Input
                    id="contact-role"
                    maxLength={160}
                    value={form.role}
                    onChange={(event) => setField("role", event.target.value)}
                    placeholder="Senior Technical Recruiter"
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact-email">Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    maxLength={254}
                    value={form.email}
                    onChange={(event) => setField("email", event.target.value)}
                    placeholder="alex@company.com"
                    autoComplete="email"
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="contact-linkedin">LinkedIn profile</Label>
                  <Input
                    id="contact-linkedin"
                    type="url"
                    maxLength={2048}
                    value={form.linkedinUrl}
                    onChange={(event) => setField("linkedinUrl", event.target.value)}
                    placeholder="https://www.linkedin.com/in/..."
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact-last-contacted">Last contacted</Label>
                  <Input
                    id="contact-last-contacted"
                    type="datetime-local"
                    value={form.lastContactedAt}
                    onChange={(event) =>
                      setField("lastContactedAt", event.target.value)
                    }
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact-next-follow-up">Next follow-up</Label>
                  <Input
                    id="contact-next-follow-up"
                    type="datetime-local"
                    value={form.nextFollowUpAt}
                    onChange={(event) =>
                      setField("nextFollowUpAt", event.target.value)
                    }
                    disabled={isPending}
                  />
                  <p className="text-[11px] text-slate-400">
                    Creates an automatic dashboard reminder.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm} disabled={isPending}>
                  <X aria-hidden="true" /> Cancel
                </Button>
                <Button type="submit" disabled={isPending || !form.name.trim()}>
                  {activeId === (editingId ?? "new-contact") ? (
                    <LoaderCircle className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Plus aria-hidden="true" />
                  )}
                  {editingId ? "Save changes" : "Add contact"}
                </Button>
              </div>
            </form>
          </CardContent>
        ) : null}
      </Card>

      {error ? (
        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          {error}
        </p>
      ) : null}

      <section aria-labelledby="application-contacts-title">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 id="application-contacts-title" className="text-sm font-semibold text-slate-900">
            Saved contacts
          </h2>
          <span className="text-xs text-slate-400">
            {contacts.length} {contacts.length === 1 ? "person" : "people"}
          </span>
        </div>

        {contacts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
            <UserRound className="mx-auto size-6 text-slate-300" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium text-slate-700">No contacts yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Add the recruiter, hiring manager, interviewer, or referral for this application.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {contacts.map((contact) => {
              const followUpIsOverdue = Boolean(
                contact.nextFollowUpAt &&
                  !contact.reminderCompletedAt &&
                  new Date(contact.nextFollowUpAt) < new Date(),
              );
              const followUpCompleted = Boolean(contact.reminderCompletedAt);

              return (
                <Card
                  key={contact.id}
                  size="sm"
                  className={cn(
                    "border shadow-none ring-0",
                    followUpIsOverdue
                      ? "border-amber-200 bg-amber-50/30"
                      : "border-slate-200",
                  )}
                >
                  <CardHeader className="border-b border-slate-100">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="truncate text-slate-950">
                            {contact.name}
                          </CardTitle>
                          <Badge variant="secondary" className="bg-indigo-50 text-indigo-700">
                            {contactTypeMeta[contact.contactType]}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {contact.role ?? company}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Edit ${contact.name}`}
                          onClick={() => startEditing(contact)}
                          disabled={isPending}
                        >
                          <Pencil aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Delete ${contact.name}`}
                          onClick={() => removeContact(contact)}
                          disabled={isPending}
                          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        >
                          {activeId === contact.id ? (
                            <LoaderCircle className="animate-spin" aria-hidden="true" />
                          ) : (
                            <Trash2 aria-hidden="true" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {contact.email ? (
                        <a
                          href={`mailto:${contact.email}`}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          <Mail aria-hidden="true" /> Email
                        </a>
                      ) : null}
                      {contact.linkedinUrl ? (
                        <a
                          href={contact.linkedinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          <Link2 aria-hidden="true" /> LinkedIn
                          <ExternalLink className="size-3" aria-hidden="true" />
                        </a>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() =>
                          runMutation(contact.id, () =>
                            logApplicationContact({ slug, contactId: contact.id }),
                          )
                        }
                      >
                        {activeId === contact.id ? (
                          <LoaderCircle className="animate-spin" aria-hidden="true" />
                        ) : (
                          <History aria-hidden="true" />
                        )}
                        Log contact now
                      </Button>
                    </div>

                    <dl className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
                      <div>
                        <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          <History className="size-3" aria-hidden="true" /> Last contact
                        </dt>
                        <dd className="mt-1 text-xs font-medium text-slate-700">
                          {contact.lastContactedAt
                            ? formatDateTime(contact.lastContactedAt)
                            : "Not contacted yet"}
                        </dd>
                      </div>
                      <div>
                        <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          {followUpCompleted ? (
                            <CheckCircle2 className="size-3 text-emerald-500" aria-hidden="true" />
                          ) : (
                            <AlarmClock className="size-3" aria-hidden="true" />
                          )}
                          Next follow-up
                        </dt>
                        <dd
                          className={cn(
                            "mt-1 text-xs font-medium",
                            followUpIsOverdue ? "text-amber-700" : "text-slate-700",
                            followUpCompleted && "text-emerald-700",
                          )}
                        >
                          {contact.nextFollowUpAt
                            ? `${formatDateTime(contact.nextFollowUpAt)}${
                                followUpCompleted
                                  ? " · completed"
                                  : followUpIsOverdue
                                    ? " · overdue"
                                    : ""
                              }`
                            : "Not scheduled"}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
