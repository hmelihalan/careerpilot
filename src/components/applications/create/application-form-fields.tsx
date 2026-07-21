import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  EMPLOYMENT_TYPE_OPTIONS,
  WORK_MODE_OPTIONS,
} from "@/src/constants/application";
import type {
  ApplicationFieldErrors,
  ApplicationFormData,
} from "@/src/types/application";

type ApplicationFormFieldsProps = {
  application: ApplicationFormData;
  errors: ApplicationFieldErrors;
  onChange: <Field extends keyof ApplicationFormData>(
    field: Field,
    value: ApplicationFormData[Field],
  ) => void;
};

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  error?: string;
  required?: boolean;
  type?: "text" | "url" | "date";
  placeholder?: string;
  onChange: (value: string) => void;
};

function TextField({
  id,
  label,
  value,
  error,
  required,
  type = "text",
  placeholder,
  onChange,
}: TextFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-slate-700">
        {label}
        {required ? <span className="text-red-500">*</span> : null}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="h-9 border-slate-200 bg-white"
      />
      {error ? (
        <p id={errorId} className="text-xs font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

function FormSection({ title, children }: SectionProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-medium text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

export function ApplicationFormFields({
  application,
  errors,
  onChange,
}: ApplicationFormFieldsProps) {
  const [newSkill, setNewSkill] = useState("");

  function addSkill() {
    const skill = newSkill.trim();
    if (!skill) return;

    const alreadyExists = application.requiredSkills.some(
      (existingSkill) => existingSkill.toLowerCase() === skill.toLowerCase(),
    );

    if (!alreadyExists) {
      onChange("requiredSkills", [...application.requiredSkills, skill]);
    }
    setNewSkill("");
  }

  function removeSkill(skillToRemove: string) {
    onChange(
      "requiredSkills",
      application.requiredSkills.filter((skill) => skill !== skillToRemove),
    );
  }

  return (
    <div className="space-y-4">
      <FormSection title="Basic Information">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            id="application-company"
            label="Company"
            value={application.company}
            error={errors.company}
            required
            placeholder="Company name"
            onChange={(value) => onChange("company", value)}
          />
          <TextField
            id="application-role"
            label="Role"
            value={application.role}
            error={errors.role}
            required
            placeholder="Job title"
            onChange={(value) => onChange("role", value)}
          />
          <div className="sm:col-span-2">
            <TextField
              id="application-location"
              label="Location"
              value={application.location}
              placeholder="City, country"
              onChange={(value) => onChange("location", value)}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Job Details">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="application-work-mode" className="text-xs text-slate-700">
              Work Mode
            </Label>
            <Select
              value={application.workMode || null}
              onValueChange={(value) => onChange("workMode", value ?? "")}
            >
              <SelectTrigger
                id="application-work-mode"
                aria-invalid={Boolean(errors.workMode)}
                aria-describedby={errors.workMode ? "application-work-mode-error" : undefined}
                className="h-9 w-full border-slate-200 bg-white"
              >
                <SelectValue placeholder="Select work mode" />
              </SelectTrigger>
              <SelectContent>
                {WORK_MODE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.workMode ? (
              <p id="application-work-mode-error" className="text-xs font-medium text-red-600">
                {errors.workMode}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="application-employment-type" className="text-xs text-slate-700">
              Employment Type
            </Label>
            <Select
              value={application.employmentType || null}
              onValueChange={(value) => onChange("employmentType", value ?? "")}
            >
              <SelectTrigger
                id="application-employment-type"
                aria-invalid={Boolean(errors.employmentType)}
                aria-describedby={errors.employmentType ? "application-employment-type-error" : undefined}
                className="h-9 w-full border-slate-200 bg-white"
              >
                <SelectValue placeholder="Select employment type" />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.employmentType ? (
              <p id="application-employment-type-error" className="text-xs font-medium text-red-600">
                {errors.employmentType}
              </p>
            ) : null}
          </div>

          <TextField
            id="application-source"
            label="Source"
            value={application.source}
            error={errors.source}
            placeholder="LinkedIn, Company website, Referral..."
            onChange={(value) => onChange("source", value)}
          />
          <TextField
            id="application-deadline"
            label="Deadline"
            type="date"
            value={application.deadline}
            error={errors.deadline}
            onChange={(value) => onChange("deadline", value)}
          />
          <div className="sm:col-span-2">
            <TextField
              id="application-url"
              label="Application URL"
              type="url"
              value={application.applicationUrl}
              error={errors.applicationUrl}
              placeholder="https://example.com/jobs/..."
              onChange={(value) => onChange("applicationUrl", value)}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Skills">
        <div className="flex min-h-8 flex-wrap gap-2" aria-label="Required skills">
          {application.requiredSkills.length ? (
            application.requiredSkills.map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="h-7 gap-1 rounded-md bg-indigo-50 pl-2.5 pr-1 text-indigo-700"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  aria-label={`Remove ${skill}`}
                  className="flex size-5 items-center justify-center rounded hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </Badge>
            ))
          ) : (
            <p className="py-1 text-xs text-slate-500">No skills added yet.</p>
          )}
        </div>
        {errors.requiredSkills ? (
          <p className="mt-2 text-xs font-medium text-red-600">
            {errors.requiredSkills}
          </p>
        ) : null}
        <div className="mt-3 flex gap-2">
          <div className="min-w-0 flex-1">
            <Label htmlFor="application-new-skill" className="sr-only">
              Add a required skill
            </Label>
            <Input
              id="application-new-skill"
              value={newSkill}
              onChange={(event) => setNewSkill(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addSkill();
                }
              }}
              placeholder="Add a skill"
              className="h-9 border-slate-200 bg-white"
            />
          </div>
          <Button type="button" variant="outline" onClick={addSkill} disabled={!newSkill.trim()}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            Add
          </Button>
        </div>
      </FormSection>

      <FormSection title="Description">
        <Label htmlFor="application-description" className="sr-only">
          Job Description
        </Label>
        <Textarea
          id="application-description"
          value={application.description}
          onChange={(event) => onChange("description", event.target.value)}
          placeholder="Add the job description, responsibilities, or notes..."
          rows={6}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? "application-description-error" : undefined}
          className="min-h-32 resize-y border-slate-200 bg-white leading-5"
        />
        {errors.description ? (
          <p id="application-description-error" className="mt-2 text-xs font-medium text-red-600">
            {errors.description}
          </p>
        ) : null}
      </FormSection>

      <FormSection title="Tracking">
        <div className="max-w-xs space-y-1.5">
          <Label htmlFor="application-status" className="text-xs text-slate-700">
            Initial Status
          </Label>
          <Select
            value={application.status}
            onValueChange={(value) => {
              if (value === "Wishlist" || value === "Applied") {
                onChange("status", value);
              }
            }}
          >
            <SelectTrigger id="application-status" className="h-9 w-full border-slate-200 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Wishlist">Wishlist</SelectItem>
              <SelectItem value="Applied">Applied</SelectItem>
            </SelectContent>
          </Select>
          {errors.status ? (
            <p className="text-xs font-medium text-red-600">{errors.status}</p>
          ) : null}
          <p className="text-xs leading-5 text-slate-500">
            New applications can start in Wishlist or Applied.
          </p>
        </div>
      </FormSection>
    </div>
  );
}
