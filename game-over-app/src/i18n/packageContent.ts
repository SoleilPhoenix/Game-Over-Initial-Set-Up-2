/**
 * Compatibility helpers for package content originating in the DB or an older
 * event cache. New assembled and fallback packages read their display strings
 * directly from the regular EN/DE translation bundles.
 */
import { getTranslation, type TranslationKeys } from './index';
import en from './en';
import de from './de';

type PackageContent = TranslationKeys['packageContent'];
type StringGroup = Record<string, string>;

const FEATURE_GROUPS = [
  'activityNames',
  'diningNames',
  'barNames',
  'genericActivities',
  'defaults',
  'fallbackFeatures',
] as const satisfies readonly (keyof PackageContent)[];

function translateKnownValue(
  value: string,
  groupNames: readonly (keyof PackageContent)[],
  target: PackageContent = getTranslation().packageContent,
): string {
  for (const groupName of groupNames) {
    const englishGroup = en.packageContent[groupName] as StringGroup;
    const germanGroup = de.packageContent[groupName] as StringGroup;
    const targetGroup = target[groupName] as StringGroup;

    for (const key of Object.keys(englishGroup)) {
      if (value === englishGroup[key] || value === germanGroup[key]) {
        return targetGroup[key];
      }
    }
  }
  return value;
}

export function translateFeature(name: string): string {
  return translateKnownValue(name, FEATURE_GROUPS);
}

export function getCanonicalFeatureName(name: string): string {
  return translateKnownValue(name, FEATURE_GROUPS, en.packageContent);
}

export function translateFeatureSub(sub: string): string {
  return translateKnownValue(sub, ['featureSubtitles']);
}

export function translatePackageDescription(desc: string): string {
  return translateKnownValue(desc, ['tierDescriptions', 'fallbackDescriptions']);
}
