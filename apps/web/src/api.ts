import type { Application, Contract, Job, Stage, WorkModel } from "./data/mock";
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

  if (globalThis.location?.hostname === "localhost" || globalThis.location?.hostname === "127.0.0.1") {
    return "http://127.0.0.1:8010";
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
    return mapApplication(data as VitaeyApplicationRow);
  }

  const result = await request<{ application: ApiApplication }>(`/api/v1/applications/${applicationId}/confirm`, {
    method: "POST",
    body: JSON.stringify({ user_confirmed: true, reviewed_fields: reviewedFields }),
  });
  return mapApplication(result.application);
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
