import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Card, Button, Field, Pill, Empty } from '../components';
import { servicesApi } from '../api/services';
import { errorMessage } from '../api/client';
import { formatDate, titleCase } from '../utils/format';
import { colors, spacing, typography } from '../theme';

export default function ServiceDetailScreen({ route }) {
  const { id } = route.params;
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Review form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Booking form state
  const [bookingNotes, setBookingNotes] = useState('');
  const [booking, setBooking] = useState(false);
  const [bookingMsg, setBookingMsg] = useState(null);

  const load = useCallback(async () => {
    try {
      setProvider(await servicesApi.get(id));
    } catch (e) {
      setError(errorMessage(e, 'Could not load provider'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const submitReview = async () => {
    setSubmittingReview(true);
    try {
      const updated = await servicesApi.addReview(id, { rating, comment: comment.trim() });
      setProvider(updated);
      setComment('');
      setRating(5);
    } catch (e) {
      Alert.alert('Error', errorMessage(e, 'Could not add review'));
    } finally {
      setSubmittingReview(false);
    }
  };

  const requestBooking = async () => {
    setBooking(true);
    setBookingMsg(null);
    try {
      await servicesApi.book(id, { notes: bookingNotes.trim() });
      setBookingNotes('');
      setBookingMsg('Booking requested! Track it under Profile → My bookings.');
    } catch (e) {
      Alert.alert('Error', errorMessage(e, 'Could not request booking'));
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !provider) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error || 'Provider not found'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.name}>{provider.name}</Text>
        <View style={styles.metaRow}>
          <Pill label={titleCase(provider.trade)} color={colors.primary} />
          <Text style={styles.rating}>
            ⭐ {provider.avgRating?.toFixed(1) ?? '0.0'} · {provider.reviewCount} reviews
          </Text>
        </View>
        <Text style={styles.muted}>
          {provider.city}
          {provider.state ? `, ${provider.state}` : ''}
        </Text>
        {provider.description ? <Text style={styles.desc}>{provider.description}</Text> : null}
        {provider.phone ? <Text style={styles.contact}>📞 {provider.phone}</Text> : null}
        {provider.email ? <Text style={styles.contact}>✉️ {provider.email}</Text> : null}
      </Card>

      {/* Request a booking */}
      <Card>
        <Text style={styles.sectionTitle}>Request a booking</Text>
        <Field
          label="Notes (optional)"
          value={bookingNotes}
          onChangeText={setBookingNotes}
          placeholder="Describe the job…"
          multiline
        />
        {bookingMsg ? <Text style={styles.success}>{bookingMsg}</Text> : null}
        <Button title="Request booking" onPress={requestBooking} loading={booking} />
      </Card>

      {/* Add a review */}
      <Card>
        <Text style={styles.sectionTitle}>Leave a review</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setRating(n)} hitSlop={6}>
              <Text style={styles.star}>{n <= rating ? '⭐' : '☆'}</Text>
            </Pressable>
          ))}
        </View>
        <Field
          label="Comment (optional)"
          value={comment}
          onChangeText={setComment}
          placeholder="How was your experience?"
          multiline
        />
        <Button title="Submit review" variant="secondary" onPress={submitReview} loading={submittingReview} />
      </Card>

      {/* Reviews list */}
      <Text style={styles.sectionTitle}>Reviews</Text>
      {provider.reviews?.length ? (
        provider.reviews
          .slice()
          .reverse()
          .map((r, idx) => (
            <Card key={r._id || idx}>
              <View style={styles.rowBetween}>
                <Text style={styles.reviewAuthor}>{r.authorName || 'Anonymous'}</Text>
                <Text style={styles.rating}>{'⭐'.repeat(r.rating)}</Text>
              </View>
              {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
              {r.createdAt ? <Text style={styles.small}>{formatDate(r.createdAt)}</Text> : null}
            </Card>
          ))
      ) : (
        <Empty title="No reviews yet" subtitle="Be the first to leave one." icon="⭐" />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  name: { ...typography.h1, fontSize: 22 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  rating: { fontSize: 13, color: colors.warning, fontWeight: '600' },
  muted: { ...typography.muted, marginTop: spacing.sm },
  desc: { ...typography.body, marginTop: spacing.md },
  contact: { ...typography.muted, marginTop: spacing.xs },
  sectionTitle: { ...typography.h3, marginBottom: spacing.md, marginTop: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stars: { flexDirection: 'row', marginBottom: spacing.md },
  star: { fontSize: 28, marginRight: spacing.xs },
  success: { color: colors.success, marginBottom: spacing.sm },
  error: { color: colors.danger },
  reviewAuthor: { ...typography.body, fontWeight: '600' },
  reviewComment: { ...typography.muted, marginTop: spacing.xs },
  small: { ...typography.small, marginTop: spacing.xs },
});
