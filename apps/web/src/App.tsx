import { lazy, Suspense, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  Check,
  Clock3,
  FileText,
  Filter,
  Gauge,
  Hand,
  LayoutDashboard,
  Layers3,
  LockKeyhole,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UploadCloud,
  UserRound,
} from "lucide-react";
import {
  confirmApplicationSubmission,
  fetchApplicationAudit,
  fetchApplications,
  fetchCandidateProfile,
  fetchRecommendedJobs,
  fetchResumes,
  prepareApplication,
  saveApplication,
  updateApplicationStage,
  uploadResume,
  upsertCandidateProfile,
} from "./api";
import { getCurrentSession, hasSupabaseConfig, onAuthStateChange, signInWithGoogle, signOut } from "./supabase";
import {
  defaultProfile,
  type Application,
  type ApplicationAudit,
  type CandidateProfile,
  type Contract,
  type Job,
  type ResumeRecord,
  type Stage,
  type WorkModel,
} from "./data/model";

const OfficeScene = lazy(() => import("./OfficeScene").then((module) => ({ default: module.OfficeScene })));

type StationId = "radar" | "integracoes" | "curriculo" | "kanban" | "perfil" | "sobre";

type IntegrationLinkId = "linkedin" | "portfolio" | "github" | "website";

type IntegrationLinks = Record<IntegrationLinkId, string>;

const stages: Array<{ id: Stage; label: string }> = [
  { id: "saved", label: "Salvas" },
  { id: "prepared", label: "Preparadas" },
  { id: "applied", label: "Enviadas" },
  { id: "interviewing", label: "Entrevistas" },
  { id: "offered", label: "Ofertas" },
];

const workflow = [
  {
    title: "Perfil calibrado",
    copy: "Preferências, skills e salário mínimo ajustam o ranking sem expor dados desnecessários.",
  },
  {
    title: "Aplicação revisada",
    copy: "Cada candidatura exige confirmação manual antes de ser registrada.",
  },
  {
    title: "Pipeline claro",
    copy: "O histórico fica organizado por etapa para o candidato decidir o próximo movimento.",
  },
];

const integrationFields: Array<{ id: IntegrationLinkId; label: string; placeholder: string }> = [
  { id: "linkedin", label: "LinkedIn", placeholder: "https://www.linkedin.com/in/seu-perfil" },
  { id: "portfolio", label: "Portfólio", placeholder: "https://seuportfolio.com" },
  { id: "github", label: "GitHub", placeholder: "https://github.com/seu-usuario" },
  { id: "website", label: "Site pessoal", placeholder: "https://seusite.com.br" },
];

const emptyIntegrationLinks: IntegrationLinks = {
  linkedin: "",
  portfolio: "",
  github: "",
  website: "",
};

