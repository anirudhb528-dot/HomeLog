import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Card, Pill, Empty } from '../components';
import { maintenanceApi } from '../api/maintenance';
import { expensesApi } from '../api/expenses';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api/client';
import { formatCurrency, formatDate, daysUntil, isOverdue, titleCase } from '../utils/format';
import { colors, palette, spacing, typography } from '../theme';

export default function DashboardScreen() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [taskList, sum] = await Promise.all([
        maintenanceApi.list({ status: 'pending' }),
        expensesApi.summary(),
      ]);
      setTasks(taskList);
      setSummary(sum);
    } catch (e) {
      setError(errorMessage(e, 'Could not load your dashboard'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload whenever the tab gains focus so data stays fresh after edits.
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

  const overdue = tasks.filter((t) => isOverdue(t.dueDate, t.status));
  const upcoming = tasks
    .filter((t) => !isOverdue(t.dueDate, t.status))
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 4);
  const topCategories = (summary?.byCategory || []).slice(0, 3);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <Text style={styles.greeting}>Hi {user?.name?.split(' ')[0] || 'there'} 👋</Text>
      <Text style={styles.sub}>{user?.home?.nickname || 'Your home at a glance'}</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Spending snapshot */}
      <Card>
        <Text style={styles.cardTitle}>Spending snapshot</Text>
        <Text style={styles.bigNumber}>{formatCurrency(summary?.total || 0)}</Text>
        <Text style={styles.muted}>total logged across all categories</Text>
        <View style={styles.pillRow}>
          {topCategories.length === 0 ? (
            <Text style={styles.muted}>No expenses yet.</Text>
          ) : (
            topCategories.map((c) => (
              <Pill
                key={c.category}
                label={`${titleCase(c.category)} · ${formatCurrency(c.total)}`}
                style={styles.pill}
              />
            ))
          )}
        </View>
      </Card>

      {/* Overdue */}
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Overdue</Text>
          {overdue.length > 0 && <Pill label={`${overdue.length}`} color={palette.overdue} selected />}
        </View>
        {overdue.length === 0 ? (
          <Text style={styles.muted}>Nothing overdue — nice work! ✅</Text>
        ) : (
          overdue.map((t) => (
            <View key={t._id} style={styles.taskRow}>
              <Text style={styles.taskTitle}>{t.title}</Text>
              <Text style={styles.overdueText}>
                {Math.abs(daysUntil(t.dueDate))}d late · {formatDate(t.dueDate)}
              </Text>
            </View>
          ))
        )}
      </Card>

      {/* Upcoming */}
      <Card>
        <Text style={styles.cardTitle}>Upcoming maintenance</Text>
        {upcoming.length === 0 ? (
          <Empty title="No upcoming tasks" subtitle="Add tasks from the Maintenance tab." icon="🔧" />
        ) : (
          upcoming.map((t) => (
            <View key={t._id} style={styles.taskRow}>
              <Text style={styles.taskTitle}>{t.title}</Text>
              <Text style={styles.muted}>
                in {daysUntil(t.dueDate)}d · {formatDate(t.dueDate)}
              </Text>
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  greeting: { ...typography.h1 },
  sub: { ...typography.muted, marginBottom: spacing.lg },
  error: { color: colors.danger, marginBottom: spacing.md },
  cardTitle: { ...typography.h3, marginBottom: spacing.sm },
  bigNumber: { fontSize: 30, fontWeight: '800', color: colors.primary },
  muted: { ...typography.muted },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md, gap: spacing.sm },
  pill: { marginRight: spacing.sm, marginBottom: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskRow: { paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  taskTitle: { ...typography.body, fontWeight: '600' },
  overdueText: { color: palette.overdue, fontSize: 13, marginTop: 2 },
});
