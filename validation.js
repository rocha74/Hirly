const { invalidRequest } = require('./errors');

const SCHEMA_VERSION = '1';
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_REQUEST_BYTES = 15 * 1024 * 1024;
const FEATURES = ['cv_parse', 'job_summary', 'match_explanation', 'cv_coach'];

const record = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalidRequest();
  return value;
};

const keys = (value, allowed) => {
  const set = new Set(allowed);
  if (Object.keys(value).some((key) => !set.has(key))) throw invalidRequest();
};

const string = (value, max, required = true) => {
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'string' || value.length > max || (required && value.length === 0)) {
    throw invalidRequest();
  }
  return value;
};

const number = (value, min, max, required = false) => {
  if ((value === undefined || value === null) && !required) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw invalidRequest();
  }
  return value;
};

const boolean = (value) => {
  if (value === undefined) return false;
  if (typeof value !== 'boolean') throw invalidRequest();
  return value;
};

const strings = (value, maxItems, maxLength, required = true) => {
  if (value === undefined && !required) return [];
  if (!Array.isArray(value) || value.length > maxItems) throw invalidRequest();
  return value.map((item) => string(item, maxLength));
};

const job = (value) => {
  const data = record(value);
  keys(data, ['id', 'title', 'company', 'type', 'contractType', 'location', 'area',
    'description', 'salary', 'skills', 'requiredSkills', 'differentials', 'benefits']);
  return {
    id: string(data.id, 200), title: string(data.title, 180),
    company: string(data.company, 180), type: string(data.type, 40),
    contractType: string(data.contractType, 40), location: string(data.location, 180),
    area: string(data.area, 120), description: string(data.description, 8000, false) || '',
    salary: string(data.salary, 120, false) || '',
    skills: strings(data.skills, 30, 100, false),
    requiredSkills: strings(data.requiredSkills, 30, 120, false),
    differentials: strings(data.differentials, 30, 120, false),
    benefits: strings(data.benefits, 30, 120, false),
  };
};

const profile = (value) => {
  const data = record(value);
  keys(data, ['course', 'university', 'area', 'areas', 'opportunityType', 'preferredCity',
    'preferredLocation', 'preferredModes', 'preferredMinSalary', 'preferredMaxSalary',
    'skills', 'interests', 'cvUploaded']);
  return {
    course: string(data.course, 180, false), university: string(data.university, 180, false),
    area: string(data.area, 120, false), areas: strings(data.areas, 3, 120, false),
    opportunityType: string(data.opportunityType, 60, false),
    preferredCity: string(data.preferredCity, 120, false),
    preferredLocation: string(data.preferredLocation, 180, false),
    preferredModes: strings(data.preferredModes, 3, 30, false),
    preferredMinSalary: number(data.preferredMinSalary, 0, 1_000_000),
    preferredMaxSalary: number(data.preferredMaxSalary, 0, 1_000_000),
    skills: strings(data.skills, 40, 100, false),
    interests: strings(data.interests, 40, 100, false),
    cvUploaded: boolean(data.cvUploaded),
  };
};

const cvParse = (value) => {
  const data = record(value);
  keys(data, ['documentBase64', 'contentType', 'fileSizeBytes']);
  const documentBase64 = string(data.documentBase64, Math.ceil(MAX_PDF_BYTES * 4 / 3) + 8);
  if (data.contentType !== 'application/pdf' || !/^[A-Za-z0-9+/]+={0,2}$/.test(documentBase64)) {
    throw invalidRequest();
  }
  const estimated = Math.floor(documentBase64.length * 3 / 4) -
    (documentBase64.endsWith('==') ? 2 : documentBase64.endsWith('=') ? 1 : 0);
  const fileSizeBytes = number(data.fileSizeBytes, 1, MAX_PDF_BYTES, true);
  if (Math.abs(estimated - fileSizeBytes) > 4 || estimated > MAX_PDF_BYTES) throw invalidRequest();
  if (!Buffer.from(documentBase64.slice(0, 16), 'base64').toString('ascii').startsWith('%PDF-')) {
    throw invalidRequest();
  }
  return { documentBase64, contentType: 'application/pdf', fileSizeBytes };
};

const wrapped = (value, shape) => {
  const data = record(value);
  keys(data, Object.keys(shape));
  const out = {};
  for (const [key, validator] of Object.entries(shape)) out[key] = validator(data[key]);
  return out;
};

const validators = {
  cv_parse: cvParse,
  job_summary: (value) => wrapped(value, { job, regenerate: boolean }),
  match_explanation: (value) => wrapped(value, { job, profile, regenerate: boolean }),
  cv_coach: (value) => wrapped(value, { profile, regenerate: boolean }),
};

const validateAiRequest = (value) => {
  const data = record(value);
  let size;
  try { size = Buffer.byteLength(JSON.stringify(data)); } catch { throw invalidRequest(); }
  if (size > MAX_REQUEST_BYTES) throw invalidRequest();
  keys(data, ['feature', 'payload', 'schemaVersion']);
  const feature = string(data.feature, 50);
  if (!FEATURES.includes(feature)) throw invalidRequest();
  const schemaVersion = data.schemaVersion === undefined ? SCHEMA_VERSION : string(data.schemaVersion, 10);
  if (schemaVersion !== SCHEMA_VERSION) throw invalidRequest();
  if (feature !== 'cv_parse' && size > 40 * 1024) throw invalidRequest();
  return { feature, payload: validators[feature](data.payload), schemaVersion, requestBytes: size };
};

module.exports = { FEATURES, MAX_PDF_BYTES, SCHEMA_VERSION, validateAiRequest };
