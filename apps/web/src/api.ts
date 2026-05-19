import type {
  Application,
  ApplicationAudit,
  CandidateProfile,
  Contract,
  Job,
  ResumeRecord,
  Stage,
  WorkModel,
} from "./data/mock";
import { hasSupabaseConfig, supabase } from "./supabase";

const API_BASE_URL = resolveApiBaseUrl();

type ApiWorkModel = "remote" | "hybrid" | "onsite";
type ApiEmploymentType = "clt" | "pj" | "contract" | "internship";

type ApiJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  work_model: ApiWorkModel;
  employment_type: ApiEmploymentType;
  seniority: string;
  salary_min: number | null;
  salary_max: number | null;
  description: string;
  requirements: string[];
  benefits: string[];
  posted_days_ago: number;
};

type ApiRecommendation = {
  job: ApiJob;
  score: number;
  gaps: string[];
};

type ApiApplication = {
  id: string;
  job_id: string;
  stage: Stage;
  company: string;
  title: string;
  sent_at: string | null;
  tags: string[];
};

type VitaeyJobRow = {
  id: string;
  title: string;
  company: string;
  location: string;
  work_model: ApiWorkModel;
  employment_type: ApiEmploymentType;
  seniority: string;
  salary_min: number | null;
  salary_max: number | null;
  score: number;
  posted_days_ago: number;
  description: string;
  requirements: string[];
  benefits: string[];
  gaps: string[];
};

type VitaeyApplicationRow = {
  id: string;
  job_id: string;
  stage: Stage;
  company: string;
  title: string;
  sent_at: string | null;
  tags: string[];
};

type VitaeyProfileRow = {
  user_id: string;
  full_name: string | null;
  headline: string | null;
  location: string | null;
  seniority: string | null;
  target_roles: string[];
  skills: string[];
  languages: string[];
  salary_min: number | null;
  remote_first: boolean;
};

type VitaeyResumeRow = {
  id: string;
  file_name: string;
  extracted_skills: string[];
  created_at: string;
};

type VitaeyAuditRow = {
  id: string;
  application_id: string;
  event_type: string;
  reviewed_fields: string[];
  message: string | null;
  created_at: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("Vitaey API URL is not configured for this environment.");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Vitaey API ${response.status}: ${path}`);
  }

  return response.json() as Promise<T>;
}

function resolveApiBaseUrl(): string {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  return "";
}

export async function fetchRecommendedJobs(): Promise<Job[]> {
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase
      .from("vitaey_jobs")
      .select("*")
      .order("score", { ascending: false });

    if (error) throw error;
    return (data as VitaeyJobRow[]).map(mapSupabaseJob);
  }

  const recommendations = await request<ApiRecommendation[]>("/api/v1/recommendations");
  return recommendations.map(({ job, score, gaps }) => mapJob(job, score, gaps));
}

export async function fetchApplications(): Promise<Application[]> {
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase
      .from("vitaey_applications")
      .select("id, job_id, stage, company, title, sent_at, tags")
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return (data as VitaeyApplicationRow[]).map(mapApplication);
  }

  const applications = await request<ApiApplication[]>("/api/v1/applications");
  return applications.map(mapApplication);
}

export async function fetchCandidateProfile(): Promise<CandidateProfile | null> {
  if (!hasSupabaseConfig || !supabase) return null;

  const { data, error } = await supabase
    .from("vitaey_profiles")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data ? mapProfile(data as VitaeyProfileRow) : null;
}

export async function upsertCandidateProfile(profile: CandidateProfile): Promise<CandidateProfile> {
  if (!hasSupabaseConfig || !supabase) return profile;

  const { data: authData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!authData.user) throw new Error("Login is required to save profile.");

  const { data, error } = await supabase
    .from("vitaey_profiles")
    .upsert(
      {
        user_id: authData.user.id,
        full_name: profile.fullName,
        headline: profile.headline,
        location: profile.location,
        seniority: profile.seniority,
        target_roles: profile.targetRoles,
        skills: normalizeList(profile.skills),
        languages: normalizeList(profile.languages),
        salary_min: profile.salaryMin,
        remote_first: profile.remoteFirst,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return mapProfile(data as VitaeyProfileRow);
}

export async function fetchResumes(): Promise<ResumeRecord[]> {
  if (!hasSupabaseConfig || !supabase) return [];

  const { data, error } = await supabase
    .from("vitaey_resumes")
    .select("id, file_name, extracted_skills, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as VitaeyResumeRow[]).map(mapResume);
}

export async function uploadResume(file: File, profile: CandidateProfile): Promise<{
  profile: CandidateProfile;
  resume: ResumeRecord;
}> {
  if (!hasSupabaseConfig || !supabase) {
    throw new Error("Supabase is required for resume uploads.");
  }

  const { data: authData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!authData.user) throw new Error("Login is required to upload resumes.");

  const extractedText = await extractText(file);
  const extractedSkills = extractSkills(extractedText);
  const storagePath = `${authData.user.id}/${Date.now()}-${safeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from("vitaey-resumes")
    .upload(storagePath, file, { upsert: true });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("vitaey_resumes")
    .insert({
      user_id: authData.user.id,
      file_name: file.name,
      storage_path: storagePath,
      extracted_text: extractedText.slice(0, 50_000),
      extracted_skills: extractedSkills,
    })
    .select("id, file_name, extracted_skills, created_at")
    .single();
  if (error) throw error;

  const nextProfile = await upsertCandidateProfile({
    ...profile,
    skills: mergeUnique(profile.skills, extractedSkills),
  });

  return { profile: nextProfile, resume: mapResume(data as VitaeyResumeRow) };
}

export async function fetchApplicationAudit(): Promise<ApplicationAudit[]> {
  if (!hasSupabaseConfig || !supabase) return [];

  const { data, error } = await supabase
    .from("vitaey_application_audit")
    .select("id, application_id, event_type, reviewed_fields, message, created_at")
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) throw error;
  return (data as VitaeyAuditRow[]).map(mapAudit);
}

