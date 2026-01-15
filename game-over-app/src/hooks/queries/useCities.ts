/**
 * Cities Query Hooks
 * React Query hooks for cities data
 */

import { useQuery } from '@tanstack/react-query';
import { citiesRepository } from '@/repositories';

// Query keys
export const cityKeys = {
  all: ['cities'] as const,
  list: () => [...cityKeys.all, 'list'] as const,
  detail: (cityId: string) => [...cityKeys.all, 'detail', cityId] as const,
  search: (query: string) => [...cityKeys.all, 'search', query] as const,
};

/**
 * Fetch all active cities
 */
export function useCities() {
  return useQuery({
    queryKey: cityKeys.list(),
    queryFn: () => citiesRepository.getAll(),
    staleTime: 30 * 60 * 1000, // 30 minutes - cities rarely change
  });
}

/**
 * Fetch a single city by ID
 */
export function useCity(cityId: string | undefined) {
  return useQuery({
    queryKey: cityKeys.detail(cityId || ''),
    queryFn: () => citiesRepository.getById(cityId!),
    enabled: !!cityId,
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Search cities by name
 */
export function useCitySearch(query: string) {
  return useQuery({
    queryKey: cityKeys.search(query),
    queryFn: () => citiesRepository.search(query),
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}
