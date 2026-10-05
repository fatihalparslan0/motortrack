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

export default function RegisterScreen() {
  const [form, setForm] = useState({
    companyName: '', fullName: '', email: '', phone: '', password: '', confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const { colors: theme, themeMode } = useAppTheme();
  
  const dynamicStyles = useMemo(() => styles(theme), [theme]);
  
  const gradientColors = themeMode === 'light' 
    ? [theme.background, '#F3F4F6', theme.background] 
    : ['#0F1117', '#1A1D27', '#0F1117'];

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const handleRegister = async () => {
    if (!form.companyName || !form.fullName || !form.email || !form.password) {
      Alert.alert('Hata', 'Zorunlu alanları doldurun.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor.');
      return;
    }
    if (form.password.length < 8) {
      Alert.alert('Hata', 'Şifre en az 8 karakter olmalıdır.');
      return;
    }

    setLoading(true);
    try {
      await register(form);
      router.replace('/paywall' as any);
    } catch (err: any) {
      Alert.alert('Kayıt Hatası', err?.message || 'Bir hata oluştu, lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const InputField = ({ label, field, placeholder, options = {} }: any) => (
    <View style={dynamicStyles.inputWrapper}>
      <Text style={dynamicStyles.label}>{label}</Text>
      <TextInput
        style={dynamicStyles.input}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        value={form[field as keyof typeof form]}
        onChangeText={(v) => update(field, v)}
        {...options}
      />
    </View>
  );

  return (
    <LinearGradient colors={gradientColors as [string, string, string]} style={dynamicStyles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={dynamicStyles.scroll} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={dynamicStyles.backBtn} onPress={() => router.back()}>
            <Text style={dynamicStyles.backText}>← Geri</Text>
          </TouchableOpacity>

          <View style={dynamicStyles.header}>
            <Text style={dynamicStyles.title}>Hesap Oluştur</Text>
            <Text style={dynamicStyles.subtitle}>3 gün ücretsiz deneyin, kredi kartı gerekmez</Text>
          </View>

          <View style={dynamicStyles.trialBadge}>
            <LinearGradient
              colors={['rgba(99,102,241,0.2)', 'rgba(99,102,241,0.1)']}
              style={dynamicStyles.trialBadgeInner}
            >
              <Text style={dynamicStyles.trialBadgeText}>🎉 3 Gün Ücretsiz Deneme</Text>
            </LinearGradient>
          </View>

          <View style={dynamicStyles.formContainer}>
            <InputField label="Şirket Adı *" field="companyName" placeholder="Şirket adınız" />
            <InputField label="Ad Soyad *" field="fullName" placeholder="Adınız ve soyadınız" />
            <InputField
              label="E-posta *" field="email" placeholder="ornek@sirket.com"
              options={{ keyboardType: 'email-address', autoCapitalize: 'none' }}
            />
            <InputField
              label="Telefon" field="phone" placeholder="+90 5XX XXX XX XX"
              options={{ keyboardType: 'phone-pad' }}
            />
            <InputField
              label="Şifre *" field="password" placeholder="En az 8 karakter"
              options={{ secureTextEntry: true }}
            />
            <InputField
              label="Şifre Tekrar *" field="confirmPassword" placeholder="Şifrenizi tekrar girin"
              options={{ secureTextEntry: true }}
            />

            <TouchableOpacity
              style={[dynamicStyles.registerBtn, loading && { opacity: 0.7 }]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#6366F1', '#4F46E5']}
                style={dynamicStyles.btnGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={dynamicStyles.btnText}>Ücretsiz Başla →</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            <Text style={dynamicStyles.termsText}>
              Kaydolarak{' '}
              <Text style={dynamicStyles.termsLink}>Kullanım Koşulları</Text>
              {' '}ve{' '}
              <Text style={dynamicStyles.termsLink}>Gizlilik Politikası</Text>
              'nı kabul etmiş olursunuz.
            </Text>
          </View>

          <TouchableOpacity style={dynamicStyles.loginLink} onPress={() => router.push('/(auth)/login')}>
            <Text style={dynamicStyles.loginLinkText}>
              Zaten hesabınız var mı? <Text style={dynamicStyles.loginLinkHighlight}>Giriş Yapın</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, padding: Spacing.lg },
  backBtn: { marginTop: Spacing.xl, marginBottom: Spacing.md },
  backText: { color: theme.primary, fontSize: Typography.fontSize.base },
  header: { marginBottom: Spacing.lg },
  title: { fontSize: Typography.fontSize['2xl'], fontWeight: '700', color: theme.textPrimary },
  subtitle: { fontSize: Typography.fontSize.sm, color: theme.textSecondary, marginTop: 4 },
  trialBadge: { marginBottom: Spacing.lg, borderRadius: BorderRadius.md, overflow: 'hidden' },
  trialBadgeInner: { padding: Spacing.md, alignItems: 'center', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)' },
  trialBadgeText: { color: theme.primaryLight, fontWeight: '600' },
  formContainer: {
    backgroundColor: theme.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.lg, borderWidth: 1, borderColor: theme.border,
  },
  inputWrapper: { marginBottom: Spacing.md },
  label: { fontSize: Typography.fontSize.sm, color: theme.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: theme.surfaceElevated, borderWidth: 1, borderColor: theme.border,
    borderRadius: BorderRadius.md, padding: Spacing.md,
    color: theme.textPrimary, fontSize: Typography.fontSize.base,
  },
  registerBtn: { borderRadius: BorderRadius.md, overflow: 'hidden', marginTop: Spacing.md },
  btnGradient: { paddingVertical: Spacing.md, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: Typography.fontSize.md, fontWeight: '700' },
  termsText: {
    textAlign: 'center', color: theme.textMuted,
    fontSize: Typography.fontSize.xs, marginTop: Spacing.md, lineHeight: 18,
  },
  termsLink: { color: theme.primary },
  loginLink: { alignItems: 'center', marginTop: Spacing.xl, marginBottom: Spacing.lg },
  loginLinkText: { color: theme.textSecondary, fontSize: Typography.fontSize.sm },
  loginLinkHighlight: { color: theme.primary, fontWeight: '600' },
});
