import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { companiesAPI } from '../../src/api/client';
import { Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { useAuthStore } from '../../src/store/auth.store';
import {
  ArrowLeft,
  Users,
  ShieldCheck,
  KeyRound,
  UserPlus,
  UserCheck,
  UserX,
  Search,
  Lock,
  Crown,
  Briefcase,
  Wrench,
  Clock,
  Mail,
  Share2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Eye,
  EyeOff,
  Sparkles,
  LogOut,
} from 'lucide-react-native';

interface UserItem {
  id: string;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'TECHNICIAN';
  isActive: boolean;
  lastLoginAt: string | null;
  avatarUrl: string | null;
  createdAt: string;
  _count?: {
    workOrders?: number;
    maintenanceRecords?: number;
    partMovements?: number;
    cashTransactions?: number;
  };
}

const ROLES_INFO = {
  ADMIN: {
    label: 'Yönetici',
    description: 'Tüm yetkilere sahiptir. Kullanıcılar, ayarlar, finans ve operasyonları yönetebilir.',
    icon: Crown,
    color: '#10B981', // Emerald
    bgColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  MANAGER: {
    label: 'Müdür',
    description: 'İş emirleri, kasa, stok ve tedarikçileri yönetebilir. Personel ekleyip çıkaramaz.',
    icon: Briefcase,
    color: '#3B82F6', // Blue
    bgColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: '#3B82F6',
  },
  TECHNICIAN: {
    label: 'Teknisyen / Usta',
    description: 'İş emirlerini görüntüleyip parça kullanabilir. Finans ve hassas verilere erişemez.',
    icon: Wrench,
    color: '#F59E0B', // Amber
    bgColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#F59E0B',
  },
  SUPER_ADMIN: {
    label: 'Sistem Yöneticisi',
    description: 'En üst düzey platform yetkilisi.',
    icon: ShieldCheck,
    color: '#8B5CF6', // Purple
    bgColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: '#8B5CF6',
  },
};

function formatDate(dateStr?: string | null) {
  if (!dateStr) return 'Hiç giriş yapmadı';
  const d = new Date(dateStr);
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function generateRandomPassword() {
  const words = ['Usta', 'Motor', 'Garaj', 'Servis', 'Hizli', 'Guvenli'];
  const symbols = ['!', '@', '#', '$', '%'];
  const randomWord = words[Math.floor(Math.random() * words.length)];
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
  return `${randomWord}${randomNum}${randomSymbol}`;
}

export default function UsersManagementScreen() {
  const { colors: theme, isDark } = useAppTheme();
  const currentUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkış yapmak ve kullanıcı giriş ekranına dönmek istediğinizden emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/(auth)/login');
            } catch (err) {
              router.replace('/(auth)/login');
            }
          },
        },
      ]
    );
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');

  // Modals state
  const [resetModalUser, setResetModalUser] = useState<UserItem | null>(null);
  const [roleModalUser, setRoleModalUser] = useState<UserItem | null>(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  // Form states for Password Reset Modal
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form states for Role Modal
  const [editRole, setEditRole] = useState<'ADMIN' | 'MANAGER' | 'TECHNICIAN'>('TECHNICIAN');
  const [editIsActive, setEditIsActive] = useState(true);

  // Form states for Add User Modal
  const [addFullName, setAddFullName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState<'ADMIN' | 'MANAGER' | 'TECHNICIAN'>('TECHNICIAN');
  const [addShowPassword, setAddShowPassword] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  // Fetch Users
  const {
    data: usersData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['companyUsers'],
    queryFn: () => companiesAPI.getUsers(),
    enabled: !!isAdmin,
  });

  const users: UserItem[] = (usersData as any)?.data || [];

  // Reset Password Mutation
  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, pass }: { id: string; pass: string }) =>
      companiesAPI.resetPassword(id, pass),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['companyUsers'] });
      const userObj = resetModalUser;
      setResetModalUser(null);
      setNewPassword('');

      Alert.alert(
        '✅ Şifre Sıfırlandı',
        `${userObj?.fullName} kullanıcısının şifresi başarıyla güncellendi.\n\nYeni Şifre: ${variables.pass}\n\nKullanıcıya iletmek için paylaşmak ister misiniz?`,
        [
          { text: 'Kapat', style: 'cancel' },
          {
            text: 'Paylaş',
            onPress: () => {
              Share.share({
                title: 'MotorTrack Giriş Bilgileri',
                message: `Merhaba ${userObj?.fullName},\nMotorTrack hesabınızın yeni giriş şifresi: ${variables.pass}\nSisteme e-posta adresiniz (${userObj?.email}) ve bu şifre ile giriş yapabilirsiniz.`,
              });
            },
          },
        ]
      );
    },
    onError: (err: any) => {
      Alert.alert('Hata', err?.error || err?.message || 'Şifre sıfırlanırken hata oluştu.');
    },
  });

  // Update Role & Status Mutation
  const updateUserMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { role?: string; isActive?: boolean; fullName?: string };
    }) => companiesAPI.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyUsers'] });
      setRoleModalUser(null);
      Alert.alert('Başarılı', 'Kullanıcı yetki ve durum bilgileri güncellendi.');
    },
    onError: (err: any) => {
      Alert.alert('Hata', err?.error || err?.message || 'Kullanıcı güncellenirken hata oluştu.');
    },
  });

  // Create User Mutation
  const createUserMutation = useMutation({
    mutationFn: (data: { email: string; fullName: string; role: string; password?: string }) =>
      companiesAPI.createUser(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['companyUsers'] });
      setIsAddUserModalOpen(false);
      setAddFullName('');
      setAddEmail('');
      setAddPassword('');
      setAddRole('TECHNICIAN');

      Alert.alert(
        '🎉 Kullanıcı Oluşturuldu',
        `${variables.fullName} başarıyla sisteme eklendi.\nE-posta: ${variables.email}\nŞifre: ${variables.password || 'MotorTrack2024!'}`,
        [
          { text: 'Tamam', style: 'default' },
          {
            text: 'Bilgileri Paylaş',
            onPress: () => {
              Share.share({
                title: 'MotorTrack Hesap Bilgileri',
                message: `Merhaba ${variables.fullName},\nMotorTrack hesabınız oluşturuldu.\nE-posta: ${variables.email}\nŞifre: ${variables.password || 'MotorTrack2024!'}`,
              });
            },
          },
        ]
      );
    },
    onError: (err: any) => {
      const msg = err?.message || err?.error || 'Kullanıcı oluşturulurken bir hata oluştu.';
      if (
        msg.includes('token') ||
        msg.includes('Yetkilendirme') ||
        msg.includes('oturum') ||
        msg.includes('yetkiniz yok')
      ) {
        setIsAddUserModalOpen(false);
        Alert.alert(
          'Yetki / Oturum Hatası',
          `${msg}\n\nKullanıcı ekleme işlemi sadece Şirket Yöneticisi (ADMIN) hesabı ile yapılabilir. Oturumunuz sonlanmışsa lütfen tekrar giriş yapın.`,
          [
            { text: 'Giriş Ekranına Git', onPress: () => router.replace('/(auth)/login') },
            { text: 'Tamam', style: 'cancel' },
          ]
        );
        return;
      }
      Alert.alert('Hata', msg);
    },
  });

  // Delete / Deactivate User Mutation
  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => companiesAPI.deleteUser(id),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['companyUsers'] });
      const msg = res?.data?.isSoft
        ? 'Kullanıcı geçmiş kayıtlara sahip olduğu için pasife alındı.'
        : 'Kullanıcı başarıyla silindi.';
      Alert.alert('Bilgi', msg);
    },
    onError: (err: any) => {
      Alert.alert('Hata', err?.error || err?.message || 'İşlem başarısız.');
    },
  });

  // Quick Toggle Active Status
  const handleToggleStatus = (targetUser: UserItem) => {
    if (targetUser.id === currentUser?.id) {
      Alert.alert('Uyarı', 'Kendi hesabınızı pasife alamazsınız.');
      return;
    }
    const nextStatus = !targetUser.isActive;
    const actionText = nextStatus ? 'aktife almak' : 'pasife almak (girişi engellemek)';

    Alert.alert(
      'Kullanıcı Durumu',
      `${targetUser.fullName} hesabını ${actionText} istediğinizden emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: nextStatus ? 'Aktif Et' : 'Pasife Al',
          style: nextStatus ? 'default' : 'destructive',
          onPress: () => {
            updateUserMutation.mutate({
              id: targetUser.id,
              data: { isActive: nextStatus },
            });
          },
        },
      ]
    );
  };

  // Open Reset Password Modal
  const openResetPassword = (userItem: UserItem) => {
    setResetModalUser(userItem);
    setNewPassword(generateRandomPassword());
    setShowPassword(true);
  };

  // Open Role Edit Modal
  const openRoleModal = (userItem: UserItem) => {
    setRoleModalUser(userItem);
    setEditRole(
      userItem.role === 'ADMIN' || userItem.role === 'MANAGER' ? userItem.role : 'TECHNICIAN'
    );
    setEditIsActive(userItem.isActive);
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedRoleFilter === 'ALL') return true;
      if (selectedRoleFilter === 'INACTIVE') return !u.isActive;
      return u.role === selectedRoleFilter;
    });
  }, [users, searchQuery, selectedRoleFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length;
    const managers = users.filter((u) => u.role === 'MANAGER').length;
    const techs = users.filter((u) => u.role === 'TECHNICIAN').length;
    const inactive = users.filter((u) => !u.isActive).length;
    return { total, admins, managers, techs, inactive };
  }, [users]);

  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.unauthorizedBox}>
          <ShieldCheck size={56} color={theme.danger} />
          <Text style={[styles.unauthorizedTitle, { color: theme.textPrimary }]}>
            Yetkisiz Erişim
          </Text>
          <Text style={[styles.unauthorizedSub, { color: theme.textSecondary }]}>
            Kullanıcı ve yetki yönetimi paneline yalnızca Şirket Yöneticileri (ADMIN) erişebilir.
          </Text>
          <TouchableOpacity
            style={[styles.backBtnLarge, { backgroundColor: theme.primary }]}
            onPress={() => router.back()}
          >
            <Text style={{ color: '#FFF', fontWeight: '700' }}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={isDark ? [theme.surface, theme.background] : [theme.primary, theme.primaryDark]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
            onPress={() => router.back()}
          >
            <ArrowLeft size={22} color="#FFF" />
          </TouchableOpacity>

          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={styles.headerTitle}>Kullanıcı & Yetki Yönetimi</Text>
            <Text style={styles.headerSubtitle}>
              {currentUser?.companyName || 'Şirket Ekibi'} • {stats.total} Kullanıcı
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: '#10B981' }]}
              onPress={() => {
                setAddFullName('');
                setAddEmail('');
                setAddPassword(generateRandomPassword());
                setAddRole('TECHNICIAN');
                setIsAddUserModalOpen(true);
              }}
              activeOpacity={0.85}
            >
              <UserPlus size={18} color="#FFF" />
              <Text style={styles.addBtnText}>Yeni Ekle</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: 'rgba(239, 68, 68, 0.25)' }]}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <LogOut size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={[
              styles.statChip,
              selectedRoleFilter === 'ALL' && styles.statChipActive,
              { backgroundColor: 'rgba(255,255,255,0.12)' },
            ]}
            onPress={() => setSelectedRoleFilter('ALL')}
          >
            <Text style={styles.statChipValue}>{stats.total}</Text>
            <Text style={styles.statChipLabel}>Tümü</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statChip,
              selectedRoleFilter === 'ADMIN' && styles.statChipActive,
              { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
            ]}
            onPress={() => setSelectedRoleFilter('ADMIN')}
          >
            <Text style={[styles.statChipValue, { color: '#34D399' }]}>{stats.admins}</Text>
            <Text style={styles.statChipLabel}>Yönetici</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statChip,
              selectedRoleFilter === 'MANAGER' && styles.statChipActive,
              { backgroundColor: 'rgba(59, 130, 246, 0.2)' },
            ]}
            onPress={() => setSelectedRoleFilter('MANAGER')}
          >
            <Text style={[styles.statChipValue, { color: '#60A5FA' }]}>{stats.managers}</Text>
            <Text style={styles.statChipLabel}>Müdür</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statChip,
              selectedRoleFilter === 'TECHNICIAN' && styles.statChipActive,
              { backgroundColor: 'rgba(245, 158, 11, 0.2)' },
            ]}
            onPress={() => setSelectedRoleFilter('TECHNICIAN')}
          >
            <Text style={[styles.statChipValue, { color: '#FBBF24' }]}>{stats.techs}</Text>
            <Text style={styles.statChipLabel}>Teknisyen</Text>
          </TouchableOpacity>

          {stats.inactive > 0 && (
            <TouchableOpacity
              style={[
                styles.statChip,
                selectedRoleFilter === 'INACTIVE' && styles.statChipActive,
                { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
              ]}
              onPress={() => setSelectedRoleFilter('INACTIVE')}
            >
              <Text style={[styles.statChipValue, { color: '#F87171' }]}>{stats.inactive}</Text>
              <Text style={styles.statChipLabel}>Pasif</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Search Input */}
      <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Search size={18} color={theme.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: theme.textPrimary }]}
          placeholder="İsim veya e-posta ile kullanıcı ara..."
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={16} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* User List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading || isRefetching}
            onRefresh={refetch}
            tintColor={theme.primary}
          />
        }
      >
        {isLoading && users.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Kullanıcılar yükleniyor...
            </Text>
          </View>
        ) : filteredUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Users size={52} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
              Kullanıcı Bulunamadı
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              {searchQuery
                ? 'Arama kriterlerinize uygun personel bulunamadı.'
                : 'Bu filtrede listelenecek kullanıcı yok.'}
            </Text>
          </View>
        ) : (
          filteredUsers.map((item) => {
            const roleInfo = ROLES_INFO[item.role] || ROLES_INFO.TECHNICIAN;
            const RoleIcon = roleInfo.icon;
            const isMe = item.id === currentUser?.id;

            return (
              <View
                key={item.id}
                style={[
                  styles.userCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: item.isActive ? theme.border : 'rgba(239, 68, 68, 0.4)',
                    opacity: item.isActive ? 1 : 0.82,
                  },
                ]}
              >
                {/* Top Section */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardAvatarWrapper}>
                    <View
                      style={[
                        styles.avatarCircle,
                        {
                          backgroundColor: roleInfo.bgColor,
                          borderColor: roleInfo.borderColor,
                        },
                      ]}
                    >
                      <Text style={[styles.avatarText, { color: roleInfo.color }]}>
                        {item.fullName
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </Text>
                    </View>
                    {!item.isActive && (
                      <View style={styles.inactiveDot} />
                    )}
                  </View>

                  <View style={styles.userInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={[styles.userName, { color: theme.textPrimary }]}>
                        {item.fullName}
                      </Text>
                      {isMe && (
                        <View style={[styles.meBadge, { backgroundColor: theme.primary + '25' }]}>
                          <Text style={[styles.meBadgeText, { color: theme.primary }]}>Sen</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.emailRow}>
                      <Mail size={12} color={theme.textMuted} />
                      <Text style={[styles.userEmail, { color: theme.textSecondary }]}>
                        {item.email}
                      </Text>
                    </View>
                  </View>

                  {/* Status & Role Pill */}
                  <View style={styles.badgeColumn}>
                    <View
                      style={[
                        styles.roleBadge,
                        {
                          backgroundColor: roleInfo.bgColor,
                          borderColor: roleInfo.borderColor,
                        },
                      ]}
                    >
                      <RoleIcon size={12} color={roleInfo.color} />
                      <Text style={[styles.roleBadgeText, { color: roleInfo.color }]}>
                        {roleInfo.label}
                      </Text>
                    </View>

                    <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: item.isActive ? '#10B981' : '#EF4444' },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          { color: item.isActive ? '#10B981' : '#EF4444' },
                        ]}
                      >
                        {item.isActive ? 'Aktif' : 'Pasif'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Metadata Row */}
                <View style={[styles.metaRow, { borderTopColor: theme.border }]}>
                  <View style={styles.metaItem}>
                    <Clock size={12} color={theme.textMuted} />
                    <Text style={[styles.metaText, { color: theme.textMuted }]}>
                      Son Giriş: {formatDate(item.lastLoginAt)}
                    </Text>
                  </View>

                  {item._count?.workOrders !== undefined && (
                    <Text style={[styles.metaText, { color: theme.textMuted }]}>
                      {item._count.workOrders} İş Emri
                    </Text>
                  )}
                </View>

                {/* Actions Row */}
                <View style={styles.actionsRow}>
                  {/* Password Reset */}
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}
                    onPress={() => openResetPassword(item)}
                    activeOpacity={0.8}
                  >
                    <KeyRound size={15} color="#F59E0B" />
                    <Text style={[styles.actionBtnText, { color: '#F59E0B' }]}>Şifre Sıfırla</Text>
                  </TouchableOpacity>

                  {/* Role / Authorization */}
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}
                    onPress={() => openRoleModal(item)}
                    activeOpacity={0.8}
                  >
                    <ShieldCheck size={15} color="#3B82F6" />
                    <Text style={[styles.actionBtnText, { color: '#3B82F6' }]}>Yetkilendir</Text>
                  </TouchableOpacity>

                  {/* Toggle Active / Deactivate */}
                  {!isMe && (
                    <TouchableOpacity
                      style={[
                        styles.actionBtnSmall,
                        {
                          backgroundColor: item.isActive
                            ? 'rgba(239, 68, 68, 0.12)'
                            : 'rgba(16, 185, 129, 0.12)',
                        },
                      ]}
                      onPress={() => handleToggleStatus(item)}
                      activeOpacity={0.8}
                    >
                      {item.isActive ? (
                        <UserX size={15} color="#EF4444" />
                      ) : (
                        <UserCheck size={15} color="#10B981" />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── MODAL 1: Şifre Sıfırlama Modalı ─────────────────────────────────── */}
      <Modal
        visible={!!resetModalUser}
        transparent
        animationType="fade"
        onRequestClose={() => setResetModalUser(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconBg, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <KeyRound size={24} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  Şifre Sıfırla
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                  {resetModalUser?.fullName} ({resetModalUser?.email})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setResetModalUser(null)}>
                <X size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Yeni Şifre
              </Text>
              <View
                style={[
                  styles.passwordInputWrapper,
                  { backgroundColor: theme.background, borderColor: theme.border },
                ]}
              >
                <Lock size={18} color={theme.textMuted} />
                <TextInput
                  style={[styles.passwordInput, { color: theme.textPrimary }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                  placeholder="En az 6 karakter girin..."
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={{ padding: 4 }}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={theme.textMuted} />
                  ) : (
                    <Eye size={18} color={theme.textMuted} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Quick Actions for Password */}
              <View style={styles.passToolsRow}>
                <TouchableOpacity
                  style={[styles.toolChip, { backgroundColor: theme.primary + '18' }]}
                  onPress={() => {
                    const rnd = generateRandomPassword();
                    setNewPassword(rnd);
                    setShowPassword(true);
                  }}
                >
                  <Sparkles size={14} color={theme.primary} />
                  <Text style={[styles.toolChipText, { color: theme.primary }]}>
                    Rastgele Güçlü Şifre Üret
                  </Text>
                </TouchableOpacity>

                {newPassword.length > 0 && (
                  <TouchableOpacity
                    style={[styles.toolChip, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}
                    onPress={() => {
                      Share.share({
                        title: 'Şifre',
                        message: `Yeni MotorTrack Şifreniz: ${newPassword}`,
                      });
                    }}
                  >
                    <Share2 size={14} color="#3B82F6" />
                    <Text style={[styles.toolChipText, { color: '#3B82F6' }]}>Paylaş</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Security Notice */}
              <View style={[styles.warningBox, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <AlertTriangle size={18} color="#F59E0B" />
                <Text style={styles.warningText}>
                  Şifre güncellendiğinde kullanıcının açık olan tüm cihazlardaki oturumları güvenlik nedeniyle otomatik sonlandırılacaktır.
                </Text>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtnSecondary, { borderColor: theme.border }]}
                onPress={() => setResetModalUser(null)}
              >
                <Text style={[styles.modalBtnSecondaryText, { color: theme.textSecondary }]}>
                  Vazgeç
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalBtnPrimary,
                  {
                    backgroundColor: '#F59E0B',
                    opacity: newPassword.length < 6 || resetPasswordMutation.isPending ? 0.6 : 1,
                  },
                ]}
                disabled={newPassword.length < 6 || resetPasswordMutation.isPending}
                onPress={() => {
                  if (resetModalUser) {
                    resetPasswordMutation.mutate({
                      id: resetModalUser.id,
                      pass: newPassword,
                    });
                  }
                }}
              >
                {resetPasswordMutation.isPending ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <KeyRound size={16} color="#FFF" />
                    <Text style={styles.modalBtnPrimaryText}>Şifreyi Güncelle</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── MODAL 2: Rol / Yetkilendirme Modalı ─────────────────────────────── */}
      <Modal
        visible={!!roleModalUser}
        transparent
        animationType="fade"
        onRequestClose={() => setRoleModalUser(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconBg, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <ShieldCheck size={24} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  Yetkilendirme & Rol
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                  {roleModalUser?.fullName}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setRoleModalUser(null)}>
                <X size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginBottom: 8 }]}>
                Erişim Rolü Seçin
              </Text>

              {/* Role Cards */}
              {(['ADMIN', 'MANAGER', 'TECHNICIAN'] as const).map((r) => {
                const info = ROLES_INFO[r];
                const isSelected = editRole === r;
                const IconComp = info.icon;

                return (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.roleOptionCard,
                      {
                        backgroundColor: isSelected ? info.bgColor : theme.background,
                        borderColor: isSelected ? info.borderColor : theme.border,
                      },
                    ]}
                    onPress={() => setEditRole(r)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.roleOptionTop}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <IconComp size={18} color={info.color} />
                        <Text style={[styles.roleOptionTitle, { color: info.color }]}>
                          {info.label}
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={[styles.selectedCheck, { backgroundColor: info.color }]}>
                          <CheckCircle2 size={16} color="#FFF" />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.roleOptionDesc, { color: theme.textSecondary }]}>
                      {info.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Status Toggle */}
              {roleModalUser?.id !== currentUser?.id && (
                <View
                  style={[
                    styles.statusToggleBox,
                    { backgroundColor: theme.background, borderColor: theme.border },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.statusToggleTitle, { color: theme.textPrimary }]}>
                      Hesap Durumu
                    </Text>
                    <Text style={[styles.statusToggleSub, { color: theme.textSecondary }]}>
                      {editIsActive
                        ? 'Kullanıcı sisteme giriş yapabilir.'
                        : 'Hesap donduruldu, giriş engellendi.'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.statusToggleBtn,
                      { backgroundColor: editIsActive ? '#10B981' : '#EF4444' },
                    ]}
                    onPress={() => setEditIsActive(!editIsActive)}
                  >
                    <Text style={styles.statusToggleBtnText}>
                      {editIsActive ? 'Aktif' : 'Pasif'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtnSecondary, { borderColor: theme.border }]}
                onPress={() => setRoleModalUser(null)}
              >
                <Text style={[styles.modalBtnSecondaryText, { color: theme.textSecondary }]}>
                  İptal
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalBtnPrimary,
                  {
                    backgroundColor: theme.primary,
                    opacity: updateUserMutation.isPending ? 0.6 : 1,
                  },
                ]}
                disabled={updateUserMutation.isPending}
                onPress={() => {
                  if (roleModalUser) {
                    updateUserMutation.mutate({
                      id: roleModalUser.id,
                      data: {
                        role: editRole,
                        isActive: editIsActive,
                      },
                    });
                  }
                }}
              >
                {updateUserMutation.isPending ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <ShieldCheck size={16} color="#FFF" />
                    <Text style={styles.modalBtnPrimaryText}>Yetkiyi Kaydet</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL 3: Yeni Kullanıcı Ekle Modalı ─────────────────────────────── */}
      <Modal
        visible={isAddUserModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddUserModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCardLarge, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconBg, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <UserPlus size={24} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  Yeni Kullanıcı / Personel Ekle
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                  Ekibinize yeni usta veya yönetici tanımlayın
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsAddUserModalOpen(false)}>
                <X size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
              {/* Ad Soyad */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Ad Soyad *
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary },
                ]}
                placeholder="Örn: Ahmet Yılmaz"
                placeholderTextColor={theme.textMuted}
                value={addFullName}
                onChangeText={setAddFullName}
              />

              {/* E-posta */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                E-posta Adresi *
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary },
                ]}
                placeholder="Örn: ahmet@motortrack.com"
                placeholderTextColor={theme.textMuted}
                value={addEmail}
                onChangeText={setAddEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Şifre */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  Başlangıç Şifresi *
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setAddPassword(generateRandomPassword());
                    setAddShowPassword(true);
                  }}
                >
                  <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '600' }}>
                    🎲 Otomatik Üret
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.passwordInputWrapper,
                  { backgroundColor: theme.background, borderColor: theme.border },
                ]}
              >
                <Lock size={18} color={theme.textMuted} />
                <TextInput
                  style={[styles.passwordInput, { color: theme.textPrimary }]}
                  value={addPassword}
                  onChangeText={setAddPassword}
                  secureTextEntry={!addShowPassword}
                  placeholder="En az 6 karakter..."
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={{ padding: 4 }}
                  onPress={() => setAddShowPassword(!addShowPassword)}
                >
                  {addShowPassword ? (
                    <EyeOff size={18} color={theme.textMuted} />
                  ) : (
                    <Eye size={18} color={theme.textMuted} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Rol Seçimi */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 14 }]}>
                Kullanıcı Rolü & Yetkisi
              </Text>
              {(['TECHNICIAN', 'MANAGER', 'ADMIN'] as const).map((r) => {
                const info = ROLES_INFO[r];
                const isSelected = addRole === r;
                const IconComp = info.icon;

                return (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.roleOptionCardSmall,
                      {
                        backgroundColor: isSelected ? info.bgColor : theme.background,
                        borderColor: isSelected ? info.borderColor : theme.border,
                      },
                    ]}
                    onPress={() => setAddRole(r)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <IconComp size={16} color={info.color} />
                      <Text style={[styles.roleOptionTitle, { color: info.color }]}>
                        {info.label}
                      </Text>
                    </View>
                    {isSelected && (
                      <CheckCircle2 size={16} color={info.color} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtnSecondary, { borderColor: theme.border }]}
                onPress={() => setIsAddUserModalOpen(false)}
              >
                <Text style={[styles.modalBtnSecondaryText, { color: theme.textSecondary }]}>
                  İptal
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalBtnPrimary,
                  {
                    backgroundColor: '#10B981',
                    opacity:
                      !addFullName.trim() ||
                      !addEmail.trim() ||
                      addPassword.length < 6 ||
                      createUserMutation.isPending
                        ? 0.5
                        : 1,
                  },
                ]}
                disabled={
                  !addFullName.trim() ||
                  !addEmail.trim() ||
                  addPassword.length < 6 ||
                  createUserMutation.isPending
                }
                onPress={() => {
                  createUserMutation.mutate({
                    fullName: addFullName.trim(),
                    email: addEmail.trim(),
                    password: addPassword,
                    role: addRole,
                  });
                }}
              >
                {createUserMutation.isPending ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <UserPlus size={16} color="#FFF" />
                    <Text style={styles.modalBtnPrimaryText}>Kullanıcıyı Oluştur</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    ...Shadows.sm,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '800',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    ...Shadows.sm,
  },
  addBtnText: {
    color: '#FFF',
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statChip: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statChipActive: {
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  statChipValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '800',
    color: '#FFF',
  },
  statChipLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    marginTop: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  centerContainer: {
    paddingTop: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: Typography.fontSize.sm,
  },
  emptyContainer: {
    paddingTop: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.xs,
    textAlign: 'center',
    marginTop: 4,
  },
  userCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardAvatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '800',
  },
  inactiveDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
  },
  meBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
  },
  meBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  userEmail: {
    fontSize: Typography.fontSize.xs,
  },
  badgeColumn: {
    alignItems: 'flex-end',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  actionBtnText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
  },
  actionBtnSmall: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '85%',
    ...Shadows.lg,
  },
  modalCardLarge: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '90%',
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: Spacing.md,
  },
  modalIconBg: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  modalBody: {
    marginBottom: Spacing.md,
  },
  modalScrollBody: {
    maxHeight: 380,
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 6,
  },
  textInput: {
    height: 46,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    fontSize: Typography.fontSize.sm,
    marginBottom: 10,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    gap: 8,
  },
  passwordInput: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    paddingVertical: 0,
  },
  passToolsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  toolChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: BorderRadius.md,
    marginTop: 14,
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    color: '#D97706',
    lineHeight: 16,
  },
  roleOptionCard: {
    padding: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  roleOptionCardSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    marginBottom: 6,
  },
  roleOptionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  roleOptionTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '800',
  },
  selectedCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleOptionDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  statusToggleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: 8,
  },
  statusToggleTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
  },
  statusToggleSub: {
    fontSize: 11,
    marginTop: 2,
  },
  statusToggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  statusToggleBtnText: {
    color: '#FFF',
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  modalBtnSecondary: {
    flex: 1,
    height: 46,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnSecondaryText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
  },
  modalBtnPrimary: {
    flex: 2,
    flexDirection: 'row',
    height: 46,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalBtnPrimaryText: {
    color: '#FFF',
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
  },

  // Unauthorized
  unauthorizedBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  unauthorizedTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '800',
    marginTop: 16,
  },
  unauthorizedSub: {
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  backBtnLarge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
  },
});
