import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Plus, X, MessageSquare, Check } from 'lucide-react-native';
import { Typography, Spacing, BorderRadius } from '../constants/theme';

const STORAGE_KEY = '@motortrack_payment_canned_notes';

export const DEFAULT_CANNED_NOTES = [
  '💵 Elden nakit teslim alındı',
  '🔒 Kapora / Ön ödeme alındı',
  '✅ İş bitimi bakiye kapatıldı',
  '🏦 Müşteri IBAN ile gönderdi',
  '💳 POS / Kredi kartı ile çekildi',
  '📅 Kalan borç hafta içi ödenecek',
  '🎁 Müşteri usta bahşişi bıraktı',
  '🤝 Müşteriyle mutabık kalındı',
];

interface CannedNotesPickerProps {
  currentNote: string;
  onSelectNote: (note: string) => void;
  theme: any;
}

export function CannedNotesPicker({ currentNote, onSelectNote, theme }: CannedNotesPickerProps) {
  const [notes, setNotes] = useState<string[]>(DEFAULT_CANNED_NOTES);
  const [isAdding, setIsAdding] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');

  // AsyncStorage'dan hazır notları yükle
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setNotes(parsed);
          }
        }
      } catch (err) {
        console.error('Hazır notlar yüklenirken hata:', err);
      }
    };
    loadNotes();
  }, []);

  const saveNotes = async (updated: string[]) => {
    setNotes(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Hazır notlar kaydedilirken hata:', err);
    }
  };

  // Yeni hazır not ekle
  const handleAddNote = () => {
    const trimmed = newNoteText.trim();
    if (!trimmed) return;
    if (notes.includes(trimmed)) {
      Alert.alert('Mevcut', 'Bu hazır not zaten listenizde mevcut.');
      return;
    }
    const updated = [...notes, trimmed];
    saveNotes(updated);
    setNewNoteText('');
    setIsAdding(false);
    // Yeni eklenen notu doğrudan mevcut nota da ekle
    handleApplyNote(trimmed);
  };

  // Hazır notu sil
  const handleDeleteNote = (noteToDelete: string) => {
    Alert.alert(
      'Hazır Notu Sil',
      `"${noteToDelete}" notunu hazır metinler listesinden silmek istiyor musunuz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            const updated = notes.filter((n) => n !== noteToDelete);
            saveNotes(updated);
          },
        },
      ]
    );
  };

  // Notu metin alanına uygula / ekle
  const handleApplyNote = (noteText: string) => {
    if (!currentNote.trim()) {
      onSelectNote(noteText);
    } else {
      if (currentNote.includes(noteText)) {
        return; // Zaten ekli
      }
      onSelectNote(`${currentNote.trim()}, ${noteText}`);
    }
  };

  return (
    <View style={{ marginBottom: Spacing.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <MessageSquare size={13} color={theme.primary} />
          <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textSecondary }}>
            Hazır Not Şablonları
          </Text>
          <Text style={{ fontSize: 10, color: theme.textMuted }}>
            (Dokun: Ekle • Basılı Tut: Sil)
          </Text>
        </View>

        {!isAdding && (
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 3,
              backgroundColor: theme.primary + '15',
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: BorderRadius.full,
            }}
            onPress={() => setIsAdding(true)}
          >
            <Plus size={11} color={theme.primary} />
            <Text style={{ fontSize: 10, fontWeight: '700', color: theme.primary }}>
              Yeni Şablon Ekle
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Yeni Şablon Ekleme Giriş Alanı */}
      {isAdding && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.surface,
            borderWidth: 1.5,
            borderColor: theme.primary,
            borderRadius: BorderRadius.md,
            paddingHorizontal: Spacing.sm,
            paddingVertical: 4,
            marginBottom: Spacing.xs,
            gap: Spacing.xs,
          }}
        >
          <TextInput
            style={{
              flex: 1,
              fontSize: Typography.fontSize.xs,
              color: theme.textPrimary,
              paddingVertical: 4,
            }}
            placeholder="Örn: 3 taksit yapıldı..."
            placeholderTextColor={theme.textMuted}
            value={newNoteText}
            onChangeText={setNewNoteText}
            autoFocus
          />
          <TouchableOpacity
            style={{
              backgroundColor: theme.primary,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: BorderRadius.sm,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 2,
            }}
            onPress={handleAddNote}
          >
            <Check size={12} color="#fff" />
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>Kaydet</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ padding: 4 }}
            onPress={() => {
              setIsAdding(false);
              setNewNoteText('');
            }}
          >
            <X size={16} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Kaydırılabilir Hazır Not Çipleri */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
        {notes.map((note, index) => {
          const isSelected = currentNote.includes(note);
          return (
            <TouchableOpacity
              key={`${note}-${index}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isSelected ? theme.primary + '20' : theme.surface,
                borderWidth: 1,
                borderColor: isSelected ? theme.primary : theme.border,
                borderRadius: BorderRadius.full,
                paddingHorizontal: 10,
                paddingVertical: 5,
                gap: 4,
              }}
              onPress={() => handleApplyNote(note)}
              onLongPress={() => handleDeleteNote(note)}
              delayLongPress={400}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: isSelected ? '700' : '500',
                  color: isSelected ? theme.primary : theme.textPrimary,
                }}
              >
                {note}
              </Text>
              <TouchableOpacity
                onPress={() => handleDeleteNote(note)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ marginLeft: 2 }}
              >
                <X size={10} color={isSelected ? theme.primary : theme.textMuted} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
