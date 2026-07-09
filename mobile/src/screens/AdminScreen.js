import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Colors, FontFamily, SharedStyles } from '../theme';
import { api } from '../config';
import Header from '../components/Header';
import Toast from '../components/Toast';

const AdminScreen = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [deleteModal, setDeleteModal] = useState({ show: false, userId: null, email: '' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(api('/api/admin/users'));
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        showToast('Failed to fetch user directory', 'error');
      }
    } catch (error) {
      showToast('Error connecting to Flask server', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (userId) => {
    try {
      const response = await fetch(api(`/api/admin/users/${userId}/toggle-admin`), {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(users.map((u) => (u.id === userId ? { ...u, is_admin: data.is_admin } : u)));
        showToast('User authorization status updated');
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to update user', 'error');
      }
    } catch (error) {
      showToast('Error toggling admin privilege', 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteModal.userId) return;

    setActionLoading(true);
    try {
      const response = await fetch(api(`/api/admin/users/${deleteModal.userId}`), {
        method: 'DELETE',
      });

      if (response.ok) {
        showToast('User account deleted permanently');
        setUsers(users.filter((u) => u.id !== deleteModal.userId));
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to delete user', 'error');
      }
    } catch (error) {
      showToast('Error connecting to database', 'error');
    } finally {
      setActionLoading(false);
      setDeleteModal({ show: false, userId: null, email: '' });
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  const totalUsers = users.length;
  const totalAdmins = users.filter((u) => u.is_admin).length;
  const totalJournals = users.reduce((acc, u) => acc + (u.journal_count || 0), 0);

  return (
    <View style={SharedStyles.screenContainer}>
      <ScrollView contentContainerStyle={SharedStyles.screenScroll} keyboardShouldPersistTaps="handled">
        <Header title="Admin Panel" subtitle="Manage users, permissions, and database records" />

        {/* Admin KPI stats cards */}
        <View style={styles.kpiContainer}>
          <View style={[SharedStyles.card, styles.kpiCard]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.2)' }]}>
              <FontAwesome5 name="users" size={16} color={Colors.primary} />
            </View>
            <Text style={styles.kpiVal}>{totalUsers}</Text>
            <Text style={styles.kpiSub}>Total Users</Text>
          </View>

          <View style={[SharedStyles.card, styles.kpiCard]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)' }]}>
              <FontAwesome5 name="shield-alt" size={16} color={Colors.negative} />
            </View>
            <Text style={styles.kpiVal}>{totalAdmins}</Text>
            <Text style={styles.kpiSub}>Admins</Text>
          </View>

          <View style={[SharedStyles.card, styles.kpiCard]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)' }]}>
              <FontAwesome5 name="book-open" size={16} color={Colors.positive} />
            </View>
            <Text style={styles.kpiVal}>{totalJournals}</Text>
            <Text style={styles.kpiSub}>Journals</Text>
          </View>
        </View>

        {/* Users list directory */}
        <View style={[SharedStyles.card, { minHeight: 250 }]}>
          <Text style={styles.directoryTitle}>User Directory</Text>

          {loading ? (
            <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />
          ) : users.length === 0 ? (
            <Text style={styles.noUsersText}>No accounts found in system database.</Text>
          ) : (
            users.map((item) => (
              <View key={item.id.toString()} style={styles.userRow}>
                <View style={styles.userInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {item.email.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userEmail} numberOfLines={1}>
                      {item.email}
                    </Text>
                    <Text style={styles.userDate}>
                      Joined: {formatDate(item.created_at)}
                    </Text>
                  </View>
                </View>

                <View style={styles.userMeta}>
                  <View style={styles.badgeRow}>
                    <View style={styles.journalBadge}>
                      <Text style={styles.journalBadgeText}>{item.journal_count} logs</Text>
                    </View>
                    {item.is_admin ? (
                      <View style={[SharedStyles.badge, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                        <FontAwesome5 name="crown" size={8} color={Colors.negative} />
                        <Text style={[styles.roleText, { color: Colors.negative }]}>Admin</Text>
                      </View>
                    ) : (
                      <View style={[SharedStyles.badge, { backgroundColor: Colors.overlayLight }]}>
                        <FontAwesome5 name="user" size={8} color={Colors.textSecondary} />
                        <Text style={[styles.roleText, { color: Colors.textSecondary }]}>User</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      onPress={() => handleToggleAdmin(item.id)}
                      style={[styles.actionBtn, item.is_admin ? styles.actionBtnActive : styles.actionBtnNormal]}
                    >
                      <FontAwesome5
                        name={item.is_admin ? 'user-minus' : 'user-shield'}
                        size={11}
                        color={item.is_admin ? Colors.white : Colors.primary}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setDeleteModal({ show: true, userId: item.id, email: item.email })}
                      style={[styles.actionBtn, styles.deleteBtn]}
                    >
                      <FontAwesome5 name="trash-alt" size={11} color={Colors.negative} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Delete User Modal */}
      <Modal
        visible={deleteModal.show}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModal({ show: false, userId: null, email: '' })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.warningIcon}>
              <FontAwesome5 name="exclamation-triangle" size={24} color={Colors.negative} />
            </View>
            <Text style={styles.modalTitle}>Delete User?</Text>
            <Text style={styles.modalDesc}>
              Permanently delete user account <Text style={{ color: Colors.white, fontWeight: 'bold' }}>{deleteModal.email}</Text> and all their database log contents? This operation is irreversible.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setDeleteModal({ show: false, userId: null, email: '' })}
                disabled={actionLoading}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleDeleteUser}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.confirmBtnText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Toast
        visible={toast.show}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, show: false })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  kpiContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  kpiVal: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
  },
  kpiSub: {
    fontSize: 10,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  directoryTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  noUsersText: {
    color: Colors.textMuted,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 40,
  },
  userRow: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1.1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: FontFamily.medium,
    color: Colors.textPrimary,
  },
  userDate: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    color: Colors.textMuted,
    marginTop: 2,
  },
  userMeta: {
    flex: 0.9,
    alignItems: 'flex-end',
    gap: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  journalBadge: {
    backgroundColor: Colors.overlayLight,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  journalBadgeText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontFamily: FontFamily.medium,
  },
  roleText: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    textTransform: 'uppercase',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnNormal: {
    backgroundColor: 'rgba(139,92,246,0.15)',
  },
  actionBtnActive: {
    backgroundColor: Colors.primary,
  },
  deleteBtn: {
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.bgCardSolid,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  warningIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239,68,68,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: Colors.overlayLight,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.semibold,
    fontSize: 14,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: Colors.negative,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
});

export default AdminScreen;