export async function saveApplication(job: Job, stage: Stage): Promise<Application> {
  if (hasSupabaseConfig && supabase) {
    const { data: authData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!authData.user) throw new Error("Login is required to save applications.");

    const application = {
      user_id: authData.user.id,
      job_id: job.id,
      stage,
      company: job.company,
      title: job.title,
      sent_at: stage === "applied" ? new Date().toISOString().slice(0, 10) : null,
      tags: [`${job.score}% match`, modelLabel(job.workModel).toLowerCase()],
    };

    const { data, error } = await supabase
      .from("vitaey_applications")
      .upsert(application, { onConflict: "user_id,job_id" })
      .select("id, job_id, stage, company, title, sent_at, tags")
      .single();

    if (error) throw error;
    return mapApplication(data as VitaeyApplicationRow);
  }

  return {
    id: `app_${job.id}`,
    jobId: job.id,
    title: job.title,
    company: job.company,
    stage,
    sentAt: stage === "applied" ? "Agora" : undefined,
    tags: [`${job.score}% match`, modelLabel(job.workModel).toLowerCase()],
  };
}

export async function prepareApplication(job: Job): Promise<Application> {
  if (hasSupabaseConfig) {
    return saveApplication(job, "prepared");
  }

  const result = await request<{ application: ApiApplication }>("/api/v1/applications/prepare", {
    method: "POST",
    body: JSON.stringify({ job_id: job.id }),
  });
  return mapApplication(result.application);
}

export async function confirmApplicationSubmission(
  applicationId: string,
  reviewedFields: string[],
): Promise<Application> {
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase
      .from("vitaey_applications")
      .update({
        stage: "applied",
        sent_at: new Date().toISOString().slice(0, 10),
        tags: reviewedFields.includes("compliance") ? ["revisada", "confirmada"] : ["revisada"],
      })
      .eq("id", applicationId)
      .select("id, job_id, stage, company, title, sent_at, tags")
      .single();

    if (error) throw error;
    const application = mapApplication(data as VitaeyApplicationRow);

    const { data: authData } = await supabase.auth.getUser();
    if (authData.user) {
      await supabase.from("vitaey_application_audit").insert({
        user_id: authData.user.id,
        application_id: application.id,
        event_type: "user_confirmed_application",
        reviewed_fields: reviewedFields,
        message: "Submission confirmed from an active user action.",
      });
    }

    return application;
  }

  const result = await request<{ application: ApiApplication }>(`/api/v1/applications/${applicationId}/confirm`, {
    method: "POST",
    body: JSON.stringify({ user_confirmed: true, reviewed_fields: reviewedFields }),
  });
  return mapApplication(result.application);
}

export async function updateApplicationStage(application: Application, stage: Stage): Promise<Application> {
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase
      .from("vitaey_applications")
      .update({
        stage,
        sent_at: stage === "applied" ? new Date().toISOString().slice(0, 10) : application.sentAt ?? null,
      })
      .eq("id", application.id)
      .select("id, job_id, stage, company, title, sent_at, tags")
      .single();

    if (error) throw error;
    return mapApplication(data as VitaeyApplicationRow);
  }

  return { ...application, stage };
}

