import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import { Colors, Typography, Spacing, BorderRadius } from '../../src/constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'E-posta ve şifre zorunludur.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/(tabs)/dashboard');
    } catch (err: any) {
      Alert.alert('Giriş Hatası', err?.message || 'E-posta veya şifre hatalı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0F1117', '#1A1D27', '#0F1117']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#6366F1', '#818CF8']}
              style={styles.logoBox}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Text style={styles.logoIcon}>⚙️</Text>
            </LinearGradient>
            <Text style={styles.logoText}>MotorTrack</Text>
            <Text style={styles.tagline}>Motor & Parça Yönetim Sistemi</Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Giriş Yap</Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>E-posta</Text>
              <TextInput
                style={styles.input}
                placeholder="ornek@sirket.com"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Şifre</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, { flex: 1, borderWidth: 0 }]}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#6366F1', '#4F46E5']}
                style={styles.loginBtnGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.loginBtnText}>Giriş Yap</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>veya</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.registerBtn}
              onPress={() => router.push('/(auth)/register')}
            >
              <Text style={styles.registerText}>
                Hesabınız yok mu? <Text style={styles.registerLink}>Ücretsiz Kaydolun</Text>
              </Text>
            </TouchableOpacity>

            <Text style={styles.trialNote}>
              🎉 14 gün ücretsiz deneme — kredi kartı gerekmez
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, padding: Spacing.lg, justifyContent: 'center' },

  logoContainer: { alignItems: 'center', marginBottom: Spacing['2xl'] },
  logoBox: {
    width: 80, height: 80, borderRadius: BorderRadius.xl,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
  },
  logoIcon: { fontSize: 36 },
  logoText: {
    fontSize: Typography.fontSize['3xl'], fontWeight: '700',
    color: Colors.textPrimary, letterSpacing: -1,
  },
  tagline: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, marginTop: 4 },

  formContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formTitle: {
    fontSize: Typography.fontSize.xl, fontWeight: '700',
    color: Colors.textPrimary, marginBottom: Spacing.lg,
  },

  inputWrapper: { marginBottom: Spacing.md },
  label: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md, paddingHorizontal: Spacing.md,
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.base,
  },
  passwordContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md,
  },
  eyeBtn: { padding: Spacing.md },
  eyeIcon: { fontSize: 18 },

  loginBtn: { borderRadius: BorderRadius.md, overflow: 'hidden', marginTop: Spacing.md },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnGradient: { paddingVertical: Spacing.md, alignItems: 'center' },
  loginBtnText: { color: '#fff', fontSize: Typography.fontSize.md, fontWeight: '700' },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textMuted, paddingHorizontal: Spacing.md, fontSize: Typography.fontSize.sm },

  registerBtn: { alignItems: 'center' },
  registerText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
  registerLink: { color: Colors.primary, fontWeight: '600' },

  trialNote: {
    textAlign: 'center', color: Colors.textMuted,
    fontSize: Typography.fontSize.xs, marginTop: Spacing.md,
  },
});
