/**
 * Destination Guide Screen (Phase 5)
 * Local tips and recommendations for the event destination
 */

import React from 'react';
import { ScrollView, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner, Image } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvent } from '@/hooks/queries/useEvents';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Chip, ChipGroup } from '@/components/ui/Chip';

// Mock destination data - in production, this would come from the API
const DESTINATION_DATA = {
  'las-vegas': {
    name: 'Las Vegas',
    tagline: 'The Entertainment Capital of the World',
    image: 'https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?w=800',
    highlights: [
      'World-class nightlife & clubs',
      'Casino gaming',
      'Pool parties',
      'Shows & entertainment',
      'Fine dining',
    ],
    neighborhoods: [
      { name: 'The Strip', description: 'Main boulevard with casinos & hotels' },
      { name: 'Fremont Street', description: 'Downtown Vegas with vintage vibes' },
      { name: 'Arts District', description: 'Hip bars and local scene' },
    ],
    tips: [
      'Book club tables in advance for groups',
      'Pool parties are best May-September',
      'Use the monorail to avoid traffic',
      'Stay hydrated in the desert heat',
    ],
    emergencyNumbers: {
      police: '911',
      taxi: '702-873-8012',
      hospital: 'Sunrise Hospital - 702-731-8000',
    },
  },
  'miami': {
    name: 'Miami',
    tagline: 'Where the Party Never Stops',
    image: 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=800',
    highlights: [
      'Beach clubs & pools',
      'South Beach nightlife',
      'Cuban cuisine',
      'Art Deco architecture',
      'Water sports',
    ],
    neighborhoods: [
      { name: 'South Beach', description: 'Iconic beach strip with nightlife' },
      { name: 'Wynwood', description: 'Art galleries and trendy bars' },
      { name: 'Brickell', description: 'Upscale dining and rooftops' },
    ],
    tips: [
      'Best beach weather December-April',
      'Reserve beach cabanas early',
      'Bring sunscreen everywhere',
      'Uber/Lyft is easier than parking',
    ],
    emergencyNumbers: {
      police: '911',
      taxi: '305-888-8888',
      hospital: 'Mount Sinai - 305-674-2121',
    },
  },
};

type DestinationKey = keyof typeof DESTINATION_DATA;

