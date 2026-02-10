/**
 * Terms of Service Screen
 * Bilingual: DE/EN — switches based on current app language
 * Draft legal terms — to be reviewed by a legal professional before launch
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

function Section({ title, children }: { title: string; children: string }) {
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
      title: '1. Acceptance of Terms',
      body: 'By downloading, installing, or using the Game-Over.app mobile application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the App. These Terms constitute a legally binding agreement between you and Game-Over.app ("we", "us", "our").',
    },
    {
      title: '2. Description of Service',
      body: 'Game-Over.app is an event planning platform that helps users organize bachelor and bachelorette parties. The App provides tools for selecting event packages, coordinating with participants via group chat and polls, managing budgets, and processing payments for bookings. We act as an intermediary between you and third-party service providers (venues, activity providers, etc.).',
    },
    {
      title: '3. User Accounts',
      body: 'To use certain features of the App, you must create an account. You agree to provide accurate, current, and complete information during registration, maintain the security of your password, and accept responsibility for all activities that occur under your account. You must be at least 18 years of age to create an account. You may not transfer your account to any other person.',
    },
    {
      title: '4. Bookings and Payments',
      body: 'When you book a package through the App, you enter into an agreement to purchase event services. All prices are displayed in Euros (EUR) and include applicable taxes unless stated otherwise. Payments are processed securely through Stripe. By making a payment, you authorize us to charge the specified amount to your chosen payment method. Group payment splitting is available; each participant is responsible for their individual share.',
    },
    {
      title: '5. Cancellation and Refund Policy',
      body: 'Free cancellation is available up to 14 days before the scheduled event date. A non-refundable deposit may be required to secure your booking. After the free cancellation period, cancellation fees may apply depending on the proximity to the event date: 50% refund for cancellations 7-14 days before the event, no refund for cancellations less than 7 days before the event. Refunds are processed to the original payment method within 5-10 business days.',
    },
    {
      title: '6. User Conduct',
      body: 'You agree not to use the App to: violate any applicable laws or regulations; post or transmit harmful, threatening, abusive, or otherwise objectionable content; impersonate any person or entity; interfere with or disrupt the App or servers; attempt to gain unauthorized access to any part of the App; use the App for any commercial purpose other than its intended use. We reserve the right to suspend or terminate accounts that violate these terms.',
    },
    {
      title: '7. Intellectual Property',
      body: 'All content, features, and functionality of the App, including but not limited to text, graphics, logos, icons, images, and software, are the exclusive property of Game-Over.app and are protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, modify, or create derivative works of any content from the App without our prior written consent.',
    },
    {
      title: '8. Limitation of Liability',
      body: 'To the maximum extent permitted by law, Game-Over.app shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly. Our total liability for any claims arising out of or relating to these Terms or the App shall not exceed the amount you paid to us in the 12 months preceding the claim.',
    },
    {
      title: '9. Third-Party Services',
      body: 'The App may contain links to or integrate with third-party services (including payment processors, venue providers, and activity providers). We are not responsible for the content, privacy policies, or practices of third-party services. Your interactions with third-party services are governed by their respective terms and conditions.',
    },
    {
      title: '10. Changes to Terms',
      body: 'We reserve the right to modify these Terms at any time. We will notify you of any material changes by posting the updated Terms in the App and updating the "Last updated" date. Your continued use of the App after changes are posted constitutes your acceptance of the modified Terms.',
    },
    {
      title: '11. Governing Law',
      body: 'These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Germany, without regard to its conflict of law provisions. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts in Germany.',
    },
    {
      title: '12. Contact',
      body: 'If you have questions about these Terms, please contact us at: support@game-over.app',
    },
  ],
  de: [
    {
      title: '1. Annahme der Nutzungsbedingungen',
      body: 'Durch das Herunterladen, Installieren oder Nutzen der mobilen Anwendung Game-Over.app („App") erklären Sie sich mit diesen Nutzungsbedingungen („Bedingungen") einverstanden. Wenn Sie diesen Bedingungen nicht zustimmen, dürfen Sie die App nicht nutzen. Diese Bedingungen stellen eine rechtsverbindliche Vereinbarung zwischen Ihnen und Game-Over.app („wir", „uns", „unser") dar.',
    },
    {
      title: '2. Beschreibung des Dienstes',
      body: 'Game-Over.app ist eine Eventplanungs-Plattform, die Nutzern bei der Organisation von Junggesellen- und Junggesellinnenabschieden hilft. Die App bietet Werkzeuge zur Auswahl von Eventpaketen, zur Koordination mit Teilnehmern über Gruppenchat und Umfragen, zur Budgetverwaltung und zur Zahlungsabwicklung für Buchungen. Wir fungieren als Vermittler zwischen Ihnen und Drittanbietern (Veranstaltungsorte, Aktivitätsanbieter usw.).',
    },
    {
      title: '3. Benutzerkonten',
      body: 'Um bestimmte Funktionen der App nutzen zu können, müssen Sie ein Konto erstellen. Sie verpflichten sich, bei der Registrierung genaue, aktuelle und vollständige Angaben zu machen, die Sicherheit Ihres Passworts zu gewährleisten und die Verantwortung für alle Aktivitäten zu übernehmen, die unter Ihrem Konto stattfinden. Sie müssen mindestens 18 Jahre alt sein, um ein Konto zu erstellen. Eine Übertragung Ihres Kontos auf eine andere Person ist nicht gestattet.',
    },
    {
      title: '4. Buchungen und Zahlungen',
      body: 'Wenn Sie ein Paket über die App buchen, gehen Sie eine Vereinbarung zum Kauf von Eventdienstleistungen ein. Alle Preise werden in Euro (EUR) angezeigt und enthalten die anfallenden Steuern, sofern nicht anders angegeben. Zahlungen werden sicher über Stripe abgewickelt. Mit Ihrer Zahlung ermächtigen Sie uns, den angegebenen Betrag über Ihre gewählte Zahlungsmethode einzuziehen. Eine Gruppenaufteilung der Zahlung ist möglich; jeder Teilnehmer ist für seinen individuellen Anteil verantwortlich.',
    },
    {
      title: '5. Stornierungs- und Erstattungsrichtlinie',
      body: 'Eine kostenlose Stornierung ist bis zu 14 Tage vor dem geplanten Veranstaltungsdatum möglich. Zur Sicherung Ihrer Buchung kann eine nicht erstattungsfähige Anzahlung erforderlich sein. Nach Ablauf der kostenlosen Stornierungsfrist können Stornierungsgebühren anfallen, abhängig vom Abstand zum Veranstaltungsdatum: 50 % Erstattung bei Stornierung 7–14 Tage vor der Veranstaltung, keine Erstattung bei Stornierung weniger als 7 Tage vor der Veranstaltung. Erstattungen werden innerhalb von 5–10 Werktagen auf die ursprüngliche Zahlungsmethode zurückerstattet.',
    },
    {
      title: '6. Nutzerverhalten',
      body: 'Sie verpflichten sich, die App nicht zu nutzen, um: gegen geltende Gesetze oder Vorschriften zu verstoßen; schädliche, bedrohliche, beleidigende oder anderweitig anstößige Inhalte zu veröffentlichen oder zu übermitteln; sich als eine andere Person oder Organisation auszugeben; die App oder Server zu stören oder zu beeinträchtigen; unbefugten Zugriff auf Teile der App zu erlangen; die App für andere kommerzielle Zwecke als den vorgesehenen zu nutzen. Wir behalten uns das Recht vor, Konten zu sperren oder zu kündigen, die gegen diese Bedingungen verstoßen.',
    },
    {
      title: '7. Geistiges Eigentum',
      body: 'Alle Inhalte, Funktionen und Merkmale der App, einschließlich, aber nicht beschränkt auf Texte, Grafiken, Logos, Symbole, Bilder und Software, sind ausschließliches Eigentum von Game-Over.app und durch Urheber-, Marken- und andere Gesetze zum Schutz geistigen Eigentums geschützt. Sie dürfen keine Inhalte der App ohne unsere vorherige schriftliche Zustimmung vervielfältigen, verbreiten, verändern oder davon abgeleitete Werke erstellen.',
    },
    {
      title: '8. Haftungsbeschränkung',
      body: 'Soweit gesetzlich zulässig, haftet Game-Over.app nicht für indirekte, zufällige, besondere, Folge- oder Strafschäden oder für entgangene Gewinne oder Einnahmen, unabhängig davon, ob diese direkt oder indirekt entstanden sind. Unsere Gesamthaftung für Ansprüche aus oder im Zusammenhang mit diesen Bedingungen oder der App ist auf den Betrag beschränkt, den Sie in den 12 Monaten vor dem Anspruch an uns gezahlt haben.',
    },
    {
      title: '9. Dienste Dritter',
      body: 'Die App kann Links zu oder Integrationen mit Diensten Dritter enthalten (einschließlich Zahlungsdienstleister, Veranstaltungsorte und Aktivitätsanbieter). Wir sind nicht verantwortlich für die Inhalte, Datenschutzrichtlinien oder Praktiken von Diensten Dritter. Ihre Interaktionen mit Diensten Dritter unterliegen deren jeweiligen Geschäftsbedingungen.',
    },
    {
      title: '10. Änderungen der Bedingungen',
      body: 'Wir behalten uns das Recht vor, diese Bedingungen jederzeit zu ändern. Über wesentliche Änderungen informieren wir Sie durch Veröffentlichung der aktualisierten Bedingungen in der App und Aktualisierung des „Zuletzt aktualisiert"-Datums. Ihre fortgesetzte Nutzung der App nach Veröffentlichung der Änderungen gilt als Annahme der geänderten Bedingungen.',
    },
    {
      title: '11. Anwendbares Recht',
      body: 'Diese Bedingungen unterliegen dem Recht der Bundesrepublik Deutschland unter Ausschluss der Kollisionsnormen. Für Streitigkeiten aus diesen Bedingungen sind ausschließlich die Gerichte in Deutschland zuständig.',
    },
    {
      title: '12. Kontakt',
      body: 'Bei Fragen zu diesen Nutzungsbedingungen kontaktieren Sie uns bitte unter: support@game-over.app',
    },
  ],
};

const LAST_UPDATED_LABEL: Record<string, string> = {
  en: 'Last updated',
  de: 'Zuletzt aktualisiert',
};

export default function TermsScreen() {
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
          testID="terms-back"
        >
          <Ionicons name="chevron-back" size={24} color={DARK_THEME.textPrimary} />
        </Pressable>
        <Text fontSize={17} fontWeight="600" color={DARK_THEME.textPrimary}>
          {t.support.termsOfService}
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
