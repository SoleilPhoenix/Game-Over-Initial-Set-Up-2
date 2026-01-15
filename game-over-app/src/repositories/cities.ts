/**
 * Cities Repository
 * Data access layer for cities
 */

import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type City = Database['public']['Tables']['cities']['Row'];

export const citiesRepository = {
  /**
   * Get all active cities
   */
  async getAll(): Promise<City[]> {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get a single city by ID
   */
  async getById(cityId: string): Promise<City | null> {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('id', cityId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  /**
   * Search cities by name
   */
  async search(query: string): Promise<City[]> {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('is_active', true)
      .ilike('name', `%${query}%`)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get cities by country
   */
  async getByCountry(country: string): Promise<City[]> {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('is_active', true)
      .eq('country', country)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },
};
