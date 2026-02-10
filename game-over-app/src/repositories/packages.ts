/**
 * Packages Repository
 * Data access layer for packages
 */

import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type Package = Database['public']['Tables']['packages']['Row'];
type EventPreferences = Database['public']['Tables']['event_preferences']['Row'];

export interface PackageWithMatch extends Package {
  match_score?: number;
  is_best_match?: boolean;
}

export const packagesRepository = {
  /**
   * Get all active packages for a city
   */
  async getByCity(cityId: string): Promise<Package[]> {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('city_id', cityId)
      .eq('is_active', true)
      .order('tier', { ascending: true })
      .order('base_price_cents', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get a single package by ID
   */
  async getById(packageId: string): Promise<Package | null> {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('id', packageId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  },

  /**
   * Get packages by tier
   */
  async getByTier(cityId: string, tier: Package['tier']): Promise<Package[]> {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('city_id', cityId)
      .eq('tier', tier)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  },

  /**
   * Get packages with match scores based on preferences
   */
  async getMatchedPackages(
    cityId: string,
    preferences: Partial<EventPreferences>
  ): Promise<PackageWithMatch[]> {
    const packages = await this.getByCity(cityId);

    // Calculate match scores
    const scoredPackages = packages.map(pkg => {
      const score = calculateMatchScore(pkg, preferences);
      return { ...pkg, match_score: score };
    });

    // Sort by score (highest first)
    scoredPackages.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

    // Mark best match
    if (scoredPackages.length > 0) {
      (scoredPackages[0] as PackageWithMatch).is_best_match = true;
    }

    return scoredPackages;
  },

  /**
   * Search packages by name or description
   */
  async search(query: string, cityId?: string): Promise<Package[]> {
    let queryBuilder = supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`);

    if (cityId) {
      queryBuilder = queryBuilder.eq('city_id', cityId);
    }

    const { data, error } = await queryBuilder;

    if (error) throw error;
    return data || [];
  },
};

/**
 * Calculate match score between package and preferences
 * Score is 0-100
 */
function calculateMatchScore(
  pkg: Package,
  preferences: Partial<EventPreferences>
): number {
  let score = 50; // Base score
  let factors = 0;

  // Gathering size match
  if (preferences.gathering_size && pkg.ideal_gathering_size?.length) {
    factors++;
    if (pkg.ideal_gathering_size.includes(preferences.gathering_size)) {
      score += 15;
    }
  }

  // Energy level match
  if (preferences.energy_level && pkg.ideal_energy_level?.length) {
    factors++;
    if (pkg.ideal_energy_level.includes(preferences.energy_level)) {
      score += 15;
    }
  }

  // Vibe preferences match
  if (preferences.vibe_preferences?.length && pkg.ideal_vibe?.length) {
    factors++;
    const matchingVibes = preferences.vibe_preferences.filter(v =>
      pkg.ideal_vibe?.includes(v)
    );
    const vibeScore = (matchingVibes.length / preferences.vibe_preferences.length) * 20;
    score += vibeScore;
  }

  // Rating bonus
  const rating = pkg.rating ?? 0;
  if (rating >= 4.5) {
    score += 5;
  } else if (rating >= 4.0) {
    score += 3;
  }

  // Review count bonus (social proof)
  const reviewCount = pkg.review_count ?? 0;
  if (reviewCount >= 100) {
    score += 5;
  } else if (reviewCount >= 50) {
    score += 3;
  }

  // Cap at 100
  return Math.min(100, Math.round(score));
}
