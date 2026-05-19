import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
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
  initialApplications,
  jobs as fallbackJobs,
  type Application,
  type ApplicationAudit,
  type CandidateProfile,
  type Contract,
  type Job,
  type ResumeRecord,
  type Stage,
  type WorkModel,
} from "./data/mock";

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

function App() {
  const [query, setQuery] = useState("");
  const [workModel, setWorkModel] = useState<WorkModel | "all">("all");
  const [contract, setContract] = useState<Contract | "all">("all");
  const [seniority, setSeniority] = useState("all");
  const [location, setLocation] = useState("all");
  const [minSalary, setMinSalary] = useState(0);
  const [jobs, setJobs] = useState<Job[]>(fallbackJobs);
  const [selectedJob, setSelectedJob] = useState<Job>(fallbackJobs[0]);
  const [applications, setApplications] = useState<Application[]>(initialApplications);
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

  useEffect(() => {
    let isMounted = true;

    getCurrentSession()
      .then((session) => {
        if (!isMounted) return;
        setSessionEmail(session?.user.email ?? null);
      })
      .catch(() => {
        if (!isMounted) return;
        setSessionEmail(null);
      });

    const unsubscribe = onAuthStateChange((session) => {
      setSessionEmail(session?.user.email ?? null);
      setAuthNotice("");
      void refreshData();
    });

    async function refreshData() {
      try {
        const [recommendedJobs, serverApplications, storedProfile, storedResumes, auditRows] = await Promise.all([
          fetchRecommendedJobs(),
          hasSupabaseConfig && !sessionEmail ? Promise.resolve([]) : fetchApplications(),
          hasSupabaseConfig && !sessionEmail ? Promise.resolve(null) : fetchCandidateProfile(),
          hasSupabaseConfig && !sessionEmail ? Promise.resolve([]) : fetchResumes(),
          hasSupabaseConfig && !sessionEmail ? Promise.resolve([]) : fetchApplicationAudit(),
        ]);
        if (!isMounted) return;
        const nextProfile = storedProfile ?? defaultProfile;
        const personalized = personalizeJobs(recommendedJobs, nextProfile);
        setProfile(nextProfile);
        setProfileDraft(nextProfile);
        setJobs(personalized);
        setSelectedJob(personalized[0] ?? fallbackJobs[0]);
        setApplications(serverApplications);
        setResumes(storedResumes);
        setAudit(auditRows);
        setApiStatus(hasSupabaseConfig ? "supabase" : "live");
      } catch {
        if (!isMounted) return;
        setApiStatus("offline");
      }
    }

    Promise.all([fetchRecommendedJobs(), fetchApplications(), fetchCandidateProfile(), fetchResumes(), fetchApplicationAudit()])
      .then(([recommendedJobs, serverApplications, storedProfile, storedResumes, auditRows]) => {
        if (!isMounted) return;
        const nextProfile = storedProfile ?? defaultProfile;
        const personalized = personalizeJobs(recommendedJobs, nextProfile);
        setProfile(nextProfile);
        setProfileDraft(nextProfile);
        setJobs(personalized);
        setSelectedJob(personalized[0] ?? fallbackJobs[0]);
        setApplications(serverApplications);
        setResumes(storedResumes);
        setAudit(auditRows);
        setApiStatus(hasSupabaseConfig ? "supabase" : "live");
      })
      .catch(() => {
        if (!isMounted) return;
        setApiStatus("offline");
      });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [sessionEmail]);

  useEffect(() => {
    if (!jobs.some((job) => job.id === selectedJob.id)) {
      setSelectedJob(jobs[0] ?? fallbackJobs[0]);
    }
  }, [jobs, selectedJob.id]);

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
      setSelectedJob(personalized[0] ?? selectedJob);
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
      setSelectedJob(personalized[0] ?? selectedJob);
      setApiStatus("supabase");
    } catch {
      setAuthNotice("Não foi possível processar o currículo agora.");
      setApiStatus("offline");
    } finally {
      setResumeUploading(false);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">V</div>
          <div>
            <strong>Vitaey</strong>
            <span>Carreira com controle</span>
          </div>
        </div>
        <nav className="nav-list" aria-label="Navegação principal">
          <a className="active" href="#dashboard"><LayoutDashboard /> Visão geral</a>
          <a href="#vagas"><BriefcaseBusiness /> Vagas</a>
          <a href="#curriculo"><FileText /> Currículo</a>
          <a href="#kanban"><ShieldCheck /> Candidaturas</a>
        </nav>
        <div className="compliance-card">
          <LockKeyhole />
          <strong>Controle do candidato</strong>
          <p>Nenhuma candidatura é enviada sem revisão e confirmação manual.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">Workspace pessoal</span>
            <h1>Vitaey</h1>
          </div>
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
            <button className="icon-button" aria-label="Ver lembretes">
              <Bell />
            </button>
          </div>
        </header>

        <section className="hero-surface" id="dashboard" aria-label="Resumo do Vitaey">
          <div className="hero-copy">
            <span className="eyebrow">Radar de carreira</span>
            <h2>Candidaturas melhores, com menos ruído.</h2>
            <p>
              Compare vagas, ajuste currículo e acompanhe cada envio em um fluxo feito para candidatos que querem decidir com segurança.
            </p>
            <div className="hero-actions">
              <a className="hero-primary" href="#vagas">Ver vagas <ArrowRight /></a>
              <a className="hero-secondary" href="#curriculo">Atualizar currículo</a>
            </div>
            <div className="trust-row" aria-label="Garantias do fluxo">
              <span><ShieldCheck /> Revisão manual</span>
              <span><LockKeyhole /> Dados privados</span>
              <span><Gauge /> Match ajustável</span>
            </div>
          </div>

          <div className="radar-panel" aria-hidden="true">
            <div className="radar-grid" />
            <div className="radar-orbit orbit-one" />
            <div className="radar-orbit orbit-two" />
            <div className="radar-orbit orbit-three" />
            <span className="radar-node node-a" />
            <span className="radar-node node-b" />
            <span className="radar-node node-c" />
            <div className="radar-center">
              <Target />
              <strong>{bestMatch}%</strong>
              <span>melhor match</span>
            </div>
            <div className="floating-card match-card">
              <span>Próxima ação</span>
              <strong>{selectedJob.title}</strong>
            </div>
            <div className="floating-card privacy-card">
              <ShieldCheck />
              <span>Envio só com confirmação</span>
            </div>
          </div>
        </section>

        {authNotice ? (
          <div className="auth-notice" role="status">
            {authNotice}
          </div>
        ) : null}

        <section className="metrics" aria-label="Indicadores do candidato">
          <Metric icon={<BriefcaseBusiness />} label="Vagas salvas" value={savedCount} tone="mint" />
          <Metric icon={<Layers3 />} label="Candidaturas ativas" value={activeCount} tone="blue" />
          <Metric icon={<Clock3 />} label="Entrevistas" value={interviewCount} tone="violet" />
          <Metric icon={<Target />} label="Melhor match" value={`${bestMatch}%`} tone="amber" />
        </section>

        <section className="workflow-strip" aria-label="Como o Vitaey organiza candidaturas">
          {workflow.map((item, index) => (
            <article key={item.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item.title}</strong>
              <p>{item.copy}</p>
            </article>
          ))}
        </section>

        <section className="content-grid">
          <div className="panel job-panel" id="vagas">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">Busca priorizada</span>
                <h2>Vagas recomendadas</h2>
                <p>{filteredJobs.length} vagas no radar · {activeFilters} filtros ativos.</p>
              </div>
              <Filter />
            </div>
            <div className="filters">
              <label className="search-field">
                <Search />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por cargo, empresa ou skill"
                />
              </label>
              <select value={workModel} onChange={(event) => setWorkModel(event.target.value as WorkModel | "all")}>
                <option value="all">Todos os modelos</option>
                <option value="remote">Remoto</option>
                <option value="hybrid">Híbrido</option>
                <option value="onsite">Presencial</option>
              </select>
              <select value={contract} onChange={(event) => setContract(event.target.value as Contract | "all")}>
                <option value="all">Todos os regimes</option>
                <option value="CLT">CLT</option>
                <option value="PJ">PJ</option>
                <option value="Contrato">Contrato</option>
                <option value="Estagio">Estágio</option>
              </select>
              <select value={seniority} onChange={(event) => setSeniority(event.target.value)}>
                <option value="all">Todas as senioridades</option>
                <option value="junior">Júnior</option>
                <option value="pleno">Pleno</option>
                <option value="senior">Sênior</option>
              </select>
              <select value={location} onChange={(event) => setLocation(event.target.value)}>
                <option value="all">Todas as localidades</option>
                <option value="remote">Remoto</option>
                <option value="sao paulo">São Paulo</option>
                <option value="curitiba">Curitiba</option>
                <option value="brasil">Brasil</option>
              </select>
              <label className="salary-field">
                <span>Salário mínimo</span>
                <input
                  min="0"
                  step="1000"
                  type="number"
                  value={minSalary || ""}
                  onChange={(event) => setMinSalary(Number(event.target.value))}
                  placeholder="0"
                />
              </label>
            </div>

            <div className="job-list">
              {filteredJobs.length ? filteredJobs.map((job) => (
                <article
                  className={`job-card ${selectedJob.id === job.id ? "selected" : ""}`}
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                >
                  <div className="job-title-row">
                    <div>
                      <span className="job-company">{job.company}</span>
                      <h3>{job.title}</h3>
                    </div>
                    <div
                      className="score-ring"
                      style={{ "--score": job.score } as CSSProperties}
                      aria-label={`Compatibilidade ${job.score}%`}
                    >
                      {job.score}%
                    </div>
                  </div>
                  <p className="job-description">{job.description}</p>
                  <div className="job-meta">
                    <span><MapPin /> {job.location}</span>
                    <span>{job.contract}</span>
                    <span>{job.seniority}</span>
                    <span>{job.posted}</span>
                  </div>
                  <div className="card-actions">
                    <button onClick={(event) => { event.stopPropagation(); setSelectedJob(job); }}>Detalhes</button>
                    <button onClick={(event) => { event.stopPropagation(); void saveJob(job); }}>Salvar</button>
                    <button className="primary" onClick={(event) => { event.stopPropagation(); void startApplication(job); }}>
                      Aplicar
                    </button>
                  </div>
                </article>
              )) : (
                <div className="empty-state">
                  <strong>Nenhuma vaga encontrada</strong>
                  <span>Ajuste os filtros ou atualize o perfil para ampliar o radar.</span>
                </div>
              )}
            </div>
          </div>

          <aside className="panel details-panel">
            <div className="company-visual">
              <div className="orbit"><Sparkles /></div>
              <div>
                <span>Compatibilidade</span>
                <strong>{selectedJob.score}%</strong>
              </div>
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
          </aside>
        </section>

        <section className="panel builder profile-workbench" id="curriculo">
          <div className="profile-editor">
            <div className="panel-heading compact-heading">
              <div>
                <span className="section-kicker">Perfil do candidato</span>
                <h2>Currículo e preferências</h2>
                <p>{sessionEmail ? sessionEmail : "Entre para manter o perfil sincronizado com segurança."}</p>
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
              {profile.skills.slice(0, 12).map((item) => <span key={item}>{item}</span>)}
            </div>
            <ul>
              {selectedJob.requirements.slice(0, 4).map((item) => (
                <li key={item}>Destacar experiência relacionada a {item}.</li>
              ))}
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
        </section>

        <section className="panel kanban" id="kanban">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Rastreamento</span>
              <h2>Pipeline de candidaturas</h2>
              <p>{pipelineProgress}% das candidaturas já saíram da etapa inicial.</p>
            </div>
            <Hand />
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
        </section>
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
    offline: "Modo local",
    supabase: "Supabase ativo",
  };
  return labels[status];
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
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