function mapSupabaseJob(job: VitaeyJobRow): Job {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    workModel: job.work_model,
    contract: mapContract(job.employment_type),
    seniority: titleCase(job.seniority),
    salary: formatSalary(job.salary_min, job.salary_max),
    salaryMin: job.salary_min,
    salaryMax: job.salary_max,
    score: job.score,
    posted: formatPosted(job.posted_days_ago),
    postedDaysAgo: job.posted_days_ago,
    requirements: job.requirements,
    benefits: job.benefits,
    description: job.description,
    gaps: job.gaps,
  };
}

function mapJob(job: ApiJob, score: number, gaps: string[]): Job {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    workModel: job.work_model,
    contract: mapContract(job.employment_type),
    seniority: titleCase(job.seniority),
    salary: formatSalary(job.salary_min, job.salary_max),
    salaryMin: job.salary_min,
    salaryMax: job.salary_max,
    score,
    posted: formatPosted(job.posted_days_ago),
    postedDaysAgo: job.posted_days_ago,
    requirements: job.requirements,
    benefits: job.benefits,
    description: job.description,
    gaps,
  };
}

function mapApplication(application: ApiApplication): Application {
  return {
    id: application.id,
    jobId: application.job_id,
    title: application.title,
    company: application.company,
    stage: application.stage,
    tags: application.tags,
    sentAt: application.sent_at ?? undefined,
  };
}

function mapProfile(profile: VitaeyProfileRow): CandidateProfile {
  return {
    fullName: profile.full_name ?? "",
    headline: profile.headline ?? "",
    location: profile.location ?? "",
    seniority: profile.seniority ?? "",
    targetRoles: profile.target_roles ?? [],
    skills: profile.skills ?? [],
    languages: profile.languages ?? [],
    salaryMin: profile.salary_min,
    remoteFirst: profile.remote_first,
  };
}

function mapResume(resume: VitaeyResumeRow): ResumeRecord {
  return {
    id: resume.id,
    fileName: resume.file_name,
    extractedSkills: resume.extracted_skills ?? [],
    createdAt: resume.created_at,
  };
}

function mapAudit(audit: VitaeyAuditRow): ApplicationAudit {
  return {
    id: audit.id,
    applicationId: audit.application_id,
    eventType: audit.event_type,
    reviewedFields: audit.reviewed_fields ?? [],
    message: audit.message ?? undefined,
    createdAt: audit.created_at,
  };
}

function mapContract(contract: ApiEmploymentType): Contract {
  const labels: Record<ApiEmploymentType, Contract> = {
    clt: "CLT",
    pj: "PJ",
    contract: "Contrato",
    internship: "Estagio",
  };
  return labels[contract];
}

function formatSalary(min: number | null, max: number | null): string {
  if (!min && !max) return "A combinar";
  const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  if (min && max) return `${currency.format(min)} - ${currency.format(max)}`;
  if (min) return `A partir de ${currency.format(min)}`;
  return `Ate ${currency.format(max ?? 0)}`;
}

function formatPosted(days: number): string {
  if (days <= 0) return "Hoje";
  if (days === 1) return "1 dia";
  return `${days} dias`;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function modelLabel(model: WorkModel) {
  const labels: Record<WorkModel, string> = {
    remote: "Remoto",
    hybrid: "Hibrido",
    onsite: "Presencial",
  };
  return labels[model];
}

function normalizeList(items: string[]): string[] {
  return mergeUnique(items.map((item) => item.trim().toLowerCase()).filter(Boolean));
}

function mergeUnique(...groups: string[][]): string[] {
  return [...new Set(groups.flat().map((item) => item.trim().toLowerCase()).filter(Boolean))];
}

async function extractText(file: File): Promise<string> {
  if (file.type.startsWith("text/") || /\.(txt|md|csv|json)$/i.test(file.name)) {
    return file.text();
  }
  return file.name;
}

function extractSkills(text: string): string[] {
  const catalog = [
    "analytics",
    "api",
    "b2b",
    "crm",
    "design system",
    "discovery",
    "figma",
    "gestao",
    "ia",
    "javascript",
    "kanban",
    "metrics",
    "postgres",
    "product",
    "prototipacao",
    "react",
    "roadmap",
    "saas",
    "sql",
    "supabase",
    "typescript",
    "ux research",
  ];
  const normalized = text.toLowerCase();
  return catalog.filter((skill) => normalized.includes(skill));
}

function safeFileName(fileName: string): string {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}
