import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Toast from '../components/Toast';

const AdminPage = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [deleteModal, setDeleteModal] = useState({ show: false, userId: null, email: '' });

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        showToast('Failed to fetch users', 'error');
      }
    } catch (error) {
      showToast('Error connecting to server', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleDeleteUser = async () => {
    if (!deleteModal.userId) return;
    
    try {
      const response = await fetch(`/api/admin/users/${deleteModal.userId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        showToast('User deleted successfully');
        setUsers(users.filter(u => u.id !== deleteModal.userId));
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to delete user', 'error');
      }
    } catch (error) {
      showToast('Error connecting to server', 'error');
    } finally {
      setDeleteModal({ show: false, userId: null, email: '' });
    }
  };

  const handleToggleAdmin = async (userId) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/toggle-admin`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(users.map(u => u.id === userId ? { ...u, is_admin: data.is_admin } : u));
        showToast('Admin status updated');
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to update user', 'error');
      }
    } catch (error) {
      showToast('Error connecting to server', 'error');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const totalUsers = users.length;
  const totalAdmins = users.filter(u => u.is_admin).length;
  const totalJournals = users.reduce((acc, user) => acc + user.journal_count, 0);

  return (
    <div className="w-full max-w-6xl mx-auto pb-10">
      <Header 
        title="Admin Dashboard" 
        subtitle="Manage users, permissions, and platform analytics." 
      />

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-[#151325]/80 backdrop-blur-md border border-cardBorder p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-textMuted text-sm font-semibold uppercase tracking-wider mb-2">Total Users</p>
              <h3 className="text-4xl font-extrabold text-white">{totalUsers}</h3>
            </div>
            <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary text-xl">
              <i className="fa-solid fa-users"></i>
            </div>
          </div>
        </div>
        
        <div className="bg-[#151325]/80 backdrop-blur-md border border-cardBorder p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-negative/10 rounded-full blur-3xl group-hover:bg-negative/20 transition-all duration-700"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-textMuted text-sm font-semibold uppercase tracking-wider mb-2">Platform Admins</p>
              <h3 className="text-4xl font-extrabold text-white">{totalAdmins}</h3>
            </div>
            <div className="w-12 h-12 bg-negative/20 rounded-2xl flex items-center justify-center text-negative text-xl">
              <i className="fa-solid fa-shield-halved"></i>
            </div>
          </div>
        </div>

        <div className="bg-[#151325]/80 backdrop-blur-md border border-cardBorder p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-positive/10 rounded-full blur-3xl group-hover:bg-positive/20 transition-all duration-700"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-textMuted text-sm font-semibold uppercase tracking-wider mb-2">Total Journals</p>
              <h3 className="text-4xl font-extrabold text-white">{totalJournals}</h3>
            </div>
            <div className="w-12 h-12 bg-positive/20 rounded-2xl flex items-center justify-center text-positive text-xl">
              <i className="fa-solid fa-book-open"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#151325]/60 backdrop-blur-md border border-cardBorder rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <i className="fa-solid fa-list-ul text-primary"></i> User Directory
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-black/20">
                <th className="p-5 text-sm font-semibold text-textMuted uppercase tracking-wider">User Email</th>
                <th className="p-5 text-sm font-semibold text-textMuted uppercase tracking-wider">Joined Date</th>
                <th className="p-5 text-sm font-semibold text-textMuted uppercase tracking-wider">Entries</th>
                <th className="p-5 text-sm font-semibold text-textMuted uppercase tracking-wider">Role</th>
                <th className="p-5 text-sm font-semibold text-textMuted uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="p-10 text-center text-textMuted">
                    <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-3 text-primary"></i>
                    <p>Loading users...</p>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-10 text-center text-textMuted font-medium">No users found.</td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-white/[0.03] transition-colors duration-200">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-violet-500/80 flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {user.email.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-white">{user.email}</span>
                      </div>
                    </td>
                    <td className="p-5 text-textSecondary">{formatDate(user.created_at)}</td>
                    <td className="p-5 text-textSecondary">
                      <div className="inline-flex items-center justify-center bg-white/5 border border-white/10 rounded-lg px-3 py-1 font-semibold">
                        {user.journal_count}
                      </div>
                    </td>
                    <td className="p-5">
                      {user.is_admin ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-negative/20 text-negative border border-negative/30 text-xs font-bold uppercase tracking-wider">
                          <i className="fa-solid fa-crown text-[0.6rem]"></i> Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-textSecondary border border-white/10 text-xs font-bold uppercase tracking-wider">
                          <i className="fa-solid fa-user text-[0.6rem]"></i> User
                        </span>
                      )}
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          onClick={() => handleToggleAdmin(user.id)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                            user.is_admin 
                              ? 'bg-white/10 text-white hover:bg-white/20' 
                              : 'bg-primary/20 text-primary hover:bg-primary/30'
                          }`}
                          title={user.is_admin ? "Remove Admin" : "Make Admin"}
                        >
                          <i className={`fa-solid ${user.is_admin ? 'fa-user-minus' : 'fa-user-shield'}`}></i>
                        </button>
                        <button 
                          onClick={() => setDeleteModal({ show: true, userId: user.id, email: user.email })}
                          className="w-9 h-9 bg-negative/10 text-negative hover:bg-negative/20 rounded-xl flex items-center justify-center transition-all"
                          title="Delete User"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#151325] border border-negative/30 rounded-3xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(239,68,68,0.15)] transform transition-all">
            <div className="w-16 h-16 bg-negative/20 rounded-full flex items-center justify-center text-negative text-2xl mx-auto mb-5">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3 className="text-2xl font-bold text-center text-white mb-2">Delete User?</h3>
            <p className="text-center text-textSecondary mb-8">
              Are you sure you want to permanently delete <strong className="text-white">{deleteModal.email}</strong> and all of their journal entries? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteModal({ show: false, userId: null, email: '' })}
                className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteUser}
                className="flex-1 py-3 px-4 bg-negative hover:bg-negative/90 text-white font-semibold rounded-xl shadow-[0_5px_15px_rgba(239,68,68,0.3)] transition-all"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.show && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
};

export default AdminPage;
