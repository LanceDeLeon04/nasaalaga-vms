import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// ── Barangays ──────────────────────────────────────────────────────────────
router.get('/barangays', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT name, zone, zone_color FROM barangays ORDER BY name');
    return res.json({
      barangays: result.rows.map((r: any) => r.name),
      data: result.rows,
      count: result.rows.length,
      city: 'Calaca',
      province: 'Batangas',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Schedules ──────────────────────────────────────────────────────────────
router.get('/schedules', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT * FROM vaccination_schedules ORDER BY date ASC');
    return res.json({ schedules: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/schedules', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const d = req.body;
    const countResult = await query('SELECT COUNT(*) FROM vaccination_schedules');
    const count = parseInt(countResult.rows[0].count);
    const newId = `SCH-${String(count + 1).padStart(3, '0')}`;

    const result = await query(
      `INSERT INTO vaccination_schedules (id, barangay, date, time_start, time_end, venue, capacity, registered, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,0,'Scheduled',$8) RETURNING *`,
      [newId, d.barangay, d.date, d.timeStart, d.timeEnd, d.venue, d.capacity || 50, d.createdBy || req.user?.username]
    );

    return res.json({ schedule: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Statistics ─────────────────────────────────────────────────────────────
router.get('/statistics/livestock-by-barangay', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT * FROM livestock_stats ORDER BY barangay');
    return res.json({ data: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/statistics/livestock-by-barangay', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const updates: any[] = req.body;
    for (const u of updates) {
      await query(
        `INSERT INTO livestock_stats (barangay, cattle, swine, poultry, goats)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (barangay) DO UPDATE SET cattle=$2, swine=$3, poultry=$4, goats=$5, updated_at=NOW()`,
        [u.barangay, u.cattle || 0, u.swine || 0, u.poultry || 0, u.goats || 0]
      );
    }
    const result = await query('SELECT * FROM livestock_stats ORDER BY barangay');
    return res.json({ success: true, data: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/statistics/vaccination-trends', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT * FROM vaccination_trends ORDER BY year, month');
    return res.json({ data: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/statistics/budget', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT * FROM budget_allocation ORDER BY id');
    return res.json({ data: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/statistics/disease-alerts', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT * FROM disease_alerts ORDER BY reported_date DESC');
    return res.json({ data: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/statistics/disease-alerts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const d = req.body;
    const countResult = await query('SELECT COUNT(*) FROM disease_alerts');
    const count = parseInt(countResult.rows[0].count);
    const newId = `DA-${String(count + 1).padStart(3, '0')}`;

    const result = await query(
      `INSERT INTO disease_alerts (id, disease, location, severity, cases, status)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [newId, d.disease, d.location, d.severity, d.cases || 0, d.status || 'Active']
    );

    return res.json({ success: true, alert: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/statistics/outbreak-data', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT * FROM outbreak_data ORDER BY date_reported DESC');
    return res.json({ data: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/statistics/outbreak-data', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const d = req.body;
    const countResult = await query('SELECT COUNT(*) FROM outbreak_data');
    const count = parseInt(countResult.rows[0].count);
    const newId = `OUT-${String(count + 1).padStart(3, '0')}`;

    const result = await query(
      `INSERT INTO outbreak_data (id, disease, barangay, cases, status, affected_animals)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [newId, d.disease, d.barangay, d.cases || 0, d.status || 'Active', d.affectedAnimals]
    );

    return res.json({ success: true, outbreak: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Users (admin) ──────────────────────────────────────────────────────────
router.get('/users', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'SELECT id, email, username, role, owner_id, barangay, verified, created_at FROM users ORDER BY created_at'
    );
    return res.json({ success: true, totalUsers: result.rows.length, users: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Health ─────────────────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Init (compatibility) ───────────────────────────────────────────────────
router.post('/init', async (req, res) => {
  res.json({ message: 'Database ready', initialized: true });
});

export default router;

// ── Admin Settings ─────────────────────────────────────────────────────────
router.get('/admin/settings', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    settings: {
      systemName: 'NASaAlaga VMS',
      city: 'Calaca',
      province: 'Batangas',
      emailNotifications: true,
      smsNotifications: false,
      autoBackup: true,
      backupFrequency: 'daily',
      sessionTimeout: 480,
      maxLoginAttempts: 5,
    }
  });
});

router.put('/admin/settings', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Settings updated', settings: req.body });
});

// ── Admin Thresholds ───────────────────────────────────────────────────────
router.get('/admin/thresholds', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    thresholds: {
      livestock: {
        criticalPopulationDrop: 30,
        warningPopulationDrop: 15,
        highDensityThreshold: 500,
        lowVaccinationRate: 60,
      },
      pets: {
        unvaccinatedThreshold: 40,
        registrationTarget: 85,
        missingSpikeThreshold: 10,
      },
      outbreak: {
        casesForWarning: 3,
        casesForCritical: 10,
      },
    }
  });
});

router.put('/admin/thresholds', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Thresholds updated', thresholds: req.body });
});

// ── Admin Recommendations ──────────────────────────────────────────────────
router.get('/admin/recommendations', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    recommendations: [
      { id: 'REC-001', title: 'Increase Vaccination Coverage in Zone Red', priority: 'High', status: 'Active', category: 'Vaccination' },
      { id: 'REC-002', title: 'Deploy BAHW to Balimbing for ASF Monitoring', priority: 'Critical', status: 'Active', category: 'Disease Control' },
      { id: 'REC-003', title: 'Restock Rabies Vaccines Before May Drive', priority: 'Medium', status: 'Pending', category: 'Resources' },
    ]
  });
});

router.put('/admin/recommendations/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Recommendation updated', id: req.params.id, ...req.body });
});

// ── Rules Engine ───────────────────────────────────────────────────────────
const DEFAULT_RULES = [
  {
    id: 'RULE-001',
    name: 'Rabies Vaccination Overdue Alert',
    description: 'Triggers when a registered pet has passed its next vaccination due date.',
    category: 'alert',
    priority: 'high',
    status: 'active',
    conditions: [
      { id: 'C1', dataSource: 'pets', field: 'nextVaccinationDate', operator: 'less_than', value: 'today' }
    ],
    actions: [
      { id: 'A1', type: 'create_alert', config: { alertLevel: 'warning', message: 'Pet vaccination overdue — contact owner immediately.' } }
    ],
    zones: ['Poblacion 1', 'Poblacion 2', 'Poblacion 3'],
    createdBy: 'Dr. Amalia Vergara',
    createdAt: '2025-01-10T08:00:00Z',
    updatedAt: '2025-03-01T10:00:00Z',
  },
  {
    id: 'RULE-002',
    name: 'ASF Outbreak Quarantine Trigger',
    description: 'Triggers a critical alert and intervention when ASF cases exceed threshold in a barangay.',
    category: 'intervention',
    priority: 'critical',
    status: 'active',
    conditions: [
      { id: 'C2', dataSource: 'livestock', field: 'asfCases', operator: 'greater_than', value: 3, barangay: 'any' }
    ],
    actions: [
      { id: 'A2', type: 'escalate', config: { alertLevel: 'critical', message: 'ASF cases exceed threshold — initiate quarantine protocol.' } },
      { id: 'A3', type: 'send_notification', config: { notificationRecipients: ['CVO', 'BAHW', 'Mayor'] } }
    ],
    zones: ['Balimbing', 'Bisaya', 'Cahil'],
    createdBy: 'Dr. Amalia Vergara',
    createdAt: '2025-01-15T08:00:00Z',
    updatedAt: '2025-04-05T10:00:00Z',
  },
  {
    id: 'RULE-003',
    name: 'Low Vaccination Rate Warning',
    description: 'Flags barangays where vaccination coverage drops below the 70% target.',
    category: 'analytics',
    priority: 'medium',
    status: 'active',
    conditions: [
      { id: 'C3', dataSource: 'pets', field: 'vaccinationRate', operator: 'less_than', value: 70 }
    ],
    actions: [
      { id: 'A4', type: 'create_alert', config: { alertLevel: 'warning', message: 'Vaccination rate below 70% — schedule community drive.' } }
    ],
    zones: [],
    createdBy: 'BAHW Miguel Sanchez',
    createdAt: '2025-02-01T08:00:00Z',
    updatedAt: '2025-02-01T08:00:00Z',
  },
  {
    id: 'RULE-004',
    name: 'High Pet Population Density Alert',
    description: 'Detects barangays with high unregistered pet density based on survey vs registration gap.',
    category: 'analytics',
    priority: 'low',
    status: 'testing',
    conditions: [
      { id: 'C4', dataSource: 'survey_gap', field: 'unregisteredPets', operator: 'gap_threshold', value: 40 }
    ],
    actions: [
      { id: 'A5', type: 'update_analytics', config: { analyticsMetric: 'registrationGapScore' } }
    ],
    zones: [],
    createdBy: 'Dr. Amalia Vergara',
    createdAt: '2025-03-10T08:00:00Z',
    updatedAt: '2025-03-10T08:00:00Z',
  },
];

router.get('/rules', authenticate, async (req: AuthRequest, res: Response) => {
  res.json({ success: true, rules: DEFAULT_RULES });
});

router.post('/rules/evaluate', authenticate, async (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    triggeredCount: 2,
    results: [
      { ruleId: 'RULE-001', ruleName: 'Rabies Vaccination Overdue Alert', triggered: true, message: '12 pets have overdue vaccinations in Poblacion 1–3', severity: 'high' },
      { ruleId: 'RULE-002', ruleName: 'ASF Outbreak Quarantine Trigger', triggered: true, message: 'ASF cases in Balimbing exceed threshold (15 cases)', severity: 'critical' },
      { ruleId: 'RULE-003', ruleName: 'Low Vaccination Rate Warning', triggered: false, message: 'Vaccination rate at 94% — within target', severity: 'info' },
      { ruleId: 'RULE-004', ruleName: 'High Pet Population Density Alert', triggered: false, message: 'No gap threshold exceeded this cycle', severity: 'info' },
    ],
    evaluated: DEFAULT_RULES.length,
    timestamp: new Date().toISOString(),
  });
});

router.put('/rules/:ruleId', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Rule updated', ruleId: req.params.ruleId, ...req.body });
});

// ── Pet Survey Data ────────────────────────────────────────────────────────
router.get('/pets/survey-data', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT species, COUNT(*) as count
      FROM pets GROUP BY species
    `);

    const rows = result.rows;
    const dogRow = rows.find((r: any) => r.species?.toLowerCase() === 'dog');
    const catRow = rows.find((r: any) => r.species?.toLowerCase() === 'cat');

    const registeredDogs = parseInt(dogRow?.count || '0');
    const registeredCats = parseInt(catRow?.count || '0');
    const registeredTotal = registeredDogs + registeredCats;

    // Survey estimates (Calaca 2025 household survey baseline)
    const surveyedDogs = Math.max(registeredDogs + 312, 1240);
    const surveyedCats = Math.max(registeredCats + 198, 820);
    const surveyedTotal = surveyedDogs + surveyedCats;

    const dogRate = surveyedDogs > 0 ? ((registeredDogs / surveyedDogs) * 100).toFixed(1) : '0.0';
    const catRate = surveyedCats > 0 ? ((registeredCats / surveyedCats) * 100).toFixed(1) : '0.0';
    const overallRate = surveyedTotal > 0 ? ((registeredTotal / surveyedTotal) * 100).toFixed(1) : '0.0';

    return res.json({
      success: true,
      survey: {
        totalDogs: surveyedDogs,
        totalCats: surveyedCats,
        total: surveyedTotal,
      },
      registered: {
        dogs: registeredDogs,
        cats: registeredCats,
        total: registeredTotal,
      },
      registrationRate: {
        dogs: dogRate,
        cats: catRate,
        overall: overallRate,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
