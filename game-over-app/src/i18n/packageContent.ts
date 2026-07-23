/**
 * Package content translations.
 *
 * Package feature names, tier descriptions and demo reviews are generated as
 * canonical ENGLISH display strings (in packageAssembly.ts and the fallback
 * package maps). Rather than restructuring that generation, we translate the
 * final English strings to German at render time via a lookup keyed by the
 * English string. Unknown strings fall through unchanged, so adding a new
 * activity never crashes — it just shows in English until translated here.
 */
import { getCurrentLanguage } from './index';

// English display string → German. Covers activity/dining/bar names, the
// generic fallbacks, and the hard-coded fallback-package feature bullets.
const FEATURE_DE: Record<string, string> = {
  // Activities
  'Laser Tag': 'Lasertag',
  'Bowling': 'Bowling',
  'Indoor Climbing': 'Indoor-Klettern',
  'Mini Golf': 'Minigolf',
  'Bubble Football': 'Bubble Football',
  'Paintball': 'Paintball',
  'Table Football': 'Tischfußball',
  'Billiards': 'Billard',
  'Harbor Cruise': 'Hafenrundfahrt',
  'Boat Rental': 'Bootsverleih',
  'Scavenger Hunt': 'Schnitzeljagd',
  'Photo Challenge': 'Foto-Challenge',
  'City Walking Tour': 'Stadtführung',
  'Street Art Tour': 'Street-Art-Tour',
  'Beach Day': 'Strandtag',
  'Theater Show': 'Theatershow',
  'Comedy Show': 'Comedy-Show',
  'Poker Night': 'Pokerabend',
  'Spa Day': 'Spa-Tag',
  'Massage Session': 'Massage',
  'Beer Tasting': 'Bierverkostung',
  'Whisky Tasting': 'Whisky-Tasting',
  'Gin Tasting': 'Gin-Tasting',
  'Cocktail Workshop': 'Cocktail-Kurs',
  'BBQ & Grill': 'BBQ & Grillen',
  'Go-Karting': 'Kartfahren',
  'VR Arcade': 'VR-Arcade',
  'Axe Throwing': 'Axtwerfen',
  'Escape Room': 'Escape Room',
  'Trampoline Park': 'Trampolinpark',
  'Cooking Class': 'Kochkurs',
  'Guided Bike Tour': 'Geführte Radtour',
  'Kayak & SUP': 'Kajak & SUP',
  'Creative Workshop': 'Kreativ-Workshop',
  'Dance Class': 'Tanzkurs',
  'Darts Tournament': 'Dart-Turnier',
  'Sports Viewing': 'Sport-Übertragung',
  'Food Tour': 'Food-Tour',
  'Wine Tasting': 'Weinverkostung',
  // Dining
  'Casual Dinner & Drinks': 'Lockeres Abendessen & Drinks',
  'Tapas Dinner': 'Tapas-Abendessen',
  'BBQ Dinner': 'BBQ-Abendessen',
  'Pizza & Craft Beer Dinner': 'Pizza & Craft-Beer-Abendessen',
  'Private Chef Dinner': 'Privates Chefkoch-Dinner',
  'Beer Hall Dinner': 'Bierhallen-Abendessen',
  'Brunch Buffet': 'Brunch-Buffet',
  'Steakhouse Dinner': 'Steakhouse-Abendessen',
  'Sushi Dinner': 'Sushi-Abendessen',
  'Restaurant Dinner': 'Restaurant-Abendessen',
  // Bar / Nightlife
  'Bar Crawl': 'Bar-Tour',
  'Club Night': 'Club-Nacht',
  'Live Music Bar': 'Live-Musik-Bar',
  'Karaoke Night': 'Karaoke-Abend',
  'Pub Quiz Night': 'Pub-Quiz-Abend',
  'Bar Night with Drinks': 'Bar-Abend mit Drinks',
  // Generic fallbacks
  'City Experience': 'Stadt-Erlebnis',
  'Group Activity': 'Gruppenaktivität',
  'Team Challenge': 'Team-Challenge',
  // Fallback-package feature bullets
  'VIP nightlife access': 'VIP-Nightlife-Zugang',
  'Private party bus': 'Privater Party-Bus',
  'Professional photographer': 'Professioneller Fotograf',
  'Welcome drinks package': 'Willkommens-Drinks-Paket',
  'Bar hopping tour': 'Bar-Tour',
  'Welcome drinks': 'Willkommens-Drinks',
  'Group coordination': 'Gruppen-Koordination',
  'Luxury suite': 'Luxus-Suite',
  'Private chef dinner': 'Privates Chefkoch-Dinner',
  'Spa & wellness package': 'Spa- & Wellness-Paket',
  'VIP club access': 'VIP-Club-Zugang',
  'Private chauffeur': 'Privater Chauffeur',
  'Reeperbahn nightlife tour': 'Reeperbahn-Nightlife-Tour',
  'Harbor cruise': 'Hafenrundfahrt',
  'Reserved bar area': 'Reservierter Bar-Bereich',
  'Guided bar tour': 'Geführte Bar-Tour',
  'Welcome cocktails': 'Willkommens-Cocktails',
  'Group planning': 'Gruppen-Planung',
  'Elbphilharmonie VIP event': 'Elbphilharmonie-VIP-Event',
  'Private yacht dinner': 'Privates Yacht-Dinner',
  'Luxury hotel suite': 'Luxus-Hotelsuite',
  'Spa & wellness day': 'Spa- & Wellness-Tag',
  'Premium bottle service': 'Premium-Flaschenservice',
  'Craft beer experience': 'Craft-Beer-Erlebnis',
  'Go-kart racing': 'Kartrennen',
  'Welcome dinner': 'Willkommens-Dinner',
  'City adventure tour': 'Stadt-Abenteuer-Tour',
  'Herrenhausen Gardens gala': 'Gala in den Herrenhäuser Gärten',
};

