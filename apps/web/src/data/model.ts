export type WorkModel = "remote" | "hybrid" | "onsite";
export type Contract = "CLT" | "PJ" | "Contrato" | "Estagio";
export type Stage = "saved" | "prepared" | "applied" | "interviewing" | "offered";

export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  workModel: WorkModel;
  contract: Contract;
  seniority: string;
  salary: string;
  salaryMin: number | null;
  salaryMax: number | null;
  score: number;
  posted: string;
  postedDaysAgo: number;
  requirements: string[];
  benefits: string[];
  description: string;
  gaps: string[];
};

export type Application = {
  id: string;
  jobId: string;
  title: string;
  company: string;
  stage: Stage;
  tags: string[];
  sentAt?: string;
};

export type CandidateProfile = {
  fullName: string;
  headline: string;
  location: string;
  seniority: string;
  targetRoles: string[];
  skills: string[];
  languages: string[];
  salaryMin: number | null;
  remoteFirst: boolean;
};

export type ResumeRecord = {
  id: string;
  fileName: string;
  extractedSkills: string[];
  createdAt: string;
};

export type ApplicationAudit = {
  id: string;
  applicationId: string;
  eventType: string;
  reviewedFields: string[];
  message?: string;
  createdAt: string;
};

export const defaultProfile: CandidateProfile = {
  fullName: "",
  headline: "",
  location: "",
  seniority: "Pleno",
  targetRoles: [],
  skills: [],
  languages: ["pt-BR"],
  salaryMin: null,
  remoteFirst: true,
};
