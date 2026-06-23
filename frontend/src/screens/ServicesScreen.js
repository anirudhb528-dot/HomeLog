import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Card, Field, Pill, Empty } from '../components';
import { servicesApi } from '../api/services';
import { errorMessage } from '../api/client';
import { titleCase } from '../utils/format';
import { colors, spacing, typography } from '../theme';

const TRADES = ['plumber', 'electrician', 'hvac', 'landscaper', 'roofer', 'painter', 'cleaner', 'handyman', 'pest-control', 'general'];

export default function ServicesScreen({ navigation }) {
  const [providers, setProviders] = useState([]);
  const [query, setQuery] = useState('');
  const [trade, setTrade] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = {};
      if (query.trim()) params.q = query.trim();
      if (trade) params.trade = trade;
      setProviders(await servicesApi.list(params));
    } catch (e) {
      setError(errorMessage(e, 'Could not load providers'));
    }
  }, [query, trade]);

  // Reload on focus and whenever the trade filter changes.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const renderItem = ({ item }) => (
    <Pressable onPress={() => navigation.navigate('ServiceDetail', { id: item._id, name: item.name })}>
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.rating}>
            ⭐ {item.avgRating?.toFixed(1) ?? '0.0'} ({item.reviewCount})
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Pill label={titleCase(item.trade)} color={colors.primary} />
          <Text style={styles.muted}>
            {item.city}
            {item.state ? `, ${item.state}` : ''}
          </Text>
        </View>
        {item.description ? (
          <Text style={styles.desc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={providers}
        keyExtractor={(p) => p._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <Field
              placeholder="Search by name or keyword…"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={load}
              returnKeyType="search"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
              <Pressable onPress={() => setTrade(null)} style={styles.chipWrap}>
                <Pill label="All" color={colors.textMuted} selected={!trade} />
              </Pressable>
              {TRADES.map((t) => (
                <Pressable key={t} onPress={() => setTrade(trade === t ? null : t)} style={styles.chipWrap}>
                  <Pill label={titleCase(t)} color={colors.primary} selected={trade === t} />
                </Pressable>
              ))}
            </ScrollView>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={<Empty title="No providers found" subtitle="Try a different search or filter." icon="🧰" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg },
  filterRow: { marginBottom: spacing.md },
  chipWrap: { marginRight: spacing.sm },
  error: { color: colors.danger, marginBottom: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { ...typography.h3, flex: 1, marginRight: spacing.sm },
  rating: { fontSize: 13, color: colors.warning, fontWeight: '600' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  muted: { ...typography.muted },
  desc: { ...typography.muted, marginTop: spacing.sm },
});
