import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Card, Button, Field, Pill, Empty } from '../components';
import { expensesApi } from '../api/expenses';
import { errorMessage } from '../api/client';
import { formatCurrency, formatDate, titleCase } from '../utils/format';
import { colors, spacing, typography, radius } from '../theme';

const CATEGORIES = ['maintenance', 'utilities', 'improvement', 'insurance', 'taxes', 'services', 'other'];

// Distinct tints so the summary bars are easy to tell apart.
const CAT_COLOR = {
  maintenance: '#0F766E',
  utilities: '#2563EB',
  improvement: '#7C3AED',
  insurance: '#DB2777',
  taxes: '#DC2626',
  services: '#D97706',
  other: '#64748B',
};

export default function ExpensesScreen() {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [list, sum] = await Promise.all([expensesApi.list(), expensesApi.summary()]);
      setExpenses(list);
      setSummary(sum);
    } catch (e) {
      setError(errorMessage(e, 'Could not load expenses'));
    }
  }, []);

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

  const onDelete = (item) => {
    const doDelete = async () => {
      try {
        await expensesApi.remove(item._id);
        await load();
      } catch (e) {
        Alert.alert('Error', errorMessage(e));
      }
    };
    Alert.alert('Delete expense', `Delete "${item.description}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doDelete },
    ]);
  };

  const maxCat = Math.max(1, ...(summary?.byCategory || []).map((c) => c.total));

  const renderItem = ({ item }) => (
    <Card>
      <View style={styles.rowBetween}>
        <Text style={styles.desc}>{item.description}</Text>
        <Text style={styles.amount}>{formatCurrency(item.amount, item.currency)}</Text>
      </View>
      <View style={styles.metaRow}>
        <Pill label={titleCase(item.category)} color={CAT_COLOR[item.category] || colors.primary} />
        <Text style={styles.muted}>{formatDate(item.date)}</Text>
      </View>
      <Pressable onPress={() => onDelete(item)} hitSlop={8}>
        <Text style={styles.delete}>Delete</Text>
      </Pressable>
    </Card>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={expenses}
        keyExtractor={(e) => e._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <Text style={styles.h1}>Expenses</Text>
            <Button title="+ Log expense" onPress={() => setModalOpen(true)} style={styles.addBtn} />
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {/* Summary with simple bar breakdown */}
            <Card>
              <Text style={styles.cardTitle}>Total spent</Text>
              <Text style={styles.bigNumber}>{formatCurrency(summary?.total || 0)}</Text>
              <View style={styles.bars}>
                {(summary?.byCategory || []).length === 0 ? (
                  <Text style={styles.muted}>No expenses logged yet.</Text>
                ) : (
                  summary.byCategory.map((c) => (
                    <View key={c.category} style={styles.barRow}>
                      <Text style={styles.barLabel}>{titleCase(c.category)}</Text>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              width: `${Math.max(6, (c.total / maxCat) * 100)}%`,
                              backgroundColor: CAT_COLOR[c.category] || colors.primary,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.barValue}>{formatCurrency(c.total)}</Text>
                    </View>
                  ))
                )}
              </View>
            </Card>
            <Text style={styles.sectionTitle}>Recent</Text>
          </View>
        }
        ListEmptyComponent={<Empty title="No expenses yet" subtitle="Log your first home expense above." icon="💵" />}
      />

      <ExpenseModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={async () => {
          setModalOpen(false);
          await load();
        }}
      />
    </View>
  );
}

function ExpenseModal({ visible, onClose, onCreated }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('maintenance');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const reset = () => {
    setDescription('');
    setAmount('');
    setCategory('maintenance');
    setError(null);
  };

  const submit = async () => {
    setError(null);
    const value = parseFloat(amount);
    if (!description.trim()) return setError('Description is required');
    if (Number.isNaN(value) || value < 0) return setError('Enter a valid amount');
    setSaving(true);
    try {
      await expensesApi.create({
        description: description.trim(),
        amount: value,
        category,
        date: new Date().toISOString(),
      });
      reset();
      await onCreated();
    } catch (e) {
      setError(errorMessage(e, 'Could not log expense'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Log an expense</Text>
            <Field label="Description" value={description} onChangeText={setDescription} placeholder="e.g. Plumber visit" />
            <Field
              label="Amount (USD)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
            <Text style={styles.pickerLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {CATEGORIES.map((c) => (
                <Pressable key={c} onPress={() => setCategory(c)} style={styles.chipWrap}>
                  <Pill label={titleCase(c)} color={CAT_COLOR[c]} selected={category === c} />
                </Pressable>
              ))}
            </ScrollView>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title="Save expense" onPress={submit} loading={saving} style={styles.modalBtn} />
            <Button title="Cancel" variant="ghost" onPress={onClose} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg },
  h1: { ...typography.h1, marginBottom: spacing.md },
  addBtn: { marginBottom: spacing.md },
  error: { color: colors.danger, marginVertical: spacing.sm },
  cardTitle: { ...typography.h3 },
  bigNumber: { fontSize: 30, fontWeight: '800', color: colors.primary, marginBottom: spacing.md },
  bars: { marginTop: spacing.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  barLabel: { width: 90, fontSize: 12, color: colors.textMuted },
  barTrack: { flex: 1, height: 10, backgroundColor: colors.border, borderRadius: radius.pill, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: radius.pill },
  barValue: { width: 78, textAlign: 'right', fontSize: 12, fontWeight: '600', color: colors.text },
  sectionTitle: { ...typography.h3, marginTop: spacing.md, marginBottom: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  desc: { ...typography.body, fontWeight: '600', flex: 1, marginRight: spacing.sm },
  amount: { ...typography.body, fontWeight: '700', color: colors.primary },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  muted: { ...typography.muted },
  delete: { color: colors.danger, fontSize: 13, marginTop: spacing.sm },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  modalTitle: { ...typography.h2, marginBottom: spacing.lg },
  modalBtn: { marginTop: spacing.md, marginBottom: spacing.sm },
  pickerLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: spacing.sm },
  chipScroll: { marginBottom: spacing.md },
  chipWrap: { marginRight: spacing.sm },
});
