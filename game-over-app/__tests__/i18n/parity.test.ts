import { describe, it, expect } from 'vitest';
import en from '@/i18n/en';
import de from '@/i18n/de';

function leafPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return typeof v === 'object' && v !== null
      ? leafPaths(v as Record<string, unknown>, path)
      : [path];
  });
}

describe('i18n EN/DE parity', () => {
  it('has the exact same set of leaf keys in EN and DE', () => {
    const enKeys = new Set(leafPaths(en as any));
    const deKeys = new Set(leafPaths(de as any));
    const missingInDe = [...enKeys].filter(k => !deKeys.has(k));
    const extraInDe = [...deKeys].filter(k => !enKeys.has(k));
    expect({ missingInDe, extraInDe }).toEqual({ missingInDe: [], extraInDe: [] });
  });

  it('has no German value identical to the English value in the invite block', () => {
    // Guards against forgotten translations (copy/paste of English into de.ts).
    const enInvite = en.invite as Record<string, string>;
    const deInvite = de.invite as Record<string, string>;
    const untranslated = Object.keys(enInvite).filter(
      k => enInvite[k] === deInvite[k] && !/^[+\d\s]+$/.test(enInvite[k]),
    );
    // phonePlaceholder is intentionally identical; allow it explicitly.
    expect(untranslated.filter(k => k !== 'phonePlaceholder')).toEqual([]);
  });
});
