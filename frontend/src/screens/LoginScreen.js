import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { Screen, Field, Button } from '../components';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api/client';
import { colors, spacing, typography } from '../theme';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('demo@homelog.app');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      // On success the RootNavigator swaps to the app automatically.
    } catch (e) {
      setError(errorMessage(e, 'Could not log in'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.logo}>🏠 HomeLog</Text>
          <Text style={styles.tagline}>Maintenance, expenses & local services — all in one place.</Text>

          <View style={styles.form}>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title="Log in" onPress={onSubmit} loading={loading} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.muted}>New here?</Text>
            <Button
              title="Create an account"
              variant="ghost"
              onPress={() => navigation.navigate('Signup')}
              style={styles.footerBtn}
            />
          </View>
          <Text style={styles.demo}>Demo: demo@homelog.app / password123</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.xxl },
  logo: { ...typography.h1, fontSize: 32, textAlign: 'center', color: colors.primary },
  tagline: { ...typography.muted, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl },
  form: { marginTop: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.sm },
  footer: { marginTop: spacing.xl, alignItems: 'center' },
  footerBtn: { alignSelf: 'stretch', marginTop: spacing.sm },
  muted: { ...typography.muted },
  demo: { ...typography.small, textAlign: 'center', marginTop: spacing.xl },
});
