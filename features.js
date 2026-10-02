const { temporarilyUnavailable } = require('./errors');

const MODEL = 'claude-sonnet-4-6';
const ALLOWED_MODELS = new Set([MODEL]);

const tool = (name, properties, required) => ({
  name,
  description: `Structured response for ${name}`,
  input_schema: { type: 'object', properties, required },
});

const stringList = (maxItems) => ({ type: 'array', items: { type: 'string' }, maxItems });

const CV_TOOL = tool('extract_cv', {
  name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' },
  city: { type: 'string' }, state: { type: 'string' }, country: { type: 'string' },
  course: { type: 'string' }, university: { type: 'string' }, educationAbroad: { type: 'boolean' },
  semester: { type: 'integer', minimum: 1, maximum: 12 },
  graduationYear: { type: 'integer', minimum: 2000, maximum: 2035 },
  area: { type: 'string', enum: ['Tech & Engenharia', 'Design & Criativo', 'Negócios & Vendas',
    'Marketing & Publicidade', 'Dados & Analytics', 'Finanças & Contabilidade',
    'Direito & Compliance', 'Saúde & Medicina', 'Educação', 'Outra área'] },
  skills: stringList(20), languages: stringList(10), summary: { type: 'string' },
  experiences: { type: 'array', maxItems: 10, items: { type: 'object', properties: {
    company: { type: 'string' }, role: { type: 'string' }, period: { type: 'string' },
    description: { type: 'string' },
  }, required: ['company', 'role'] } },
  links: { type: 'array', maxItems: 5, items: { type: 'object', properties: {
    type: { type: 'string', enum: ['linkedin', 'github', 'portfolio', 'other'] }, url: { type: 'string' },
  }, required: ['type', 'url'] } },
}, []);

const SUMMARY_TOOL = tool('summarize_job', {
  oneLiner: { type: 'string' }, bullets: stringList(5),
  seniority: { type: 'string', enum: ['estagiario', 'junior', 'pleno', 'senior', 'qualquer'] },
  redFlags: stringList(4),
}, ['oneLiner', 'bullets', 'seniority']);

const MATCH_TOOL = tool('explain_match', {
  headline: { type: 'string' }, pros: stringList(4), cons: stringList(3),
  verdict: { type: 'string', enum: ['go', 'maybe', 'skip'] },
}, ['headline', 'pros', 'verdict']);

const COACH_TOOL = tool('coach_cv', {
  score: { type: 'integer', minimum: 0, maximum: 100 }, strengths: stringList(4),
  improvements: stringList(6), skillSuggestions: stringList(5), nextStep: { type: 'string' },
}, ['score', 'strengths', 'improvements', 'nextStep']);

const join = (items) => items.length ? items.join(', ') : '-';
const jobText = (job) => [
  `Cargo: ${job.title}`, `Empresa: ${job.company}`, `Modalidade: ${job.type}`,
  `Contrato: ${job.contractType}`, `Local: ${job.location}`, `Area: ${job.area}`,
  `Descricao: ${job.description}`, `Requisitos: ${join(job.requiredSkills)}`,
  `Diferenciais: ${join(job.differentials)}`, `Beneficios: ${join(job.benefits)}`,
].join('\n');

const profileText = (profile) => [
  `Curso: ${profile.course || '-'}`, `Universidade: ${profile.university || '-'}`,
  `Areas: ${join(profile.areas?.length ? profile.areas : profile.area ? [profile.area] : [])}`,
  `Objetivo: ${profile.opportunityType || '-'}`,
  `Local: ${profile.preferredCity || profile.preferredLocation || '-'}`,
  `Modalidades: ${join(profile.preferredModes)}`, `Skills declaradas: ${join(profile.skills)}`,
  `Interesses: ${join(profile.interests)}`,
  `Curriculo enviado: ${profile.cvUploaded ? 'sim' : 'nao'}`,
].join('\n');

const configs = {
  cv_parse: {
    model: MODEL, maxTokens: 4000, temperature: 0, tool: CV_TOOL,
    system: 'Extraia somente dados presentes no curriculo brasileiro. Nao invente campos. Responda apenas pela tool extract_cv, em PT-BR, com no maximo 20 skills.',
    messages: (p) => [{ role: 'user', content: [
      { type: 'document', source: { type: 'base64', media_type: p.contentType, data: p.documentBase64 } },
      { type: 'text', text: 'Extraia os campos estruturados do curriculo.' },
    ] }],
    quota: { minute: 1, day: 5, regenerations: 0 },
  },
  job_summary: {
    model: MODEL, maxTokens: 700, temperature: 0.2, tool: SUMMARY_TOOL,
    system: 'Resuma a vaga para candidato iniciante em PT-BR. Seja concreto, nao invente e responda apenas pela tool summarize_job.',
    messages: (p) => [{ role: 'user', content: jobText(p.job) }],
    quota: { minute: 5, day: 40, regenerations: 5 },
  },
  match_explanation: {
    model: MODEL, maxTokens: 800, temperature: 0.2, tool: MATCH_TOOL,
    system: 'Explique em PT-BR por que a vaga combina com o perfil. Use somente dados fornecidos, destaque gaps reais e responda apenas pela tool explain_match.',
    messages: (p) => [{ role: 'user', content: `PERFIL\n${profileText(p.profile)}\n\nVAGA\n${jobText(p.job)}` }],
    quota: { minute: 3, day: 30, regenerations: 5 },
  },
  cv_coach: {
    model: MODEL, maxTokens: 900, temperature: 0.2, tool: COACH_TOOL,
    system: 'Avalie o perfil de candidato iniciante em PT-BR. Sugira acoes concretas sem discriminar ou inventar. Responda apenas pela tool coach_cv.',
    messages: (p) => [{ role: 'user', content: profileText(p.profile) }],
    quota: { minute: 1, day: 5, regenerations: 2 },
  },
};

