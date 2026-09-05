import React, { useState, useMemo } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, Modal, 
  TextInput, FlatList, KeyboardAvoidingView, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useAppTheme } from '../../hooks/useAppTheme';

export interface SelectOption {
  id: string;
  label: string;
  subtitle?: string;
  icon?: string;
}

interface SearchableSelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (val: string) => void;
  placeholder?: string;
  allowCustomEntry?: boolean;
  last?: boolean;
  displayValue?: string; // what to show in the field when selected
}

export function SearchableSelect({ 
  label, value, options, onChange, 
  placeholder = 'Seçiniz...', 
  allowCustomEntry = false,
  last = false,
  displayValue,
}: SearchableSelectProps) {
  const { colors: theme } = useAppTheme();
  const dynamicStyles = useMemo(() => styles(theme), [theme]);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const lower = search.toLowerCase();
    return options.filter(o => 
      o.label.toLowerCase().includes(lower) || 
      (o.subtitle && o.subtitle.toLowerCase().includes(lower))
    );
  }, [options, search]);

  const showCustomOption = allowCustomEntry && search.trim().length > 0 && 
    !options.some(o => o.label.toLowerCase() === search.trim().toLowerCase());

  const handleSelect = (id: string) => {
    onChange(id);
    setModalVisible(false);
    setSearch('');
  };

  const handleCustomEntry = () => {
    onChange(search.trim());
    setModalVisible(false);
    setSearch('');
  };

  // Determine what to display in the main input
  let displayedText = displayValue;
  if (!displayedText && value) {
    const selectedOpt = options.find(o => o.id === value);
    displayedText = selectedOpt ? selectedOpt.label : value;
  }

  return (
    <>
      <View style={[dynamicStyles.inputWrapper, !last && dynamicStyles.inputBorder]}>
        <Text style={dynamicStyles.inputLabel}>{label}</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={dynamicStyles.touchableArea}>
          <Text style={[dynamicStyles.inputText, !value && { color: theme.textMuted }]}>
            {value ? displayedText : placeholder}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={dynamicStyles.modalContainer}
        >
          <SafeAreaView style={dynamicStyles.modalContent}>
            {/* Modal Header */}
            <View style={dynamicStyles.modalHeader}>
              <Text style={dynamicStyles.modalTitle}>{label} Seçin</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={dynamicStyles.closeBtn}>Kapat</Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={dynamicStyles.searchContainer}>
              <Text style={dynamicStyles.searchIcon}>🔍</Text>
              <TextInput
                style={dynamicStyles.searchInput}
                placeholder="Ara..."
                placeholderTextColor={theme.textMuted}
                value={search}
                onChangeText={setSearch}
                autoFocus
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Text style={dynamicStyles.clearIcon}>✖</Text>
                </TouchableOpacity>
              )}
            </View>

            {allowCustomEntry && (
              <Text style={dynamicStyles.hintText}>
                💡 Listede bulamadığınız kayıtları klavyeden yazarak ekleyebilirsiniz.
              </Text>
            )}

            {/* List */}
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item.id}
              contentContainerStyle={dynamicStyles.listContent}
              ListHeaderComponent={() => showCustomOption ? (
                <TouchableOpacity style={dynamicStyles.customOptionBtn} onPress={handleCustomEntry}>
                  <Text style={dynamicStyles.customOptionIcon}>➕</Text>
                  <View>
                    <Text style={dynamicStyles.customOptionText}>"{search}" olarak kaydet</Text>
                    <Text style={dynamicStyles.customOptionSubtext}>Listede bulunamadığı için yeni oluşturulacak</Text>
                  </View>
                </TouchableOpacity>
              ) : null}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[dynamicStyles.optionItem, item.id === value && dynamicStyles.optionItemActive]} 
                  onPress={() => handleSelect(item.id)}
                >
                  <Text style={[dynamicStyles.optionIcon, item.id === value && dynamicStyles.optionIconActive]}>
                    {item.icon || (item.id === value ? '✅' : '○')}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[dynamicStyles.optionLabel, item.id === value && dynamicStyles.optionLabelActive]}>
                      {item.label}
                    </Text>
                    {item.subtitle && (
                      <Text style={[dynamicStyles.optionSubtitle, item.id === value && dynamicStyles.optionSubtitleActive]}>
                        {item.subtitle}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => !showCustomOption ? (
                <View style={dynamicStyles.emptyContainer}>
                  <Text style={dynamicStyles.emptyText}>Sonuç bulunamadı</Text>
                </View>
              ) : null}
            />
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = (theme: any) => StyleSheet.create({
  inputWrapper: { padding: Spacing.md },
  inputBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  inputLabel: { fontSize: Typography.fontSize.xs, color: theme.textMuted, marginBottom: 8 },
  touchableArea: { paddingVertical: 4 },
  inputText: { fontSize: Typography.fontSize.base, color: theme.textPrimary },
  
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.background, flex: 1, marginTop: 100, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.border },
  modalTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: theme.textPrimary },
  closeBtn: { fontSize: Typography.fontSize.base, color: theme.primary, fontWeight: '600' },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, margin: Spacing.lg, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: theme.border },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, height: 48, color: theme.textPrimary, fontSize: Typography.fontSize.base },
  clearIcon: { fontSize: 16, color: theme.textMuted, padding: 8 },
  hintText: { fontSize: Typography.fontSize.xs, color: theme.primary, fontStyle: 'italic', paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm },
  
  listContent: { paddingBottom: Spacing.xl },
  optionItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.border },
  optionItemActive: { backgroundColor: theme.primary + '15' },
  optionIcon: { fontSize: 18, width: 30, color: theme.textMuted },
  optionIconActive: { color: theme.primary },
  optionLabel: { fontSize: Typography.fontSize.base, color: theme.textPrimary, fontWeight: '500' },
  optionLabelActive: { color: theme.primary, fontWeight: '700' },
  optionSubtitle: { fontSize: Typography.fontSize.sm, color: theme.textSecondary, marginTop: 2 },
  optionSubtitleActive: { color: theme.primaryLight },
  
  customOptionBtn: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, backgroundColor: theme.primary + '20', borderBottomWidth: 1, borderBottomColor: theme.border },
  customOptionIcon: { fontSize: 20, width: 30, color: theme.primary },
  customOptionText: { fontSize: Typography.fontSize.base, color: theme.primary, fontWeight: '700' },
  customOptionSubtext: { fontSize: Typography.fontSize.xs, color: theme.primaryLight, marginTop: 2 },
  
  emptyContainer: { padding: Spacing.xl, alignItems: 'center' },
  emptyText: { color: theme.textMuted, fontSize: Typography.fontSize.base },
});
