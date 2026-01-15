/**
 * Packages Query Hooks
 * React Query hooks for package data
 */

import { useQuery } from '@tanstack/react-query';
import { packagesRepository, PackageWithMatch } from '@/repositories';
import type { Database } from '@/lib/supabase/types';

type EventPreferences = Database['public']['Tables']['event_preferences']['Row'];

// Query keys
export const packageKeys = {
  all: ['packages'] as const,
  lists: () => [...packageKeys.all, 'list'] as const,
  listByCity: (cityId: string) => [...packageKeys.lists(), cityId] as const,
  matched: (cityId: string, prefsHash: string) =>
    [...packageKeys.lists(), cityId, 'matched', prefsHash] as const,
  details: () => [...packageKeys.all, 'detail'] as const,
  detail: (packageId: string) => [...packageKeys.details(), packageId] as const,
};

/**
 * Fetch all packages for a city
 */
export function usePackages(cityId: string | undefined) {
  return useQuery({
    queryKey: packageKeys.listByCity(cityId || ''),
    queryFn: () => packagesRepository.getByCity(cityId!),
    enabled: !!cityId,
    staleTime: 10 * 60 * 1000, // 10 minutes - packages don't change often
  });
}

/**
 * Fetch a single package by ID
 */
export function usePackage(packageId: string | undefined) {
  return useQuery({
    queryKey: packageKeys.detail(packageId || ''),
    queryFn: () => packagesRepository.getById(packageId!),
    enabled: !!packageId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch packages with match scores based on preferences
 */
export function useMatchedPackages(
  cityId: string | undefined,
  preferences: Partial<EventPreferences> | undefined
) {
  // Create a hash of preferences for cache key
  const prefsHash = preferences
    ? JSON.stringify({
        gathering_size: preferences.gathering_size,
        energy_level: preferences.energy_level,
        vibe_preferences: preferences.vibe_preferences,
      })
    : '';

  return useQuery({
    queryKey: packageKeys.matched(cityId || '', prefsHash),
    queryFn: () =>
      packagesRepository.getMatchedPackages(cityId!, preferences || {}),
    enabled: !!cityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Search packages
 */
export function usePackageSearch(query: string, cityId?: string) {
  return useQuery({
    queryKey: [...packageKeys.all, 'search', query, cityId],
    queryFn: () => packagesRepository.search(query, cityId),
    enabled: query.length >= 2,
    staleTime: 2 * 60 * 1000,
  });
}