const text = (value, max) => typeof value === 'string' ? value.slice(0, max) : '';
const list = (value, maxItems, maxLength) => Array.isArray(value)
  ? value.filter((item) => typeof item === 'string').slice(0, maxItems).map((item) => item.slice(0, maxLength))
  : [];

const safeUrl = (value) => {
  if (typeof value !== 'string' || value.length > 500) return null;
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) return null;
    return parsed.toString().slice(0, 500);
  } catch {
    return null;
  }
};

const sanitizeExperience = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const company = text(value.company, 180);
  const role = text(value.role, 180);
  if (!company || !role) return null;
  return {
    company,
    role,
    ...(text(value.period, 100) ? { period: text(value.period, 100) } : {}),
    ...(text(value.description, 600) ? { description: text(value.description, 600) } : {}),
  };
};

const sanitizeLink = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const type = ['linkedin', 'github', 'portfolio', 'other'].includes(value.type) ? value.type : 'other';
  const url = safeUrl(value.url);
  return url ? { type, url } : null;
};

const sanitizers = {
  cv_parse: (raw) => {
    if (!raw || typeof raw !== 'object') throw temporarilyUnavailable();
    const out = {};
    for (const key of ['name', 'email', 'phone', 'city', 'state', 'country', 'course', 'university']) {
      if (typeof raw[key] === 'string') out[key] = raw[key].slice(0, 300);
    }
    const allowedAreas = CV_TOOL.input_schema.properties.area.enum;
    if (allowedAreas.includes(raw.area)) out.area = raw.area;
    for (const key of ['educationAbroad']) if (typeof raw[key] === 'boolean') out[key] = raw[key];
    if (Number.isInteger(raw.semester) && raw.semester >= 1 && raw.semester <= 12) out.semester = raw.semester;
    if (Number.isInteger(raw.graduationYear) && raw.graduationYear >= 2000 && raw.graduationYear <= 2035) {
      out.graduationYear = raw.graduationYear;
    }
    out.skills = list(raw.skills, 20, 100); out.languages = list(raw.languages, 10, 100);
    if (typeof raw.summary === 'string') out.summary = raw.summary.slice(0, 500);
    out.experiences = Array.isArray(raw.experiences)
      ? raw.experiences.slice(0, 10).map(sanitizeExperience).filter(Boolean)
      : [];
    out.links = Array.isArray(raw.links)
      ? raw.links.slice(0, 5).map(sanitizeLink).filter(Boolean)
      : [];
    return out;
  },
  job_summary: (raw) => {
    const result = { oneLiner: text(raw?.oneLiner, 120), bullets: list(raw?.bullets, 5, 160),
      seniority: ['estagiario', 'junior', 'pleno', 'senior', 'qualquer'].includes(raw?.seniority) ? raw.seniority : 'qualquer',
      redFlags: list(raw?.redFlags, 4, 180) };
    if (!result.oneLiner || result.bullets.length < 1) throw temporarilyUnavailable();
    return result;
  },
  match_explanation: (raw) => {
    const result = { headline: text(raw?.headline, 120), pros: list(raw?.pros, 4, 180),
      cons: list(raw?.cons, 3, 180), verdict: ['go', 'maybe', 'skip'].includes(raw?.verdict) ? raw.verdict : 'maybe' };
    if (!result.headline || !result.pros.length) throw temporarilyUnavailable();
    return result;
  },
  cv_coach: (raw) => {
    const result = { score: Math.max(0, Math.min(100, Math.round(Number(raw?.score) || 0))),
      strengths: list(raw?.strengths, 4, 180), improvements: list(raw?.improvements, 6, 180),
      skillSuggestions: list(raw?.skillSuggestions, 5, 160), nextStep: text(raw?.nextStep, 220) };
    if (!result.nextStep || !result.improvements.length) throw temporarilyUnavailable();
    return result;
  },
};

const getFeatureConfig = (feature) => {
  const config = configs[feature];
  if (!config || !ALLOWED_MODELS.has(config.model)) throw temporarilyUnavailable();
  return config;
};

const buildProviderBody = (feature, payload) => {
  const config = getFeatureConfig(feature);
  return { model: config.model, max_tokens: config.maxTokens, temperature: config.temperature,
    system: config.system, tools: [config.tool], tool_choice: { type: 'tool', name: config.tool.name },
    messages: config.messages(payload) };
};

const parseProviderResponse = (feature, json) => {
  const config = getFeatureConfig(feature);
  const block = Array.isArray(json?.content) ? json.content.find((item) =>
    item?.type === 'tool_use' && item?.name === config.tool.name) : null;
  if (!block?.input) throw temporarilyUnavailable();
  return sanitizers[feature](block.input);
};

module.exports = { buildProviderBody, getFeatureConfig, parseProviderResponse };
