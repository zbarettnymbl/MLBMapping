// e2e/fixtures/seed-enrichment.ts
// Seeds test data for the Development Programming exercise
//
// Seeds:
// - 1 exercise "Development Programming 2026" with status 'active'
// - 3 source columns: siteId, programId, programName
// - 2 classification columns: sportCategory (picklist, required), categorization (dependent picklist)
// - 1 reference table mapping sportCategory -> categorization options
// - 10 source records (mix of new/existing states)
// - 2 records pre-classified, 1 with validation error

export const TEST_EXERCISE_ID = 'test-exercise-id';

export const seedExercise = {
  id: TEST_EXERCISE_ID,
  name: 'Development Programming 2026',
  description: 'Classify development programming records',
  status: 'active',
  sourceColumns: [
    { id: 'sc1', key: 'siteId', label: 'Site ID', dataType: 'text', columnRole: 'source', visible: true, ordinal: 0 },
    { id: 'sc2', key: 'programId', label: 'Program ID', dataType: 'text', columnRole: 'source', visible: true, ordinal: 1 },
    { id: 'sc3', key: 'programName', label: 'Program Name', dataType: 'text', columnRole: 'source', visible: true, ordinal: 2 },
  ],
  classificationColumns: [
    {
      id: 'cc1', key: 'sportCategory', label: 'Sport Category', dataType: 'picklist',
      columnRole: 'classification', required: true,
      config: { picklistValues: ['Girls Baseball', 'Girls Softball', 'Boys Baseball', 'T-Ball', 'Coach Pitch'] },
      dependentConfig: null,
    },
    {
      id: 'cc2', key: 'categorization', label: 'Categorization', dataType: 'picklist',
      columnRole: 'classification', required: false,
      config: {},
      dependentConfig: {
        parentColumnKey: 'sportCategory',
        referenceTableId: 'ref-table-1',
        parentReferenceColumn: 'sport',
        childReferenceColumn: 'category',
      },
    },
  ],
};

export const seedRecords = Array.from({ length: 10 }, (_, i) => ({
  id: `r${i + 1}`,
  uniqueKey: { siteId: `SITE-${100 + i}`, programId: `PRG-${200 + i}` },
  sourceData: {
    siteId: `SITE-${100 + i}`,
    programId: `PRG-${200 + i}`,
    programName: `Program ${i + 1}`,
  },
  classifications: i < 2
    ? { sportCategory: 'Girls Baseball', categorization: 'Travel' }
    : { sportCategory: null, categorization: null },
  recordState: i < 3 ? 'new' : 'existing',
  validationErrors: i === 9
    ? [{ columnKey: 'sportCategory', severity: 'error', message: 'Sport Category is required', ruleType: 'required' }]
    : [],
  isFullyClassified: i < 2,
}));

export const seedReferenceTable = {
  id: 'ref-table-1',
  name: 'Sport Categories',
  data: {
    'Girls Baseball': ['Travel', 'Recreation', 'Elite', 'Developmental'],
    'Girls Softball': ['Travel', 'Recreation', 'Competitive', 'Developmental'],
    'Boys Baseball': ['Travel', 'Recreation', 'Elite', 'Developmental', 'Academy'],
    'T-Ball': ['Intro', 'Recreation'],
    'Coach Pitch': ['Intro', 'Recreation', 'Developmental'],
  },
};