// Feature subtitle strings (from featureSub()).
const FEATURE_SUB_DE: Record<string, string> = {
  'Group activity included': 'Gruppenaktivität inklusive',
  'Group dinner included': 'Gruppen-Abendessen inklusive',
  'Evening entertainment included': 'Abendunterhaltung inklusive',
};

// Tier + fallback-package descriptions.
const DESCRIPTION_DE: Record<string, string> = {
  'The perfect starter package — one highlight activity, great dinner, and drinks included.':
    'Das perfekte Einsteiger-Paket – eine Highlight-Aktivität, ein tolles Abendessen und Drinks inklusive.',
  'The ideal balance of activities, dining, and nightlife for an unforgettable celebration.':
    'Die ideale Balance aus Aktivitäten, Essen und Nightlife für eine unvergessliche Feier.',
  'The ultimate premium experience with three activities, fine dining, and exclusive nightlife.':
    'Das ultimative Premium-Erlebnis mit drei Aktivitäten, feinem Essen und exklusivem Nightlife.',
  'The ideal balance of nightlife, culture, and unforgettable moments in Berlin.':
    'Die ideale Balance aus Nightlife, Kultur und unvergesslichen Momenten in Berlin.',
  'A solid party plan with all the essentials covered.':
    'Ein solider Party-Plan, bei dem alles Wesentliche abgedeckt ist.',
  'The ultimate premium experience with luxury at every turn.':
    'Das ultimative Premium-Erlebnis mit Luxus an jeder Ecke.',
  "Experience Hamburg's legendary nightlife and harbor in style.":
    'Erlebe Hamburgs legendäres Nightlife und den Hafen mit Stil.',
  'A fun, well-organized Hamburg party experience.':
    'Ein unterhaltsames, gut organisiertes Hamburg-Party-Erlebnis.',
  'Premium Hamburg experience with exclusive venues and luxury service.':
    'Premium-Hamburg-Erlebnis mit exklusiven Locations und Luxus-Service.',
  'An action-packed celebration in the heart of Hannover.':
    'Eine actiongeladene Feier im Herzen von Hannover.',
  'A great time in Hannover without breaking the bank.':
    'Eine großartige Zeit in Hannover, ohne das Budget zu sprengen.',
  'Exclusive Hannover experience with private gala and luxury wellness.':
    'Exklusives Hannover-Erlebnis mit privater Gala und Luxus-Wellness.',
};

export function translateFeature(name: string): string {
  if (getCurrentLanguage() !== 'de') return name;
  return FEATURE_DE[name] ?? name;
}

export function translateFeatureSub(sub: string): string {
  if (getCurrentLanguage() !== 'de') return sub;
  return FEATURE_SUB_DE[sub] ?? sub;
}

export function translatePackageDescription(desc: string): string {
  if (getCurrentLanguage() !== 'de') return desc;
  return DESCRIPTION_DE[desc] ?? desc;
}
