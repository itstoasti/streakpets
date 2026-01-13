import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '../../lib/themeContext';

export default function WelcomeScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <LinearGradient colors={theme.gradient} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* App Logo/Title Section */}
          <View style={styles.headerSection}>
            <Image
              source={require('../../assets/spark_logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: theme.primary }]}>Spark</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Care for your virtual pet together</Text>
          </View>

          {/* Feature Highlights */}
          <View style={styles.featuresSection}>
            <View style={[styles.featureItem, { backgroundColor: theme.surface }]}>
              <Text style={styles.featureEmoji}>🐾</Text>
              <Text style={[styles.featureText, { color: theme.text }]}>Raise a pet with your partner</Text>
            </View>
            <View style={[styles.featureItem, { backgroundColor: theme.surface }]}>
              <Text style={styles.featureEmoji}>🎨</Text>
              <Text style={[styles.featureText, { color: theme.text }]}>Draw together on the whiteboard</Text>
            </View>
            <View style={[styles.featureItem, { backgroundColor: theme.surface }]}>
              <Text style={styles.featureEmoji}>📸</Text>
              <Text style={[styles.featureText, { color: theme.text }]}>Create shared memories</Text>
            </View>
            <View style={[styles.featureItem, { backgroundColor: theme.surface }]}>
              <Text style={styles.featureEmoji}>🔥</Text>
              <Text style={[styles.featureText, { color: theme.text }]}>Build streaks & earn rewards</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonSection}>
            <TouchableOpacity
              style={[styles.primaryButton, {
                backgroundColor: theme.primary,
                shadowColor: theme.primary,
              }]}
              onPress={() => router.push('/(auth)/signup')}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: theme.primary }]}
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.8}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>I already have an account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 10,
  },
  featuresSection: {
    marginTop: 40,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
  },
  featureEmoji: {
    fontSize: 28,
    marginRight: 15,
  },
  featureText: {
    fontSize: 16,
    flex: 1,
  },
  buttonSection: {
    gap: 15,
  },
  primaryButton: {
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 2,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
