import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Typography, Spacing } from '../../constants/theme';
import { useAppTheme } from '../../hooks/useAppTheme';

interface DatePickerFieldProps {
  label: string;
  value: string; // ISO date string (YYYY-MM-DD)
  onChange: (date: string) => void;
  last?: boolean;
}

export function DatePickerField({ label, value, onChange, last = false }: DatePickerFieldProps) {
  const { colors: theme, isDark } = useAppTheme();
  const dynamicStyles = useMemo(() => styles(theme), [theme]);
  const [show, setShow] = useState(false);

  const parsedDate = value ? new Date(value) : new Date();

  // Format date as DD.MM.YYYY
  const formattedDate = value 
    ? value.split('-').reverse().join('.') 
    : 'Tarih Seçin';

  const handleDateChange = (event: any, selectedDate?: Date) => {
    // Android auto-closes on selection, so we just set show to false
    if (Platform.OS === 'android') {
      setShow(false);
    }
    // On iOS we want to manually close if the user tapped a date on the inline picker or if they click the wrapper
    // Wait, on iOS, the onChange fires every time the spinner moves or a day is tapped.
    
    if (selectedDate) {
      // YYYY-MM-DD format for storage
      const isoDate = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      onChange(isoDate);
    }
  };

  return (
    <View style={[dynamicStyles.inputWrapper, !last && dynamicStyles.inputBorder]}>
      <Text style={dynamicStyles.inputLabel}>{label}</Text>
      
      <TouchableOpacity onPress={() => setShow(true)} style={dynamicStyles.touchableArea}>
        <Text style={[dynamicStyles.inputText, !value && { color: theme.textMuted }]}>
          {formattedDate}
        </Text>
      </TouchableOpacity>

      {/* For Android, conditionally rendering the DateTimePicker opens its native modal */}
      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={parsedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          locale="tr-TR"
        />
      )}

      {/* For iOS, we wrap it in a custom Modal so we can add a "Kapat" (Done) button, ensuring it closes */}
      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent={true} animationType="slide">
          <View style={dynamicStyles.modalOverlay}>
            <View style={dynamicStyles.modalContent}>
              <View style={dynamicStyles.modalHeader}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={dynamicStyles.modalDoneText}>Bitti</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={parsedDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                textColor={theme.textPrimary}
                themeVariant={isDark ? 'dark' : 'light'}
                locale="tr-TR"
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = (theme: any) => StyleSheet.create({
  inputWrapper: {
    padding: Spacing.md,
  },
  inputBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  inputLabel: {
    fontSize: Typography.fontSize.xs,
    color: theme.textMuted,
    marginBottom: 4,
  },
  touchableArea: {
    paddingVertical: 4,
  },
  inputText: {
    fontSize: Typography.fontSize.base,
    color: theme.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: theme.background,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.surface,
  },
  modalDoneText: {
    fontSize: Typography.fontSize.base,
    color: theme.primary,
    fontWeight: 'bold',
  },
});
