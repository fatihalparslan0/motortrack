import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { Typography, Spacing, BorderRadius } from '../../src/constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const login = useAuthStore((s) => s.login);
  const { colors: theme, themeMode } = useAppTheme();
  
  const dynamicStyles = useMemo(() => styles(theme), [theme]);
  
  const gradientColors = themeMode === 'light' 
    ? [theme.background, '#F3F4F6', theme.background] 
    : ['#0F1117', '#1A1D27', '#0F1117'];

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'E-posta ve şifre zorunludur.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Giriş Hatası', err?.message || 'E-posta veya şifre hatalı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={gradientColors as [string, string, string]} style={dynamicStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={dynamicStyles.kav}
      >
        <ScrollView contentContainerStyle={dynamicStyles.scroll} showsVerticalScrollIndicator={false}>
          {/* Logo */}
          <View style={dynamicStyles.logoContainer}>
            <LinearGradient
              colors={['#6366F1', '#818CF8']}
              style={dynamicStyles.logoBox}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Text style={dynamicStyles.logoIcon}>⚙️</Text>
            </LinearGradient>
            <Text style={dynamicStyles.logoText}>MotorTrack</Text>
            <Text style={dynamicStyles.tagline}>Motor & Parça Yönetim Sistemi</Text>
          </View>

          {/* Form */}
          <View style={dynamicStyles.formContainer}>
            <Text style={dynamicStyles.formTitle}>Giriş Yap</Text>

            <View style={dynamicStyles.inputWrapper}>
              <Text style={dynamicStyles.label}>E-posta</Text>
              <TextInput
                style={dynamicStyles.input}
                placeholder="ornek@sirket.com"
                placeholderTextColor={theme.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={dynamicStyles.inputWrapper}>
              <Text style={dynamicStyles.label}>Şifre</Text>
              <View style={dynamicStyles.passwordContainer}>
                <TextInput
                  style={[dynamicStyles.input, { flex: 1, borderWidth: 0 }]}
                  placeholder="••••••••"
                  placeholderTextColor={theme.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={dynamicStyles.eyeBtn}
                >
                  <Text style={dynamicStyles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[dynamicStyles.loginBtn, loading && dynamicStyles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#6366F1', '#4F46E5']}
                style={dynamicStyles.loginBtnGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={dynamicStyles.loginBtnText}>Giriş Yap</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            <View style={dynamicStyles.divider}>
              <View style={dynamicStyles.dividerLine} />
              <Text style={dynamicStyles.dividerText}>veya</Text>
              <View style={dynamicStyles.dividerLine} />
            </View>

            <TouchableOpacity
              style={dynamicStyles.registerBtn}
              onPress={() => router.push('/(auth)/register')}
            >
              <Text style={dynamicStyles.registerText}>
                Hesabınız yok mu? <Text style={dynamicStyles.registerLink}>Ücretsiz Kaydolun</Text>
              </Text>
            </TouchableOpacity>

            <Text style={dynamicStyles.trialNote}>
              🎉 14 gün ücretsiz deneme — kredi kartı gerekmez
            </Text>

            {/* Hızlı Demo Girişi */}
            <View style={{ marginTop: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: theme.border }}>
              <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted, fontWeight: '700', textAlign: 'center', marginBottom: Spacing.sm, textTransform: 'uppercase' }}>
                ⚡ Hızlı Demo Girişi
              </Text>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#6366F115', borderWidth: 1, borderColor: '#6366F150', borderRadius: BorderRadius.md, paddingVertical: 10, alignItems: 'center' }}
                  onPress={async () => {
                    setEmail('admin@motortrack.com');
                    setPassword('Demo1234!');
                    setLoading(true);
                    try {
                      await login('admin@motortrack.com', 'Demo1234!');
                      router.replace('/(tabs)');
                    } catch (err: any) {
                      Alert.alert('Giriş Hatası', err?.message || 'Giriş yapılamadı.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  <Text style={{ color: '#6366F1', fontWeight: '700', fontSize: Typography.fontSize.xs }}>👨‍💼 Yönetici</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 10 }}>Fatih Alparslan</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#10B98115', borderWidth: 1, borderColor: '#10B98150', borderRadius: BorderRadius.md, paddingVertical: 10, alignItems: 'center' }}
                  onPress={async () => {
                    setEmail('teknisyen@motortrack.com');
                    setPassword('Demo1234!');
                    setLoading(true);
                    try {
                      await login('teknisyen@motortrack.com', 'Demo1234!');
                      router.replace('/(tabs)');
                    } catch (err: any) {
                      Alert.alert('Giriş Hatası', err?.message || 'Giriş yapılamadı.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  <Text style={{ color: '#10B981', fontWeight: '700', fontSize: Typography.fontSize.xs }}>🔧 Teknisyen</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 10 }}>Ahmet Yılmaz</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = (theme: any) => StyleSheet.create({
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
    color: theme.textPrimary, letterSpacing: -1,
  },
  tagline: { fontSize: Typography.fontSize.sm, color: theme.textSecondary, marginTop: 4 },

  formContainer: {
    backgroundColor: theme.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  formTitle: {
    fontSize: Typography.fontSize.xl, fontWeight: '700',
    color: theme.textPrimary, marginBottom: Spacing.lg,
  },

  inputWrapper: { marginBottom: Spacing.md },
  label: { fontSize: Typography.fontSize.sm, color: theme.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: theme.surfaceElevated,
    borderWidth: 1, borderColor: theme.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md, paddingHorizontal: Spacing.md,
    color: theme.textPrimary,
    fontSize: Typography.fontSize.base,
  },
  passwordContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.surfaceElevated,
    borderWidth: 1, borderColor: theme.border,
    borderRadius: BorderRadius.md,
  },
  eyeBtn: { padding: Spacing.md },
  eyeIcon: { fontSize: 18 },

  loginBtn: { borderRadius: BorderRadius.md, overflow: 'hidden', marginTop: Spacing.md },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnGradient: { paddingVertical: Spacing.md, alignItems: 'center' },
  loginBtnText: { color: '#fff', fontSize: Typography.fontSize.md, fontWeight: '700' },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.border },
  dividerText: { color: theme.textMuted, paddingHorizontal: Spacing.md, fontSize: Typography.fontSize.sm },

  registerBtn: { alignItems: 'center' },
  registerText: { color: theme.textSecondary, fontSize: Typography.fontSize.sm },
  registerLink: { color: theme.primary, fontWeight: '600' },

  trialNote: {
    textAlign: 'center', color: theme.textMuted,
    fontSize: Typography.fontSize.xs, marginTop: Spacing.md,
  },
});
