const fs = require('node:fs');
const path = require('node:path');
const { after, before, beforeEach, describe, test } = require('node:test');
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const {
  deleteField,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} = require('firebase/firestore');
const { deleteObject, getBytes, ref, uploadBytes } = require('firebase/storage');

const PROJECT_ID = 'demo-hirly-rules';
const ROOT = path.resolve(__dirname, '../..');
const MAX_CV_BYTES = 10 * 1024 * 1024;

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8'),
    },
    storage: {
      rules: fs.readFileSync(path.join(ROOT, 'storage.rules'), 'utf8'),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv.cleanup();
});

describe('Firestore rules', () => {
  test('registros de envio por email sao exclusivos do backend', async () => {
    for (const context of [testEnv.authenticatedContext('alice'),
      testEnv.authenticatedContext('admin', { admin: true }), testEnv.unauthenticatedContext()]) {
      for (const recordPath of ['emailApplicationRoutes/job-1',
        'users/alice/emailApplicationDrafts/job-1',
        'users/alice/emailApplicationConsents/job-1',
        'users/alice/emailApplicationAttempts/job-1']) {
        await assertFails(setDoc(doc(context.firestore(), recordPath), { fingerprint: 'forged' }));
        await assertFails(getDoc(doc(context.firestore(), recordPath)));
      }
    }
  });

  test('projecao de email permite somente leitura do candidato', async () => {
    const recordPath = 'users/alice/emailApplicationProjections/job-1';
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), recordPath), { status: 'accepted' });
    });
    await assertSucceeds(getDoc(doc(testEnv.authenticatedContext('alice').firestore(), recordPath)));
    for (const context of [testEnv.authenticatedContext('alice'),
      testEnv.authenticatedContext('bob'), testEnv.unauthenticatedContext()]) {
      await assertFails(setDoc(doc(context.firestore(), recordPath), { status: 'accepted' }));
    }
    await assertFails(getDoc(doc(testEnv.authenticatedContext('bob').firestore(), recordPath)));
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), recordPath)));
  });

  test('snapshots de email nao podem ser enviados ou lidos diretamente pelo cliente', async () => {
    for (const context of [testEnv.authenticatedContext('alice'),
      testEnv.authenticatedContext('bob'), testEnv.unauthenticatedContext()]) {
      const file = ref(context.storage(), 'users/alice/emailApplicationSnapshots/cv-1.pdf');
      await assertFails(uploadBytes(file, Buffer.from('test'), { contentType: 'application/pdf' }));
      await assertFails(getBytes(file));
    }
  });

  test('usuario acessa o proprio perfil e subcolecoes', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(db, 'users/alice'), { name: 'Alice' }));
    await assertSucceeds(setDoc(doc(db, 'users/alice/likes/job-1'), { jobId: 'job-1' }));
    await assertSucceeds(getDoc(doc(db, 'users/alice/likes/job-1')));
  });

  test('usuario grava e desfaz a propria interacao de feed', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    const interaction = doc(db, 'users/alice/interactions/job-1');
    await assertSucceeds(setDoc(interaction, { jobId: 'job-1', passedAt: 1 }));
    await assertSucceeds(setDoc(interaction, { jobId: 'job-1', passedAt: null }));
    await assertSucceeds(getDoc(interaction));
  });

  test('usuario grava candidatura confirmada com snapshot minimo e ID idempotente', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    const application = doc(db, 'users/alice/applications/job-1');
    const snapshot = {
      jobId: 'job-1',
      title: 'Estagio em Produto',
      company: 'Empresa',
      location: 'Remoto',
      applyUrl: 'https://jobs.example.com/apply',
      status: 'applied',
      applicationSource: 'job_detail',
      confirmedByUser: true,
    };
    await assertSucceeds(setDoc(application, snapshot));
    await assertSucceeds(setDoc(application, snapshot));
    await assertSucceeds(getDoc(application));
  });

  test('usuario nao acessa interacoes de feed de outro candidato', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(getDoc(doc(db, 'users/bob/interactions/job-1')));
    await assertFails(setDoc(doc(db, 'users/bob/interactions/job-1'), {
      jobId: 'job-1',
      likedAt: 1,
    }));
  });

  test('usuario nao acessa dados de outro candidato', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(getDoc(doc(db, 'users/bob')));
    await assertFails(setDoc(doc(db, 'users/bob/applications/job-1'), { status: 'applied' }));
  });

  test('likes e candidaturas permanecem privadas ao proprietario', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    const bobDb = testEnv.authenticatedContext('bob').firestore();
    await assertSucceeds(setDoc(doc(aliceDb, 'users/alice/likes/job-1'), { jobId: 'job-1' }));
    await assertSucceeds(setDoc(doc(aliceDb, 'users/alice/applications/job-1'), {
      jobId: 'job-1', status: 'applied', confirmedByUser: true,
    }));
    await assertFails(getDoc(doc(bobDb, 'users/alice/likes/job-1')));
    await assertFails(getDoc(doc(bobDb, 'users/alice/applications/job-1')));
  });

  test('candidato cria e atualiza somente as proprias preferencias Apply validadas', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    const preferences = doc(db, 'users/alice/applyPreferences/current');
    await assertSucceeds(setDoc(preferences, {
      candidateId: 'alice',
      targetRoles: ['Produto'],
      areaIds: ['business_sales'],
      seniorities: ['intern'],
      locationIds: ['remote'],
      workModeIds: ['remote'],
      minimumSalary: 1800,
      availability: 'immediate',
      contractTypeIds: ['internship'],
      preferredCompanies: [],
      blockedCompanies: [],
      hardRequirements: [],
      minimumMatchScore: 60,
      maximumDailyRecommendations: 5,
      schemaVersion: '2026-07-31',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));
    await assertSucceeds(updateDoc(preferences, {
      minimumMatchScore: 65,
      updatedAt: serverTimestamp(),
    }));
    await assertSucceeds(getDoc(preferences));
  });

  test('preferencias Apply rejeitam outro UID, campos extras e limites invalidos', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    const base = {
      targetRoles: [], areaIds: [], seniorities: [], locationIds: [], workModeIds: [],
      minimumSalary: null, availability: 'unknown', contractTypeIds: [],
      preferredCompanies: [], blockedCompanies: [], hardRequirements: [],
      minimumMatchScore: 55, maximumDailyRecommendations: 5,
      schemaVersion: '2026-07-31', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    };
    await assertFails(setDoc(doc(db, 'users/alice/applyPreferences/current'), {
      ...base, candidateId: 'bob',
    }));
    await assertFails(setDoc(doc(db, 'users/alice/applyPreferences/current'), {
      ...base, candidateId: 'alice', maximumDailyRecommendations: 100,
    }));
    await assertFails(setDoc(doc(db, 'users/alice/applyPreferences/current'), {
      ...base, candidateId: 'alice', privateAnswer: 'nao permitido',
    }));
    await assertFails(setDoc(doc(db, 'users/alice/applyPreferences/another'), {
      ...base, candidateId: 'alice',
    }));
  });

  test('dados operacionais Apply sao escritos apenas pelo backend e lidos pelo dono', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'users/alice/applicationPackages/package-1'), {
        candidateId: 'alice', status: 'package_ready',
      });
      await setDoc(doc(adminDb, 'users/alice/applicationPackages/package-1/answers/answer-1'), {
        candidateId: 'alice', approved: false,
      });
      await setDoc(doc(adminDb, 'users/alice/applicationQueue/queue-1'), {
        candidateId: 'alice', status: 'prepared',
      });
      await setDoc(doc(adminDb, 'users/alice/externalApplicationSessions/session-1'), {
        candidateId: 'alice', status: 'created',
      });
      await setDoc(doc(adminDb, 'users/alice/applyOperations/operation-1'), {
        candidateId: 'alice', status: 'pending',
      });
    });

    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    const bobDb = testEnv.authenticatedContext('bob').firestore();
    const paths = [
      'users/alice/applicationPackages/package-1',
      'users/alice/applicationPackages/package-1/answers/answer-1',
      'users/alice/applicationQueue/queue-1',
      'users/alice/externalApplicationSessions/session-1',
      'users/alice/applyOperations/operation-1',
    ];
    for (const target of paths) {
      await assertSucceeds(getDoc(doc(aliceDb, target)));
      await assertFails(setDoc(doc(aliceDb, target), { status: 'submitted' }, { merge: true }));
      await assertFails(getDoc(doc(bobDb, target)));
    }
  });

  test('fundacao automatica fica privada no backend e expoe somente projecao', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'users/alice/providerApplicationForms/form-1'), {
        candidateId: 'alice', fingerprint: 'form-fingerprint',
      });
      await setDoc(doc(adminDb, 'users/alice/applicationConsents/consent-1'), {
        candidateId: 'alice', consentFingerprint: 'consent-fingerprint',
      });
      await setDoc(doc(adminDb, 'users/alice/applicationSubmissionAttempts/attempt-1'), {
        candidateId: 'alice', state: 'created', payloadFingerprint: 'private',
      });
      await setDoc(doc(adminDb, 'users/alice/applicationSubmissionProjections/attempt-1'), {
        candidateId: 'alice', state: 'created', company: 'Empresa Teste',
      });
    });

    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    const bobDb = testEnv.authenticatedContext('bob').firestore();
    const backendOnlyPaths = [
      'users/alice/providerApplicationForms/form-1',
      'users/alice/applicationConsents/consent-1',
      'users/alice/applicationSubmissionAttempts/attempt-1',
    ];
    for (const target of backendOnlyPaths) {
      await assertFails(getDoc(doc(aliceDb, target)));
      await assertFails(setDoc(doc(aliceDb, target), { state: 'submitted' }, { merge: true }));
      await assertFails(getDoc(doc(bobDb, target)));
    }

    const projectionPath = 'users/alice/applicationSubmissionProjections/attempt-1';
    await assertSucceeds(getDoc(doc(aliceDb, projectionPath)));
    await assertFails(setDoc(doc(aliceDb, projectionPath), { state: 'submitted' }, { merge: true }));
    await assertFails(getDoc(doc(bobDb, projectionPath)));
  });

  test('subcolecao privada desconhecida nao herda escrita ampla', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(db, 'users/alice/unreviewedCollection/doc-1'), { value: true }));
    await assertFails(getDoc(doc(db, 'users/alice/unreviewedCollection/doc-1')));
  });

  test('usuario anonimo nao acessa perfis', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'users/alice')));
  });

  test('cliente nao le nem altera quotas ou auditoria de IA', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(db, 'aiQuotas/alice/features/cv_parse'), { dayCount: 0 }));
    await assertFails(getDoc(doc(db, 'aiQuotas/alice/features/cv_parse')));
    await assertFails(setDoc(doc(db, 'aiEvents/event-1'), { uid: 'alice' }));
  });

  test('denuncia so pode ser criada pela callable administrativa', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(db, 'reports/job-1_alice'), {
      jobId: 'job-1',
      reportedBy: 'alice',
      reason: 'fake',
    }));
    await assertFails(setDoc(doc(db, 'jobs/job-1/reports/alice'), {
      jobId: 'job-1',
      reportedBy: 'alice',
      reason: 'fake',
    }));
  });

  test('candidato cria feedback validado sem poder le-lo ou altera-lo', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    const feedback = doc(db, 'feedback/feedback-1');
    await assertSucceeds(setDoc(feedback, {
      uid: 'alice',
      rating: 4,
      category: 'suggestion',
      text: 'Mais filtros seriam úteis.',
      sourceScreen: 'Feed',
      allowContact: false,
      appVersion: '1.0.0',
      platform: 'ios',
      status: 'new',
      createdAt: serverTimestamp(),
    }));
    await assertFails(getDoc(feedback));
    await assertFails(setDoc(feedback, { rating: 1 }, { merge: true }));
  });

  test('feedback rejeita UID alheio, categoria e payload invalidos', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    const base = {
      rating: 5,
      category: 'suggestion',
      text: '',
      sourceScreen: 'Profile',
      allowContact: false,
      appVersion: '1.0.0',
      platform: 'android',
      status: 'new',
      createdAt: serverTimestamp(),
    };
    await assertFails(setDoc(doc(db, 'feedback/wrong-owner'), { ...base, uid: 'bob' }));
    await assertFails(setDoc(doc(db, 'feedback/wrong-category'), {
      ...base, uid: 'alice', category: 'cv_contents',
    }));
    await assertFails(setDoc(doc(db, 'feedback/extra-field'), {
      ...base, uid: 'alice', email: 'not-allowed',
    }));
  });

  test('admin nao publica vaga incompleta e pode salvar draft', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'admins/admin'), { active: true });
    });
    const db = testEnv.authenticatedContext('admin').firestore();
    await assertFails(setDoc(doc(db, 'jobs/invalid-live'), {
      title: 'Estagio',
      company: 'Empresa',
      status: 'live',
      isActive: true,
    }));
    await assertSucceeds(setDoc(doc(db, 'jobs/draft'), {
      title: 'Rascunho',
      status: 'draft',
      isActive: false,
    }));
  });

  test('admin publica somente vaga verificada e aprovada', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'admins/admin'), { active: true });
    });
    const db = testEnv.authenticatedContext('admin').firestore();
    const validJob = {
      title: 'Estagio em Produto',
      company: 'Empresa',
      applyUrl: 'https://empresa.example/apply',
      sourceUrl: 'https://empresa.example/jobs/1',
      location: 'Recife, PE',
      city: 'Recife',
      state: 'PE',
      country: 'BR',
      workMode: 'Híbrido',
      contractType: 'Estágio',
      description: 'Descricao suficientemente completa para a publicacao da vaga.',
      requiredSkills: ['Excel'],
      areaId: 'business_sales',
      source: 'company',
      publishedAt: 1,
      lastVerifiedAt: 1,
      verificationStatus: 'verified',
      curationStatus: 'approved',
      status: 'live',
      isActive: true,
    };
    await assertSucceeds(setDoc(doc(db, 'jobs/valid-live'), validJob));
    await assertFails(setDoc(doc(db, 'jobs/insecure-live'), {
      ...validJob,
      applyUrl: 'http://empresa.example/apply',
    }));
  });

  test('candidato le somente vagas efetivamente publicadas', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'jobs/draft-hidden'), {
        status: 'draft', isActive: false, verificationStatus: 'needs_review',
      });
      await setDoc(doc(adminDb, 'jobs/live-visible'), {
        status: 'live', isActive: true, verificationStatus: 'verified', curationStatus: 'approved',
      });
    });
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(getDoc(doc(db, 'jobs/draft-hidden')));
    await assertSucceeds(getDoc(doc(db, 'jobs/live-visible')));
  });

  test('consulta paginada do feed satisfaz as regras sem liberar consulta ampla', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'jobs/live-query'), {
        status: 'live',
        isActive: true,
        verificationStatus: 'verified',
        curationStatus: 'approved',
        createdAt: 2,
      });
      await setDoc(doc(adminDb, 'jobs/draft-query'), {
        status: 'draft',
        isActive: false,
        verificationStatus: 'needs_review',
        curationStatus: 'needs_review',
        createdAt: 1,
      });
    });

    const db = testEnv.authenticatedContext('alice').firestore();
    const feedQuery = query(
      collection(db, 'jobs'),
      where('isActive', '==', true),
      where('status', '==', 'live'),
      where('verificationStatus', '==', 'verified'),
      where('curationStatus', '==', 'approved'),
      orderBy('createdAt', 'desc'),
    );
    await assertSucceeds(getDocs(feedQuery));
    await assertFails(getDocs(query(
      collection(db, 'jobs'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc'),
    )));
  });

  test('metadata global de vaga e somente leitura para clientes e admins', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'jobs/job-1/meta/tldr'), {
        oneLiner: 'Resumo criado pelo backend',
      });
      await setDoc(doc(context.firestore(), 'admins/admin'), { active: true });
    });
    const candidateDb = testEnv.authenticatedContext('alice').firestore();
    const adminDb = testEnv.authenticatedContext('admin').firestore();
    await assertSucceeds(getDoc(doc(candidateDb, 'jobs/job-1/meta/tldr')));
    await assertFails(setDoc(doc(candidateDb, 'jobs/job-1/meta/tldr'), { oneLiner: 'Ataque' }));
    await assertFails(setDoc(doc(adminDb, 'jobs/job-1/meta/tldr'), { oneLiner: 'Cliente admin' }));
  });

  test('fluxo persistido de like, pass, undo e candidatura respeita as regras', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    const interaction = doc(db, 'users/alice/interactions/job-1');
    const like = doc(db, 'users/alice/likes/job-1');
    const application = doc(db, 'users/alice/applications/job-1');

    await assertSucceeds(setDoc(doc(db, 'users/alice'), {
      consentAccepted: true,
      onboardingCompleted: true,
    }));
    await assertSucceeds(setDoc(interaction, { jobId: 'job-1', passedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(interaction, { passedAt: deleteField() }));
    await assertSucceeds(setDoc(like, { jobId: 'job-1', likedAt: serverTimestamp() }));
    await assertSucceeds(setDoc(application, {
      jobId: 'job-1',
      title: 'Estagio',
      company: 'Empresa',
      location: 'Remoto',
      applyUrl: 'https://example.com/apply',
      status: 'applied',
      confirmedByUser: true,
    }));
    await assertSucceeds(getDoc(application));
  });

  test('cache de recomendacoes pertence ao candidato e nao altera estado de candidatura', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    const bobDb = testEnv.authenticatedContext('bob').firestore();
    const recommendation = doc(aliceDb, 'users/alice/jobRecommendations/today');
    const payload = {
      candidateId: 'alice',
      date: '2026-07-31',
      recommendations: [],
      diagnostics: { selectedJobCount: 0 },
      generatorVersion: 'deterministic-triage-v1',
      schemaVersion: 'daily-recommendations-v1',
      generatedAtMs: 1785456000000,
      cachedAt: serverTimestamp(),
    };
    await assertSucceeds(setDoc(recommendation, payload));
    await assertSucceeds(getDoc(recommendation));
    await assertFails(getDoc(doc(bobDb, 'users/alice/jobRecommendations/today')));
    await assertFails(setDoc(doc(aliceDb, 'users/alice/jobRecommendations/tomorrow'), payload));
    await assertFails(setDoc(recommendation, { ...payload, candidateId: 'bob' }));
    await assertFails(setDoc(recommendation, { ...payload, status: 'submitted' }));
  });

  test('memoria profissional aprovada e privada e somente o backend escreve', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/alice/approvedAnswers/answer-1'), {
        answer: 'Resposta aprovada', approved: true,
      });
      await setDoc(doc(context.firestore(), 'users/alice/professionalFacts/fact-1'), {
        value: 'React', approved: true,
      });
    });
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    const bobDb = testEnv.authenticatedContext('bob').firestore();
    await assertSucceeds(getDoc(doc(aliceDb, 'users/alice/approvedAnswers/answer-1')));
    await assertSucceeds(getDoc(doc(aliceDb, 'users/alice/professionalFacts/fact-1')));
    await assertFails(setDoc(doc(aliceDb, 'users/alice/approvedAnswers/answer-2'), { answer: 'Cliente' }));
    await assertFails(getDoc(doc(bobDb, 'users/alice/approvedAnswers/answer-1')));
    await assertFails(getDoc(doc(bobDb, 'users/alice/professionalFacts/fact-1')));
  });
});