export default function DestinationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: event, isLoading } = useEvent(id);

  if (isLoading || !event) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="$primary" />
      </YStack>
    );
  }

  // Get destination data based on city name
  const citySlug = event.city?.name?.toLowerCase().replace(/\s+/g, '-') as DestinationKey;
  const destination = DESTINATION_DATA[citySlug] || {
    name: event.city?.name || 'Unknown',
    tagline: 'Explore your destination',
    image: 'https://images.unsplash.com/photo-1496568816309-51d7c20e3b21?w=800',
    highlights: ['Local attractions', 'Dining options', 'Entertainment venues'],
    neighborhoods: [],
    tips: ['Check local weather', 'Research transportation options'],
    emergencyNumbers: { police: '911', taxi: 'Local taxi service', hospital: 'Local hospital' },
  };

  const openMaps = () => {
    const query = encodeURIComponent(destination.name);
    Linking.openURL(`https://maps.google.com/?q=${query}`);
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Hero Header */}
      <YStack position="relative">
        <Image
          source={{ uri: destination.image }}
          width="100%"
          height={250}
        />
        <YStack
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          backgroundColor="rgba(0,0,0,0.4)"
        />
        <XStack
          position="absolute"
          top={insets.top + 8}
          left={16}
        >
          <XStack
            width={40}
            height={40}
            borderRadius="$full"
            backgroundColor="rgba(255,255,255,0.9)"
            alignItems="center"
            justifyContent="center"
            pressStyle={{ opacity: 0.8 }}
            onPress={() => router.back()}
            testID="back-button"
          >
            <Ionicons name="arrow-back" size={24} color="#1A202C" />
          </XStack>
        </XStack>
        <YStack
          position="absolute"
          bottom={20}
          left={16}
          right={16}
        >
          <Text color="white" fontSize="$2" fontWeight="500" opacity={0.9}>
            DESTINATION GUIDE
          </Text>
          <Text color="white" fontSize="$8" fontWeight="800">
            {destination.name}
          </Text>
          <Text color="white" fontSize="$3" opacity={0.9}>
            {destination.tagline}
          </Text>
        </YStack>
      </YStack>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* Highlights */}
        <Text fontSize="$4" fontWeight="700" color="$textPrimary" marginBottom="$3">
          Highlights
        </Text>
        <ChipGroup testID="highlights-chips">
          {destination.highlights.map((highlight, index) => (
            <Chip
              key={index}
              label={highlight}
              icon={<Ionicons name="star" size={12} color="#FFD700" />}
              testID={`highlight-${index}`}
            />
          ))}
        </ChipGroup>

        {/* Neighborhoods */}
        {destination.neighborhoods.length > 0 && (
          <YStack marginTop="$6">
            <Text fontSize="$4" fontWeight="700" color="$textPrimary" marginBottom="$3">
              Neighborhoods
            </Text>
            <YStack gap="$2">
              {destination.neighborhoods.map((neighborhood, index) => (
                <Card key={index} testID={`neighborhood-${index}`}>
                  <XStack alignItems="center" gap="$3">
                    <YStack
                      width={44}
                      height={44}
                      borderRadius="$md"
                      backgroundColor="$backgroundHover"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Ionicons name="location" size={24} color="#258CF4" />
                    </YStack>
                    <YStack flex={1}>
                      <Text fontWeight="600" color="$textPrimary">
                        {neighborhood.name}
                      </Text>
                      <Text fontSize="$2" color="$textSecondary">
                        {neighborhood.description}
                      </Text>
                    </YStack>
                    <Ionicons name="chevron-forward" size={20} color="#64748B" />
                  </XStack>
                </Card>
              ))}
            </YStack>
          </YStack>
        )}

        {/* Local Tips */}
        <YStack marginTop="$6">
          <Text fontSize="$4" fontWeight="700" color="$textPrimary" marginBottom="$3">
            Local Tips
          </Text>
          <Card variant="filled">
            <YStack gap="$3">
              {destination.tips.map((tip, index) => (
                <XStack key={index} gap="$2" alignItems="flex-start">
                  <Ionicons name="bulb" size={18} color="#FFD700" style={{ marginTop: 2 }} />
                  <Text flex={1} color="$textPrimary" fontSize="$3">
                    {tip}
                  </Text>
                </XStack>
              ))}
            </YStack>
          </Card>
        </YStack>

        {/* Emergency Contacts */}
        <YStack marginTop="$6">
          <Text fontSize="$4" fontWeight="700" color="$textPrimary" marginBottom="$3">
            Emergency Contacts
          </Text>
          <Card>
            <YStack gap="$3">
              <XStack justifyContent="space-between" alignItems="center">
                <XStack gap="$2" alignItems="center">
                  <Ionicons name="shield" size={18} color="#E12D39" />
                  <Text color="$textSecondary">Emergency</Text>
                </XStack>
                <Text color="$textPrimary" fontWeight="600">
                  {destination.emergencyNumbers.police}
                </Text>
              </XStack>
              <XStack justifyContent="space-between" alignItems="center">
                <XStack gap="$2" alignItems="center">
                  <Ionicons name="car" size={18} color="#258CF4" />
                  <Text color="$textSecondary">Taxi</Text>
                </XStack>
                <Text color="$textPrimary" fontWeight="600">
                  {destination.emergencyNumbers.taxi}
                </Text>
              </XStack>
              <XStack justifyContent="space-between" alignItems="center">
                <XStack gap="$2" alignItems="center">
                  <Ionicons name="medkit" size={18} color="#47B881" />
                  <Text color="$textSecondary">Hospital</Text>
                </XStack>
                <Text color="$textPrimary" fontWeight="600" fontSize="$2">
                  {destination.emergencyNumbers.hospital}
                </Text>
              </XStack>
            </YStack>
          </Card>
        </YStack>

        {/* Open Maps Button */}
        <Card
          marginTop="$6"
          onPress={openMaps}
          testID="open-maps-button"
        >
          <XStack alignItems="center" justifyContent="center" gap="$2" padding="$2">
            <Ionicons name="map" size={24} color="#258CF4" />
            <Text color="$primary" fontWeight="600" fontSize="$4">
              Open in Maps
            </Text>
          </XStack>
        </Card>
      </ScrollView>
    </YStack>
  );
}
