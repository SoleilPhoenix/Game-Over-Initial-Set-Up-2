/**
 * Privacy Policy Screen
 * Bilingual: DE/EN — switches based on current app language
 * Draft privacy policy — to be reviewed by a legal professional before launch
 */

import React from 'react';
import { Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, View } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/i18n';
import { DARK_THEME } from '@/constants/theme';

const LAST_UPDATED = '2026-02-09';

interface SectionData {
  title: string;
  body: string;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <YStack gap="$2" marginBottom="$5">
      <Text fontSize={16} fontWeight="700" color={DARK_THEME.textPrimary}>
        {title}
      </Text>
      <Text fontSize={13} color={DARK_THEME.textSecondary} lineHeight={20}>
        {children}
      </Text>
    </YStack>
  );
}

const SECTIONS: Record<string, SectionData[]> = {
  en: [
    {
      title: '1. Introduction',
      body: 'Game-Over.app ("we", "us", "our") is committed to protecting the privacy of our users. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application ("App"). Please read this policy carefully. By using the App, you consent to the data practices described in this policy.',
    },
    {
      title: '2. Information We Collect',
      body: 'We collect information that you provide directly to us, including: Account information (name, email address, profile picture) when you create an account; Event data (event details, preferences, participant lists) when you create or join events; Payment information processed securely through Stripe (we do not store your full card details); Chat messages and poll votes within event group chats; Device information (device type, operating system, unique device identifiers) for app functionality; Usage data (features used, screens visited, interaction patterns) to improve our service.',
    },
    {
      title: '3. How We Use Your Information',
      body: 'We use the information we collect to: Provide, maintain, and improve the App; Process bookings and payments; Facilitate group communication and coordination; Send you notifications about your events and bookings; Provide customer support; Analyze usage patterns to improve user experience; Comply with legal obligations. We do not sell your personal data to third parties.',
    },
    {
      title: '4. Data Sharing',
      body: 'We may share your information with: Event participants (limited profile information visible to other members of your event group); Payment processors (Stripe) to process transactions; Cloud service providers (Supabase) for data storage and authentication; Law enforcement or regulatory authorities when required by law. We require all third-party service providers to respect the security of your personal data and to treat it in accordance with applicable law.',
    },
    {
      title: '5. Data Storage and Security',
      body: 'Your data is stored on secure servers provided by Supabase (hosted within the European Union). We implement appropriate technical and organizational measures to protect your personal data, including: Encryption in transit (TLS/SSL) and at rest; Row-level security policies on all database tables; Secure authentication with encrypted token storage; Regular security audits and updates. However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.',
    },
    {
      title: '6. Your Rights (GDPR)',
      body: 'Under the General Data Protection Regulation (GDPR), you have the right to: Access the personal data we hold about you; Request correction of inaccurate personal data; Request deletion of your personal data ("right to be forgotten"); Object to processing of your personal data; Request restriction of processing; Data portability (receive your data in a structured, machine-readable format); Withdraw consent at any time. To exercise any of these rights, please contact us at: privacy@game-over.app',
    },
    {
      title: '7. Data Retention',
      body: 'We retain your personal data only for as long as necessary to fulfill the purposes for which it was collected, including: Active account data is retained while your account is active; Booking and transaction records are retained for 7 years for legal and tax purposes; Chat messages are retained for the duration of the event and 90 days after; You may request deletion of your account and associated data at any time.',
    },
    {
      title: '8. Cookies and Tracking',
      body: 'The App does not use browser cookies. We may use similar technologies such as local storage for session management and user preferences. Push notification tokens are stored to deliver event notifications.',
    },
    {
      title: '9. Third-Party Services',
      body: "The App integrates with the following third-party services: Stripe (payment processing) \u2014 governed by Stripe's Privacy Policy; Supabase (backend infrastructure) \u2014 data hosted in EU; Expo (app distribution and push notifications); Apple and Google (authentication via Sign in with Apple / Google OAuth). Each of these services has its own privacy policy that governs their handling of your data.",
    },
    {
      title: "10. Children's Privacy",
      body: 'The App is not intended for use by individuals under 18 years of age. We do not knowingly collect personal data from children under 18. If we become aware that we have collected data from a child under 18, we will take steps to delete such information.',
    },
    {
      title: '11. Changes to This Policy',
      body: 'We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy in the App and updating the "Last updated" date. We encourage you to review this policy periodically.',
    },
    {
      title: '12. Contact Us',
      body: 'If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:\n\nEmail: privacy@game-over.app\nGeneral: support@game-over.app\nAddress: See Impressum for postal address',
    },
  ],
  de: [
    {
      title: '1. Einleitung',
      body: 'Game-Over.app („wir", „uns", „unser") verpflichtet sich zum Schutz der Privatsphäre unserer Nutzer. Diese Datenschutzerklärung erläutert, wie wir Ihre Daten erfassen, verwenden, weitergeben und schützen, wenn Sie unsere mobile Anwendung („App") nutzen. Bitte lesen Sie diese Erklärung sorgfältig durch. Durch die Nutzung der App stimmen Sie den in dieser Erklärung beschriebenen Datenpraktiken zu.',
    },
    {
      title: '2. Welche Daten wir erheben',
      body: 'Wir erheben Daten, die Sie uns direkt zur Verfügung stellen, darunter: Kontoinformationen (Name, E-Mail-Adresse, Profilbild) bei der Kontoerstellung; Eventdaten (Veranstaltungsdetails, Präferenzen, Teilnehmerlisten) bei der Erstellung oder Teilnahme an Events; Zahlungsinformationen, die sicher über Stripe verarbeitet werden (wir speichern keine vollständigen Kartendaten); Chat-Nachrichten und Umfragestimmen in Event-Gruppenchats; Geräteinformationen (Gerätetyp, Betriebssystem, eindeutige Gerätekennungen) für die App-Funktionalität; Nutzungsdaten (genutzte Funktionen, besuchte Bildschirme, Interaktionsmuster) zur Verbesserung unseres Dienstes.',
    },
    {
      title: '3. Wie wir Ihre Daten verwenden',
      body: 'Wir verwenden die erhobenen Daten, um: die App bereitzustellen, zu pflegen und zu verbessern; Buchungen und Zahlungen abzuwickeln; die Gruppenkommunikation und -koordination zu ermöglichen; Ihnen Benachrichtigungen über Ihre Events und Buchungen zu senden; Kundensupport zu leisten; Nutzungsmuster zu analysieren, um die Benutzererfahrung zu verbessern; gesetzlichen Verpflichtungen nachzukommen. Wir verkaufen Ihre personenbezogenen Daten nicht an Dritte.',
    },
    {
      title: '4. Datenweitergabe',
      body: 'Wir können Ihre Daten weitergeben an: Event-Teilnehmer (eingeschränkte Profilinformationen, die für andere Mitglieder Ihrer Eventgruppe sichtbar sind); Zahlungsdienstleister (Stripe) zur Abwicklung von Transaktionen; Cloud-Dienstleister (Supabase) für Datenspeicherung und Authentifizierung; Strafverfolgungsbehörden oder Aufsichtsbehörden, wenn dies gesetzlich vorgeschrieben ist. Wir verlangen von allen Drittanbietern, die Sicherheit Ihrer personenbezogenen Daten zu respektieren und diese im Einklang mit geltendem Recht zu behandeln.',
    },
    {
      title: '5. Datenspeicherung und Sicherheit',
      body: 'Ihre Daten werden auf sicheren Servern von Supabase gespeichert (gehostet innerhalb der Europäischen Union). Wir setzen angemessene technische und organisatorische Maßnahmen zum Schutz Ihrer personenbezogenen Daten um, darunter: Verschlüsselung bei der Übertragung (TLS/SSL) und im Ruhezustand; Row-Level-Security-Richtlinien für alle Datenbanktabellen; sichere Authentifizierung mit verschlüsselter Token-Speicherung; regelmäßige Sicherheitsaudits und Updates. Allerdings ist keine Methode der elektronischen Übertragung oder Speicherung zu 100 % sicher, und wir können keine absolute Sicherheit garantieren.',
    },
    {
      title: '6. Ihre Rechte (DSGVO)',
      body: 'Gemäß der Datenschutz-Grundverordnung (DSGVO) haben Sie das Recht auf: Zugang zu den personenbezogenen Daten, die wir über Sie gespeichert haben; Berichtigung unrichtiger personenbezogener Daten; Löschung Ihrer personenbezogenen Daten („Recht auf Vergessenwerden"); Widerspruch gegen die Verarbeitung Ihrer personenbezogenen Daten; Einschränkung der Verarbeitung; Datenübertragbarkeit (Erhalt Ihrer Daten in einem strukturierten, maschinenlesbaren Format); jederzeitigen Widerruf der Einwilligung. Um eines dieser Rechte auszuüben, kontaktieren Sie uns bitte unter: privacy@game-over.app',
    },
    {
      title: '7. Datenspeicherung',
      body: 'Wir speichern Ihre personenbezogenen Daten nur so lange, wie es zur Erfüllung der Zwecke erforderlich ist, für die sie erhoben wurden, einschließlich: Aktive Kontodaten werden aufbewahrt, solange Ihr Konto aktiv ist; Buchungs- und Transaktionsdaten werden aus steuer- und handelsrechtlichen Gründen 7 Jahre aufbewahrt; Chat-Nachrichten werden für die Dauer des Events und 90 Tage danach aufbewahrt; Sie können jederzeit die Löschung Ihres Kontos und der zugehörigen Daten beantragen.',
    },
    {
      title: '8. Cookies und Tracking',
      body: 'Die App verwendet keine Browser-Cookies. Wir können ähnliche Technologien wie lokale Speicherung für die Sitzungsverwaltung und Nutzereinstellungen verwenden. Push-Benachrichtigungs-Tokens werden gespeichert, um Event-Benachrichtigungen zu übermitteln.',
    },
    {
      title: '9. Dienste Dritter',
      body: 'Die App integriert folgende Dienste Dritter: Stripe (Zahlungsabwicklung) \u2014 geregelt durch die Datenschutzrichtlinie von Stripe; Supabase (Backend-Infrastruktur) \u2014 Daten in der EU gehostet; Expo (App-Verteilung und Push-Benachrichtigungen); Apple und Google (Authentifizierung über „Mit Apple anmelden" / Google OAuth). Jeder dieser Dienste hat eine eigene Datenschutzrichtlinie, die den Umgang mit Ihren Daten regelt.',
    },
    {
      title: '10. Datenschutz für Kinder',
      body: 'Die App ist nicht für die Nutzung durch Personen unter 18 Jahren bestimmt. Wir erheben wissentlich keine personenbezogenen Daten von Kindern unter 18 Jahren. Sollten wir erfahren, dass wir Daten eines Kindes unter 18 Jahren erhoben haben, werden wir Maßnahmen ergreifen, um diese Daten zu löschen.',
    },
    {
      title: '11. Änderungen dieser Richtlinie',
      body: 'Wir können diese Datenschutzerklärung von Zeit zu Zeit aktualisieren. Über wesentliche Änderungen informieren wir Sie durch Veröffentlichung der aktualisierten Richtlinie in der App und Aktualisierung des „Zuletzt aktualisiert"-Datums. Wir empfehlen Ihnen, diese Erklärung regelmäßig zu überprüfen.',
    },
    {
      title: '12. Kontakt',
      body: 'Bei Fragen oder Bedenken zu dieser Datenschutzerklärung oder unseren Datenpraktiken kontaktieren Sie uns bitte unter:\n\nE-Mail: privacy@game-over.app\nAllgemein: support@game-over.app\nAdresse: Siehe Impressum für die Postanschrift',
    },
  ],
};

const LAST_UPDATED_LABEL: Record<string, string> = {
  en: 'Last updated',
  de: 'Zuletzt aktualisiert',
};

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, language } = useTranslation();

  const sections = SECTIONS[language] ?? SECTIONS.en;
  const lastUpdatedLabel = LAST_UPDATED_LABEL[language] ?? LAST_UPDATED_LABEL.en;

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
          testID="privacy-back"
        >
          <Ionicons name="chevron-back" size={24} color={DARK_THEME.textPrimary} />
        </Pressable>
        <Text fontSize={17} fontWeight="600" color={DARK_THEME.textPrimary}>
          {t.support.privacyPolicy}
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
        <Text fontSize={11} color={DARK_THEME.textTertiary} marginBottom="$4">
          {lastUpdatedLabel}: {LAST_UPDATED}
        </Text>

        {sections.map((section, index) => (
          <Section key={index} title={section.title}>
            {section.body}
          </Section>
        ))}
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
