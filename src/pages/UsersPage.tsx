import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';
import { logActivity } from '../lib/logger';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal, ModalFooter } from '../components/ui/Modal';
import { Users, UserPlus, Trash2, Pencil, Ban, CheckCircle } from 'lucide-react';
import { Tooltip } from '../components/ui/Tooltip';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Id, Doc } from '../../convex/_generated/dataModel';

export function UsersPage() {
  const { profile } = useAuth();
  const dialog = useDialog();
  
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  
  // Convex Hooks
  const allUsers = useQuery(api.profiles.list);
  const departments = useQuery(api.departments.list) || [];
  
  const addProfile = useMutation(api.profiles.add);
  const updateProfile = useMutation(api.profiles.update);
  const removeProfile = useMutation(api.profiles.remove);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUserId, setEditingUserId] = useState<Id<"profiles"> | null>(null);

  const isReadOnly = profile?.role === 'director';

  // Filters
  const users = (allUsers || []).filter(u => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return u.is_active;
    if (statusFilter === 'inactive') return !u.is_active;
    return true;
  }).sort((a, b) => a.full_name.localeCompare(b.full_name));

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    employeeId: '',
    role: '',
    departmentId: '',
    reportingManagerId: '',
    imageUrl: '',
    dob: '',
    marriageAnniversary: '',
    joiningDate: ''
  });

  const [error, setError] = useState('');

  const getRoleBadgeVariant = (role: string) => {
    if (role === 'super_admin') return 'danger';
    if (role === 'admin') return 'warning';
    if (role === 'director') return 'default'; 
    if (role === 'team_leader') return 'info';
    if (role === 'sales_executive') return 'success';
    if (role === 'crm_staff') return 'info';
    if (role === 'accountant') return 'warning';
    if (role === 'driver') return 'default';
    if (role === 'receptionist') return 'success';
    return 'default';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      employeeId: '',
      role: '',
      departmentId: '',
      reportingManagerId: '',
      imageUrl: '',
      dob: '',
      marriageAnniversary: '',
      joiningDate: ''
    });
    setEditingUserId(null);
    setError('');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleEditUser = (user: Doc<"profiles">) => {
    if (isReadOnly) return;
    setEditingUserId(user._id);
    setFormData({
      fullName: user.full_name,
      email: user.email,
      phone: user.phone || '',
      employeeId: user.employee_id,
      role: user.role,
      departmentId: user.department_id || '',
      reportingManagerId: user.reporting_manager_id || '',
      imageUrl: user.image_url || '',
      dob: user.dob || '',
      marriageAnniversary: user.marriage_anniversary || '',
      joiningDate: user.joining_date || ''
    });
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setError('');
    setIsSubmitting(true);

    try {
      if (editingUserId) {
        // Update existing profile
        await updateProfile({
          id: editingUserId,
          full_name: formData.fullName,
          phone: formData.phone || undefined,
          role: formData.role,
          department_id: formData.departmentId || undefined,
          reporting_manager_id: formData.reportingManagerId || undefined,
          image_url: formData.imageUrl || undefined,
          dob: formData.dob || undefined,
          marriage_anniversary: formData.marriageAnniversary || undefined,
          joining_date: formData.joiningDate || undefined,
          updated_at: new Date().toISOString()
        });

        await logActivity('USER_UPDATED', `User profile updated: ${formData.fullName}`);
        await dialog.alert('User updated successfully!', { variant: 'success', title: 'Success' });
      } else {
        // Create new profile in Convex
        await addProfile({
          employee_id: formData.employeeId,
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone || undefined,
          role: formData.role,
          department_id: formData.departmentId || undefined,
          reporting_manager_id: formData.reportingManagerId || undefined,
          image_url: formData.imageUrl || undefined,
          dob: formData.dob || undefined,
          marriage_anniversary: formData.marriageAnniversary || undefined,
          joining_date: formData.joiningDate || undefined,
          is_active: true,
          force_password_change: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        await logActivity('USER_CREATED', `New user created: ${formData.fullName} (${formData.role})`);
        await dialog.alert('User added successfully! They can now sign in using Clerk with their email.', { 
            variant: 'success', 
            title: 'Success' 
        });
      }

      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      console.error('Error saving user:', err);
      setError(err.message || 'An error occurred while saving the user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = (user: Doc<"profiles">) => {
    if (isReadOnly) return;
    const action = user.is_active ? 'deactivate' : 'reactivate';
    dialog.confirm(
      `Are you sure you want to ${action} ${user.full_name}? ${action === 'deactivate' ? 'They will no longer be able to log in.' : 'They will regain access to the system.'}`,
      {
        variant: action === 'deactivate' ? 'danger' : 'success',
        confirmText: action === 'deactivate' ? 'Deactivate' : 'Reactivate',
        title: `${action.charAt(0).toUpperCase() + action.slice(1)} User`
      }
    ).then(async (confirmed) => {
      if (!confirmed) return;

      try {
        await updateProfile({
          id: user._id,
          is_active: !user.is_active,
          updated_at: new Date().toISOString()
        });

        await logActivity(`USER_${action.toUpperCase()}D`, `User ${user.full_name} was ${action}d`);
        await dialog.alert(`User ${action}d successfully.`, { variant: 'success', title: 'Success' });
      } catch (error) {
        console.error(`Error ${action}ing user:`, error);
        await dialog.alert(`Failed to ${action} user.`, { variant: 'danger', title: 'Error' });
      }
    });
  };

  const handleDelete = async (id: Id<"profiles">) => {
    if (isReadOnly) return;
    const confirmed = await dialog.confirm('Are you sure you want to PERMANENTLY delete this user? This action cannot be undone and should only be used for erroneous entries.', {
      variant: 'danger',
      confirmText: 'Delete Permanently',
      title: 'Delete User'
    });

    if (!confirmed) return;

    try {
      await removeProfile({ id });
      await logActivity('USER_DELETED', `User ${id} deleted`);
      await dialog.alert('User deleted.', { variant: 'success', title: 'Deleted' });
    } catch (error) {
      console.error('Error deleting user:', error);
      await dialog.alert('Failed to delete user.', { variant: 'danger', title: 'Error' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">User Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage team members and access control</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-40 h-[42px]"
            options={[
              { value: 'active', label: 'Active Users' },
              { value: 'inactive', label: 'Inactive Users' },
              { value: 'all', label: 'All Users' },
            ]}
          />
          {!isReadOnly && (
            <Button
              variant="primary"
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="h-[42px] whitespace-nowrap"
            >
              <UserPlus size={18} className="mr-2" />
              Add User
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users size={20} />
            <CardTitle>Users List</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {!allUsers ? (
            <LoadingSpinner size="lg" className="min-h-[400px]" />
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No users found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  {!isReadOnly && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user._id} className={!user.is_active ? 'bg-gray-50' : ''}>
                    <TableCell className="font-mono text-xs">{user.employee_id}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {user.image_url && <img src={user.image_url} alt="" className="w-6 h-6 rounded-full object-cover" />}
                        <span className={!user.is_active ? 'text-gray-500' : ''}>{user.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={user.is_active ? 'success' : 'default'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </TableCell>
                    {!isReadOnly && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Tooltip content={user.is_active ? "Deactivate User" : "Reactivate User"}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(user)}
                              className={user.is_active ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-orange-500/10" : "text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-500/10"}
                            >
                              {user.is_active ? <Ban size={16} /> : <CheckCircle size={16} />}
                            </Button>
                          </Tooltip>

                          <Tooltip content="Edit Details">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleEditUser(user)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-500/10"
                            >
                              <Pencil size={16} />
                            </Button>
                          </Tooltip>

                          <Tooltip content="Delete Permanently">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-500/10"
                              onClick={() => handleDelete(user._id)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </Tooltip>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingUserId ? "Edit User" : "Add New User"}
        size="lg"
      >
        <form onSubmit={handleSaveUser} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              required
              placeholder="e.g. John Doe"
            />
            <Input
              label="Employee ID"
              name="employeeId"
              value={formData.employeeId}
              onChange={handleInputChange}
              required
              placeholder="e.g. EMP001"
              disabled={!!editingUserId}
            />
            <Input
              type="email"
              label="Email Address"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder="john@example.com"
              disabled={!!editingUserId}
            />
            <Input
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="+91 98765 43210"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:col-span-2">
              <Input
                type="date"
                label="Date of Birth"
                name="dob"
                value={formData.dob}
                onChange={handleInputChange}
                className="w-full"
              />
              <Input
                type="date"
                label="Marriage Anniversary"
                name="marriageAnniversary"
                value={formData.marriageAnniversary}
                onChange={handleInputChange}
                className="w-full"
              />
              <Input
                type="date"
                label="Date of Joining"
                name="joiningDate"
                value={formData.joiningDate}
                onChange={handleInputChange}
                className="w-full"
              />
            </div>
            <Select
              label="Role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              required
              options={[
                { value: 'admin', label: 'Admin (Access & Controls)' },
                { value: 'director', label: 'Director (Read-Only Access)' },
                { value: 'sales_executive', label: 'Sales Executive' },
                { value: 'accountant', label: 'Accountant' },
                { value: 'crm_staff', label: 'CRM (Customer Relationship Manager)' },
                { value: 'team_leader', label: 'Team Leader – Sales' },
                { value: 'driver', label: 'Driver' },
                { value: 'receptionist', label: 'Receptionist' },
              ]}
            />
            <Select
              label="Department"
              name="departmentId"
              value={formData.departmentId}
              onChange={handleInputChange}
              required
              options={departments.map((d: any) => ({ value: d._id, label: d.name }))}
            />
            <Select
              label="Reporting Manager"
              name="reportingManagerId"
              value={formData.reportingManagerId}
              onChange={handleInputChange}
              options={(allUsers || []).filter(u => u._id !== editingUserId).map(u => ({ value: u._id, label: u.full_name }))}
            />
            <Input
              label="Profile Image URL"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleInputChange}
              placeholder="https://..."
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              {editingUserId ? (
                <>
                  <span className="hidden sm:inline">Update User</span>
                  <span className="sm:hidden">Update</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Create User</span>
                  <span className="sm:hidden">Create</span>
                </>
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}

