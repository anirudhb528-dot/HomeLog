import React from 'react';
import { Text, View, Pressable, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme';

/**
 * Small rounded label/chip. Pass `color` for a custom tint, `selected` for the
 * filled state, and `onPress` to make it act as a filter toggle.
 */
export default function Pill({ label, color = colors.primary, selected, onPress, style }) {
  const Container = onPress ? Pressable : View;
  return (
    <Container
      onPress={onPress}
      style={[
        styles.pill,
        { borderColor: color },
        selected && { backgroundColor: color },
        style,
      ]}
    >
      <Text style={[styles.text, { color: selected ? '#fff' : color }]}>{label}</Text>
    </Container>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '600' },
});
