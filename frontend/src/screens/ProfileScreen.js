import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Card, Button, Field, Pill, Empty } from '../components';
import { useAuth } from '../context/AuthContext';
import { servicesApi } from '../api/services';
import { errorMessage } from '../api/client';
import { formatDate, titleCase } from '../utils/format';
import { colors, spacing, typography } from '../theme';

export default function ProfileScreen() {
  const { user, updateProfile, logout } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [home, setHome] = useState({
    nickname: user?.home?.nickname || '',
    type: user?.home?.type || '',
    city: user?.home?.city || '',
    state: user?.home?.state || '',
    sizeSqFt: user?.home?.sizeSqFt ? String(user.home.sizeSqFt) : '',
    yearBuilt: user?.home?.yearBuilt ? String(user.home.yearBuilt) : '',
  });
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(null);

  const [bookings, setBookings] = useState([]);

  const loadBookings = useCallback(async () => {
    try {
      setBookings(await servicesApi.myBookings());
    } catch (_e) {
      // Non-fatal for the profile screen.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [loadBookings])
  );

  const setHomeField = (key) => (val) => setHome((h) => ({ ...h, [key]: val }));

  const save = async () => {
    setSaving(true);
    setSavedMsg(null);
    try {
      await updateProfile({
        name: name.trim(),
        home: {
          nickname: home.nickname.trim(),
          type: home.type.trim(),
          city: home.city.trim(),
          state: home.state.trim(),
          sizeSqFt: home.sizeSqFt ? Number(home.sizeSqFt) : undefined,
          yearBuilt: home.yearBuilt ? Number(home.yearBuilt) : undefined,
        },
      });
      setSavedMsg('Profile saved ✓');
    } catch (e) {
      Alert.alert('Error', errorMessage(e, 'Could not save profile'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Profile</Text>

      <Card>
        <Text style={styles.sectionTitle}>Account</Text>
        <Field label="Name" value={name} onChangeText={setName} />
        <Field label="Email" value={user?.email || ''} editable={false} />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Home details</Text>
        <Field label="Nickname" value={home.nickname} onChangeText={setHomeField('nickname')} placeholder="e.g. The Maple House" />
        <Field label="Type" value={home.type} onChangeText={setHomeField('type')} placeholder="house, condo…" />
        <Field label="City" value={home.city} onChangeText={setHomeField('city')} />
        <Field label="State" value={home.state} onChangeText={setHomeField('state')} />
        <Field label="Size (sq ft)" value={home.sizeSqFt} onChangeText={setHomeField('sizeSqFt')} keyboardType="number-pad" />
        <Field label="Year built" value={home.yearBuilt} onChangeText={setHomeField('yearBuilt')} keyboardType="number-pad" />
        {savedMsg ? <Text style={styles.success}>{savedMsg}</Text> : null}
        <Button title="Save changes" onPress={save} loading={saving} />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>My bookings</Text>
        {bookings.length === 0 ? (
          <Empty title="No bookings yet" subtitle="Request one from the Services tab." icon="📋" />
        ) : (
          bookings.map((b) => (
            <View key={b._id} style={styles.bookingRow}>
              <View style={styles.rowBetween}>
                <Text style={styles.bookingName}>{b.provider?.name || 'Provider'}</Text>
                <Pill label={titleCase(b.status)} color={colors.primary} />
              </View>
              <Text style={styles.muted}>
                {b.provider?.trade ? `${titleCase(b.provider.trade)} · ` : ''}
                Requested {formatDate(b.createdAt)}
              </Text>
              {b.notes ? <Text style={styles.muted}>“{b.notes}”</Text> : null}
            </View>
          ))
        )}
      </Card>

      <Button title="Log out" variant="danger" onPress={logout} style={styles.logout} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  h1: { ...typography.h1, marginBottom: spacing.md },
  sectionTitle: { ...typography.h3, marginBottom: spacing.md },
  success: { color: colors.success, marginBottom: spacing.sm },
  muted: { ...typography.muted, marginTop: spacing.xs },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookingRow: { paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  bookingName: { ...typography.body, fontWeight: '600' },
  logout: { marginTop: spacing.sm, marginBottom: spacing.xxl },
});
