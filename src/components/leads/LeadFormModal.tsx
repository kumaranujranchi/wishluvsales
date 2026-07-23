import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useDialog } from '../../contexts/DialogContext';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Doc, Id } from '../../../convex/_generated/dataModel';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal, ModalFooter } from '../ui/Modal';
import { User, Phone, Mail, Layers, Compass, FileText } from 'lucide-react';

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingLead?: Doc<"leads"> | null;
}

export function LeadFormModal({ isOpen, onClose, onSuccess, editingLead }: LeadFormModalProps) {
  const { user } = useAuth();
  const dialog = useDialog();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Convex Queries
  const projects = useQuery(api.projects.list) || [];
  const profiles = useQuery(api.profiles.list) || [];

  // Filter profiles to get sales team members (sales executive, team leader, super_admin, admin)
  const salesTeam = profiles.filter(
    p => ['sales_executive', 'team_leader', 'super_admin', 'admin'].includes(p.role)
  );

  // Convex Mutations & Actions
  const addLead = useMutation(api.leads.add);
  const updateLead = useMutation(api.leads.update);
  const sendLeadNotification = useAction(api.leadNotifier.sendLeadAssignmentNotification);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    projectId: '',
    assignedTo: '',
    source: 'Referral',
    status: 'pending',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (editingLead) {
        setFormData({
          name: editingLead.name,
          phone: editingLead.phone,
          email: editingLead.email || '',
          projectId: editingLead.project_id,
          assignedTo: editingLead.assigned_to,
          source: editingLead.source,
          status: editingLead.status,
          notes: editingLead.notes || ''
        });
      } else {
        setFormData({
          name: '',
          phone: '',
          email: '',
          projectId: projects[0]?._id || '',
          assignedTo: salesTeam[0]?._id || '',
          source: 'Referral',
          status: 'pending',
          notes: ''
        });
      }
    }
  }, [isOpen, editingLead, projects, profiles]);

  // Set default selection when data becomes available
  useEffect(() => {
    if (projects.length > 0 && !formData.projectId) {
      setFormData(prev => ({ ...prev, projectId: projects[0]._id }));
    }
  }, [projects]);

  useEffect(() => {
    if (salesTeam.length > 0 && !formData.assignedTo) {
      setFormData(prev => ({ ...prev, assignedTo: salesTeam[0]._id }));
    }
  }, [profiles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId || !formData.assignedTo) {
      await dialog.alert('Please ensure projects and sales executives are loaded.', { variant: 'danger' });
      return;
    }

    setIsSubmitting(true);
    const now = new Date().toISOString();

    // Resolve project name for the notification email
    const selectedProject = projects.find(p => p._id === formData.projectId);
    const projectName = selectedProject?.name || 'Unknown Project';

    try {
      if (editingLead) {
        const isReassigned = editingLead.assigned_to !== formData.assignedTo;

        await updateLead({
          id: editingLead._id,
          name: formData.name,
          phone: formData.phone,
          email: formData.email || undefined,
          project_id: formData.projectId,
          assigned_to: formData.assignedTo,
          source: formData.source,
          status: formData.status,
          notes: formData.notes || undefined,
          updated_at: now
        });

        // Send email + manager notification only if lead was reassigned
        if (isReassigned) {
          sendLeadNotification({
            assignedToId: formData.assignedTo,
            leadName: formData.name,
            leadPhone: formData.phone,
            leadEmail: formData.email || undefined,
            projectName,
            source: formData.source,
            notes: formData.notes || undefined,
            isReassignment: true,
          }).catch((err) => console.error('[LeadNotifier] Reassignment notification failed:', err));
        }

        await dialog.alert('Lead updated successfully!', { variant: 'success' });
      } else {
        await addLead({
          name: formData.name,
          phone: formData.phone,
          email: formData.email || undefined,
          project_id: formData.projectId,
          assigned_to: formData.assignedTo,
          source: formData.source,
          status: formData.status,
          notes: formData.notes || undefined,
          created_at: now,
          updated_at: now
        });

        // Send email to assigned user + notification to reporting manager
        sendLeadNotification({
          assignedToId: formData.assignedTo,
          leadName: formData.name,
          leadPhone: formData.phone,
          leadEmail: formData.email || undefined,
          projectName,
          source: formData.source,
          notes: formData.notes || undefined,
          isReassignment: false,
        }).catch((err) => console.error('[LeadNotifier] New lead notification failed:', err));

        await dialog.alert('Lead assigned successfully!', { variant: 'success' });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving lead:', err);
      await dialog.alert(err.message || 'Failed to save lead.', { variant: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingLead ? "Edit Lead Details" : "Assign New Lead"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Contact Info */}
        <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-lg space-y-3 border border-gray-200 dark:border-white/10">
          <h3 className="font-semibold text-[#0A1C37] dark:text-white flex items-center gap-2 text-sm">
            <User size={16} className="text-[#1673FF]" />
            Lead Contact Information
          </h3>
          <div className="space-y-3">
            <Input 
              label="Lead Name *" 
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })} 
              required 
              maxLength={100} 
            />
            <Input 
              label="Phone Number *" 
              value={formData.phone} 
              onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} 
              required 
              placeholder="10-digit number" 
            />
            <Input 
              label="Email Address" 
              type="email" 
              value={formData.email} 
              onChange={e => setFormData({ ...formData, email: e.target.value })} 
            />
          </div>
        </div>

        {/* Assignment Info */}
        <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-lg space-y-3 border border-gray-200 dark:border-white/10">
          <h3 className="font-semibold text-[#0A1C37] dark:text-white flex items-center gap-2 text-sm">
            <Compass size={16} className="text-[#1673FF]" />
            Assignment & Project
          </h3>
          <div className="space-y-3">
            <Select
              label="Project *"
              value={formData.projectId}
              onChange={e => setFormData({ ...formData, projectId: e.target.value })}
              options={projects.map(p => ({ label: p.name, value: p._id }))}
              required
            />
            <Select
              label="Assign To *"
              value={formData.assignedTo}
              onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
              options={salesTeam.map(s => ({ label: `${s.full_name} (${s.role.replace('_', ' ')})`, value: s._id }))}
              required
            />
            <Select
              label="Lead Source *"
              value={formData.source}
              onChange={e => setFormData({ ...formData, source: e.target.value })}
              options={[
                { label: 'Referral', value: 'Referral' },
                { label: '99acres', value: '99acres' },
                { label: 'MagicBrick', value: 'MagicBrick' },
                { label: 'Housing', value: 'Housing' },
                { label: 'Meta', value: 'Meta' },
                { label: 'Google', value: 'Google' },
                { label: 'Walk-in', value: 'Walk-in' }
              ]}
              required
            />
            <Select
              label="Lead Status *"
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              options={[
                { label: 'Pending / New', value: 'pending' },
                { label: 'Contacted', value: 'contacted' },
                { label: 'Converted', value: 'converted' },
                { label: 'Lost', value: 'lost' }
              ]}
              required
            />
          </div>
        </div>

        {/* Notes */}
        <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-lg space-y-3 border border-gray-200 dark:border-white/10">
          <h3 className="font-semibold text-[#0A1C37] dark:text-white flex items-center gap-2 text-sm">
            <FileText size={16} className="text-[#1673FF]" />
            Additional Notes
          </h3>
          <div>
            <textarea
              className="w-full min-h-[80px] p-2 bg-white dark:bg-black/20 rounded border border-gray-300 dark:border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-[#1673FF] text-[#0A1C37] dark:text-white"
              placeholder="Enter notes about lead, conversation details, etc..."
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button variant="primary" type="submit" isLoading={isSubmitting}>
            {editingLead ? "Update Lead" : "Assign Lead"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
