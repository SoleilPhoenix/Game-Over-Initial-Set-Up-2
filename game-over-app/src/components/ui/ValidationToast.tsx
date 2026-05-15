import React, { useEffect } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ValidationToastProps {
  fields: string[];
  onDismiss: () => void;
}

export function ValidationToast({ fields, onDismiss }: ValidationToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <Modal transparent animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Ionicons name="alert-circle" size={20} color="#C6A75E" />
            <Text style={styles.title}>Almost there!</Text>
            <Pressable onPress={onDismiss} hitSlop={8}>
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.45)" />
            </Pressable>
          </View>
          <Text style={styles.subtitle}>Please fill in:</Text>
          {fields.map((field, i) => (
            <View key={i} style={styles.row}>
              <View style={styles.bullet} />
              <Text style={styles.item}>{field}</Text>
            </View>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 16,
    paddingBottom: 110,
  },
  card: {
    backgroundColor: '#1A2F47',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(198,167,94,0.4)',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  title: {
    flex: 1,
    color: '#C6A75E',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_600SemiBold',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.60)',
    fontSize: 13,
    marginBottom: 10,
    fontFamily: 'Inter_400Regular',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 7,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#C6A75E',
  },
  item: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
});
