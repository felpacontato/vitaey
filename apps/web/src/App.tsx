import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
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

  return (
    <main className="experience-shell">
      <video
        className="office-video-backdrop"
        src="/media/office-workers-pexels-7966581.mp4"
        poster="/media/office-workers-pexels-7966581.jpg"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
      <OfficeWebGLScene signalScore={bestMatch || 72} jobCount={jobs.length} applicationCount={applications.length} />
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
          <a href="#vagas"><BriefcaseBusiness /> Vagas</a>
          <a href="#curriculo"><FileText /> Currículo</a>
          <a href="#kanban"><ShieldCheck /> Candidaturas</a>
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
        <a href="#vagas"><span /> Radar</a>
        <a href="#curriculo"><span /> Currículo</a>
        <a href="#kanban"><span /> Pipeline</a>
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
            <a className="hero-primary" href="#vagas">Explorar vagas <ArrowRight /></a>
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
            <strong>{bestMatch ? `${bestMatch}%` : "Fonte"}</strong>
            <span>{bestMatch ? "melhor match disponível" : "aguardando vagas"}</span>
          </div>
          <div className="career-snapshot" aria-label="Resumo do progresso">
            <span>
              <strong>{profile.headline || "Perfil em edição"}</strong>
              Currículo
            </span>
            <span>
              <strong>{filteredJobs.length || "Fonte pendente"}</strong>
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

      <section className="scene-section jobs-section" id="vagas" aria-label="Vagas recomendadas">
        <div className="section-frame section-intro">
          <span className="section-kicker">Estação 01 // Radar</span>
          <h2>Vagas recomendadas</h2>
          <p>
            {jobs.length
              ? `${filteredJobs.length} oportunidades no radar com ${activeFilters} filtro(s) ativo(s).`
              : "As oportunidades reais aparecerão aqui quando a fonte estiver conectada."}
          </p>
        </div>

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
      </section>

      <section className="scene-section resume-section" id="curriculo" aria-label="Currículo e preferências">
        <div className="section-frame section-intro">
          <span className="section-kicker">Estação 02 // Currículo</span>
          <h2>Currículo e preferências</h2>
          <p>{sessionEmail ? sessionEmail : "Entre para manter o perfil sincronizado com segurança."}</p>
        </div>

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

function OfficeWebGLScene({ signalScore, jobCount, applicationCount }: { signalScore: number; jobCount: number; applicationCount: number }) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const sceneHost = host;

    let isCancelled = false;
    let cleanupScene: (() => void) | undefined;

    async function mountScene() {
      const THREE = await import("three");
      if (isCancelled || !sceneHost.isConnected) return;

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const renderer = new THREE.WebGLRenderer({
        alpha: false,
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setClearColor(0x020202, 1);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      sceneHost.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x020202);
      scene.fog = new THREE.FogExp2(0x050507, 0.032);

      const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120);
      camera.position.set(0, 2.5, 12);

      const geometries: Array<import("three").BufferGeometry> = [];
      const materials: Array<import("three").Material> = [];
      const textures: Array<import("three").Texture> = [];
      const registerGeometry = <T extends import("three").BufferGeometry>(geometry: T) => {
        geometries.push(geometry);
        return geometry;
      };
      const registerMaterial = <T extends import("three").Material>(material: T) => {
        materials.push(material);
        return material;
      };
      const registerTexture = <T extends import("three").Texture>(texture: T) => {
        textures.push(texture);
        return texture;
      };

      const darkMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x070707, roughness: 0.72, metalness: 0.28 }));
      const floorMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x101114, roughness: 0.68, metalness: 0.18 }));
      const glassMat = registerMaterial(new THREE.MeshPhysicalMaterial({
        color: 0x0d1318,
        roughness: 0.18,
        metalness: 0.08,
        transmission: 0.38,
        transparent: true,
        opacity: 0.34,
      }));
      const redMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xff2a2a, emissiveIntensity: 1.4, roughness: 0.28 }));
      const cyanMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x58d8ff, emissive: 0x58d8ff, emissiveIntensity: 0.65, roughness: 0.35 }));
      const whiteMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xf4f2ed, roughness: 0.54, metalness: 0.05 }));
      const lineRed = registerMaterial(new THREE.LineBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.62 }));
      const lineCyan = registerMaterial(new THREE.LineBasicMaterial({ color: 0x58d8ff, transparent: true, opacity: 0.24 }));

      scene.add(new THREE.AmbientLight(0x93a3b6, 0.34));
      const moon = new THREE.DirectionalLight(0x8dcdf2, 1.2);
      moon.position.set(-5, 8, 7);
      scene.add(moon);
      const redLight = new THREE.PointLight(0xff2a2a, 18, 15);
      redLight.position.set(4.8, 2.2, -1.6);
      scene.add(redLight);
      const cyanLight = new THREE.PointLight(0x58d8ff, 10, 16);
      cyanLight.position.set(-5.8, 3, -4.8);
      scene.add(cyanLight);

      const root = new THREE.Group();
      scene.add(root);

      function box(size: [number, number, number], position: [number, number, number], material: import("three").Material, rotation: [number, number, number] = [0, 0, 0]) {
        const mesh = new THREE.Mesh(registerGeometry(new THREE.BoxGeometry(size[0], size[1], size[2])), material);
        mesh.position.set(position[0], position[1], position[2]);
        mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
        root.add(mesh);
        return mesh;
      }

      box([18, 0.08, 22], [0, -1.08, -1.2], floorMat);
      box([18, 0.08, 22], [0, 4.2, -1.2], darkMat);
      box([18, 5.2, 0.08], [0, 1.48, -8.2], darkMat);
      box([0.08, 5.2, 22], [-8.2, 1.48, -1.2], darkMat);
      box([0.08, 5.2, 22], [8.2, 1.48, -1.2], darkMat);

      for (let index = -4; index <= 4; index += 1) {
        box([0.018, 0.018, 22], [index * 2, 4.16, -1.2], lineCyan);
        box([18, 0.018, 0.018], [0, 4.17, -8 + index * 2], lineCyan);
      }

      for (let index = 0; index < 4; index += 1) {
        const x = -4.6 + index * 3.1;
        box([2.15, 0.16, 1.22], [x, -0.68, 0.95], darkMat);
        box([0.12, 0.94, 0.12], [x - 0.82, -0.2, 0.56], darkMat);
        box([0.12, 0.94, 0.12], [x + 0.82, -0.2, 0.56], darkMat);
        box([0.12, 0.94, 0.12], [x - 0.82, -0.2, 1.34], darkMat);
        box([0.12, 0.94, 0.12], [x + 0.82, -0.2, 1.34], darkMat);
        box([0.08, 0.78, 1.08], [x, 0.02, 0.18], glassMat);
        box([0.92, 0.56, 0.04], [x, 0.23, 0.05], redMat);
        box([0.74, 0.12, 0.74], [x, -0.72, 2.12], darkMat);
        box([0.44, 0.7, 0.44], [x, -0.27, 2.12], darkMat);
      }

      box([4.8, 0.18, 1.44], [0, -0.58, -3.2], darkMat);
      box([4.2, 1.8, 0.08], [0, 0.72, -4.15], glassMat);
      box([0.12, 2.4, 0.12], [-2.4, 0.45, -4.15], cyanMat);
      box([0.12, 2.4, 0.12], [2.4, 0.45, -4.15], cyanMat);
      box([5.8, 0.08, 0.08], [0, 1.7, -4.15], cyanMat);

      const video = document.createElement("video");
      video.src = "/media/office-workers-pexels-7966581.mp4";
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      const videoTexture = registerTexture(new THREE.VideoTexture(video));
      videoTexture.colorSpace = THREE.SRGBColorSpace;
      const videoMat = registerMaterial(new THREE.MeshBasicMaterial({ map: videoTexture, transparent: true, opacity: 0.72 }));
      const videoWall = new THREE.Mesh(registerGeometry(new THREE.PlaneGeometry(2.55, 1.44)), videoMat);
      videoWall.position.set(0, 0.85, -4.22);
      root.add(videoWall);
      void video.play().catch(() => undefined);

      const loader = new THREE.TextureLoader();
      const textureSpecs = [
        { src: "/media/resume-review-pexels-5439436.jpg", position: [-5.75, 0.85, -3.25] as [number, number, number], rotation: [0, 0.72, 0] as [number, number, number] },
        { src: "/media/office-desk-pexels-7731349.jpg", position: [5.75, 0.85, -3.25] as [number, number, number], rotation: [0, -0.72, 0] as [number, number, number] },
      ];
      textureSpecs.forEach((spec) => {
        loader.load(spec.src, (texture) => {
          if (isCancelled) return;
          texture.colorSpace = THREE.SRGBColorSpace;
          registerTexture(texture);
          const mesh = new THREE.Mesh(registerGeometry(new THREE.PlaneGeometry(1.72, 1.02)), registerMaterial(new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.54 })));
          mesh.position.set(...spec.position);
          mesh.rotation.set(...spec.rotation);
          root.add(mesh);
        });
      });

      const documentGroup = new THREE.Group();
      for (let index = 0; index < 7; index += 1) {
        const page = new THREE.Mesh(registerGeometry(new THREE.BoxGeometry(0.92, 0.018, 1.28)), whiteMat);
        page.position.set(-3.2 + index * 0.045, -0.32 + index * 0.045, -2.15 - index * 0.025);
        page.rotation.set(-0.18, 0.12, -0.08);
        documentGroup.add(page);
      }
      root.add(documentGroup);

      const pipeline = new THREE.Group();
      ["saved", "prepared", "applied", "interviewing", "offered"].forEach((_, index) => {
        const column = new THREE.Mesh(registerGeometry(new THREE.BoxGeometry(0.76, 1.8, 0.06)), glassMat);
        column.position.set(3.7 + index * 0.62, 0.26, -2.55);
        column.rotation.y = -0.38;
        pipeline.add(column);
        const node = new THREE.Mesh(registerGeometry(new THREE.SphereGeometry(0.08 + index * 0.006, 18, 18)), index % 2 ? cyanMat : redMat);
        node.position.set(3.7 + index * 0.62, 1.3 - index * 0.25, -2.48);
        pipeline.add(node);
      });
      root.add(pipeline);

      const pathPoints = [
        new THREE.Vector3(-6.8, -0.98, 3.5),
        new THREE.Vector3(-4.6, -0.62, 1.2),
        new THREE.Vector3(-2.1, -0.32, -1.8),
        new THREE.Vector3(0.6, -0.35, -3.4),
        new THREE.Vector3(3.5, -0.48, -2.4),
        new THREE.Vector3(6.4, -0.8, 0.6),
      ];
      const curve = new THREE.CatmullRomCurve3(pathPoints);
      const signalLine = new THREE.Line(registerGeometry(new THREE.BufferGeometry().setFromPoints(curve.getPoints(160))), lineRed);
      root.add(signalLine);

      const particlePositions = new Float32Array(420 * 3);
      for (let index = 0; index < 420; index += 1) {
        const point = curve.getPoint(index / 420);
        particlePositions[index * 3] = point.x + (Math.random() - 0.5) * 1.2;
        particlePositions[index * 3 + 1] = point.y + Math.random() * 1.8;
        particlePositions[index * 3 + 2] = point.z + (Math.random() - 0.5) * 1.2;
      }
      const particleGeometry = registerGeometry(new THREE.BufferGeometry());
      particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
      const particleMaterial = registerMaterial(new THREE.PointsMaterial({
        color: 0xff2a2a,
        depthWrite: false,
        size: 0.035,
        transparent: true,
        opacity: 0.54,
      }));
      const particles = new THREE.Points(particleGeometry, particleMaterial);
      root.add(particles);

      const signalRing = new THREE.Mesh(
        registerGeometry(new THREE.TorusGeometry(0.82 + signalScore / 260, 0.012, 10, 120)),
        registerMaterial(new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.36, wireframe: true })),
      );
      signalRing.position.set(-4.7, 1.55, 0.72);
      signalRing.rotation.set(1.34, 0.18, 0.3);
      root.add(signalRing);

      for (let index = 0; index < Math.max(3, Math.min(12, jobCount + applicationCount + 3)); index += 1) {
        const node = new THREE.Mesh(registerGeometry(new THREE.SphereGeometry(0.055, 16, 16)), index % 3 === 0 ? cyanMat : redMat);
        const point = curve.getPoint(index / Math.max(3, Math.min(12, jobCount + applicationCount + 3)));
        node.position.set(point.x, point.y + 0.62 + Math.sin(index) * 0.4, point.z);
        root.add(node);
      }

      const keyframes = [
        { p: 0, camera: new THREE.Vector3(0, 2.25, 12.2), target: new THREE.Vector3(0, 0.55, -1.9) },
        { p: 0.28, camera: new THREE.Vector3(-5.3, 1.75, 4.8), target: new THREE.Vector3(-1.4, 0.2, -1.1) },
        { p: 0.58, camera: new THREE.Vector3(1.2, 1.65, 4.1), target: new THREE.Vector3(-2.6, 0.34, -2.4) },
        { p: 0.82, camera: new THREE.Vector3(5.2, 1.8, 4.2), target: new THREE.Vector3(4.4, 0.28, -2.35) },
        { p: 1, camera: new THREE.Vector3(0, 2.35, 9.8), target: new THREE.Vector3(0, 0.25, -2.2) },
      ];
      const desiredCamera = keyframes[0].camera.clone();
      const desiredTarget = keyframes[0].target.clone();
      const currentTarget = keyframes[0].target.clone();
      const pointer = { x: 0, y: 0 };
      let scrollProgress = 0;

      function interpolate(progress: number) {
        const bounded = Math.max(0, Math.min(1, progress));
        let from = keyframes[0];
        let to = keyframes[keyframes.length - 1];
        for (let index = 0; index < keyframes.length - 1; index += 1) {
          if (bounded >= keyframes[index].p && bounded <= keyframes[index + 1].p) {
            from = keyframes[index];
            to = keyframes[index + 1];
            break;
          }
        }
        const local = to.p === from.p ? 0 : (bounded - from.p) / (to.p - from.p);
        desiredCamera.copy(from.camera).lerp(to.camera, local);
        desiredTarget.copy(from.target).lerp(to.target, local);
      }

      function updateScroll() {
        const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        scrollProgress = window.scrollY / maxScroll;
        interpolate(scrollProgress);
      }

      const setSize = () => {
        const rect = sceneHost.getBoundingClientRect();
        const width = Math.max(1, rect.width);
        const height = Math.max(1, rect.height);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        updateScroll();
      };
      const onPointerMove = (event: PointerEvent) => {
        pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
        pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
      };

      setSize();
      window.addEventListener("resize", setSize);
      window.addEventListener("scroll", updateScroll, { passive: true });
      window.addEventListener("pointermove", onPointerMove);

      let frameId = 0;
      const startTime = performance.now();
      const render = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        const parallaxCamera = desiredCamera.clone();
        parallaxCamera.x += pointer.x * 0.22;
        parallaxCamera.y += pointer.y * -0.12;
        camera.position.lerp(parallaxCamera, 0.075);
        currentTarget.lerp(desiredTarget, 0.075);
        camera.lookAt(currentTarget);

        particles.rotation.y = Math.sin(elapsed * 0.12) * 0.035;
        signalRing.rotation.z = elapsed * 0.28;
        signalLine.rotation.y = Math.sin(elapsed * 0.1) * 0.035;
        documentGroup.position.y = Math.sin(elapsed * 0.8) * 0.035;
        pipeline.position.y = Math.sin(elapsed * 0.55) * 0.045;
        redLight.intensity = 16 + Math.sin(elapsed * 1.4) * 3;
        particleMaterial.opacity = 0.42 + Math.sin(elapsed * 1.7) * 0.12;

        renderer.render(scene, camera);
        frameId = window.requestAnimationFrame(render);
      };

      if (prefersReducedMotion) {
        renderer.render(scene, camera);
      } else {
        render();
      }

      cleanupScene = () => {
        window.removeEventListener("resize", setSize);
        window.removeEventListener("scroll", updateScroll);
        window.removeEventListener("pointermove", onPointerMove);
        window.cancelAnimationFrame(frameId);
        video.pause();
        geometries.forEach((geometry) => geometry.dispose());
        materials.forEach((material) => material.dispose());
        textures.forEach((texture) => texture.dispose());
        renderer.dispose();
        if (renderer.domElement.parentElement === sceneHost) {
          sceneHost.removeChild(renderer.domElement);
        }
      };
    }

    void mountScene();

    return () => {
      isCancelled = true;
      cleanupScene?.();
    };
  }, [applicationCount, jobCount, signalScore]);

  return <div className="office-webgl" ref={hostRef} aria-hidden="true" />;
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
