import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, View } from '@/components/Themed';
import { Theme } from '@/constants/Theme';
import { useAuth } from '@/context/AuthContext';

type Mode = 'login' | 'register';

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!phone.trim() || !password.trim()) {
      setError('Введите телефон и пароль');
      return;
    }
    if (password.length < 6) {
      setError('Пароль минимум 6 символов');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(phone.trim(), password);
      } else {
        await register(phone.trim(), password, name.trim() || undefined);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={Theme.bannerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.logoWrap}>
            <FontAwesome name="medkit" size={36} color="#fff" />
          </View>
          <Text style={styles.appName}>HamshiraGo</Text>
          <Text style={styles.appTagline}>Медсёстры на дом</Text>
        </LinearGradient>

        <View style={styles.card}>
          <View style={styles.tabRow}>
            <Pressable
              style={[styles.tab, mode === 'login' && styles.tabActive]}
              onPress={() => { setMode('login'); setError(null); }}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>
                Войти
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, mode === 'register' && styles.tabActive]}
              onPress={() => { setMode('register'); setError(null); }}
            >
              <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>
                Регистрация
              </Text>
            </Pressable>
          </View>

          {mode === 'register' && (
            <>
              <Text style={styles.label}>Имя</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Иван (необязательно)"
                placeholderTextColor={Theme.textSecondary}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </>
          )}

          <Text style={styles.label}>Телефон *</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+998901234567"
            placeholderTextColor={Theme.textSecondary}
            keyboardType="phone-pad"
            autoComplete="tel"
            returnKeyType="next"
          />

          <Text style={styles.label}>Пароль *</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Минимум 6 символов"
            placeholderTextColor={Theme.textSecondary}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          {error && (
            <View style={styles.errorBox}>
              <FontAwesome name="exclamation-circle" size={14} color={Theme.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [styles.submitBtn, pressed && styles.submitBtnPressed, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>
                {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
              </Text>
            )}
          </Pressable>

          <Pressable onPress={toggleMode} style={styles.switchLink}>
            <Text style={styles.switchText} lightColor={Theme.textSecondary} darkColor={Theme.textSecondary}>
              {mode === 'login' ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
              <Text style={styles.switchTextBold} lightColor={Theme.primary} darkColor={Theme.primary}>
                {mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
              </Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.background,
  },
  scroll: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 80,
    paddingBottom: 48,
    alignItems: 'center',
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
  },
  appTagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  card: {
    margin: 16,
    marginTop: -24,
    backgroundColor: Theme.surface,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Theme.background,
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Theme.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.textSecondary,
  },
  tabTextActive: {
    color: Theme.primary,
  },
  label: {
    fontSize: 13,
    color: Theme.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Theme.background,
    borderWidth: 1,
    borderColor: Theme.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: Theme.text,
    marginBottom: 14,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${Theme.error}12`,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: Theme.error,
  },
  submitBtn: {
    backgroundColor: Theme.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnPressed: { opacity: 0.9 },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  switchLink: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 4,
  },
  switchText: {
    fontSize: 14,
  },
  switchTextBold: {
    fontWeight: '600',
  },
});