function App() {
  const [query, setQuery] = useState("");
  const [workModel, setWorkModel] = useState<WorkModel | "all">("all");
  const [contract, setContract] = useState<Contract | "all">("all");
  const [seniority, setSeniority] = useState("all");
  const [location, setLocation] = useState("all");
  const [minSalary, setMinSalary] = useState(0);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [applyJob, setApplyJob] = useState<Job | null>(null);
  const [reviewed, setReviewed] = useState<string[]>(["profile"]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiStatus, setApiStatus] = useState<"connecting" | "live" | "offline" | "supabase">("connecting");
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState("");
  const [profile, setProfile] = useState<CandidateProfile>(defaultProfile);
  const [profileDraft, setProfileDraft] = useState<CandidateProfile>(defaultProfile);
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [audit, setAudit] = useState<ApplicationAudit[]>([]);
  const [profileSaving, setProfileSaving] = useState(false);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [activeStation, setActiveStation] = useState<StationId | null>(null);
  const [integrationLinks, setIntegrationLinks] = useState<IntegrationLinks>(emptyIntegrationLinks);
  const [integrationNotice, setIntegrationNotice] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function refreshData(currentEmail?: string | null) {
      try {
        const hasSessionGate = hasSupabaseConfig && !currentEmail;
        const [recommendedJobs, serverApplications, storedProfile, storedResumes, auditRows] = await Promise.all([
          fetchRecommendedJobs(),
          hasSessionGate ? Promise.resolve([]) : fetchApplications(),
          hasSessionGate ? Promise.resolve(null) : fetchCandidateProfile(),
          hasSessionGate ? Promise.resolve([]) : fetchResumes(),
          hasSessionGate ? Promise.resolve([]) : fetchApplicationAudit(),
        ]);
        if (!isMounted) return;
        const nextProfile = storedProfile ?? defaultProfile;
        const personalized = personalizeJobs(recommendedJobs, nextProfile);
        setProfile(nextProfile);
        setProfileDraft(nextProfile);
        setJobs(personalized);
        setSelectedJob(personalized[0] ?? null);
        setApplications(serverApplications);
        setResumes(storedResumes);
        setAudit(auditRows);
        setApiStatus(hasSupabaseConfig ? "supabase" : "live");
      } catch {
        if (!isMounted) return;
        setApiStatus("offline");
      }
    }

    getCurrentSession()
      .then((session) => {
        if (!isMounted) return;
        const email = session?.user.email ?? null;
        setSessionEmail(email);
        void refreshData(email);
      })
      .catch(() => {
        if (!isMounted) return;
        setSessionEmail(null);
        void refreshData(null);
      });

    const unsubscribe = onAuthStateChange((session) => {
      const email = session?.user.email ?? null;
      setSessionEmail(email);
      setAuthNotice("");
      void refreshData(email);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("vitaey.integrationLinks");
      if (!stored) return;
      const parsed = JSON.parse(stored) as Partial<IntegrationLinks>;
      setIntegrationLinks({
        linkedin: parsed.linkedin ?? "",
        portfolio: parsed.portfolio ?? "",
        github: parsed.github ?? "",
        website: parsed.website ?? "",
      });
    } catch {
      setIntegrationLinks(emptyIntegrationLinks);
    }
  }, []);

  useEffect(() => {
    if (selectedJob && !jobs.some((job) => job.id === selectedJob.id)) {
      setSelectedJob(jobs[0] ?? null);
    }
    if (!selectedJob && jobs.length) {
      setSelectedJob(jobs[0]);
    }
  }, [jobs, selectedJob]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const haystack = `${job.title} ${job.company} ${job.description} ${job.requirements.join(" ")}`.toLowerCase();
      const matchesQuery = !query || haystack.includes(query.toLowerCase());
      const matchesModel = workModel === "all" || job.workModel === workModel;
      const matchesContract = contract === "all" || job.contract === contract;
      const matchesSeniority = seniority === "all" || job.seniority.toLowerCase() === seniority;
      const matchesLocation =
        location === "all" ||
        (location === "remote" ? job.workModel === "remote" : job.location.toLowerCase().includes(location));
      const matchesSalary = !minSalary || (job.salaryMax ?? 0) >= minSalary;
      return matchesQuery && matchesModel && matchesContract && matchesSeniority && matchesLocation && matchesSalary;
    });
  }, [contract, jobs, location, minSalary, query, seniority, workModel]);

  const savedCount = applications.filter((item) => item.stage === "saved").length;
  const activeCount = applications.filter((item) => item.stage !== "offered").length;
  const interviewCount = applications.filter((item) => item.stage === "interviewing").length;
  const bestMatch = jobs.length ? Math.max(...jobs.map((job) => job.score)) : 0;
  const activeFilters = [workModel, contract, seniority, location].filter((item) => item !== "all").length + (minSalary ? 1 : 0);
  const pipelineProgress = applications.length ? Math.round((applications.filter((item) => item.stage !== "saved").length / applications.length) * 100) : 0;
  const selectedRequirements = selectedJob?.requirements.slice(0, 4) ?? [];

  function upsertApplication(application: Application) {
    setApplications((items) => [
      ...items.filter((item) => item.id !== application.id && item.jobId !== application.jobId),
      application,
    ]);
  }

  async function saveJob(job: Job) {
    if (hasSupabaseConfig && !sessionEmail) {
      setAuthNotice("Entre com Google para salvar e acompanhar candidaturas com segurança.");
      return;
    }
    if (applications.some((item) => item.jobId === job.id)) return;
    try {
      const saved = await saveApplication(job, "saved");
      upsertApplication(saved);
      setApiStatus(hasSupabaseConfig ? "supabase" : "live");
    } catch {
      upsertApplication({
        id: `app_${job.id}`,
        jobId: job.id,
        title: job.title,
        company: job.company,
        stage: "saved",
        tags: [`${job.score}% match`, modelLabel(job.workModel).toLowerCase()],
      });
      setApiStatus("offline");
    }
  }

  async function startApplication(job: Job) {
    if (hasSupabaseConfig && !sessionEmail) {
      setAuthNotice("Entre com Google para preparar e salvar esta candidatura com segurança.");
      return;
    }
    setApplyJob(job);
    setReviewed(["profile"]);
    try {
      const prepared = await prepareApplication(job);
      upsertApplication(prepared);
      setApiStatus(hasSupabaseConfig ? "supabase" : "live");
    } catch {
      upsertApplication({
        id: `app_${job.id}`,
        jobId: job.id,
        title: job.title,
        company: job.company,
        stage: "prepared",
        tags: [`${job.score}% match`, modelLabel(job.workModel).toLowerCase()],
      });
      setApiStatus("offline");
    }
  }

  function fallbackAppliedApplication(job: Job): Application {
    return {
      id: `app_${job.id}`,
      jobId: job.id,
      title: job.title,
      company: job.company,
      stage: "applied",
      sentAt: "Agora",
      tags: [`${job.score}% match`, "revisada"],
    };
  }

  async function confirmApplication() {
    if (!applyJob || reviewed.length < 4 || isSubmitting) return;
    setIsSubmitting(true);
    const existing = applications.find((item) => item.jobId === applyJob.id);

    try {
      const prepared = existing ?? (await prepareApplication(applyJob));
      upsertApplication(prepared);
      const confirmed = await confirmApplicationSubmission(prepared.id, reviewed);
      upsertApplication(confirmed);
      setApiStatus(hasSupabaseConfig ? "supabase" : "live");
    } catch {
      upsertApplication(fallbackAppliedApplication(applyJob));
      setApiStatus("offline");
    } finally {
      setIsSubmitting(false);
      setApplyJob(null);
      setReviewed(["profile"]);
    }
  }

  async function moveApplication(id: string, stage: Stage) {
    const current = applications.find((item) => item.id === id);
    if (!current) return;
    setApplications((items) => items.map((item) => (item.id === id ? { ...item, stage } : item)));
    try {
      const updated = await updateApplicationStage(current, stage);
      upsertApplication(updated);
    } catch {
      setApiStatus("offline");
    }
  }

  function toggleReviewed(key: string) {
    setReviewed((items) => (items.includes(key) ? items.filter((item) => item !== key) : [...items, key]));
  }

  function updateProfileDraft<K extends keyof CandidateProfile>(key: K, value: CandidateProfile[K]) {
    setProfileDraft((item) => ({ ...item, [key]: value }));
  }

  async function saveProfile() {
    if (hasSupabaseConfig && !sessionEmail) {
      setAuthNotice("Entre com Google para salvar seu perfil.");
      return;
    }
    setProfileSaving(true);
    try {
      const saved = await upsertCandidateProfile(profileDraft);
      const personalized = personalizeJobs(jobs, saved);
      setProfile(saved);
      setProfileDraft(saved);
      setJobs(personalized);
      setSelectedJob(personalized[0] ?? selectedJob ?? null);
      setApiStatus(hasSupabaseConfig ? "supabase" : "live");
    } catch {
      setAuthNotice("Não foi possível salvar o perfil agora.");
      setApiStatus("offline");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleResumeUpload(file: File | null) {
    if (!file) return;
    if (hasSupabaseConfig && !sessionEmail) {
      setAuthNotice("Entre com Google para enviar currículo.");
      return;
    }
    setResumeUploading(true);
    try {
      const result = await uploadResume(file, profile);
      const personalized = personalizeJobs(jobs, result.profile);
      setProfile(result.profile);
      setProfileDraft(result.profile);
      setResumes((items) => [result.resume, ...items.filter((item) => item.id !== result.resume.id)]);
      setJobs(personalized);
      setSelectedJob(personalized[0] ?? selectedJob ?? null);
      setApiStatus("supabase");
    } catch {
      setAuthNotice("Não foi possível processar o currículo agora.");
      setApiStatus("offline");
    } finally {
      setResumeUploading(false);
    }
  }

  function openStation(station: StationId) {
    setActiveStation(station);
  }

  function updateIntegrationLink(id: IntegrationLinkId, value: string) {
    setIntegrationNotice("");
    setIntegrationLinks((current) => ({ ...current, [id]: value }));
  }

  function saveIntegrationLinks() {
    window.localStorage.setItem("vitaey.integrationLinks", JSON.stringify(integrationLinks));
    setIntegrationNotice("Links profissionais salvos neste navegador.");
  }

  return (
    <main className="experience-shell">
      <Suspense fallback={<div className="office-webgl office-webgl-fallback" aria-hidden="true" />}>
        <OfficeScene signalScore={bestMatch} jobCount={jobs.length} applicationCount={applications.length} />
      </Suspense>
      <BootOverlay />

      <header className="experience-nav">
        <a className="brand-lockup" href="#dashboard" aria-label="Voltar para o início do Vitaey">
          <span className="brand-glyph">V</span>
          <span>
            <strong>Vitaey</strong>
            <small>Career signal OS</small>
          </span>
        </a>
        <nav className="nav-list" aria-label="Navegação principal">
          <a className="active" href="#dashboard"><LayoutDashboard /> Visão geral</a>
          <a href="#curriculo"><FileText /> Currículo</a>
          <a href="#radar"><Gauge /> Radar</a>
          <a href="#kanban"><ShieldCheck /> Pipeline</a>
          <a href="#integracoes"><BriefcaseBusiness /> Integrações</a>
          <a href="#perfil"><UserRound /> Perfil</a>
          <a href="#sobre"><LockKeyhole /> Sobre</a>
        </nav>
        <div className="status-cluster">
          <span className={`api-pill ${apiStatus}`}>{statusLabel(apiStatus)}</span>
          {hasSupabaseConfig ? (
            sessionEmail ? (
              <button className="auth-button" onClick={() => void signOut()} title={sessionEmail}>
                Sair
              </button>
            ) : (
              <button className="auth-button" onClick={() => void signInWithGoogle()}>
                Entrar com Google
              </button>
            )
          ) : null}
          <button className="icon-button" aria-label="Ver lembretes" onClick={() => setAuthNotice("Nenhum lembrete pendente agora.")}>
            <Bell />
          </button>
        </div>
      </header>

      <aside className="scene-rail" aria-label="Progresso da experiência">
        <a href="#dashboard"><span /> Lobby</a>
        <a href="#curriculo"><span /> Currículo</a>
        <a href="#radar"><span /> Radar</a>
        <a href="#kanban"><span /> Pipeline</a>
        <a href="#integracoes"><span /> Integrações</a>
        <a href="#perfil"><span /> Perfil</a>
        <a href="#sobre"><span /> Sobre</a>
      </aside>

      <section className="scene-section hero-section" id="dashboard" aria-label="Resumo do Vitaey">
        <div className="section-frame hero-copy">
          <span className="eyebrow">Radar de vagas e currículo</span>
          <h1>Vitaey</h1>
          <h2>VITAEY</h2>
          <p>
            Encontre oportunidades, calibre seu currículo e avance candidaturas com revisão manual antes de qualquer envio.
          </p>
          <div className="hero-actions">
            <a className="hero-primary" href="#radar">Explorar vagas <ArrowRight /></a>
            <a className="hero-secondary" href="#curriculo">Revisar currículo</a>
          </div>
          <div className="assurance-strip" aria-label="Garantias do fluxo">
            <span><ShieldCheck /> Envio sempre revisado</span>
            <span><LockKeyhole /> Dados privados</span>
            <span><Gauge /> Match auditável</span>
          </div>
        </div>

        <div className="hero-surface">
          <div className="signal-readout">
            <strong>{bestMatch ? `${bestMatch}%` : "Sem match"}</strong>
            <span>{bestMatch ? "melhor match disponível" : "aguardando vagas reais"}</span>
          </div>
          <div className="career-snapshot" aria-label="Resumo do progresso">
            <span>
              <strong>{profile.headline || "Perfil em edição"}</strong>
              Currículo
            </span>
            <span>
              <strong>{filteredJobs.length}</strong>
              Vagas no radar
            </span>
            <span>
              <strong>{activeCount}</strong>
              Candidaturas ativas
            </span>
          </div>
        </div>
      </section>

      {authNotice ? (
        <div className="auth-notice" role="status">
          {authNotice}
        </div>
      ) : null}

      <section className="scene-section jobs-section radar-section" id="radar" aria-label="Radar de vagas">
        <div className="section-frame section-intro">
          <span className="section-kicker">Estação 02 // Radar</span>
          <h2>Radar de vagas</h2>
          <p>
            {jobs.length
              ? `${filteredJobs.length} oportunidades no radar com ${activeFilters} filtro(s) ativo(s).`
              : "As oportunidades reais aparecerão aqui quando a fonte estiver conectada."}
          </p>
        </div>

        <StationGate
          id="radar"
          activeStation={activeStation}
          station="Radar"
          buttonLabel="Abrir radar"
          onOpen={openStation}
        />

        {activeStation === "radar" ? (
          <div className="station-workspace" data-station-workspace="radar">
            <WorkspaceDock title="Radar de vagas" onClose={() => setActiveStation(null)} />
            <div className="opportunity-console">
          <div className="filters">
            <label className="search-field">
              <Search />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por cargo, empresa ou skill"
              />
            </label>
            <label>
              <span>Modelo</span>
              <select value={workModel} onChange={(event) => setWorkModel(event.target.value as WorkModel | "all")}>
                <option value="all">Todos os modelos</option>
                <option value="remote">Remoto</option>
                <option value="hybrid">Híbrido</option>
                <option value="onsite">Presencial</option>
              </select>
            </label>
            <label>
              <span>Contrato</span>
              <select value={contract} onChange={(event) => setContract(event.target.value as Contract | "all")}>
                <option value="all">Todos</option>
                <option value="CLT">CLT</option>
                <option value="PJ">PJ</option>
                <option value="Contrato">Contrato</option>
                <option value="Estagio">Estágio</option>
              </select>
            </label>
            <label>
              <span>Senioridade</span>
              <select value={seniority} onChange={(event) => setSeniority(event.target.value)}>
                <option value="all">Todas</option>
                <option value="junior">Júnior</option>
                <option value="pleno">Pleno</option>
                <option value="senior">Sênior</option>
              </select>
            </label>
            <label>
              <span>Local</span>
              <select value={location} onChange={(event) => setLocation(event.target.value)}>
                <option value="all">Todos</option>
                <option value="remote">Remoto</option>
                <option value="são paulo">São Paulo</option>
                <option value="rio">Rio</option>
              </select>
            </label>
            <label className="salary-field">
              <span>Salário mínimo</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={minSalary || ""}
                onChange={(event) => setMinSalary(Number(event.target.value) || 0)}
                placeholder="R$"
              />
            </label>
          </div>

          <div className="radar-workbench">
            <div className="job-list" aria-label="Lista de vagas recomendadas">
              {filteredJobs.length ? (
                filteredJobs.map((job) => (
                  <article
                    className={`job-card ${selectedJob?.id === job.id ? "selected" : ""}`}
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                  >
                    <div className="job-title-row">
                      <div>
                        <span className="job-company">{job.company}</span>
                        <h3>{job.title}</h3>
                      </div>
                      <div className="score-ring" style={{ "--score": job.score } as CSSProperties}>
                        {job.score}%
                      </div>
                    </div>
                    <p className="job-description">{job.description}</p>
                    <div className="job-meta">
                      <span><MapPin /> {job.location}</span>
                      <span>{modelLabel(job.workModel)}</span>
                      <span>{job.contract}</span>
                      <span>{job.salary}</span>
                    </div>
                    <div className="card-actions">
                      <button className="primary" onClick={(event) => { event.stopPropagation(); void startApplication(job); }}>
                        Personalizar candidatura
                      </button>
                      <button onClick={(event) => { event.stopPropagation(); void saveJob(job); }}>
                        Salvar vaga
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <strong>Nenhuma vaga disponível</strong>
                  <span>{jobs.length ? "Ajuste os filtros para ampliar o radar." : "Conecte uma fonte de oportunidades para iniciar o ranking."}</span>
                </div>
              )}
            </div>

            <aside className="details-panel">
              {selectedJob ? (
                <>
                  <div className="company-visual">
                    <Sparkles />
                    <span>Compatibilidade</span>
                    <strong>{selectedJob.score}%</strong>
                  </div>
                  <span className="section-kicker">Vaga selecionada</span>
                  <h2>{selectedJob.title}</h2>
                  <p className="muted">{selectedJob.company} · {selectedJob.salary}</p>
                  <p>{selectedJob.description}</p>
                  <SectionList title="Requisitos conectados" items={selectedJob.requirements} />
                  <SectionList title="Pontos para revisar" items={selectedJob.gaps} subtle />
                  <button className="wide-primary" onClick={() => void startApplication(selectedJob)}>
                    Personalizar candidatura <ArrowRight />
                  </button>
                </>
              ) : (
                <div className="empty-state detail-empty">
                  <strong>Nenhuma vaga selecionada</strong>
                  <span>Conecte uma fonte de oportunidades ou aguarde novas vagas para revisar compatibilidade.</span>
                </div>
              )}
            </aside>
          </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="scene-section resume-section" id="curriculo" aria-label="Currículo e preferências">
        <div className="section-frame section-intro">
          <span className="section-kicker">Estação 01 // Currículo</span>
          <h2>Currículo e preferências</h2>
          <p>{sessionEmail ? sessionEmail : "Entre para manter o perfil sincronizado com segurança."}</p>
        </div>

        <StationGate
          id="curriculo"
          activeStation={activeStation}
          station="Currículo"
          buttonLabel="Abrir currículo"
          onOpen={openStation}
        />

        {activeStation === "curriculo" ? (
          <div className="station-workspace" data-station-workspace="curriculo">
            <WorkspaceDock title="Currículo e perfil" onClose={() => setActiveStation(null)} />
            <div className="profile-workbench">
          <div className="profile-editor">
            <div className="panel-heading compact-heading">
              <div>
                <span className="section-kicker">Perfil do candidato</span>
                <h2>Dados para matching</h2>
              </div>
              <UserRound />
            </div>
            <label>
              <span>Nome</span>
              <input value={profileDraft.fullName} onChange={(event) => updateProfileDraft("fullName", event.target.value)} />
            </label>
            <label>
              <span>Headline</span>
              <input value={profileDraft.headline} onChange={(event) => updateProfileDraft("headline", event.target.value)} />
            </label>
            <div className="profile-row">
              <label>
                <span>Localidade</span>
                <input value={profileDraft.location} onChange={(event) => updateProfileDraft("location", event.target.value)} />
              </label>
              <label>
                <span>Senioridade</span>
                <select value={profileDraft.seniority} onChange={(event) => updateProfileDraft("seniority", event.target.value)}>
                  <option>Júnior</option>
                  <option>Pleno</option>
                  <option>Sênior</option>
                </select>
              </label>
            </div>
            <label>
              <span>Funções alvo</span>
              <input
                value={profileDraft.targetRoles.join(", ")}
                onChange={(event) => updateProfileDraft("targetRoles", splitList(event.target.value))}
              />
            </label>
            <label>
              <span>Skills</span>
              <textarea
                value={profileDraft.skills.join(", ")}
                onChange={(event) => updateProfileDraft("skills", splitList(event.target.value))}
              />
            </label>
            <div className="profile-row">
              <label>
                <span>Salário mínimo</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={profileDraft.salaryMin ?? ""}
                  onChange={(event) => updateProfileDraft("salaryMin", Number(event.target.value) || null)}
                />
              </label>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={profileDraft.remoteFirst}
                  onChange={(event) => updateProfileDraft("remoteFirst", event.target.checked)}
                />
                <span>Priorizar remoto</span>
              </label>
            </div>
            <div className="profile-actions">
              <button className="primary" disabled={profileSaving} onClick={() => void saveProfile()}>
                {profileSaving ? "Salvando..." : "Salvar perfil"}
              </button>
              <label className="upload-button">
                <UploadCloud />
                <input
                  type="file"
                  accept=".txt,.md,.pdf,.doc,.docx,text/plain,text/markdown,application/pdf"
                  onChange={(event) => void handleResumeUpload(event.target.files?.[0] ?? null)}
                />
                {resumeUploading ? "Enviando..." : "Enviar currículo"}
              </label>
            </div>
          </div>

          <div className="document-preview">
            <div className="preview-heading">
              <span>Resumo para aplicação</span>
              <strong>{profile.headline || "Atualize o perfil para personalizar o ranking."}</strong>
            </div>
            <div className="skill-cloud">
              {profile.skills.length ? profile.skills.slice(0, 12).map((item) => <span key={item}>{item}</span>) : <span>skills serão extraídas do currículo</span>}
            </div>
            <ul>
              {selectedRequirements.length ? (
                selectedRequirements.map((item) => (
                  <li key={item}>Destacar experiência relacionada a {item}.</li>
                ))
              ) : (
                <li>Salve uma vaga real para gerar recomendações de destaque.</li>
              )}
            </ul>
            <div className="resume-list">
              {resumes.slice(0, 3).map((resume) => (
                <span key={resume.id}>{resume.fileName}</span>
              ))}
            </div>
            <div className="audit-list">
              {audit.slice(0, 3).map((item) => (
                <span key={item.id}>{auditLabel(item.eventType)}</span>
              ))}
            </div>
          </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="scene-section pipeline-section" id="kanban" aria-label="Pipeline de candidaturas">
        <div className="section-frame section-intro">
          <span className="section-kicker">Estação 03 // Pipeline</span>
          <h2>Pipeline de candidaturas</h2>
          <p>
            {applications.length
              ? `${pipelineProgress}% das candidaturas já saíram da etapa inicial.`
              : "As etapas aparecem quando você salvar ou iniciar uma candidatura."}
          </p>
        </div>

        <StationGate
          id="kanban"
          activeStation={activeStation}
          station="Pipeline"
          buttonLabel="Abrir pipeline"
          onOpen={openStation}
        />

        {activeStation === "kanban" ? (
          <div className="station-workspace" data-station-workspace="kanban">
            <WorkspaceDock title="Pipeline de candidaturas" onClose={() => setActiveStation(null)} />
            <div className="metrics" aria-label="Indicadores do candidato">
          <Metric icon={<BriefcaseBusiness />} label="Vagas salvas" value={savedCount} tone="mint" />
          <Metric icon={<Layers3 />} label="Candidaturas ativas" value={activeCount} tone="blue" />
          <Metric icon={<Clock3 />} label="Entrevistas" value={interviewCount} tone="violet" />
          <Metric icon={<Target />} label="Melhor match" value={bestMatch ? `${bestMatch}%` : "Sem dados"} tone="amber" />
        </div>

        <div className="workflow-strip" aria-label="Como o Vitaey organiza candidaturas">
          {workflow.map((item, index) => (
            <article key={item.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item.title}</strong>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>

        <div className="kanban-grid">
          {stages.map((stage) => (
            <div className="kanban-column" key={stage.id}>
              <h3>{stage.label}</h3>
              {applications.filter((item) => item.stage === stage.id).map((item) => (
                <article className="application-card" key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{item.company}</span>
                  <div className="tag-row">{item.tags.map((tag) => <small key={tag}>{tag}</small>)}</div>
                  <select value={item.stage} onChange={(event) => void moveApplication(item.id, event.target.value as Stage)}>
                    {stages.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}
                  </select>
                </article>
              ))}
            </div>
          ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="scene-section integrations-section" id="integracoes" aria-label="Integrações profissionais">
        <div className="section-frame section-intro">
          <span className="section-kicker">Estação 04 // Integrações</span>
          <h2>Integrações profissionais</h2>
          <p>Conecte páginas públicas como LinkedIn, portfólio, GitHub e site pessoal ao perfil Vitaey.</p>
        </div>

        <StationGate
          id="integracoes"
          activeStation={activeStation}
          station="Integrações"
          buttonLabel="Abrir integrações"
          onOpen={openStation}
        />

        {activeStation === "integracoes" ? (
          <div className="station-workspace" data-station-workspace="integracoes">
            <WorkspaceDock title="Integrações profissionais" onClose={() => setActiveStation(null)} />
            <div className="integrations-workspace">
              <div className="panel-heading compact-heading">
                <div>
                  <span className="section-kicker">Links públicos</span>
                  <h2>Conecte suas páginas profissionais</h2>
                  <p>Use links reais para fortalecer o perfil antes de revisar vagas e candidaturas.</p>
                </div>
                <BriefcaseBusiness />
              </div>
              <div className="integration-link-grid">
                {integrationFields.map((field) => (
                  <label className="integration-link-field" key={field.id}>
                    <span>{field.label}</span>
                    <input
                      value={integrationLinks[field.id]}
                      onChange={(event) => updateIntegrationLink(field.id, event.target.value)}
                      placeholder={field.placeholder}
                      inputMode="url"
                    />
                  </label>
                ))}
              </div>
              <div className="profile-actions">
                <button className="primary" type="button" onClick={saveIntegrationLinks}>
                  Salvar integrações
                </button>
                {integrationNotice ? <span className="inline-notice">{integrationNotice}</span> : null}
              </div>
              <div className="integration-preview">
                {integrationFields.map((field) => {
                  const href = normalizeExternalUrl(integrationLinks[field.id]);
                  return href ? (
                    <a href={href} target="_blank" rel="noreferrer" key={field.id}>
                      Abrir {field.label}
                    </a>
                  ) : (
                    <span key={field.id}>{field.label} não conectado</span>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="scene-section profile-section" id="perfil" aria-label="Perfil de matching">
        <div className="section-frame section-intro">
          <span className="section-kicker">Estação 05 // Perfil</span>
          <h2>Perfil de matching</h2>
          <p>{profile.headline || "O perfil aparece aqui com os dados sincronizados do candidato."}</p>
        </div>

        <StationGate
          id="perfil"
          activeStation={activeStation}
          station="Perfil"
          buttonLabel="Abrir perfil"
          onOpen={openStation}
        />

        {activeStation === "perfil" ? (
          <div className="station-workspace" data-station-workspace="perfil">
            <WorkspaceDock title="Perfil de matching" onClose={() => setActiveStation(null)} />
            <div className="profile-station">
              <div className="panel-heading compact-heading">
                <div>
                  <span className="section-kicker">Dados sincronizados</span>
                  <h2>{profile.fullName || "Perfil sem nome informado"}</h2>
                  <p>{profile.headline || "Atualize o currículo para melhorar a leitura do perfil."}</p>
                </div>
                <UserRound />
              </div>
              <div className="profile-summary-grid">
                <article>
                  <span>Localidade</span>
                  <strong>{profile.location || "Não informada"}</strong>
                </article>
                <article>
                  <span>Senioridade</span>
                  <strong>{profile.seniority || "Não informada"}</strong>
                </article>
                <article>
                  <span>Modelo</span>
                  <strong>{profile.remoteFirst ? "Prioriza remoto" : "Aberto a híbrido/presencial"}</strong>
                </article>
                <article>
                  <span>Salário mínimo</span>
                  <strong>{profile.salaryMin ? `R$ ${profile.salaryMin.toLocaleString("pt-BR")}` : "Não definido"}</strong>
                </article>
              </div>
              <SectionList title="Funções alvo" items={profile.targetRoles} />
              <SectionList title="Skills mapeadas" items={profile.skills.slice(0, 12)} subtle />
            </div>
          </div>
        ) : null}
      </section>

      <section className="scene-section about-section" id="sobre" aria-label="Sobre o Vitaey">
        <div className="section-frame section-intro">
          <span className="section-kicker">Estação 06 // Sobre</span>
          <h2>Sobre o Vitaey</h2>
          <p>Informações institucionais, privacidade e termos de uso reunidos em uma estação própria.</p>
        </div>

        <StationGate
          id="sobre"
          activeStation={activeStation}
          station="Sobre"
          buttonLabel="Abrir sobre"
          onOpen={openStation}
        />

        {activeStation === "sobre" ? (
          <div className="station-workspace" data-station-workspace="sobre">
            <WorkspaceDock title="Sobre o Vitaey" onClose={() => setActiveStation(null)} />
            <div className="about-workspace">
              <article>
                <span className="section-kicker">Sobre nós</span>
                <h3>O Vitaey organiza a busca de emprego com revisão manual.</h3>
                <p>
                  O produto conecta perfil, currículo, vagas e candidaturas em um fluxo único para o usuário encontrar oportunidades,
                  revisar dados antes de enviar e acompanhar cada etapa com clareza.
                </p>
              </article>
              <article>
                <span className="section-kicker">Política de privacidade</span>
                <h3>Dados de currículo e perfil ficam ligados à conta do usuário.</h3>
                <p>
                  As informações são usadas para matching, filtros, histórico de candidaturas e melhoria da experiência. O usuário deve
                  manter controle sobre envio de currículo, revisão de candidatura e autenticação da conta.
                </p>
              </article>
              <article>
                <span className="section-kicker">Termos de uso</span>
                <h3>Cada candidatura depende de ação confirmada pelo usuário.</h3>
                <p>
                  O Vitaey não promete contratação, não substitui análise humana de recrutadores e não deve enviar candidaturas sem
                  confirmação. O usuário é responsável pela veracidade dos dados enviados.
                </p>
              </article>
              <article>
                <span className="section-kicker">Segurança</span>
                <h3>Revisão, consentimento e rastreabilidade são parte do fluxo.</h3>
                <p>
                  A experiência foi desenhada para evitar envio automático em massa, preservar contexto da candidatura e manter o usuário
                  no controle do perfil profissional.
                </p>
              </article>
            </div>
          </div>
        ) : null}
      </section>

      {applyJob ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setApplyJob(null)}>
          <section className="apply-modal" role="dialog" aria-modal="true" aria-labelledby="apply-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="panel-heading">
              <div>
                <span className="section-kicker">Confirmação final</span>
                <h2 id="apply-title">Aplicar para {applyJob.title}</h2>
                <p>Revise cada item. O envio só libera com confirmação manual.</p>
              </div>
              <ShieldCheck />
            </div>
            {["profile", "resume", "answers", "compliance"].map((item) => (
              <label className="review-row" key={item}>
                <input type="checkbox" checked={reviewed.includes(item)} onChange={() => toggleReviewed(item)} />
                <span>{reviewLabel(item)}</span>
                {reviewed.includes(item) ? <Check /> : null}
              </label>
            ))}
            <div className="notice">
              Vitaey não envia candidaturas em massa. Esta ação representa uma candidatura revisada e iniciada por você.
            </div>
            <div className="modal-actions">
              <button onClick={() => setApplyJob(null)}>Cancelar</button>
              <button className="primary" disabled={reviewed.length < 4 || isSubmitting} onClick={() => void confirmApplication()}>
                {isSubmitting ? "Registrando..." : "Enviar candidatura"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function StationGate({
  id,
  activeStation,
  station,
  buttonLabel,
  onOpen,
}: {
  id: StationId;
  activeStation: StationId | null;
  station: string;
  buttonLabel: string;
  onOpen: (station: StationId) => void;
}) {
  const isActive = activeStation === id;

  return (
    <div className={`station-gate station-gate--${id} ${isActive ? "is-active" : ""}`}>
      <button
        className="station-access"
        type="button"
        onClick={() => onOpen(id)}
        aria-expanded={isActive}
        aria-label={`${buttonLabel} no monitor ${station}`}
      >
        {isActive ? "Estação aberta" : buttonLabel}
        <ArrowRight />
      </button>
    </div>
  );
}

function WorkspaceDock({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="workspace-dock">
      <span>{title}</span>
      <button type="button" onClick={onClose}>Voltar para sala</button>
    </div>
  );
}

function BootOverlay() {
  const [progress, setProgress] = useState(0);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const progressTimer = window.setInterval(() => {
      setProgress((value) => Math.min(100, value + 5 + Math.round(Math.random() * 9)));
    }, 90);
    const hideTimer = window.setTimeout(() => setIsHidden(true), 2300);
    return () => {
      window.clearInterval(progressTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  return (
    <div className={`boot-overlay ${isHidden ? "is-hidden" : ""}`} aria-hidden="true">
      <div className="boot-mark">V</div>
      <span>Inicializando Vitaey</span>
      <strong>{progress}%</strong>
      <div className="boot-ring" />
      <small>VAGAS // CURRÍCULO // REVISÃO MANUAL</small>
    </div>
  );
}

function Metric({ label, value, tone, icon }: { label: string; value: string | number; tone: string; icon: ReactNode }) {
  return (
    <article className={`metric ${tone}`}>
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function SectionList({ title, items, subtle = false }: { title: string; items: string[]; subtle?: boolean }) {
  return (
    <div className={subtle ? "section-list subtle" : "section-list"}>
      <h3>{title}</h3>
      <div>{items.length ? items.map((item) => <span key={item}>{item}</span>) : <span>Nenhum ponto crítico agora</span>}</div>
    </div>
  );
}

function reviewLabel(item: string) {
  const labels: Record<string, string> = {
    profile: "Dados pessoais e contato revisados",
    resume: "Currículo e carta adaptados para esta vaga",
    answers: "Perguntas obrigatórias preenchidas",
    compliance: "Confirmo que quero iniciar esta candidatura",
  };
  return labels[item];
}

function modelLabel(model: WorkModel) {
  const labels: Record<WorkModel, string> = {
    remote: "Remoto",
    hybrid: "Híbrido",
    onsite: "Presencial",
  };
  return labels[model];
}

function statusLabel(status: "connecting" | "live" | "offline" | "supabase") {
  const labels = {
    connecting: "Conectando",
    live: "API ativa",
    offline: "Radar sem fonte",
    supabase: "Conta sincronizada",
  };
  return labels[status];
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeExternalUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function auditLabel(eventType: string) {
  const labels: Record<string, string> = {
    user_confirmed_application: "Candidatura confirmada",
  };
  return labels[eventType] ?? eventType;
}

function personalizeJobs(sourceJobs: Job[], profile: CandidateProfile): Job[] {
  const profileSkills = new Set(profile.skills.map((item) => item.toLowerCase()));
  const targetRoles = profile.targetRoles.map((item) => item.toLowerCase());
  const location = profile.location.toLowerCase();

  return sourceJobs
    .map((job) => {
      const jobSkills = job.requirements.map((item) => item.toLowerCase());
      const skillHits = jobSkills.filter((item) => profileSkills.has(item)).length;
      const roleHit = targetRoles.some((role) => job.title.toLowerCase().includes(role));
      const remoteHit = profile.remoteFirst && job.workModel === "remote";
      const locationHit = location && job.location.toLowerCase().includes(location.split(",")[0]);
      const salaryPenalty = profile.salaryMin && job.salaryMax && job.salaryMax < profile.salaryMin ? -14 : 0;
      const personalizedScore = Math.max(
        1,
        Math.min(99, job.score + skillHits * 4 + (roleHit ? 6 : 0) + (remoteHit ? 3 : 0) + (locationHit ? 2 : 0) + salaryPenalty),
      );

      return {
        ...job,
        score: personalizedScore,
        gaps: jobSkills.filter((item) => !profileSkills.has(item)).slice(0, 3),
      };
    })
    .sort((a, b) => b.score - a.score);
}

export default App;
