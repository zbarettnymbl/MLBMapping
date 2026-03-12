import { db } from './connection';
import { organizations, users, enrichmentExercises, exerciseColumns, userExerciseAssignments, enrichmentRecords, storedCredentials } from './schema';

async function seed() {
  console.log('Seeding database...');

  // Create test organization
  await db
    .insert(organizations)
    .values({
      id: 'org-00000000-0000-0000-0000-000000000001',
      name: 'Test Organization',
      slug: 'test-org',
    })
    .onConflictDoNothing();

  // Create a test user
  const [testUser] = await db
    .insert(users)
    .values({
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      orgId: 'org-00000000-0000-0000-0000-000000000001',
      email: 'user@test.com',
      name: 'Test User',
      role: 'user',
      passwordHash: 'not-a-real-hash',
    })
    .onConflictDoNothing()
    .returning();

  const userId = testUser?.id ?? 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  // Create an exercise
  const [exercise] = await db
    .insert(enrichmentExercises)
    .values({
      orgId: 'org-00000000-0000-0000-0000-000000000001',
      name: 'Development Programming 2026',
      description: 'Classify program registrations by sport and category',
      status: 'active',
      uniqueKeyColumns: ['siteId', 'programId'],
      deadline: '2026-04-15',
    })
    .returning();

  // Create columns
  await db.insert(exerciseColumns).values([
    {
      exerciseId: exercise.id,
      key: 'siteId',
      label: 'Site ID',
      dataType: 'text',
      columnRole: 'source',
      required: false,
      visible: true,
      ordinal: 0,
      config: {},
      validationRules: [],
    },
    {
      exerciseId: exercise.id,
      key: 'programId',
      label: 'Program ID',
      dataType: 'text',
      columnRole: 'source',
      required: false,
      visible: true,
      ordinal: 1,
      config: {},
      validationRules: [],
    },
    {
      exerciseId: exercise.id,
      key: 'programName',
      label: 'Program Name',
      dataType: 'text',
      columnRole: 'source',
      required: false,
      visible: true,
      ordinal: 2,
      config: {},
      validationRules: [],
    },
    {
      exerciseId: exercise.id,
      key: 'sportCategory',
      label: 'Sport Category',
      dataType: 'picklist',
      columnRole: 'classification',
      required: true,
      visible: true,
      ordinal: 3,
      config: { picklistValues: ['Baseball', 'Softball', 'Girls Baseball', 'Tee Ball', 'Coach Pitch'] },
      validationRules: [{ type: 'required', config: {}, severity: 'error', message: 'Sport Category is required' }],
    },
    {
      exerciseId: exercise.id,
      key: 'categorization',
      label: 'Categorization',
      dataType: 'picklist',
      columnRole: 'classification',
      required: true,
      visible: true,
      ordinal: 4,
      config: { picklistValues: ['Recreational', 'Competitive', 'Elite', 'Instructional', 'Camp'] },
      validationRules: [{ type: 'required', config: {}, severity: 'error', message: 'Categorization is required' }],
    },
  ]);

  // Assign user to exercise
  await db.insert(userExerciseAssignments).values({
    userId,
    exerciseId: exercise.id,
    role: 'editor',
  });

  // Create sample records (mix of classified and unclassified)
  const samplePrograms = [
    { siteId: '22044', programId: '3998508', programName: '2023 Girls Baseball', classified: true, sport: 'Girls Baseball', cat: 'Recreational' },
    { siteId: '22044', programId: '4036238', programName: '2023 World Series', classified: false, sport: null, cat: null },
    { siteId: '22044', programId: '3998628', programName: '2023 BREAKTHROUGH', classified: true, sport: 'Softball', cat: 'Competitive', hasError: true },
    { siteId: '22044', programId: '4100123', programName: '2024 MLB TOUR', classified: false, sport: null, cat: null, isNew: true },
    { siteId: '22044', programId: '3998701', programName: '2023 Spring Baseball', classified: true, sport: 'Baseball', cat: 'Recreational' },
    { siteId: '22045', programId: '4001234', programName: '2023 Fall Tee Ball', classified: true, sport: 'Tee Ball', cat: 'Instructional' },
    { siteId: '22045', programId: '4005678', programName: '2023 Summer Camp', classified: true, sport: 'Baseball', cat: 'Camp' },
    { siteId: '22045', programId: '4009012', programName: '2024 Coach Pitch Intro', classified: false, sport: null, cat: null },
  ] as const;

  for (const prog of samplePrograms) {
    const classifications: Record<string, string | null> = {
      sportCategory: prog.sport,
      categorization: prog.cat,
    };

    await db.insert(enrichmentRecords).values({
      exerciseId: exercise.id,
      uniqueKey: { programId: prog.programId },
      sourceData: { siteId: prog.siteId, programId: prog.programId, programName: prog.programName },
      classifications,
      recordState: 'isNew' in prog && prog.isNew ? 'new' : 'existing',
      validationErrors: 'hasError' in prog && prog.hasError
        ? [{ columnKey: 'categorization', severity: 'error', message: 'Value "Competitive" may not apply to Softball programs', ruleType: 'relational' }]
        : [],
      isFullyClassified: prog.classified && !('hasError' in prog && prog.hasError),
    });
  }

  // Seed demo BigQuery credential if mock mode is enabled
  if (process.env.MOCK_BIGQUERY === 'true') {
    await db
      .insert(storedCredentials)
      .values({
        id: 'b0000000-0000-4000-8000-000000000001',
        orgId: 'org-00000000-0000-0000-0000-000000000001',
        name: 'Demo BigQuery Connection',
        credentialType: 'gcp_service_account',
        encryptedValue: 'mock-credential-no-real-key',
        createdBy: userId,
      })
      .onConflictDoNothing();

    console.log('  - 1 demo BigQuery credential (mock mode)');
  }

  console.log('Seed complete. Created:');
  console.log('  - 1 test user (user@test.com)');
  console.log('  - 1 exercise (Development Programming 2026)');
  console.log('  - 5 columns (3 source, 2 classification)');
  console.log('  - 8 sample records');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