describe('Storage rules', () => {
  const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);

  test('proprietario grava, le e apaga PDFs novo e legado', async () => {
    const storage = testEnv.authenticatedContext('alice').storage();
    const cvRef = ref(storage, 'users/alice/cv/upload-123.pdf');
    await assertSucceeds(uploadBytes(cvRef, pdfBytes, { contentType: 'application/pdf' }));
    await assertSucceeds(getBytes(cvRef));
    await assertSucceeds(deleteObject(cvRef));

    const legacyCvRef = ref(storage, 'users/alice/cv.pdf');
    await assertSucceeds(uploadBytes(legacyCvRef, pdfBytes, { contentType: 'application/pdf' }));
    await assertSucceeds(getBytes(legacyCvRef));
    await assertSucceeds(deleteObject(legacyCvRef));

    const attachmentRef = ref(storage, 'users/alice/attachments/certificate-123.pdf');
    await assertSucceeds(uploadBytes(attachmentRef, pdfBytes, { contentType: 'application/pdf' }));
    await assertSucceeds(getBytes(attachmentRef));
    await assertSucceeds(deleteObject(attachmentRef));
  });

  test('usuario nao le nem sobrescreve curriculo de outro', async () => {
    const ownerStorage = testEnv.authenticatedContext('bob').storage();
    const ownerRef = ref(ownerStorage, 'users/bob/cv/upload-456.pdf');
    await assertSucceeds(uploadBytes(ownerRef, pdfBytes, { contentType: 'application/pdf' }));

    const attackerStorage = testEnv.authenticatedContext('alice').storage();
    const attackerRef = ref(attackerStorage, 'users/bob/cv/upload-456.pdf');
    await assertFails(getBytes(attackerRef));
    await assertFails(uploadBytes(attackerRef, pdfBytes, { contentType: 'application/pdf' }));
    await assertFails(uploadBytes(
      ref(attackerStorage, 'users/bob/attachments/certificate-456.pdf'),
      pdfBytes,
      { contentType: 'application/pdf' },
    ));
  });

  test('acesso anonimo e bloqueado', async () => {
    const storage = testEnv.unauthenticatedContext().storage();
    const cvRef = ref(storage, 'users/alice/cv.pdf');
    await assertFails(getBytes(cvRef));
    await assertFails(uploadBytes(cvRef, pdfBytes, { contentType: 'application/pdf' }));
  });

  test('bloqueia caminho e MIME fora do contrato', async () => {
    const storage = testEnv.authenticatedContext('alice').storage();
    await assertFails(
      uploadBytes(ref(storage, 'users/alice/resume.pdf'), pdfBytes, {
        contentType: 'application/pdf',
      }),
    );
    await assertFails(
      uploadBytes(ref(storage, 'users/alice/cv/not-a-pdf.txt'), pdfBytes, {
        contentType: 'application/pdf',
      }),
    );
    await assertFails(
      uploadBytes(ref(storage, 'users/alice/cv.pdf'), pdfBytes, {
        contentType: 'text/plain',
      }),
    );
    await assertFails(
      uploadBytes(ref(storage, 'users/alice/attachments/not-a-pdf.txt'), pdfBytes, {
        contentType: 'application/pdf',
      }),
    );
  });

  test('bloqueia PDF acima de 10 MB', async () => {
    const storage = testEnv.authenticatedContext('alice').storage();
    const oversized = new Uint8Array(MAX_CV_BYTES + 1);
    await assertFails(
      uploadBytes(ref(storage, 'users/alice/cv/oversized.pdf'), oversized, {
        contentType: 'application/pdf',
      }),
    );
  });
});
