import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  Check,
  FileText,
  Filter,
  Hand,
  LayoutDashboard,
  LockKeyhole,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  confirmApplicationSubmission,
  fetchApplications,
  fetchRecommendedJobs,
  prepareApplication,
  saveApplication,
} from "./api";
import { getCurrentSession, hasSupabaseConfig, onAuthStateChange, signInWithGoogle, signOut } from "./supabase";
import { initialApplications, jobs as fallbackJobs, type Application, type Contract, type Job, type Stage, type WorkModel } from "./data/mock";

const stages: Array<{ id: Stage; label: string }> = [
  { id: "saved", label: "Salvas" },
  { id: "prepared", label: "Preparadas" },
  { id: "applied", label: "Enviadas" },
  { id: "interviewing", label: "Entrevistas" },
  { id: "offered", label: "Ofertas" },
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
        const [recommendedJobs, serverApplications] = await Promise.all([
          fetchRecommendedJobs(),
          hasSupabaseConfig && !sessionEmail ? Promise.resolve([]) : fetchApplications(),
        ]);
        if (!isMounted) return;
        setJobs(recommendedJobs);
        setSelectedJob(recommendedJobs[0] ?? fallbackJobs[0]);
        setApplications(serverApplications);
        setApiStatus(hasSupabaseConfig ? "supabase" : "live");
      } catch {
        if (!isMounted) return;
        setApiStatus("offline");
      }
    }

    Promise.all([fetchRecommendedJobs(), fetchApplications()])
      .then(([recommendedJobs, serverApplications]) => {
        if (!isMounted) return;
        setJobs(recommendedJobs);
        setSelectedJob(recommendedJobs[0] ?? fallbackJobs[0]);
        setApplications(serverApplications);
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

  function upsertApplication(application: Application) {
    setApplications((items) => [
      ...items.filter((item) => item.id !== application.id && item.jobId !== application.jobId),
      application,
    ]);
  }

  async function saveJob(job: Job) {
    if (hasSupabaseConfig && !sessionEmail) {
      setAuthNotice("Entre com Google para salvar e rastrear candidaturas no Supabase.");
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
      setAuthNotice("Entre com Google para preparar e salvar esta candidatura com seguranca.");
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

  const bestMatch = jobs.length ? Math.max(...jobs.map((job) => job.score)) : 0;
  const activeFilters = [workModel, contract, seniority, location].filter((item) => item !== "all").length + (minSalary ? 1 : 0);

  function moveApplication(id: string, stage: Stage) {
    setApplications((items) => items.map((item) => (item.id === id ? { ...item, stage } : item)));
  }

  function toggleReviewed(key: string) {
    setReviewed((items) => (items.includes(key) ? items.filter((item) => item !== key) : [...items, key]));
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">V</div>
          <div>
            <strong>Vitaey</strong>
            <span>AI job search</span>
          </div>
        </div>
        <nav className="nav-list" aria-label="Navegacao principal">
          <a className="active" href="#dashboard"><LayoutDashboard /> Dashboard</a>
          <a href="#vagas"><BriefcaseBusiness /> Vagas</a>
          <a href="#curriculo"><FileText /> Curriculo</a>
          <a href="#kanban"><ShieldCheck /> Candidaturas</a>
        </nav>
        <div className="compliance-card">
          <LockKeyhole />
          <strong>Modo seguro</strong>
          <p>Nenhuma candidatura e enviada sem clique e revisao final do usuario.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>Radar de oportunidades</h1>
            <p>Priorize vagas com aderencia real, curriculo ajustado e rastreio completo.</p>
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

        {authNotice ? (
          <div className="auth-notice" role="status">
            {authNotice}
          </div>
        ) : null}

        <section className="metrics" id="dashboard" aria-label="Resumo">
          <Metric label="Vagas salvas" value={savedCount} tone="mint" />
          <Metric label="Candidaturas ativas" value={activeCount} tone="blue" />
          <Metric label="Entrevistas" value={interviewCount} tone="violet" />
          <Metric label="Melhor match" value={`${bestMatch}%`} tone="amber" />
        </section>

        <section className="content-grid">
          <div className="panel job-panel" id="vagas">
            <div className="panel-heading">
              <div>
                <h2>Vagas recomendadas</h2>
                <p>{filteredJobs.length} vagas filtradas - {activeFilters} filtros ativos.</p>
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
                <option value="hybrid">Hibrido</option>
                <option value="onsite">Presencial</option>
              </select>
              <select value={contract} onChange={(event) => setContract(event.target.value as Contract | "all")}>
                <option value="all">Todos os regimes</option>
                <option value="CLT">CLT</option>
                <option value="PJ">PJ</option>
                <option value="Contrato">Contrato</option>
                <option value="Estagio">Estagio</option>
              </select>
              <select value={seniority} onChange={(event) => setSeniority(event.target.value)}>
                <option value="all">Todas as senioridades</option>
                <option value="junior">Junior</option>
                <option value="pleno">Pleno</option>
                <option value="senior">Senior</option>
              </select>
              <select value={location} onChange={(event) => setLocation(event.target.value)}>
                <option value="all">Todas as localidades</option>
                <option value="remote">Remoto</option>
                <option value="sao paulo">Sao Paulo</option>
                <option value="curitiba">Curitiba</option>
                <option value="brasil">Brasil</option>
              </select>
              <label className="salary-field">
                <span>Salario minimo</span>
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
                  <div>
                    <h3>{job.title}</h3>
                    <p>{job.company} - {job.location}</p>
                  </div>
                  <div
                    className="score-ring"
                    style={{ "--score": job.score } as CSSProperties}
                    aria-label={`Compatibilidade ${job.score}%`}
                  >
                    {job.score}%
                  </div>
                  <div className="job-meta">
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
                  <span>Ajuste os filtros para ampliar o radar.</span>
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
            <h2>{selectedJob.title}</h2>
            <p className="muted">{selectedJob.company} - {selectedJob.salary}</p>
            <p>{selectedJob.description}</p>
            <SectionList title="Requisitos conectados" items={selectedJob.requirements} />
            <SectionList title="Pontos para revisar" items={selectedJob.gaps} subtle />
            <button className="wide-primary" onClick={() => void startApplication(selectedJob)}>
              Personalizar e aplicar <ArrowRight />
            </button>
          </aside>
        </section>

        <section className="panel builder" id="curriculo">
          <div>
            <h2>Construtor assistido</h2>
            <p>O Vitaey sugere bullets e carta com base na vaga selecionada. Voce edita antes de usar.</p>
          </div>
          <div className="document-preview">
            <div>
              <span>Resumo sugerido</span>
              <strong>Designer de produto com experiencia em discovery, design system e SaaS.</strong>
            </div>
            <ul>
              {selectedJob.requirements.slice(0, 4).map((item) => (
                <li key={item}>Adaptar experiencia para destacar {item}.</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="panel kanban" id="kanban">
          <div className="panel-heading">
            <div>
              <h2>Pipeline de candidaturas</h2>
              <p>Atualize o status sem perder historico de cada vaga.</p>
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
                    <select value={item.stage} onChange={(event) => moveApplication(item.id, event.target.value as Stage)}>
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
                <h2 id="apply-title">Aplicar para {applyJob.title}</h2>
                <p>Revise cada item. O envio so libera com confirmacao manual.</p>
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
              Vitaey nao envia candidaturas em massa. Esta acao representa uma candidatura revisada e iniciada por voce.
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

function Metric({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <article className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function SectionList({ title, items, subtle = false }: { title: string; items: string[]; subtle?: boolean }) {
  return (
    <div className={subtle ? "section-list subtle" : "section-list"}>
      <h3>{title}</h3>
      <div>{items.map((item) => <span key={item}>{item}</span>)}</div>
    </div>
  );
}

function reviewLabel(item: string) {
  const labels: Record<string, string> = {
    profile: "Dados pessoais e contato revisados",
    resume: "Curriculo e carta adaptados para esta vaga",
    answers: "Perguntas obrigatorias preenchidas",
    compliance: "Confirmo que quero iniciar esta candidatura",
  };
  return labels[item];
}

function modelLabel(model: WorkModel) {
  const labels: Record<WorkModel, string> = {
    remote: "Remoto",
    hybrid: "Hibrido",
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

export default App;
