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
  headline: "Product Designer com experiencia em SaaS B2B",
  location: "Sao Paulo, SP",
  seniority: "Pleno",
  targetRoles: ["Product Designer", "UX Designer", "Product Manager"],
  skills: ["ux research", "figma", "design system", "analytics", "saas", "prototipacao"],
  languages: ["pt-BR", "en"],
  salaryMin: 8500,
  remoteFirst: true,
};

export const jobs: Job[] = [
  {
    id: "job_001",
    title: "Product Designer Pleno",
    company: "NuvemLabs",
    location: "Remoto Brasil",
    workModel: "remote",
    contract: "CLT",
    seniority: "Pleno",
    salary: "R$ 9.000 - 12.500",
    salaryMin: 9000,
    salaryMax: 12500,
    score: 92,
    posted: "2 dias",
    postedDaysAgo: 2,
    requirements: ["UX Research", "Figma", "Design System", "SaaS", "Prototipacao"],
    benefits: ["Remoto", "Plano de saude", "Auxilio educacao"],
    description:
      "Atuar em squads de produto B2B SaaS, conduzir discovery, prototipos e evoluir o design system com metricas de produto.",
    gaps: ["Ingles avancado desejavel"],
  },
  {
    id: "job_002",
    title: "UX Researcher Senior",
    company: "ContaVerde",
    location: "Sao Paulo, SP",
    workModel: "hybrid",
    contract: "CLT",
    seniority: "Senior",
    salary: "R$ 11.000 - 14.500",
    salaryMin: 11000,
    salaryMax: 14500,
    score: 84,
    posted: "5 dias",
    postedDaysAgo: 5,
    requirements: ["UX Research", "Analytics", "Entrevistas", "Discovery"],
    benefits: ["Hibrido", "Bonus anual", "Seguro saude"],
    description:
      "Pesquisa com usuarios, entrevistas, analise qualitativa e priorizacao com times de produto e negocio.",
    gaps: ["Case recente de pesquisa quantitativa"],
  },
  {
    id: "job_003",
    title: "Product Manager",
    company: "HealthSync",
    location: "Remoto LATAM",
    workModel: "remote",
    contract: "PJ",
    seniority: "Pleno",
    salary: "R$ 12.000 - 17.000",
    salaryMin: 12000,
    salaryMax: 17000,
    score: 78,
    posted: "1 dia",
    postedDaysAgo: 1,
    requirements: ["Roadmap", "Analytics", "Discovery", "SaaS", "Stakeholders"],
    benefits: ["Remoto", "Horario flexivel", "Orcamento para cursos"],
    description:
      "Definir roadmap, acompanhar metricas e liderar descoberta em produto de saude digital.",
    gaps: ["Experiencia direta em healthtech"],
  },
];

export const initialApplications: Application[] = [
  {
    id: "app_001",
    jobId: "job_001",
    title: "Product Designer Pleno",
    company: "NuvemLabs",
    stage: "saved",
    tags: ["92% match", "remoto"],
  },
  {
    id: "app_002",
    jobId: "job_002",
    title: "UX Researcher Senior",
    company: "ContaVerde",
    stage: "interviewing",
    sentAt: "15/05/2026",
    tags: ["entrevista", "hibrido"],
  },
];
