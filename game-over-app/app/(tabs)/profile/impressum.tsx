/**
 * Impressum Screen
 * Legal notice as required by German law (TMG / DDG)
 * Bilingual: DE/EN — switches based on current app language
 * Placeholder data — to be updated with final company details before launch
 */

import React from 'react';
import { Pressable, StyleSheet, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, View } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/i18n';
import { DARK_THEME } from '@/constants/theme';

function InfoRow({ label, value, isLink }: { label: string; value: string; isLink?: boolean }) {
  const handlePress = () => {
    if (isLink && value.includes('@')) {
      Linking.openURL(`mailto:${value}`);
    } else if (isLink) {
      Linking.openURL(value.startsWith('http') ? value : `https://${value}`);
    }
  };

  return (
    <YStack gap={4} marginBottom="$3">
      <Text fontSize={11} fontWeight="600" color={DARK_THEME.textTertiary} textTransform="uppercase" letterSpacing={0.5}>
        {label}
      </Text>
      {isLink ? (
        <Pressable onPress={handlePress}>
          <Text fontSize={14} color={DARK_THEME.primary} fontWeight="500">
            {value}
          </Text>
        </Pressable>
      ) : (
        <Text fontSize={14} color={DARK_THEME.textPrimary} fontWeight="500">
          {value}
        </Text>
      )}
    </YStack>
  );
}

const CONTENT = {
  en: {
    companyHeading: 'Information pursuant to § 5 DDG',
    operator: 'Operator',
    owner: 'Owner',
    address: 'Address',
    addressValue: 'Address will be updated before launch',
    city: 'Country',
    cityValue: 'Germany',
    contactHeading: 'Contact',
    email: 'Email',
    website: 'Website',
    disclaimerHeading: 'Disclaimer',
    disclaimerText: 'The contents of this app have been created with the utmost care. However, we cannot guarantee the accuracy, completeness, or timeliness of the content. As a service provider, we are responsible for our own content in this app in accordance with § 7 para. 1 DDG and general laws. However, we are not obligated to monitor transmitted or stored third-party information.',
    dataProtectionHeading: 'Data Protection',
    dataProtectionText: 'The use of our app is generally possible without providing personal data. Where personal data is collected, this is always done on a voluntary basis. This data will not be passed on to third parties without your explicit consent. For more information, please see our Privacy Policy.',
    placeholderNote: 'Placeholder Impressum. Update with complete company details before publication.',
  },
  de: {
    companyHeading: 'Angaben gem. § 5 DDG',
    operator: 'Betreiber',
    owner: 'Inhaber',
    address: 'Anschrift',
    addressValue: 'Adresse wird vor Launch aktualisiert',
    city: 'Stadt',
    cityValue: 'Deutschland',
    contactHeading: 'Kontakt',
    email: 'E-Mail',
    website: 'Website',
    disclaimerHeading: 'Haftungsausschluss',
    disclaimerText: 'Die Inhalte dieser App wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte in dieser App nach den allgemeinen Gesetzen verantwortlich. Eine Verpflichtung zur Überwachung übermittelter oder gespeicherter fremder Informationen besteht jedoch nicht.',
    dataProtectionHeading: 'Datenschutz',
    dataProtectionText: 'Die Nutzung unserer App ist in der Regel ohne Angabe personenbezogener Daten möglich. Soweit personenbezogene Daten erhoben werden, erfolgt dies stets auf freiwilliger Basis. Diese Daten werden ohne Ihre ausdrückliche Zustimmung nicht an Dritte weitergegeben. Weitere Informationen finden Sie in unserer Datenschutzerklärung.',
    placeholderNote: 'Platzhalter-Impressum. Vor Veröffentlichung mit vollständigen Unternehmensdaten aktualisieren.',
  },
};

export default function ImpressumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, language } = useTranslation();

  const c = CONTENT[language] ?? CONTENT.en;

  return (
    <View flex={1} backgroundColor={DARK_THEME.background}>
      {/* Header */}
      <XStack
        paddingTop={insets.top}
        paddingHorizontal="$4"
        paddingBottom="$3"
        alignItems="center"
        justifyContent="space-between"
        backgroundColor={DARK_THEME.surface}
        borderBottomWidth={1}
        borderBottomColor={DARK_THEME.border}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.headerButton}
          testID="impressum-back"
        >
          <Ionicons name="chevron-back" size={24} color={DARK_THEME.textPrimary} />
        </Pressable>
        <Text fontSize={17} fontWeight="600" color={DARK_THEME.textPrimary}>
          {t.support.impressum}
        </Text>
        <View width={40} />
      </XStack>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100,
          paddingTop: 24,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Company Info */}
        <YStack
          backgroundColor={DARK_THEME.surface}
          borderRadius={12}
          borderWidth={1}
          borderColor={DARK_THEME.border}
          padding="$4"
          marginBottom="$5"
        >
          <Text fontSize={11} fontWeight="700" color={DARK_THEME.textTertiary} textTransform="uppercase" letterSpacing={1} marginBottom="$4">
            {c.companyHeading}
          </Text>

          <InfoRow label={c.operator} value="Game-Over.app" />
          <InfoRow label={c.owner} value="Soleil Phoenix" />
          <InfoRow label={c.address} value={c.addressValue} />
          <InfoRow label={c.city} value={c.cityValue} />
        </YStack>

        {/* Contact */}
        <YStack
          backgroundColor={DARK_THEME.surface}
          borderRadius={12}
          borderWidth={1}
          borderColor={DARK_THEME.border}
          padding="$4"
          marginBottom="$5"
        >
          <Text fontSize={11} fontWeight="700" color={DARK_THEME.textTertiary} textTransform="uppercase" letterSpacing={1} marginBottom="$4">
            {c.contactHeading}
          </Text>

          <InfoRow label={c.email} value="support@game-over.app" isLink />
          <InfoRow label={c.website} value="game-over.app" isLink />
        </YStack>

        {/* Liability Disclaimer */}
        <YStack
          backgroundColor={DARK_THEME.surface}
          borderRadius={12}
          borderWidth={1}
          borderColor={DARK_THEME.border}
          padding="$4"
          marginBottom="$5"
        >
          <Text fontSize={11} fontWeight="700" color={DARK_THEME.textTertiary} textTransform="uppercase" letterSpacing={1} marginBottom="$3">
            {c.disclaimerHeading}
          </Text>
          <Text fontSize={13} color={DARK_THEME.textSecondary} lineHeight={20}>
            {c.disclaimerText}
          </Text>
        </YStack>

        {/* Data Protection */}
        <YStack
          backgroundColor={DARK_THEME.surface}
          borderRadius={12}
          borderWidth={1}
          borderColor={DARK_THEME.border}
          padding="$4"
          marginBottom="$5"
        >
          <Text fontSize={11} fontWeight="700" color={DARK_THEME.textTertiary} textTransform="uppercase" letterSpacing={1} marginBottom="$3">
            {c.dataProtectionHeading}
          </Text>
          <Text fontSize={13} color={DARK_THEME.textSecondary} lineHeight={20}>
            {c.dataProtectionText}
          </Text>
        </YStack>

        {/* Placeholder note */}
        <XStack
          padding="$3"
          backgroundColor="rgba(251, 146, 60, 0.1)"
          borderRadius={12}
          gap="$2"
          alignItems="center"
        >
          <Ionicons name="warning-outline" size={16} color="#FB923C" />
          <Text fontSize={12} color={DARK_THEME.textTertiary} flex={1}>
            {c.placeholderNote}
          </Text>
        </XStack>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
