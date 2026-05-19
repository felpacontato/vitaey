const VALID_WORK_MODELS = new Set(["remote", "hybrid", "onsite"]);
const VALID_EMPLOYMENT_TYPES = new Set(["clt", "pj", "contract", "internship"]);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const ingestToken = process.env.VITAEY_INGEST_TOKEN;
  const receivedToken = req.headers["x-vitaey-ingest-token"];

  if (!ingestToken || receivedToken !== ingestToken) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ ok: false, error: "missing_server_configuration" });
  }

  let payload;
  try {
    payload = await readJsonBody(req);
  } catch {
    return res.status(400).json({ ok: false, error: "invalid_json" });
  }

  const source = normalizeText(payload.source, "authorized_ingest").slice(0, 120);
  const normalizedJobs = normalizeJobs(payload.jobs);

  if (normalizedJobs.length === 0) {
    return res.status(400).json({ ok: false, error: "jobs_required" });
  }

  if (payload.dry_run === true) {
    return res.status(200).json({
      ok: true,
      dry_run: true,
      source,
      count: normalizedJobs.length,
      jobs: normalizedJobs,
    });
  }

  const insertResponse = await fetch(`${supabaseUrl}/rest/v1/vitaey_jobs?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(normalizedJobs),
  });

  if (!insertResponse.ok) {
    const detail = await safeResponseText(insertResponse);
    await writeIngestionAudit(supabaseUrl, serviceRoleKey, source, normalizedJobs.length, "failed", detail);
    return res.status(502).json({ ok: false, error: "supabase_insert_failed", detail });
  }

  await writeIngestionAudit(supabaseUrl, serviceRoleKey, source, normalizedJobs.length, "completed", null);

  return res.status(200).json({
    ok: true,
    source,
    upserted: normalizedJobs.length,
  });
};

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    return req.body.trim() ? JSON.parse(req.body) : {};
  }

  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
  }

  return raw.trim() ? JSON.parse(raw) : {};
}

function normalizeJobs(jobs) {
  if (!Array.isArray(jobs)) {
    return [];
  }

  return jobs
    .map((job) => normalizeJob(job))
    .filter((job) => job.title && job.company)
    .slice(0, 50);
}

function normalizeJob(job) {
  const title = normalizeText(job.title);
  const company = normalizeText(job.company);
  const location = normalizeText(job.location, "Remoto Brasil");
  const id = normalizeText(job.id) || makeJobId(title, company, location);
  const workModel = normalizeEnum(job.work_model || job.workModel, VALID_WORK_MODELS, "remote");
  const employmentType = normalizeEnum(
    job.employment_type || job.employmentType || job.contract,
    VALID_EMPLOYMENT_TYPES,
    "clt",
  );

  return {
    id,
    title,
    company,
    location,
    work_model: workModel,
    employment_type: employmentType,
    seniority: normalizeText(job.seniority, "Pleno"),
    salary_min: normalizeNumber(job.salary_min ?? job.salaryMin),
    salary_max: normalizeNumber(job.salary_max ?? job.salaryMax),
    score: clampNumber(job.match_score ?? job.matchScore ?? job.score, 1, 99, 70),
    posted_days_ago: clampNumber(job.posted_days_ago ?? job.postedDaysAgo, 0, 365, 0),
    source: normalizeText(job.source, "authorized_ingest").slice(0, 120),
    source_url: normalizeText(job.source_url || job.sourceUrl) || null,
    requirements: normalizeArray(job.requirements),
    benefits: normalizeArray(job.benefits),
    description: normalizeText(job.description, "Vaga importada por ingestao autorizada."),
    gaps: normalizeArray(job.gaps),
  };
}

function normalizeText(value, fallback = "") {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value).replace(/\s+/g, " ").trim() || fallback;
}

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean).slice(0, 20);
  }

  if (typeof value === "string") {
    return value
      .split(/[,;\n]/)
      .map((item) => normalizeText(item))
      .filter(Boolean)
      .slice(0, 20);
  }

  return [];
}

function normalizeEnum(value, allowed, fallback) {
  const normalized = normalizeText(value).toLowerCase();
  return allowed.has(normalized) ? normalized : fallback;
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function makeJobId(title, company, location) {
  const slug = `${title}-${company}-${location}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);

  return `ingest_${slug || Date.now()}`;
}

async function writeIngestionAudit(supabaseUrl, serviceRoleKey, source, jobsCount, status, errorDetail) {
  await fetch(`${supabaseUrl}/rest/v1/vitaey_job_ingestions`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      prefer: "return=minimal",
    },
    body: JSON.stringify({
      source,
      jobs_count: jobsCount,
      status,
      error_detail: errorDetail,
    }),
  }).catch(() => undefined);
}

async function safeResponseText(response) {
  const text = await response.text().catch(() => "");
  return text.slice(0, 500);
}
