import { assemblePackages } from '@/utils/packageAssembly';

const FULL_ANSWERS = {
  h1: 'active' as const,
  h2: 'group' as const,
  h3: 'cooperative' as const,
  h4: 'experience' as const,
  h5: 'indoor' as const,
  h6: 'dinner_bar' as const,
  g1: '26-30' as const,
  g2: 'mixed' as const,
  g3: 'medium' as const,
  g4: 'social' as const,
  g5: 'team_players' as const,
  g6: ['action', 'nightlife'],
};

describe('assemblePackages', () => {
  it('returns exactly 3 packages', () => {
    expect(assemblePackages(FULL_ANSWERS, 'hannover')).toHaveLength(3);
  });

  it('returns tiers in order essential → classic → grand', () => {
    const pkgs = assemblePackages(FULL_ANSWERS, 'hannover');
    expect(pkgs[0].tier).toBe('essential');
    expect(pkgs[1].tier).toBe('classic');
    expect(pkgs[2].tier).toBe('grand');
  });

  it('S has 3 features, M has 4, L has 5', () => {
    const pkgs = assemblePackages(FULL_ANSWERS, 'hannover');
    expect(pkgs[0].features).toHaveLength(3);
    expect(pkgs[1].features).toHaveLength(4);
    expect(pkgs[2].features).toHaveLength(5);
  });

  it('classic tier has bestMatch true, others do not', () => {
    const pkgs = assemblePackages(FULL_ANSWERS, 'hannover');
    expect(pkgs[1].bestMatch).toBe(true);
    expect(pkgs[0].bestMatch).toBeFalsy();
    expect(pkgs[2].bestMatch).toBeFalsy();
  });

  it('ids include city slug', () => {
    const pkgs = assemblePackages(FULL_ANSWERS, 'hamburg');
    expect(pkgs[0].id).toBe('hamburg-essential');
    expect(pkgs[1].id).toBe('hamburg-classic');
    expect(pkgs[2].id).toBe('hamburg-grand');
  });

  it('uses defaults for null answers without throwing', () => {
    const nullAnswers = {
      h1: null, h2: null, h3: null, h4: null, h5: null, h6: null,
      g1: null, g2: null, g3: null, g4: null, g5: null, g6: [],
    };
    const pkgs = assemblePackages(nullAnswers, 'berlin');
    expect(pkgs).toHaveLength(3);
    expect(pkgs[0].features).toHaveLength(3);
    expect(pkgs[1].features).toHaveLength(4);
    expect(pkgs[2].features).toHaveLength(5);
  });

  it('different profiles produce different top activities (specific known winners)', () => {
    // Relaxed + food-focused profile → Cocktail Making Course scores highest (22pts)
    const relaxed = { ...FULL_ANSWERS, h1: 'relaxed' as const, h4: 'food' as const, g5: 'relaxed' as const };
    // Action + experience-focused + competitive → VR Arcade scores highest (23pts)
    const action  = { ...FULL_ANSWERS, h1: 'action' as const,  h4: 'experience' as const, g5: 'competitive' as const };
    const relaxedPkgs = assemblePackages(relaxed, 'hannover');
    const actionPkgs  = assemblePackages(action, 'hannover');
    expect(relaxedPkgs[0].features[0]).toBe('Cocktail Workshop');
    expect(actionPkgs[0].features[0]).toBe('VR Arcade');
  });

  it('prices match tier definitions', () => {
    const pkgs = assemblePackages(FULL_ANSWERS, 'berlin');
    expect(pkgs[0].price_per_person_cents).toBe(99_00);
    expect(pkgs[1].price_per_person_cents).toBe(149_00);
    expect(pkgs[2].price_per_person_cents).toBe(199_00);
  });

  it('all feature strings are non-empty strings', () => {
    const pkgs = assemblePackages(FULL_ANSWERS, 'hannover');
    for (const pkg of pkgs) {
      for (const feature of pkg.features) {
        expect(typeof feature).toBe('string');
        expect(feature.length).toBeGreaterThan(0);
      }
    }
  });

  it('L tier activities are all unique (no duplicates when pool has enough)', () => {
    const pkgs = assemblePackages(FULL_ANSWERS, 'hannover');
    const grand = pkgs[2];
    const activityFeatures = grand.features.slice(0, 3);
    const unique = new Set(activityFeatures);
    expect(unique.size).toBe(3);
  });

  it('features never duplicate across any profile (no dining repeated as activity)', () => {
    // Low-activity profile — tests that even when the scoring matrix
    // returns few highly-scored activities, features remain unique
    const lowActivity = {
      h1: 'relaxed' as const, h2: 'background' as const, h3: 'cooperative' as const,
      h4: 'food' as const,    h5: 'indoor' as const,    h6: 'dinner_only' as const,
      g1: '35+' as const,     g2: 'strangers' as const,  g3: 'low' as const,
      g4: 'low' as const,     g5: 'relaxed' as const,    g6: [],
    };
    const pkgs = assemblePackages(lowActivity, 'berlin');
    expect(pkgs).toHaveLength(3);
    for (const pkg of pkgs) {
      // No feature should appear more than once in a single tier
      const seen = new Set(pkg.features);
      expect(seen.size).toBe(pkg.features.length);
      // All features must be non-empty strings
      for (const f of pkg.features) {
        expect(typeof f).toBe('string');
        expect(f.length).toBeGreaterThan(0);
      }
    }
  });
});
