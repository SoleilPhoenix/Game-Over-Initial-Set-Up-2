/**
 * Communication Screen
 * Chat, Voting, Decisions with organized channel sections
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Animated, PanResponder, ScrollView, RefreshControl, Pressable, StyleSheet, View, StatusBar, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadDesiredParticipants } from '@/lib/participantCountCache';
import { YStack, XStack, Text, Image } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvents } from '@/hooks/queries/useEvents';
import { useChannels, useCreateChannel } from '@/hooks/queries/useChat';
import { usePolls, useCreatePoll, useVote, useDeletePoll } from '@/hooks/queries/usePolls';
import { DARK_THEME } from '@/constants/theme';
import { useTranslation, getTranslation } from '@/i18n';
import { useSwipeTabs } from '@/hooks/useSwipeTabs';
import { useUser } from '@/stores/authStore';
import { getEventImage, resolveImageSource } from '@/constants/packageImages';
import type { Database } from '@/lib/supabase/types';

// 100 icon options per category — best match chosen from channel name keywords
const CATEGORY_ICON_POOLS: Record<string, Array<{ icon: string; keywords: string[] }>> = {
  general: [
    { icon: 'chatbubbles',           keywords: ['chat', 'general', 'talk', 'discussion', 'lobby', 'main'] },
    { icon: 'megaphone',             keywords: ['announcement', 'news', 'update', 'broadcast', 'info'] },
    { icon: 'people',                keywords: ['group', 'team', 'crew', 'gang', 'party', 'gather', 'squad'] },
    { icon: 'globe',                 keywords: ['travel', 'world', 'global', 'international', 'destination'] },
    { icon: 'heart',                 keywords: ['love', 'celebrate', 'cheer', 'congrats', 'wedding', 'birthday'] },
    { icon: 'star',                  keywords: ['vip', 'special', 'premium', 'highlight', 'best', 'favorite'] },
    { icon: 'flag',                  keywords: ['plan', 'goal', 'event', 'meeting', 'schedule', 'mission'] },
    { icon: 'bulb',                  keywords: ['idea', 'tip', 'suggestion', 'advice', 'concept', 'brainstorm'] },
    { icon: 'trophy',                keywords: ['win', 'award', 'challenge', 'competition', 'game', 'champion'] },
    { icon: 'compass',               keywords: ['explore', 'discover', 'adventure', 'trip', 'tour'] },
    { icon: 'notifications',         keywords: ['alert', 'notification', 'reminder', 'alarm'] },
    { icon: 'calendar',              keywords: ['calendar', 'date', 'day', 'week', 'month', 'schedule'] },
    { icon: 'time',                  keywords: ['time', 'clock', 'hour', 'when', 'timing'] },
    { icon: 'mail',                  keywords: ['email', 'message', 'inbox', 'letter', 'contact'] },
    { icon: 'paper-plane',           keywords: ['send', 'invite', 'share', 'forward', 'dispatch'] },
    { icon: 'rocket',                keywords: ['launch', 'start', 'kickoff', 'go', 'fast', 'speed'] },
    { icon: 'sunny',                 keywords: ['sunny', 'morning', 'day', 'bright', 'good vibes'] },
    { icon: 'moon',                  keywords: ['night', 'evening', 'late', 'midnight', 'dark'] },
    { icon: 'flash',                 keywords: ['quick', 'urgent', 'important', 'rush', 'now'] },
    { icon: 'water',                 keywords: ['water', 'drink', 'hydrate', 'chill', 'flow'] },
    { icon: 'leaf',                  keywords: ['nature', 'eco', 'green', 'outdoor', 'fresh', 'vegan'] },
    { icon: 'musical-notes',         keywords: ['music', 'song', 'playlist', 'vibe', 'sound', 'dj'] },
    { icon: 'mic',                   keywords: ['mic', 'karaoke', 'speak', 'voice', 'host', 'emcee'] },
    { icon: 'headset',               keywords: ['headset', 'audio', 'listen', 'podcast'] },
    { icon: 'camera',                keywords: ['photo', 'camera', 'shooting', 'memory', 'selfie', 'snap'] },
    { icon: 'videocam',              keywords: ['video', 'film', 'record', 'reel', 'clip'] },
    { icon: 'search',                keywords: ['search', 'find', 'look', 'browse', 'discover'] },
    { icon: 'thumbs-up',             keywords: ['yes', 'agree', 'approve', 'like', 'vote yes', 'confirm'] },
    { icon: 'thumbs-down',           keywords: ['no', 'disagree', 'reject', 'dislike', 'vote no'] },
    { icon: 'happy',                 keywords: ['fun', 'happy', 'excited', 'joy', 'smile', 'lol'] },
    { icon: 'ribbon',                keywords: ['ribbon', 'honor', 'ceremony', 'celebrate', 'achievement'] },
    { icon: 'diamond',               keywords: ['diamond', 'luxury', 'exclusive', 'precious', 'engagement'] },
    { icon: 'shield',                keywords: ['safe', 'protect', 'security', 'rules', 'guidelines'] },
    { icon: 'checkmark-circle',      keywords: ['done', 'complete', 'check', 'finished', 'approved', 'confirmed'] },
    { icon: 'information-circle',    keywords: ['faq', 'help', 'about', 'details', 'info', 'information'] },
    { icon: 'pencil',                keywords: ['write', 'note', 'edit', 'draft', 'log'] },
    { icon: 'document-text',         keywords: ['document', 'notes', 'list', 'rules', 'agenda', 'doc'] },
    { icon: 'clipboard',             keywords: ['checklist', 'tasks', 'todo', 'reminders'] },
    { icon: 'share-social',          keywords: ['social', 'post', 'instagram', 'tiktok', 'story'] },
    { icon: 'cloud',                 keywords: ['cloud', 'sync', 'backup', 'save', 'files', 'storage'] },
    { icon: 'settings',              keywords: ['settings', 'config', 'options', 'preferences', 'admin'] },
    { icon: 'layers',                keywords: ['overview', 'all', 'everything', 'combined', 'stacked'] },
    { icon: 'grid',                  keywords: ['grid', 'board', 'layout', 'organize'] },
    { icon: 'bookmark',              keywords: ['save', 'bookmark', 'pin', 'keep', 'remember'] },
    { icon: 'wine',                  keywords: ['wine', 'champagne', 'toast', 'celebrate', 'cheers', 'prosecco'] },
    { icon: 'beer',                  keywords: ['beer', 'bier', 'prost', 'brew', 'craft'] },
    { icon: 'person',                keywords: ['person', 'user', 'member', 'guest', 'individual', 'you'] },
    { icon: 'person-add',            keywords: ['invite', 'add', 'new member', 'join', 'welcome'] },
    { icon: 'key',                   keywords: ['access', 'unlock', 'password', 'permission', 'vip access'] },
    { icon: 'lock-open',             keywords: ['open', 'unlocked', 'public', 'accessible', 'free'] },
    { icon: 'eye',                   keywords: ['view', 'watch', 'see', 'look', 'observe'] },
    { icon: 'hand-left',             keywords: ['stop', 'wait', 'hold', 'pause', 'attention'] },
    { icon: 'create',                keywords: ['create', 'new', 'add', 'design', 'make', 'build'] },
    { icon: 'link',                  keywords: ['link', 'url', 'website', 'web', 'external'] },
    { icon: 'download',              keywords: ['download', 'save', 'get', 'fetch', 'import'] },
    { icon: 'sync',                  keywords: ['update', 'refresh', 'reload', 'sync', 'changes'] },
    { icon: 'color-palette',         keywords: ['design', 'color', 'theme', 'style', 'aesthetic'] },
    { icon: 'options',               keywords: ['options', 'choice', 'select', 'alternatives', 'pick'] },
    { icon: 'earth',                 keywords: ['global', 'international', 'worldwide', 'earth'] },
    { icon: 'navigate',              keywords: ['navigate', 'go to', 'direction', 'path', 'guide'] },
    { icon: 'print',                 keywords: ['print', 'ticket', 'pass', 'boarding', 'receipt'] },
    { icon: 'code',                  keywords: ['tech', 'app', 'digital', 'software', 'platform'] },
    { icon: 'phone-portrait',        keywords: ['phone', 'mobile', 'app', 'device', 'contact'] },
    { icon: 'ban',                   keywords: ['ban', 'forbidden', 'not allowed', 'restricted', 'no'] },
    { icon: 'sparkles',              keywords: ['magic', 'sparkle', 'amazing', 'wow', 'special'] } as any,
    { icon: 'bonfire',               keywords: ['fire', 'bonfire', 'camp', 'grill', 'bbq'] } as any,
    { icon: 'accessibility',         keywords: ['accessible', 'inclusive', 'wheelchair', 'support'] },
    { icon: 'body',                  keywords: ['health', 'wellness', 'body', 'physical', 'wellbeing'] },
    { icon: 'man',                   keywords: ['bachelor', 'groom', 'man', 'guy', 'male'] },
    { icon: 'woman',                 keywords: ['bachelorette', 'bride', 'woman', 'lady', 'female'] },
    { icon: 'walk',                  keywords: ['walk', 'stroll', 'explore', 'sightseeing', 'tour'] },
    { icon: 'bus',                   keywords: ['bus', 'group transport', 'shuttle', 'coach', 'transfer'] },
    { icon: 'train',                 keywords: ['train', 'rail', 'subway', 'metro', 'station'] },
    { icon: 'podium',                keywords: ['speech', 'presentation', 'toast', 'announcement', 'ceremony'] },
    { icon: 'trending-up',           keywords: ['progress', 'improve', 'growth', 'stats', 'score'] },
    { icon: 'radio',                 keywords: ['radio', 'stream', 'live', 'broadcast', 'listen'] },
    { icon: 'list',                  keywords: ['list', 'items', 'all', 'everything', 'register'] },
    { icon: 'menu',                  keywords: ['menu', 'nav', 'categories', 'sections'] },
    { icon: 'alert-circle',          keywords: ['important', 'warning', 'critical', 'note', 'notice'] },
    { icon: 'sad',                   keywords: ['sorry', 'bad news', 'cancelled', 'postponed'] },
    { icon: 'close-circle',          keywords: ['cancel', 'remove', 'delete', 'off', 'stop'] },
    { icon: 'add-circle',            keywords: ['add new', 'create new', 'plus', 'more', 'extra'] },
    { icon: 'pricetags',             keywords: ['tags', 'labels', 'categories', 'types', 'kinds'] },
    { icon: 'gift',                  keywords: ['gift', 'present', 'surprise', 'giveaway', 'freebie'] },
    { icon: 'book',                  keywords: ['book', 'read', 'story', 'history', 'guide', 'manual'] },
    { icon: 'library',               keywords: ['library', 'resources', 'collection', 'archive', 'database'] },
    { icon: 'build',                 keywords: ['build', 'setup', 'work', 'organize', 'structure'] },
    { icon: 'cafe',                  keywords: ['coffee', 'cafe', 'brunch', 'morning', 'latte', 'espresso'] },
    { icon: 'pizza',                 keywords: ['pizza', 'takeaway', 'delivery', 'food order'] },
    { icon: 'fast-food',             keywords: ['fast food', 'burger', 'snack', 'quick', 'takeout'] },
    { icon: 'nutrition',             keywords: ['healthy', 'diet', 'nutrition', 'vegan', 'salad'] },
    { icon: 'medkit',                keywords: ['medical', 'first aid', 'health', 'safety', 'emergency'] },
    { icon: 'bandage',               keywords: ['bandage', 'accident', 'oops', 'mistake', 'fix'] },
    { icon: 'storefront',            keywords: ['shop', 'store', 'buy', 'retail', 'boutique', 'market'] },
    { icon: 'school',                keywords: ['school', 'learn', 'workshop', 'class', 'education'] },
    { icon: 'tv',                    keywords: ['tv', 'watch', 'stream', 'netflix', 'show', 'series'] },
    { icon: 'image',                 keywords: ['photo album', 'gallery', 'pictures', 'pics', 'images'] },
    { icon: 'images',                keywords: ['photos', 'gallery', 'album', 'memories', 'shots'] },
    { icon: 'paw',                   keywords: ['dog', 'pet', 'animal', 'cat', 'fur baby'] },
    { icon: 'fish',                  keywords: ['fish', 'sea', 'ocean', 'aquarium', 'seafood', 'sushi'] },
    { icon: 'ice-cream',             keywords: ['ice cream', 'sweet', 'dessert', 'gelato', 'sorbet'] },
  ],
  accommodation: [
    { icon: 'bed',                   keywords: ['room', 'bed', 'sleep', 'suite', 'bedroom', 'allocation'] },
    { icon: 'home',                  keywords: ['villa', 'house', 'apartment', 'airbnb', 'home', 'rental'] },
    { icon: 'business',              keywords: ['hotel', 'hostel', 'resort', 'lodge', 'inn'] },
    { icon: 'key',                   keywords: ['check-in', 'checkin', 'checkout', 'key', 'access', 'entry'] },
    { icon: 'location',              keywords: ['address', 'location', 'where', 'place', 'spot', 'area'] },
    { icon: 'map',                   keywords: ['map', 'directions', 'route', 'navigation', 'get there'] },
    { icon: 'car',                   keywords: ['parking', 'car', 'drive', 'shuttle', 'garage'] },
    { icon: 'boat',                  keywords: ['boat', 'yacht', 'cruise', 'sailing', 'sea', 'houseboat'] },
    { icon: 'airplane',              keywords: ['flight', 'airport', 'fly', 'airline', 'plane', 'arrival', 'departure'] },
    { icon: 'umbrella',              keywords: ['pool', 'beach', 'relax', 'spa', 'lounge', 'sun'] },
    { icon: 'storefront',            keywords: ['reception', 'lobby', 'front desk', 'checkin desk'] },
    { icon: 'star',                  keywords: ['5 star', 'rating', 'stars', 'luxury', 'quality', 'review'] },
    { icon: 'wifi',                  keywords: ['wifi', 'internet', 'connection', 'online', 'access'] },
    { icon: 'phone-portrait',        keywords: ['contact', 'call', 'phone', 'number', 'reach'] },
    { icon: 'lock-closed',           keywords: ['security', 'safe', 'lock', 'secure', 'private'] },
    { icon: 'sunny',                 keywords: ['terrace', 'balcony', 'outdoor', 'garden', 'view'] },
    { icon: 'water',                 keywords: ['pool', 'jacuzzi', 'hot tub', 'bathtub', 'shower', 'swim'] },
    { icon: 'leaf',                  keywords: ['eco', 'sustainable', 'nature', 'glamping', 'camping', 'treehouse'] },
    { icon: 'body',                  keywords: ['spa', 'wellness', 'massage', 'sauna', 'beauty'] },
    { icon: 'fitness',               keywords: ['gym', 'fitness', 'workout', 'facilities'] },
    { icon: 'restaurant',            keywords: ['breakfast', 'dinner', 'restaurant', 'food', 'buffet'] },
    { icon: 'cafe',                  keywords: ['coffee', 'cafe', 'morning', 'breakfast included'] },
    { icon: 'wine',                  keywords: ['minibar', 'wine', 'bar', 'drinks', 'welcome drink'] },
    { icon: 'tv',                    keywords: ['tv', 'television', 'entertainment', 'smart tv'] },
    { icon: 'musical-notes',         keywords: ['entertainment', 'music', 'show', 'live entertainment'] },
    { icon: 'snow',                  keywords: ['air con', 'ac', 'aircon', 'cooling', 'climate'] } as any,
    { icon: 'flame',                 keywords: ['heating', 'warm', 'fireplace', 'cozy', 'winter'] } as any,
    { icon: 'time',                  keywords: ['check-in time', 'checkout time', 'late check', 'hours'] },
    { icon: 'calendar',              keywords: ['reservation', 'booking', 'dates', 'nights', 'stay'] },
    { icon: 'clipboard',             keywords: ['booking confirmation', 'details', 'itinerary', 'schedule'] },
    { icon: 'person-add',            keywords: ['extra guest', 'plus one', 'additional', 'extra bed'] },
    { icon: 'people',                keywords: ['roommates', 'sharing', 'room split', 'group room'] },
    { icon: 'cash',                  keywords: ['deposit', 'prepayment', 'cost', 'price', 'rate'] },
    { icon: 'card',                  keywords: ['payment', 'card on file', 'pay at hotel', 'online pay'] },
    { icon: 'pricetag',              keywords: ['price', 'deal', 'offer', 'rate', 'discount'] },
    { icon: 'trending-up',           keywords: ['upgrade', 'room upgrade', 'better room', 'premium'] },
    { icon: 'shield',                keywords: ['insurance', 'protection', 'cancellation', 'coverage'] },
    { icon: 'bus',                   keywords: ['airport transfer', 'shuttle', 'transport', 'pickup'] },
    { icon: 'bicycle',               keywords: ['bike rental', 'cycle', 'mobility', 'transport'] },
    { icon: 'walk',                  keywords: ['walking distance', 'nearby', 'close', 'walkable'] },
    { icon: 'navigate',              keywords: ['how to get there', 'directions', 'coordinates', 'gps'] },
    { icon: 'earth',                 keywords: ['city center', 'district', 'area', 'zone', 'neighborhood'] },
    { icon: 'pin',                   keywords: ['exact location', 'pin', 'address', 'find us'] },
    { icon: 'document-text',         keywords: ['rules', 'house rules', 'policy', 'terms', 'conditions'] },
    { icon: 'notifications',         keywords: ['reminder', 'alarm', 'wake up', 'morning call'] },
    { icon: 'trash',                 keywords: ['cleaning', 'housekeeping', 'tidy', 'service'] } as any,
    { icon: 'bag',                   keywords: ['luggage', 'bags', 'storage', 'left luggage'] } as any,
    { icon: 'layers',                keywords: ['floors', 'level', 'floor number', 'storey'] },
    { icon: 'grid',                  keywords: ['layout', 'floor plan', 'rooms', 'apartments', 'units'] },
    { icon: 'settings',              keywords: ['amenities', 'facilities', 'features', 'extras'] },
    { icon: 'search',                keywords: ['search rooms', 'find hotel', 'alternatives', 'options'] },
    { icon: 'bookmark',              keywords: ['saved', 'wishlist', 'favourite', 'shortlist'] },
    { icon: 'information-circle',    keywords: ['info', 'faq', 'questions', 'help', 'support'] },
    { icon: 'alert-circle',          keywords: ['important', 'note', 'warning', 'attention', 'notice'] },
    { icon: 'checkmark-circle',      keywords: ['confirmed', 'booked', 'reserved', 'secured'] },
    { icon: 'share-social',          keywords: ['share', 'send address', 'share location'] },
    { icon: 'link',                  keywords: ['website', 'booking.com', 'expedia', 'link', 'url'] },
    { icon: 'mail',                  keywords: ['confirmation email', 'voucher', 'booking email'] },
    { icon: 'camera',                keywords: ['photos of place', 'pictures', 'preview', 'gallery'] },
    { icon: 'images',                keywords: ['room photos', 'gallery', 'images', 'look'] },
    { icon: 'eye',                   keywords: ['room view', 'sea view', 'city view', 'panorama'] },
    { icon: 'options',               keywords: ['room type', 'options', 'choices', 'alternatives'] },
    { icon: 'paw',                   keywords: ['pet friendly', 'dog allowed', 'animals'] },
    { icon: 'accessibility',         keywords: ['accessible', 'disabled', 'wheelchair', 'ground floor'] },
    { icon: 'moon',                  keywords: ['overnight', 'late arrival', 'night', '24h', 'evening'] },
    { icon: 'flash',                 keywords: ['last minute', 'urgent', 'immediate', 'now'] },
    { icon: 'compass',               keywords: ['orientation', 'surroundings', 'local tips', 'explore nearby'] },
    { icon: 'gift',                  keywords: ['honeymoon suite', 'welcome gift', 'special occasion', 'romantic'] },
    { icon: 'ribbon',                keywords: ['award winning', 'rated', 'certified', 'excellence'] },
    { icon: 'trophy',                keywords: ['best hotel', 'top rated', 'award', 'ranking'] },
    { icon: 'diamond',               keywords: ['5 star luxury', 'premium', 'exclusive', 'boutique'] },
    { icon: 'heart',                 keywords: ['honeymoon', 'romantic', 'couples', 'love', 'anniversary'] },
    { icon: 'ice-cream',             keywords: ['snacks', 'minibar treats', 'vending', 'food options'] },
    { icon: 'pizza',                 keywords: ['room service', 'delivery', 'order food', 'takeaway'] },
    { icon: 'headset',               keywords: ['concierge', 'service', 'helpdesk', 'front desk call'] },
    { icon: 'megaphone',             keywords: ['update', 'change', 'announcement', 'modification'] },
    { icon: 'create',                keywords: ['special request', 'custom', 'preference', 'preference list'] },
    { icon: 'list',                  keywords: ['all rooms', 'room list', 'available', 'inventory'] },
    { icon: 'print',                 keywords: ['print voucher', 'confirmation letter', 'check-in code'] },
    { icon: 'sync',                  keywords: ['update booking', 'modify', 'change dates', 'rebook'] },
    { icon: 'school',                keywords: ['hostel', 'dorm', 'budget', 'student', 'shared'] },
    { icon: 'book',                  keywords: ['guide', 'local guide', 'city guide', 'recommendations'] },
    { icon: 'bar-chart',             keywords: ['comparison', 'compare', 'ratings', 'ranking'] } as any,
    { icon: 'globe',                 keywords: ['international', 'worldwide brand', 'chain', 'global'] },
    { icon: 'train',                 keywords: ['near station', 'train station', 's-bahn', 'metro'] },
    { icon: 'walk',                  keywords: ['5 min walk', 'short walk', 'steps away'] },
    { icon: 'car-sport',             keywords: ['car rental', 'drive', 'vehicle', 'limo', 'taxi'] } as any,
    { icon: 'umbrella',              keywords: ['beach resort', 'pool side', 'sun lounger', 'cabana'] },
  ],
  activities: [
    { icon: 'game-controller',       keywords: ['game', 'gaming', 'casino', 'poker', 'arcade', 'play'] },
    { icon: 'football',              keywords: ['football', 'soccer', 'sport', 'match', 'stadium', 'kick'] },
    { icon: 'bicycle',               keywords: ['bike', 'cycling', 'karting', 'kart', 'race', 'go-kart', 'scooter'] },
    { icon: 'basketball',            keywords: ['basketball', 'court', 'hoops', 'nba'] },
    { icon: 'golf',                  keywords: ['golf', 'tee', 'putting', 'green', 'course', 'mini golf'] },
    { icon: 'fitness',               keywords: ['gym', 'fitness', 'workout', 'paintball', 'laser', 'exercise'] },
    { icon: 'beer-outline',          keywords: ['bar', 'drinks', 'beer', 'pub', 'nightlife', 'club', 'barhoping'] },
    { icon: 'restaurant',            keywords: ['dinner', 'restaurant', 'food', 'brunch', 'lunch', 'steak', 'grill'] },
    { icon: 'ticket',                keywords: ['concert', 'show', 'event', 'theater', 'comedy', 'saturday', 'friday', 'night out'] },
    { icon: 'camera',                keywords: ['photo', 'camera', 'shooting', 'memory', 'video', 'photoshoot'] },
    { icon: 'trophy',                keywords: ['competition', 'win', 'challenge', 'tournament', 'contest', 'award'] },
    { icon: 'boat',                  keywords: ['boat', 'yacht', 'sailing', 'cruise', 'sea', 'lake', 'water'] },
    { icon: 'airplane',              keywords: ['skydive', 'paraglide', 'hot air balloon', 'fly', 'aviation'] },
    { icon: 'musical-notes',         keywords: ['karaoke', 'music', 'concert', 'festival', 'dj', 'dance'] },
    { icon: 'mic',                   keywords: ['karaoke', 'comedy', 'open mic', 'improv', 'stand up'] },
    { icon: 'wine',                  keywords: ['wine tasting', 'sommelier', 'vineyard', 'winery', 'cocktails'] },
    { icon: 'beer',                  keywords: ['brewery tour', 'craft beer', 'pub crawl', 'barhop', 'bier'] },
    { icon: 'cafe',                  keywords: ['coffee tasting', 'brunch activity', 'morning activity'] },
    { icon: 'pizza',                 keywords: ['cooking class', 'pizza making', 'food tour', 'eat'] },
    { icon: 'ice-cream',             keywords: ['dessert tour', 'sweet', 'ice cream tour'] },
    { icon: 'body',                  keywords: ['spa', 'massage', 'sauna', 'wellness', 'yoga', 'meditation'] },
    { icon: 'walk',                  keywords: ['walking tour', 'city walk', 'hike', 'trekking', 'trail'] },
    { icon: 'compass',               keywords: ['scavenger hunt', 'treasure hunt', 'escape room', 'discovery'] },
    { icon: 'earth',                 keywords: ['sightseeing', 'landmarks', 'tourism', 'city tour', 'culture'] },
    { icon: 'navigate',              keywords: ['rally', 'road trip', 'navigation challenge', 'orienteering'] },
    { icon: 'water',                 keywords: ['swimming', 'diving', 'surfing', 'kayaking', 'rafting', 'aqua'] },
    { icon: 'leaf',                  keywords: ['nature', 'hiking', 'forest', 'camping', 'outdoor'] },
    { icon: 'sunny',                 keywords: ['beach day', 'outdoor activity', 'sun', 'summer', 'rooftop'] },
    { icon: 'moon',                  keywords: ['night activity', 'evening', 'nightclub', 'after dinner', 'moonlight'] },
    { icon: 'flash',                 keywords: ['extreme', 'adrenaline', 'bungee', 'speed', 'thrilling'] },
    { icon: 'bonfire',               keywords: ['bonfire', 'campfire', 'beach party', 'bbq', 'grill'] } as any,
    { icon: 'paw',                   keywords: ['pet experience', 'animal', 'zoo', 'farm', 'safari'] },
    { icon: 'fish',                  keywords: ['fishing', 'angling', 'fish market', 'sea trip'] },
    { icon: 'medkit',                keywords: ['paintball', 'airsoft', 'tactical', 'combat', 'war game'] },
    { icon: 'shield',                keywords: ['escape room', 'puzzle', 'mystery', 'challenge', 'quest'] },
    { icon: 'people',                keywords: ['group activity', 'team building', 'social', 'together'] },
    { icon: 'star',                  keywords: ['vip experience', 'exclusive', 'premium', 'special'] },
    { icon: 'diamond',               keywords: ['luxury experience', 'private', 'bespoke', 'fancy'] },
    { icon: 'heart',                 keywords: ['romantic', 'couples', 'date night', 'love activity'] },
    { icon: 'ribbon',                keywords: ['ceremony', 'award night', 'prize', 'recognition'] },
    { icon: 'megaphone',             keywords: ['tour guide', 'guided tour', 'excursion', 'organized'] },
    { icon: 'radio',                 keywords: ['radio activity', 'podcast recording', 'broadcast'] },
    { icon: 'tv',                    keywords: ['watch party', 'cinema', 'movie', 'screening', 'drive-in'] },
    { icon: 'videocam',              keywords: ['film activity', 'video creation', 'movie making', 'vlog'] },
    { icon: 'image',                 keywords: ['art gallery', 'exhibition', 'museum', 'art', 'culture'] },
    { icon: 'color-palette',         keywords: ['painting', 'art class', 'pottery', 'creative', 'workshop'] },
    { icon: 'musical-note',          keywords: ['dance class', 'salsa', 'tango', 'dance lesson'] },
    { icon: 'key',                   keywords: ['lock picking', 'escape game', 'unlock', 'mystery key'] },
    { icon: 'headset',               keywords: ['VR', 'virtual reality', 'gaming headset', 'esports'] },
    { icon: 'layers',                keywords: ['multi-activity', 'activity package', 'full day', 'combo'] },
    { icon: 'grid',                  keywords: ['activity board', 'plan', 'activity list', 'itinerary'] },
    { icon: 'time',                  keywords: ['time trial', 'timed challenge', 'speed round'] },
    { icon: 'alarm',                 keywords: ['countdown', 'timer', 'alarm activity', 'race against time'] },
    { icon: 'search',                keywords: ['find', 'search activity', 'discover', 'explore new'] },
    { icon: 'share-social',          keywords: ['social media challenge', 'viral', 'content', 'story'] },
    { icon: 'bookmark',              keywords: ['saved activity', 'wishlist', 'want to do'] },
    { icon: 'gift',                  keywords: ['surprise activity', 'gift experience', 'voucher'] },
    { icon: 'document-text',         keywords: ['activity rules', 'instructions', 'how to', 'guide'] },
    { icon: 'pricetag',              keywords: ['activity cost', 'entry fee', 'admission', 'price'] },
    { icon: 'card',                  keywords: ['pay for activity', 'payment', 'ticket purchase'] },
    { icon: 'cash',                  keywords: ['split costs', 'pay cash', 'activity budget'] },
    { icon: 'person',                keywords: ['solo activity', 'individual', 'one person'] },
    { icon: 'person-add',            keywords: ['bring a friend', 'plus one', 'extra person'] },
    { icon: 'car',                   keywords: ['car activity', 'driving', 'drag race', 'auto'] },
    { icon: 'bus',                   keywords: ['party bus', 'limousine', 'group transport activity'] },
    { icon: 'train',                 keywords: ['train trip', 'rail adventure', 'scenic train'] },
    { icon: 'trophy',                keywords: ['winner', 'team challenge', 'leaderboard', 'score'] },
    { icon: 'podium',                keywords: ['awards night', 'ceremony', 'leaderboard reveal'] },
    { icon: 'bulb',                  keywords: ['creative activity', 'innovation', 'thinking', 'brainstorm'] },
    { icon: 'flag',                  keywords: ['start signal', 'race start', 'event flag', 'game on'] },
    { icon: 'options',               keywords: ['pick activity', 'choose', 'vote activity', 'options'] },
    { icon: 'checkmark-circle',      keywords: ['activity done', 'completed', 'achieved', 'crossed off'] },
    { icon: 'sad',                   keywords: ['failed activity', 'cancelled', 'postponed activity'] },
    { icon: 'happy',                 keywords: ['fun activity', 'best activity', 'loved it', 'amazing'] },
    { icon: 'thumbs-up',             keywords: ['approved activity', 'good choice', 'yes'] },
    { icon: 'school',                keywords: ['class', 'lesson', 'learn skill', 'masterclass'] },
    { icon: 'library',               keywords: ['book experience', 'historic tour', 'heritage', 'culture'] },
    { icon: 'globe',                 keywords: ['international', 'foreign', 'exotic', 'unique experience'] },
    { icon: 'nutrition',             keywords: ['healthy activity', 'diet challenge', 'nutrition workshop'] },
    { icon: 'planet',                keywords: ['astronomy', 'stargazing', 'space', 'planetarium'] } as any,
    { icon: 'accessibility',         keywords: ['accessible activity', 'inclusive', 'all abilities'] },
    { icon: 'bicycle',               keywords: ['racing', 'sport', 'active', 'cardio', 'movement'] },
    { icon: 'alert-circle',          keywords: ['waiver required', 'safety brief', 'important info'] },
    { icon: 'link',                  keywords: ['booking link', 'online booking', 'reserve activity'] },
    { icon: 'storefront',            keywords: ['activity shop', 'gear store', 'equipment', 'buy gear'] },
    { icon: 'print',                 keywords: ['print tickets', 'print voucher', 'show at door'] },
    { icon: 'settings',              keywords: ['activity settings', 'customize', 'preferences'] },
    { icon: 'mail',                  keywords: ['activity confirmation', 'booking email', 'e-ticket'] },
    { icon: 'pin',                   keywords: ['meeting point', 'start location', 'gather here'] },
    { icon: 'map',                   keywords: ['activity map', 'venue location', 'where to go'] },
    { icon: 'location',              keywords: ['activity location', 'where', 'venue', 'spot', 'place'] },
  ],
  budget: [
    { icon: 'cash',                  keywords: ['cash', 'money', 'payment', 'pay', 'fund', 'funds'] },
    { icon: 'card',                  keywords: ['card', 'credit', 'debit', 'stripe', 'deposit', 'payment method'] },
    { icon: 'wallet',                keywords: ['wallet', 'budget', 'spend', 'cost', 'expense', 'spending'] },
    { icon: 'calculator',            keywords: ['calculate', 'total', 'split', 'share', 'per person', 'divide'] },
    { icon: 'pie-chart',             keywords: ['breakdown', 'overview', 'summary', 'report', 'distribution'] },
    { icon: 'bar-chart',             keywords: ['tracking', 'progress', 'goal', 'target', 'stats', 'graph'] },
    { icon: 'trending-up',           keywords: ['update', 'change', 'increase', 'extra', 'more', 'added'] },
    { icon: 'receipt',               keywords: ['receipt', 'invoice', 'bill', 'reimbursement', 'expense claim'] },
    { icon: 'pricetag',              keywords: ['price', 'fee', 'ticket', 'admission', 'entry', 'cost'] },
    { icon: 'gift',                  keywords: ['gift', 'present', 'surprise', 'decoration', 'stag', 'bachelor'] },
    { icon: 'trending-down',         keywords: ['discount', 'cheaper', 'reduce', 'lower', 'save money', 'cut'] },
    { icon: 'ribbon',                keywords: ['prize money', 'bonus', 'reward', 'prize pool'] },
    { icon: 'star',                  keywords: ['premium budget', 'luxury spend', 'upgrade cost', 'vip price'] },
    { icon: 'trophy',                keywords: ['winner gets paid', 'reward pool', 'jackpot', 'competition prize'] },
    { icon: 'people',                keywords: ['group budget', 'shared cost', 'everyone pays', 'split between'] },
    { icon: 'person',                keywords: ['individual share', 'per head', 'each person', 'my share'] },
    { icon: 'home',                  keywords: ['accommodation cost', 'hotel budget', 'housing cost', 'rent'] },
    { icon: 'airplane',              keywords: ['flight cost', 'travel budget', 'transport cost', 'airfare'] },
    { icon: 'restaurant',            keywords: ['food budget', 'dining cost', 'meal budget', 'food spend'] },
    { icon: 'beer',                  keywords: ['drinks budget', 'bar spend', 'alcohol budget', 'party drinks'] },
    { icon: 'ticket',                keywords: ['activity budget', 'tickets cost', 'entry fees', 'events spend'] },
    { icon: 'car',                   keywords: ['transport', 'rental car', 'uber', 'taxi cost', 'travel'] },
    { icon: 'boat',                  keywords: ['boat rental', 'cruise cost', 'water activity cost'] },
    { icon: 'body',                  keywords: ['spa budget', 'wellness cost', 'treatment cost'] },
    { icon: 'game-controller',       keywords: ['entertainment budget', 'activity spend', 'gaming cost'] },
    { icon: 'camera',                keywords: ['photography budget', 'photos cost', 'videographer'] },
    { icon: 'musical-notes',         keywords: ['music budget', 'dj cost', 'band cost', 'entertainment fee'] },
    { icon: 'diamond',               keywords: ['luxury budget', 'premium spend', 'exclusive cost', 'high end'] },
    { icon: 'shield',                keywords: ['insurance cost', 'protection fee', 'travel insurance'] },
    { icon: 'medkit',                keywords: ['medical budget', 'emergency fund', 'first aid cost'] },
    { icon: 'phone-portrait',        keywords: ['sim card', 'roaming cost', 'data plan', 'mobile cost'] },
    { icon: 'cloud',                 keywords: ['online payment', 'digital transfer', 'bank transfer'] },
    { icon: 'sync',                  keywords: ['budget update', 'recalculate', 'refresh total', 'revision'] },
    { icon: 'alert-circle',          keywords: ['over budget', 'warning', 'limit reached', 'exceeded'] },
    { icon: 'checkmark-circle',      keywords: ['paid', 'settled', 'cleared', 'done', 'paid off'] },
    { icon: 'close-circle',          keywords: ['cancelled cost', 'refund', 'void', 'not paid'] },
    { icon: 'add-circle',            keywords: ['add expense', 'new cost', 'extra charge', 'additional'] },
    { icon: 'remove-circle',         keywords: ['remove expense', 'delete cost', 'scratch that'] },
    { icon: 'create',                keywords: ['edit budget', 'modify', 'update amount', 'change'] },
    { icon: 'document-text',         keywords: ['budget doc', 'expense list', 'financial plan', 'breakdown doc'] },
    { icon: 'clipboard',             keywords: ['budget checklist', 'payment list', 'expense tracker'] },
    { icon: 'print',                 keywords: ['print invoice', 'receipt', 'paper trail', 'documentation'] },
    { icon: 'share-social',          keywords: ['share costs', 'send payment link', 'share invoice'] },
    { icon: 'mail',                  keywords: ['payment email', 'invoice email', 'cost breakdown email'] },
    { icon: 'link',                  keywords: ['paypal link', 'payment link', 'bank link', 'transfer'] },
    { icon: 'key',                   keywords: ['payment code', 'pin', 'authorization', 'access payment'] },
    { icon: 'lock-closed',           keywords: ['budget locked', 'fixed budget', 'confirmed cost', 'frozen'] },
    { icon: 'settings',              keywords: ['budget settings', 'payment preferences', 'config'] },
    { icon: 'options',               keywords: ['payment options', 'payment methods', 'how to pay'] },
    { icon: 'search',                keywords: ['find expenses', 'search costs', 'look up payment'] },
    { icon: 'bookmark',              keywords: ['save estimate', 'bookmark price', 'saved costs'] },
    { icon: 'information-circle',    keywords: ['cost info', 'payment details', 'about the fee', 'faq'] },
    { icon: 'help-circle',           keywords: ['budget help', 'how to split', 'cost questions', 'confused'] },
    { icon: 'flag',                  keywords: ['budget goal', 'target spend', 'financial goal', 'aim'] },
    { icon: 'bulb',                  keywords: ['budget idea', 'save money tip', 'cost cutting', 'hack'] },
    { icon: 'globe',                 keywords: ['currency', 'exchange rate', 'international payment'] },
    { icon: 'earth',                 keywords: ['foreign currency', 'euro', 'pound', 'exchange'] },
    { icon: 'time',                  keywords: ['payment deadline', 'due date', 'when to pay', 'late fee'] },
    { icon: 'calendar',              keywords: ['payment schedule', 'installment', 'monthly', 'recurring'] },
    { icon: 'notifications',         keywords: ['payment reminder', 'due reminder', 'alert pay'] },
    { icon: 'alarm',                 keywords: ['payment alert', 'deadline', 'overdue', 'urgent pay'] },
    { icon: 'paper-plane',           keywords: ['send payment', 'transfer money', 'wire', 'dispatch'] },
    { icon: 'rocket',                keywords: ['fast payment', 'instant transfer', 'quick pay'] },
    { icon: 'compass',               keywords: ['budget overview', 'financial direction', 'track spending'] },
    { icon: 'layers',                keywords: ['all costs', 'total overview', 'full budget', 'combined'] },
    { icon: 'grid',                  keywords: ['cost grid', 'expense categories', 'breakdown grid'] },
    { icon: 'list',                  keywords: ['expense list', 'cost list', 'all payments', 'itemized'] },
    { icon: 'book',                  keywords: ['ledger', 'accounts', 'financial record', 'book keeping'] },
    { icon: 'storefront',            keywords: ['vendor payment', 'supplier', 'service provider', 'vendor'] },
    { icon: 'school',                keywords: ['budget lesson', 'financial planning', 'advice', 'education'] },
    { icon: 'megaphone',             keywords: ['budget announcement', 'cost update', 'price change', 'new price'] },
    { icon: 'heart',                 keywords: ['voluntary contribution', 'donation', 'tip', 'generosity'] },
    { icon: 'handshake',             keywords: ['payment agreement', 'deal', 'settled', 'agreed'] } as any,
    { icon: 'podium',                keywords: ['biggest spender', 'top contribution', 'most paid'] },
    { icon: 'happy',                 keywords: ['great deal', 'good price', 'bargain', 'satisfied'] },
    { icon: 'thumbs-up',             keywords: ['approved payment', 'payment ok', 'confirmed', 'accepted'] },
    { icon: 'thumbs-down',           keywords: ['declined', 'rejected', 'not approved', 'denied'] },
    { icon: 'sad',                   keywords: ['expensive', 'too costly', 'over budget', 'regret'] },
    { icon: 'leaf',                  keywords: ['eco budget', 'sustainable spend', 'green option'] },
    { icon: 'fitness',               keywords: ['activity costs', 'sports fees', 'gym day pass'] },
    { icon: 'wine',                  keywords: ['drinks tab', 'bar bill', 'alcohol spend', 'wine cost'] },
    { icon: 'bicycle',               keywords: ['transport costs', 'bike rental cost', 'mobility budget'] },
    { icon: 'bus',                   keywords: ['bus ticket', 'group transport cost', 'coach hire'] },
    { icon: 'train',                 keywords: ['train ticket', 'rail cost', 'travel card'] },
    { icon: 'umbrella',              keywords: ['unexpected costs', 'contingency', 'buffer', 'reserve fund'] },
    { icon: 'lock-open',             keywords: ['payment released', 'funds released', 'unlocked budget'] },
    { icon: 'eye',                   keywords: ['view budget', 'see costs', 'check expenses', 'review'] },
    { icon: 'color-palette',         keywords: ['decoration cost', 'design fee', 'creative budget'] },
    { icon: 'pricetags',             keywords: ['multiple prices', 'all pricing', 'pricing overview'] },
    { icon: 'attach',                keywords: ['attach receipt', 'upload proof', 'add document'] },
  ],
};

function pickIconForChannel(channelName: string, _category?: string): string {
  // Always use the shared general pool so the same keyword → same icon across all categories
  const pool = CATEGORY_ICON_POOLS['general'];
  const lower = channelName.toLowerCase();
  for (const option of pool) {
    if (option.keywords.some(kw => lower.includes(kw))) {
      return option.icon;
    }
  }
  // Hash-based fallback: varied but consistent icon per channel name
  const hash = lower.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return pool[hash % pool.length].icon;
}

// Category config — shared between voting tab and poll info modal
const POLL_CATEGORY_CONFIG_CONST: Record<string, { icon: string; color: string; bg: string }> = {
  general:       { icon: 'chatbubbles',     color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' },
  accommodation: { icon: 'bed',             color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' },
  activities:    { icon: 'game-controller', color: '#F97316', bg: 'rgba(249, 115, 22, 0.15)' },
  budget:        { icon: 'cash',            color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' },
};

type CommunicationTab = 'topics' | 'voting';
type ChannelCategory = Database['public']['Enums']['channel_category'];

type ChatChannel = Database['public']['Tables']['chat_channels']['Row'];

type LocalChannel = {
  id: string;
  name: string;
  icon?: string;
};

type LocalChannelSection = {
  id: ChannelCategory;
  title: string;
  channels: LocalChannel[];
};

export default function CommunicationScreen() {
  const router = useRouter();
  // eventIdParam is set when navigating from Event Summary — pre-selects that event
  const { eventId: eventIdParam } = useLocalSearchParams<{ eventId?: string }>();
  const insets = useSafeAreaInsets();
  const user = useUser();
  const [selectedTab, setSelectedTab] = useState<CommunicationTab>('topics');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(eventIdParam || null);
  const [eventSelectorOpen, setEventSelectorOpen] = useState(false);
  const [pollModalVisible, setPollModalVisible] = useState(false);
  const [pollModalCategory, setPollModalCategory] = useState<ChannelCategory>('general');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [participantCount, setParticipantCount] = useState<number>(0);
  const { t } = useTranslation();
  const COMM_TABS = ['topics', 'voting'] as const;
  const { handlers: swipeHandlers, animatedStyle: swipeAnimStyle, switchTab: switchTabAnimated } = useSwipeTabs(COMM_TABS, selectedTab, setSelectedTab);

  // Per-event local channel storage (keyed by eventId or 'none')
  const [localChannelsByEvent, setLocalChannelsByEvent] = useState<Record<string, LocalChannelSection[]>>({});

  // Persist localChannelsByEvent to AsyncStorage so channels survive navigation
  useEffect(() => {
    AsyncStorage.getItem('localChannelsByEvent').then(raw => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Record<string, LocalChannelSection[]>;
          setLocalChannelsByEvent(parsed);
        } catch {}
      }
    });
  }, []);

  useEffect(() => {
    if (Object.keys(localChannelsByEvent).length > 0) {
      AsyncStorage.setItem('localChannelsByEvent', JSON.stringify(localChannelsByEvent)).catch(() => {});
    }
  }, [localChannelsByEvent]);

  // Re-sync local channels from AsyncStorage whenever this screen gains focus
  // (handles channel deletions done in [channelId].tsx)
  useFocusEffect(
    React.useCallback(() => {
      AsyncStorage.getItem('localChannelsByEvent').then(raw => {
        if (raw) {
          try {
            setLocalChannelsByEvent(JSON.parse(raw));
          } catch {}
        }
      });
    }, [])
  );

  // Fetch user's events
  const { data: events, refetch: refetchEvents } = useEvents();

  // Filter booked events
  const bookedEvents = useMemo(() => {
    return (events || []).filter(e => e.status === 'booked' || e.status === 'completed');
  }, [events]);

  // Load participant count from cache when event changes
  useEffect(() => {
    if (!selectedEventId) return;
    loadDesiredParticipants(selectedEventId).then(count => {
      if (count) setParticipantCount(count);
    });
  }, [selectedEventId]);

  // When returning to Chat via tab bar (eventIdParam gone), reset to auto-select
  const prevEventIdParam = useRef(eventIdParam);
  useEffect(() => {
    const wasSet = !!prevEventIdParam.current;
    const isNowClear = !eventIdParam;
    prevEventIdParam.current = eventIdParam;
    if (wasSet && isNowClear) {
      setSelectedEventId(null);
      hasAutoSelected.current = false;
    }
  }, [eventIdParam]);

  // Left-edge swipe to go back when opened from Event Summary
  const swipeBackResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        gs.dx > 20 && Math.abs(gs.dy) < 60 && gs.moveX < 40,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > 40) router.back();
      },
    })
  ).current;

  // Auto-select nearest upcoming booked event on first load (skip if opened from Event Summary)
  const hasAutoSelected = useRef(false);
  useEffect(() => {
    if (hasAutoSelected.current || bookedEvents.length === 0 || eventIdParam) return;
    hasAutoSelected.current = true;

    const now = Date.now();
    const sorted = [...bookedEvents].sort((a, b) => {
      const aDate = a.start_date ? new Date(a.start_date).getTime() : Infinity;
      const bDate = b.start_date ? new Date(b.start_date).getTime() : Infinity;
      // Prefer future events, then closest
      const aFuture = aDate >= now ? 0 : 1;
      const bFuture = bDate >= now ? 0 : 1;
      if (aFuture !== bFuture) return aFuture - bFuture;
      return aDate - bDate;
    });
    setSelectedEventId(sorted[0].id);
  }, [bookedEvents]);

  // Fetch channels for selected event (only if event exists)
  const { data: dbChannels = [], refetch: refetchChannels } = useChannels(selectedEventId || undefined);

  // Create channel mutation
  const createChannelMutation = useCreateChannel();

  // Poll hooks
  const { data: polls = [] } = usePolls(selectedEventId ?? undefined);
  const createPollMutation = useCreatePoll();
  const voteMutation = useVote();
  const deletePollMutation = useDeletePoll();
  const [pollInfoModal, setPollInfoModal] = useState<import('@/repositories/polls').PollWithOptions | null>(null);
  const optionInputRefs = useRef<Array<import('react-native').TextInput | null>>([]);

  // Derived local sections for current event (per-event map)
  const DEFAULT_LOCAL_SECTIONS: LocalChannelSection[] = [
    { id: 'general', title: 'GENERAL', channels: [] },
    { id: 'accommodation', title: 'ACCOMMODATION', channels: [] },
    { id: 'activities', title: 'ACTIVITIES', channels: [] },
    { id: 'budget', title: 'BUDGET', channels: [] },
  ];
  const localSections = localChannelsByEvent[selectedEventId ?? 'none'] ?? DEFAULT_LOCAL_SECTIONS;

  const setLocalSectionsForEvent = (updater: (prev: LocalChannelSection[]) => LocalChannelSection[]) => {
    const key = selectedEventId ?? 'none';
    setLocalChannelsByEvent(prev => ({
      ...prev,
      [key]: updater(prev[key] ?? DEFAULT_LOCAL_SECTIONS),
    }));
  };

  // Group channels by category (use DB channels if event exists, otherwise local)
  const groupedChannels = useMemo(() => {
    const groups: Record<ChannelCategory, Array<ChatChannel | LocalChannel>> = {
      general: [],
      accommodation: [],
      activities: [],
      budget: [],
    };

    if (selectedEventId && dbChannels.length > 0) {
      // Use database channels if event is selected
      dbChannels.forEach(channel => {
        if (groups[channel.category]) {
          groups[channel.category].push(channel);
        }
      });
    } else {
      // Use local channels otherwise
      localSections.forEach(section => {
        groups[section.id] = section.channels;
      });
    }

    return groups;
  }, [selectedEventId, dbChannels, localSections]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchEvents(), refetchChannels()]);
    setIsRefreshing(false);
  };

  const handleNotifications = () => {
    router.push('/notifications');
  };

  const handleInvite = () => {
    // Navigate to dedicated Share screen if a real event is selected
    if (selectedEventId) {
      router.push(`/event/${selectedEventId}/share`);
    } else {
      Alert.alert('Kein Event ausgewählt', 'Wähle zuerst ein Event aus, um es zu teilen.');
    }
  };

  const handleDeletePoll = (poll: import('@/repositories/polls').PollWithOptions) => {
    Alert.alert(
      'Delete Poll',
      `Delete "${poll.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setPollInfoModal(null);
            try {
              await deletePollMutation.mutateAsync(poll.id);
            } catch {
              Alert.alert('Error', 'Could not delete poll.');
            }
          },
        },
      ]
    );
  };

  const handleAddChannel = (category: ChannelCategory) => {
    const tr = getTranslation();
    const categoryTitles: Record<ChannelCategory, string> = {
      general: tr.chat.general,
      accommodation: tr.chat.accommodation,
      activities: tr.chat.activities,
      budget: tr.chat.budgetCategory,
    };

    Alert.prompt(
      tr.chat.newChannelTitle.replace('{{category}}', categoryTitles[category]),
      tr.chat.newChannelMessage,
      [
        {
          text: tr.common.cancel,
          style: 'cancel',
        },
        {
          text: tr.chat.create,
          onPress: async (channelName?: string) => {
            if (channelName && channelName.trim()) {
              if (selectedEventId) {
                // Save to database if event exists
                try {
                  await createChannelMutation.mutateAsync({
                    event_id: selectedEventId,
                    name: channelName.trim(),
                    category,
                  });
                  Alert.alert(tr.budget.success, tr.chat.channelCreated);
                } catch (error: any) {
                  // RLS policy violation (42501) — fall back to local-only channel
                  const code = error?.code || error?.message || '';
                  if (code === '42501' || String(code).includes('42501')) {
                    setLocalSectionsForEvent(prevSections =>
                      prevSections.map(section =>
                        section.id === category
                          ? {
                              ...section,
                              channels: [
                                ...section.channels,
                                { id: Date.now().toString(), name: channelName.trim(), icon: pickIconForChannel(channelName.trim(), category) }
                              ]
                            }
                          : section
                      )
                    );
                    Alert.alert(tr.budget.success, tr.chat.channelCreated);
                  } else {
                    console.error('Failed to create channel:', error);
                    Alert.alert(tr.common.error, tr.chat.channelCreateFailed);
                  }
                }
              } else {
                // Save locally if no event
                setLocalSectionsForEvent(prevSections =>
                  prevSections.map(section =>
                    section.id === category
                      ? {
                          ...section,
                          channels: [
                            ...section.channels,
                            { id: Date.now().toString(), name: channelName.trim(), icon: pickIconForChannel(channelName.trim(), category) }
                          ]
                        }
                      : section
                  )
                );
              }
            }
          },
        },
      ],
      'plain-text',
      '',
      'default'
    );
  };

  const handleCreateNewTopic = () => {
    const tr = getTranslation();
    Alert.prompt(
      tr.chat.newTopicLabel,
      tr.chat.newTopicMessage,
      [
        {
          text: tr.common.cancel,
          style: 'cancel',
        },
        {
          text: tr.chat.create,
          onPress: async (topicName?: string) => {
            if (topicName && topicName.trim()) {
              if (selectedEventId) {
                // Save to database if event exists
                try {
                  await createChannelMutation.mutateAsync({
                    event_id: selectedEventId,
                    name: topicName.trim(),
                    category: 'general',
                  });
                  Alert.alert(tr.budget.success, tr.chat.topicCreated);
                } catch (error: any) {
                  // RLS policy violation (42501) — fall back to local-only channel
                  const code = error?.code || error?.message || '';
                  if (code === '42501' || String(code).includes('42501')) {
                    setLocalSectionsForEvent(prevSections =>
                      prevSections.map(section =>
                        section.id === 'general'
                          ? {
                              ...section,
                              channels: [
                                ...section.channels,
                                { id: Date.now().toString(), name: topicName.trim(), icon: pickIconForChannel(topicName.trim(), 'general') }
                              ]
                            }
                          : section
                      )
                    );
                    Alert.alert(tr.budget.success, tr.chat.topicCreated);
                  } else {
                    console.error('Failed to create topic:', error);
                    Alert.alert(tr.common.error, tr.chat.topicCreateFailed);
                  }
                }
              } else {
                // Save locally if no event
                setLocalSectionsForEvent(prevSections =>
                  prevSections.map(section =>
                    section.id === 'general'
                      ? {
                          ...section,
                          channels: [
                            ...section.channels,
                            { id: Date.now().toString(), name: topicName.trim(), icon: pickIconForChannel(topicName.trim(), 'general') }
                          ]
                        }
                      : section
                  )
                );
              }
            }
          },
        },
      ],
      'plain-text',
      '',
      'default'
    );
  };

  const handleCreatePoll = (category: ChannelCategory) => {
    setPollModalCategory(category);
    setPollQuestion('');
    setPollOptions(['', '']);
    setPollModalVisible(true);
  };

  const handleSubmitPoll = async () => {
    if (!pollQuestion.trim() || !selectedEventId) return;
    const validOptions = pollOptions.filter(o => o.trim());
    if (validOptions.length < 2) return;
    try {
      await createPollMutation.mutateAsync({
        poll: {
          event_id: selectedEventId,
          title: pollQuestion.trim(),
          category: pollModalCategory,
          status: 'active',
        },
        options: validOptions,
      });
      setPollModalVisible(false);
    } catch (err) {
      console.error('Failed to create poll:', err);
    }
  };

  const renderVotingTab = () => {
    if (bookedEvents.length === 0) {
      return (
        <View style={styles.lockedBanner}>
          <Ionicons name="lock-closed-outline" size={18} color={DARK_THEME.textSecondary} />
          <Text style={styles.lockedBannerText}>{t.chat.bookToUnlock}</Text>
        </View>
      );
    }

    // Category config — same as POLL_CATEGORY_CONFIG defined at component scope
    const POLL_CATEGORY_CONFIG = POLL_CATEGORY_CONFIG_CONST;

    const VOTING_CATEGORIES = [
      { id: 'general' as const,       label: 'GENERAL',       icon: 'chatbubbles',     color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)' },
      { id: 'accommodation' as const, label: 'ACCOMMODATION',  icon: 'bed',             color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
      { id: 'activities' as const,    label: 'ACTIVITIES',     icon: 'game-controller', color: '#F97316', bg: 'rgba(249,115,22,0.15)' },
      { id: 'budget' as const,        label: 'BUDGET',         icon: 'cash',            color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
    ];

    // Denominator: total participants minus the honoree (bachelor/bachelorette)
    // Falls back to totalVotes if no participant count cached
    const getVoteDenominator = (totalVotes: number) => {
      if (participantCount > 1) return participantCount - 1;
      return Math.max(totalVotes, 1);
    };

    const handleVote = async (pollId: string, optionId: string) => {
      try {
        await voteMutation.mutateAsync({ pollId, optionId });
      } catch {}
    };


    return (
      <>
        {VOTING_CATEGORIES.map(catDef => {
          const cfg = POLL_CATEGORY_CONFIG[catDef.id];
          const catPolls = polls.filter(p => p.category === catDef.id);
          return (
            <View key={catDef.id + catDef.label} style={styles.channelSection}>
              <XStack justifyContent="space-between" alignItems="center" marginBottom={12}>
                <Text style={styles.sectionTitle}>{catDef.label}</Text>
                <Pressable
                  onPress={() => handleCreatePoll(catDef.id)}
                  style={styles.newPollButton}
                  hitSlop={8}
                >
                  <Text style={styles.newPollButtonText}>New Poll</Text>
                  <Ionicons name="add-circle" size={18} color={cfg.color} />
                </Pressable>
              </XStack>
              {catPolls.length === 0 ? (
                <View style={styles.emptyChannelBox}>
                  <Text style={styles.emptyChannelText}>No polls yet</Text>
                </View>
              ) : (
                <YStack gap={12}>
                  {catPolls.map(poll => {
                    const totalVotes = poll.options?.reduce((sum, o) => sum + (o.vote_count ?? 0), 0) ?? 0;
                    const userVoted = !!poll.user_vote;
                    const denominator = getVoteDenominator(totalVotes);
                    // Status badge uses category color for ACTIVE, grey for closed
                    const statusColor = poll.status === 'active' ? cfg.color : poll.status === 'closing_soon' ? '#F97316' : '#9CA3AF';
                    const statusBg   = poll.status === 'active' ? cfg.bg : poll.status === 'closing_soon' ? 'rgba(249,115,22,0.15)' : 'rgba(156,163,175,0.15)';
                    // Sort options: most votes first, then original order
                    const sortedOptions = [...(poll.options ?? [])].sort(
                      (a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0)
                    );
                    return (
                      <View key={poll.id} style={styles.pollCard}>
                        <XStack alignItems="flex-start" gap={10} marginBottom={12}>
                          <View style={[styles.pollCategoryIcon, { backgroundColor: cfg.bg }]}>
                            <Ionicons name={pickIconForChannel(poll.title) as any} size={18} color={cfg.color} />
                          </View>
                          <YStack style={{ flex: 1 }} gap={2}>
                            <Text style={styles.pollTitle}>{poll.title}</Text>
                          </YStack>
                          <View style={[styles.pollStatusBadge, { backgroundColor: statusBg }]}>
                            <Text style={[styles.pollStatusText, { color: statusColor }]}>
                              {poll.status === 'closing_soon' ? 'CLOSING SOON' : (poll.status ?? 'ACTIVE').toUpperCase()}
                            </Text>
                          </View>
                          <Pressable onPress={() => setPollInfoModal(poll)} hitSlop={8}>
                            <Ionicons name="information-circle-outline" size={20} color={DARK_THEME.textTertiary} />
                          </Pressable>
                        </XStack>
                        <YStack gap={8} marginBottom={12}>
                          {sortedOptions.map(opt => {
                            // Percentage based on total eligible voters (participants - 1)
                            const pct = Math.round(((opt.vote_count ?? 0) / denominator) * 100);
                            const isSelected = poll.user_vote === opt.id;
                            return (
                              <Pressable
                                key={opt.id}
                                style={[styles.pollOption, isSelected && { ...styles.pollOptionSelected, borderColor: cfg.color }]}
                                onPress={() => handleVote(poll.id, opt.id)}
                              >
                                <View style={[styles.pollRadio, isSelected && { borderColor: cfg.color }]}>
                                  {isSelected && <View style={[styles.pollRadioDot, { backgroundColor: cfg.color }]} />}
                                </View>
                                <Text style={[styles.pollOptionText, isSelected && { color: cfg.color }, { flex: 1 }]}>
                                  {opt.label}
                                </Text>
                                <Text style={[styles.pollPct, isSelected && { color: cfg.color }]}>{pct}%</Text>
                              </Pressable>
                            );
                          })}
                        </YStack>
                        <XStack justifyContent="space-between" alignItems="center">
                          <Text style={styles.pollFooter}>
                            {totalVotes} of {denominator} voted{poll.ends_at ? ` \u00b7 Ends ${new Date(poll.ends_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}` : ''}
                          </Text>
                          {!userVoted && (
                            <Text style={[styles.pollFooter, { color: '#5A7EB0' }]}>Tap option to vote</Text>
                          )}
                        </XStack>
                      </View>
                    );
                  })}
                </YStack>
              )}
            </View>
          );
        })}
        <Pressable
          style={styles.newTopicButton}
          onPress={() => handleCreatePoll('general')}
        >
          <Ionicons name="add-circle-outline" size={24} color="#5A7EB0" />
          <Text style={styles.newTopicText}>Create New Poll</Text>
        </Pressable>
      </>
    );
  };

  const renderTabs = () => (
    <View style={styles.filterContainer}>
      <View style={styles.filterPill}>
        {(['topics', 'voting'] as CommunicationTab[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => switchTabAnimated(tab)}
            style={[
              styles.filterTab,
              selectedTab === tab && styles.filterTabActive,
            ]}
            testID={`tab-${tab}`}
          >
            <Text
              style={[
                styles.filterTabText,
                selectedTab === tab && styles.filterTabTextActive,
              ]}
            >
              {tab === 'topics' ? t.chat.tabChat : t.chat.tabVoting}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  // Selected event display name
  const selectedEvent = bookedEvents.find(e => e.id === selectedEventId);
  const selectedEventName = selectedEvent
    ? (selectedEvent.title || (selectedEvent.honoree_name ? `${selectedEvent.honoree_name}'s Event` : 'Event'))
    : ((t as any).chatSelector?.selectEvent || 'Select Event');

  const renderEventSelector = () => {
    if (bookedEvents.length === 0) return null;

    // Get city image for selected event
    const selectedCitySlug = selectedEvent?.city?.name?.toLowerCase() || 'berlin';
    const selectedCityImage = getEventImage(selectedCitySlug, selectedEvent?.hero_image_url);

    return (
      <View style={styles.eventSelectorWrapper}>
        <Pressable
          style={styles.eventSelectorCard}
          onPress={() => !eventIdParam && bookedEvents.length > 1 && setEventSelectorOpen(!eventSelectorOpen)}
          testID="event-selector"
        >
          {/* City thumbnail */}
          <Image
            source={resolveImageSource(selectedEvent?.hero_image_url || selectedCityImage)}
            style={styles.eventSelectorImage}
            resizeMode="cover"
          />
          <YStack flex={1} gap={2}>
            <Text style={styles.eventSelectorLabel}>
              {t.chat.currentEvent}
            </Text>
            <Text style={styles.eventSelectorName} numberOfLines={1}>
              {selectedEventName}
            </Text>
            {selectedEvent?.start_date && (
              <Text style={styles.eventSelectorDate}>
                {new Date(selectedEvent.start_date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' \u2022 '}
                {selectedEvent.city?.name || ''}
              </Text>
            )}
          </YStack>
          {!eventIdParam && bookedEvents.length > 1 && (
            <View style={styles.eventSelectorChevron}>
              <Ionicons
                name={eventSelectorOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={DARK_THEME.textPrimary}
              />
            </View>
          )}
        </Pressable>

        {/* Dropdown — hidden when locked to single event from Event Summary */}
        {!eventIdParam && eventSelectorOpen && (
          <View style={styles.eventDropdown}>
            {[...bookedEvents]
              .sort((a, b) => {
                // Selected event always first
                if (a.id === selectedEventId) return -1;
                if (b.id === selectedEventId) return 1;
                // Then sort by date (nearest future first)
                const aDate = a.start_date ? new Date(a.start_date).getTime() : Infinity;
                const bDate = b.start_date ? new Date(b.start_date).getTime() : Infinity;
                return aDate - bDate;
              })
              .map(ev => {
              const isSelected = ev.id === selectedEventId;
              const evName = ev.title || (ev.honoree_name ? `${ev.honoree_name}'s Event` : 'Event');
              const evCitySlug = ev.city?.name?.toLowerCase() || 'berlin';
              const evCityImage = getEventImage(evCitySlug, ev.hero_image_url);
              return (
                <Pressable
                  key={ev.id}
                  style={[styles.eventDropdownItem, isSelected && styles.eventDropdownItemActive]}
                  onPress={() => {
                    setSelectedEventId(ev.id);
                    setEventSelectorOpen(false);
                  }}
                >
                  <Image
                    source={resolveImageSource(ev.hero_image_url || evCityImage)}
                    style={styles.eventDropdownImage}
                    resizeMode="cover"
                  />
                  <YStack flex={1} gap={1}>
                    <Text style={[
                      styles.eventDropdownText,
                      isSelected && styles.eventDropdownTextActive,
                    ]} numberOfLines={1}>
                      {evName}
                    </Text>
                    <Text style={styles.eventDropdownDate}>
                      {ev.city?.name || ''}
                      {ev.start_date ? ` \u2022 ${new Date(ev.start_date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}` : ''}
                    </Text>
                  </YStack>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color="#5A7EB0" />
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const renderShareEventCard = () => (
    <Pressable style={styles.shareEventCard} onPress={handleInvite}>
      <XStack alignItems="center" gap={10}>
        <View style={styles.shareEventIcon}>
          <Ionicons name="share-social-outline" size={18} color="#5A7EB0" />
        </View>
        <Text style={styles.shareEventTitle} numberOfLines={1} flex={1}>
          {t.chat.shareInvite} — {t.chat.inviteFriendsToJoin}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={DARK_THEME.textTertiary} />
      </XStack>
    </Pressable>
  );

  const CHANNEL_CATEGORY_CONFIG: Record<ChannelCategory, { icon: string; color: string; bg: string }> = {
    general:       { icon: 'chatbubbles',     color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' },
    accommodation: { icon: 'bed',             color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' },
    activities:    { icon: 'game-controller', color: '#F97316', bg: 'rgba(249, 115, 22, 0.15)' },
    budget:        { icon: 'cash',            color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' },
  };

  const renderChannelSection = (category: ChannelCategory, title: string) => {
    const categoryChannels = groupedChannels[category];
    const catCfg = CHANNEL_CATEGORY_CONFIG[category];

    return (
      <View key={category} style={styles.channelSection}>
        <XStack justifyContent="space-between" alignItems="center" marginBottom={12}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Pressable
            onPress={() => handleAddChannel(category)}
            style={styles.addButton}
            hitSlop={8}
          >
            <Ionicons name="add" size={20} color="#5A7EB0" />
          </Pressable>
        </XStack>
        {categoryChannels.length > 0 ? (
          <YStack gap={8}>
            {categoryChannels.map((channel) => {
              const iconName = (channel as any).icon ?? pickIconForChannel(channel.name, category);
              return (
                <Pressable
                  key={channel.id}
                  style={styles.channelItem}
                  onPress={() => {
                    router.push(`/(tabs)/chat/${channel.id}?name=${encodeURIComponent(channel.name)}&category=${category}&icon=${encodeURIComponent(iconName)}`);
                  }}
                >
                  <View style={[styles.channelIconWrap, { backgroundColor: catCfg.bg }]}>
                    <Ionicons name={iconName as any} size={16} color={catCfg.color} />
                  </View>
                  <Text style={styles.channelName}>{channel.name}</Text>
                </Pressable>
              );
            })}
          </YStack>
        ) : (
          <View style={styles.emptyChannelBox}>
            <Text style={styles.emptyChannelText}>{t.chat.noChannels}</Text>
          </View>
        )}
      </View>
    );
  };

  // Get user avatar or initials
  const userAvatar = user?.user_metadata?.avatar_url;
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <View style={styles.container} {...(eventIdParam ? swipeBackResponder.panHandlers : {})}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background */}
      <LinearGradient
        colors={[DARK_THEME.deepNavy, DARK_THEME.background]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <XStack alignItems="center" justifyContent="space-between" paddingHorizontal={20}>
          {/* Back button (when opened from Event Summary) or Avatar */}
          <XStack alignItems="center" gap={12}>
            {eventIdParam ? (
              <Pressable
                onPress={() => router.back()}
                hitSlop={8}
                style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="arrow-back" size={24} color={DARK_THEME.textPrimary} />
              </Pressable>
            ) : (
              <View style={styles.avatarContainer}>
                {userAvatar ? (
                  <Image
                    source={{ uri: userAvatar }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarInitial}>{userInitial}</Text>
                  </View>
                )}
              </View>
            )}
            <Text style={styles.headerTitle}>{t.chat.headerTitle}</Text>
          </XStack>

          {/* Notification Bell */}
          <Pressable
            onPress={handleNotifications}
            style={styles.notificationButton}
            testID="notifications-button"
          >
            <Ionicons name="notifications-outline" size={24} color={DARK_THEME.textPrimary} />
          </Pressable>
        </XStack>

        {/* Tabs */}
        {renderTabs()}
      </View>

      {/* Event Selector */}
      {renderEventSelector()}

      {/* Content — swipe left/right to switch tabs */}
      <Animated.View style={[{ flex: 1 }, swipeAnimStyle]} {...swipeHandlers}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 180 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={DARK_THEME.primary}
            colors={[DARK_THEME.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Share Event Card */}
        {renderShareEventCard()}

        {selectedTab === 'topics' ? (
          /* Topics tab */
          bookedEvents.length === 0 ? (
            /* No event booked - show grayed out channels with overlay message */
            <>
            <View style={styles.lockedBanner}>
              <Ionicons name="lock-closed-outline" size={18} color={DARK_THEME.textSecondary} />
              <Text style={styles.lockedBannerText}>
                {t.chat.bookToUnlock}
              </Text>
            </View>
            <View style={{ opacity: 0.35, pointerEvents: 'none' as const }}>
              {renderChannelSection('general', t.chat.general.toUpperCase())}
              {renderChannelSection('accommodation', t.chat.accommodation.toUpperCase())}
              {renderChannelSection('activities', t.chat.activities.toUpperCase())}
              {renderChannelSection('budget', t.chat.budgetCategory.toUpperCase())}

              <View style={styles.channelSection}>
                <Text style={styles.sectionTitle}>{t.chat.newTopics}</Text>
                <Pressable style={styles.newTopicButton} onPress={handleCreateNewTopic}>
                  <Ionicons name="add-circle-outline" size={24} color="#5A7EB0" />
                  <Text style={styles.newTopicText}>{t.chat.createNewTopic}</Text>
                </Pressable>
              </View>
            </View>
            </>
          ) : (
            /* Event booked - show active channels */
            <>
              {renderChannelSection('general', t.chat.general.toUpperCase())}
              {renderChannelSection('accommodation', t.chat.accommodation.toUpperCase())}
              {renderChannelSection('activities', t.chat.activities.toUpperCase())}
              {renderChannelSection('budget', t.chat.budgetCategory.toUpperCase())}

              <View style={styles.channelSection}>
                <Text style={styles.sectionTitle}>{t.chat.newTopics}</Text>
                <Pressable style={styles.newTopicButton} onPress={handleCreateNewTopic}>
                  <Ionicons name="add-circle-outline" size={24} color="#5A7EB0" />
                  <Text style={styles.newTopicText}>{t.chat.createNewTopic}</Text>
                </Pressable>
              </View>
            </>
          )
        ) : (
          /* Voting tab */
          renderVotingTab()
        )}
      </ScrollView>
      </Animated.View>

      {/* Poll Creation Modal */}
      <Modal
        visible={pollModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPollModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <ScrollView
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalSheet}>
                <Text style={styles.modalTitle}>New Poll</Text>
                <Text style={styles.modalLabel}>Question</Text>
                <TextInput
                  style={styles.modalInput}
                  value={pollQuestion}
                  onChangeText={setPollQuestion}
                  placeholder="What should we decide?"
                  placeholderTextColor={DARK_THEME.textTertiary}
                  multiline={false}
                />
                <Text style={styles.modalLabel}>Options</Text>
                {pollOptions.map((opt, i) => (
                  <TextInput
                    key={i}
                    ref={el => { optionInputRefs.current[i] = el; }}
                    style={styles.modalInput}
                    value={opt}
                    onChangeText={val => {
                      const updated = [...pollOptions];
                      updated[i] = val;
                      setPollOptions(updated);
                    }}
                    placeholder={`Option ${i + 1}`}
                    placeholderTextColor={DARK_THEME.textTertiary}
                  />
                ))}
                {pollOptions.length < 5 && (
                  <Pressable
                    onPress={() => {
                      const newIndex = pollOptions.length;
                      setPollOptions(prev => [...prev, '']);
                      setTimeout(() => optionInputRefs.current[newIndex]?.focus(), 50);
                    }}
                    style={styles.addOptionButton}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#5A7EB0" />
                    <Text style={styles.addOptionText}>Add Option</Text>
                  </Pressable>
                )}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                  <Pressable style={[styles.modalButton, styles.modalButtonCancel]} onPress={() => setPollModalVisible(false)}>
                    <Text style={styles.modalButtonCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[styles.modalButton, styles.modalButtonCreate]} onPress={handleSubmitPoll}>
                    <Text style={styles.modalButtonCreateText}>Create Poll</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Poll Info Modal — bottom sheet */}
      <Modal
        visible={!!pollInfoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setPollInfoModal(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPollInfoModal(null)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <XStack justifyContent="space-between" alignItems="center" marginBottom={16}>
              <Text style={styles.modalTitle}>Poll Info</Text>
              <Pressable onPress={() => setPollInfoModal(null)} hitSlop={8}>
                <Ionicons name="close" size={22} color={DARK_THEME.textTertiary} />
              </Pressable>
            </XStack>
            {pollInfoModal && (() => {
              const catCfg = POLL_CATEGORY_CONFIG_CONST[pollInfoModal.category ?? 'general'] ?? POLL_CATEGORY_CONFIG_CONST.general;
              const pollIcon = pickIconForChannel(pollInfoModal.title);
              return (
                <>
                  {/* 1. Category — text only */}
                  <XStack gap={10} alignItems="center" marginBottom={10}>
                    <Text style={{ color: catCfg.color, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 }}>{pollInfoModal.category?.toUpperCase() ?? 'GENERAL'}</Text>
                  </XStack>
                  {/* 2. Poll title — uses same icon as the poll card */}
                  <XStack gap={10} alignItems="center" marginBottom={10}>
                    <Ionicons name={pollIcon as any} size={18} color={catCfg.color} />
                    <Text numberOfLines={2} style={{ flex: 1, color: DARK_THEME.textPrimary, fontSize: 15, fontWeight: '600' }}>{pollInfoModal.title}</Text>
                  </XStack>
                  {/* 3. Creator */}
                  <XStack gap={10} alignItems="center" marginBottom={10}>
                    <Ionicons name="person-outline" size={18} color={DARK_THEME.textSecondary} />
                    <Text style={{ color: DARK_THEME.textSecondary, fontSize: 14 }}>
                      {pollInfoModal.created_by === user?.id
                        ? (user?.user_metadata?.full_name ?? 'You')
                        : 'Another member'}
                    </Text>
                  </XStack>
                  {/* 4. Date */}
                  <XStack gap={10} alignItems="center" marginBottom={10}>
                    <Ionicons name="calendar-outline" size={18} color={DARK_THEME.textSecondary} />
                    <Text style={{ color: DARK_THEME.textSecondary, fontSize: 14 }}>
                      {pollInfoModal.created_at
                        ? new Date(pollInfoModal.created_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </Text>
                  </XStack>
                  {/* 5. Vote status */}
                  <XStack gap={10} alignItems="center" marginBottom={20}>
                    <Ionicons name="stats-chart-outline" size={18} color={DARK_THEME.textSecondary} />
                    <Text style={{ color: DARK_THEME.textSecondary, fontSize: 14 }}>
                      {pollInfoModal.total_votes} vote{pollInfoModal.total_votes !== 1 ? 's' : ''} · <Text style={{ color: catCfg.color, fontWeight: '600' }}>{(pollInfoModal.status ?? 'active').toUpperCase()}</Text>
                    </Text>
                  </XStack>
                  {pollInfoModal.created_by === user?.id && (
                    <Pressable
                      style={[styles.modalButton, { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)', borderWidth: 1, flex: 0, alignSelf: 'stretch' }]}
                      onPress={() => handleDeletePoll(pollInfoModal)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 14, marginLeft: 6 }}>Delete Poll</Text>
                    </Pressable>
                  )}
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_THEME.background,
  },
  header: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: DARK_THEME.glassBorder,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: DARK_THEME.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: DARK_THEME.textPrimary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: DARK_THEME.background,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: DARK_THEME.textPrimary,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DARK_THEME.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  filterPill: {
    flexDirection: 'row',
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 25,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#5A7EB0',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: DARK_THEME.textSecondary,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
  },
  shareEventCard: {
    backgroundColor: 'rgba(45, 55, 72, 0.5)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  shareEventIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(90, 126, 176, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareEventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: DARK_THEME.textPrimary,
  },
  channelSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: DARK_THEME.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(90, 126, 176, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChannelBox: {
    backgroundColor: 'rgba(45, 55, 72, 0.3)',
    borderRadius: 10,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChannelText: {
    fontSize: 13,
    color: DARK_THEME.textTertiary,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
  },
  channelName: {
    fontSize: 14,
    fontWeight: '500',
    color: DARK_THEME.textPrimary,
    flex: 1,
  },
  newTopicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
  },
  newTopicText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5A7EB0',
  },
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45, 55, 72, 0.5)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  lockedBannerText: {
    fontSize: 14,
    fontWeight: '500',
    color: DARK_THEME.textSecondary,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(45, 55, 72, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  // Event Selector — Prominent blue card with city image
  eventSelectorWrapper: {
    paddingHorizontal: 20,
    paddingTop: 12,
    zIndex: 10,
  },
  eventSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#5A7EB0',
    borderRadius: 16,
    padding: 14,
  },
  eventSelectorImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  eventSelectorLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  eventSelectorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  eventSelectorDate: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  eventSelectorChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDropdown: {
    marginTop: 6,
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
    overflow: 'hidden',
  },
  eventDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: DARK_THEME.glassBorder,
  },
  eventDropdownItemActive: {
    backgroundColor: 'rgba(90, 126, 176, 0.12)',
  },
  eventDropdownImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  eventDropdownText: {
    fontSize: 14,
    fontWeight: '500',
    color: DARK_THEME.textSecondary,
  },
  eventDropdownTextActive: {
    color: '#5A7EB0',
    fontWeight: '700',
  },
  eventDropdownDate: {
    fontSize: 11,
    color: DARK_THEME.textTertiary,
  },
  channelIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newPollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  newPollButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5A7EB0',
  },
  pollCard: {
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
  },
  pollCategoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pollTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: DARK_THEME.textPrimary,
  },
  pollStatusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pollStatusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  pollOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  pollOptionSelected: {
    backgroundColor: 'rgba(90, 126, 176, 0.15)',
    borderColor: '#5A7EB0',
  },
  pollRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: DARK_THEME.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pollRadioSelected: {
    borderColor: '#5A7EB0',
  },
  pollRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#5A7EB0',
  },
  pollOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: DARK_THEME.textSecondary,
  },
  pollPct: {
    fontSize: 13,
    fontWeight: '700',
    color: DARK_THEME.textTertiary,
  },
  pollFooter: {
    fontSize: 11,
    color: DARK_THEME.textTertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#1E2329',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DARK_THEME.textPrimary,
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: DARK_THEME.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 12,
  },
  modalInput: {
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: DARK_THEME.textPrimary,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
    marginBottom: 8,
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  addOptionText: {
    fontSize: 14,
    color: '#5A7EB0',
    fontWeight: '500',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: DARK_THEME.surfaceCard,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
  },
  modalButtonCreate: {
    backgroundColor: '#5A7EB0',
  },
  modalButtonCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: DARK_THEME.textSecondary,
  },
  modalButtonCreateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
