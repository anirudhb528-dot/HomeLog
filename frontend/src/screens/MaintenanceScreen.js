import React, { useCallback, useEffect, useState } from 'react';
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
import { maintenanceApi } from '../api/maintenance';
import { errorMessage } from '../api/client';
import { formatDate, daysUntil, isOverdue, titleCase } from '../utils/format';
import { colors, palette, spacing, typography, radius } from '../theme';

const CATEGORIES = ['hvac', 'plumbing', 'electrical', 'exterior', 'appliances', 'safety', 'landscaping', 'general'];
const RECURRENCES = ['none', 'monthly', 'quarterly', 'biannual', 'annual'];
const PRIORITIES = ['low', 'medium', 'high'];

const PRIORITY_COLOR = { low: palette.low, medium: palette.medium, high: palette.high };

export default function MaintenanceScreen() {
  const [tasks, setTasks] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null); // null = create mode

  const openCreate = () => {
    setEditingTask(null);
    setModalOpen(true);
  };
  const openEdit = (task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const load = useCallback(async () => {
    setError(null);
    try {
      setTasks(await maintenanceApi.list());
    } catch (e) {
      setError(errorMessage(e, 'Could not load tasks'));
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

  const onComplete = async (task) => {
    try {
      await maintenanceApi.complete(task._id);
      await load();
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
    }
  };

  const onDelete = (task) => {
    const doDelete = async () => {
      try {
        await maintenanceApi.remove(task._id);
        await load();
      } catch (e) {
        Alert.alert('Error', errorMessage(e));
      }
    };
    // Alert.alert confirm isn't available on web — fall back to immediate delete there.
    if (typeof Alert.alert === 'function') {
      Alert.alert('Delete task', `Delete "${task.title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    } else {
      doDelete();
    }
  };

  const renderItem = ({ item }) => {
    const overdue = isOverdue(item.dueDate, item.status);
    const done = item.status === 'done';
    return (
      <Card>
        <View style={styles.rowBetween}>
          <Text style={[styles.title, done && styles.doneTitle]}>{item.title}</Text>
          <Pill label={titleCase(item.priority)} color={PRIORITY_COLOR[item.priority]} />
        </View>
        <View style={styles.metaRow}>
          <Pill label={titleCase(item.category)} color={colors.textMuted} style={styles.metaPill} />
          {item.recurrence !== 'none' && (
            <Pill label={`↻ ${titleCase(item.recurrence)}`} color={colors.primary} style={styles.metaPill} />
          )}
        </View>
        <Text style={[styles.due, overdue && styles.overdue]}>
          {done
            ? `Completed ${formatDate(item.completedAt)}`
            : overdue
              ? `Overdue by ${Math.abs(daysUntil(item.dueDate))}d · ${formatDate(item.dueDate)}`
              : `Due ${formatDate(item.dueDate)} (in ${daysUntil(item.dueDate)}d)`}
        </Text>
        {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}

        <View style={styles.actions}>
          {!done && (
            <Button title="Complete" variant="secondary" onPress={() => onComplete(item)} style={styles.actionBtn} />
          )}
          <Button title="Edit" variant="ghost" onPress={() => openEdit(item)} style={styles.actionBtn} />
          <Button title="Delete" variant="ghost" onPress={() => onDelete(item)} style={styles.actionBtn} />
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={tasks}
        keyExtractor={(t) => t._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.h1}>Maintenance</Text>
            <Button title="+ Add task" onPress={openCreate} style={styles.addBtn} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={<Empty title="No tasks yet" subtitle="Tap “Add task” to schedule your first one." icon="🔧" />}
      />

      <TaskModal
        visible={modalOpen}
        task={editingTask}
        onClose={() => setModalOpen(false)}
        onSaved={async () => {
          setModalOpen(false);
          await load();
        }}
      />
    </View>
  );
}

/** Modal form for creating or editing a task. Pass `task` to edit, omit to create. */
function TaskModal({ visible, task, onClose, onSaved }) {
  const isEdit = !!task;
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('general');
  const [recurrence, setRecurrence] = useState('none');
  const [priority, setPriority] = useState('medium');
  const [dueInDays, setDueInDays] = useState('7');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Prefill from the task when editing (or reset to defaults when creating)
  // each time the modal opens.
  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (task) {
      setTitle(task.title || '');
      setNotes(task.notes || '');
      setCategory(task.category || 'general');
      setRecurrence(task.recurrence || 'none');
      setPriority(task.priority || 'medium');
      setDueInDays(String(Math.max(0, daysUntil(task.dueDate))));
    } else {
      setTitle('');
      setNotes('');
      setCategory('general');
      setRecurrence('none');
      setPriority('medium');
      setDueInDays('7');
    }
  }, [visible, task]);

  const submit = async () => {
    setError(null);
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    const due = new Date();
    due.setDate(due.getDate() + (parseInt(dueInDays, 10) || 0));
    const payload = {
      title: title.trim(),
      notes: notes.trim(),
      category,
      recurrence,
      priority,
      dueDate: due.toISOString(),
    };
    setSaving(true);
    try {
      if (isEdit) {
        await maintenanceApi.update(task._id, payload);
      } else {
        await maintenanceApi.create(payload);
      }
      await onSaved();
    } catch (e) {
      setError(errorMessage(e, `Could not ${isEdit ? 'update' : 'create'} task`));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>{isEdit ? 'Edit task' : 'New maintenance task'}</Text>
            <Field label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Replace air filter" />
            <Field
              label="Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Details, part numbers, etc."
              multiline
            />
            <Field
              label="Due in (days)"
              value={dueInDays}
              onChangeText={setDueInDays}
              keyboardType="number-pad"
              placeholder="7"
            />

            <ChipPicker label="Category" options={CATEGORIES} value={category} onChange={setCategory} />
            <ChipPicker label="Recurrence" options={RECURRENCES} value={recurrence} onChange={setRecurrence} />
            <ChipPicker
              label="Priority"
              options={PRIORITIES}
              value={priority}
              onChange={setPriority}
              colorFor={(o) => PRIORITY_COLOR[o]}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title={isEdit ? 'Save changes' : 'Create task'} onPress={submit} loading={saving} style={styles.modalBtn} />
            <Button title="Cancel" variant="ghost" onPress={onClose} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** A horizontal row of selectable pills. */
function ChipPicker({ label, options, value, onChange, colorFor }) {
  return (
    <View style={styles.picker}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map((o) => (
          <Pressable key={o} onPress={() => onChange(o)} style={styles.chipWrap}>
            <Pill
              label={titleCase(o)}
              color={colorFor ? colorFor(o) : colors.primary}
              selected={value === o}
            />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg },
  header: { marginBottom: spacing.sm },
  h1: { ...typography.h1, marginBottom: spacing.md },
  addBtn: { marginBottom: spacing.md },
  error: { color: colors.danger, marginVertical: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...typography.h3, flex: 1, marginRight: spacing.sm },
  doneTitle: { textDecorationLine: 'line-through', color: colors.textMuted },
  metaRow: { flexDirection: 'row', marginTop: spacing.sm, flexWrap: 'wrap', gap: spacing.sm },
  metaPill: { marginRight: spacing.sm },
  due: { ...typography.muted, marginTop: spacing.sm },
  overdue: { color: palette.overdue, fontWeight: '600' },
  notes: { ...typography.muted, marginTop: spacing.xs, fontStyle: 'italic' },
  actions: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.sm },
  actionBtn: { flex: 1 },
  // Modal
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
  picker: { marginBottom: spacing.md },
  pickerLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: spacing.sm },
  chipWrap: { marginRight: spacing.sm },
});
