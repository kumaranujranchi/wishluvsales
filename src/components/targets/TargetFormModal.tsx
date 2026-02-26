import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useDialog } from '../../contexts/DialogContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { startOfMonth, endOfMonth, format } from 'date-fns';

interface TargetFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingTarget?: any | null; // Convex Doc<"targets">
}

export function TargetFormModal({ isOpen, onClose, onSuccess, editingTarget }: TargetFormModalProps) {
    const dialog = useDialog();
    const [submitting, setSubmitting] = useState(false);

    // Convex Queries
    const profiles = useQuery(api.profiles.list) || [];
    const addTarget = useMutation(api.targets.add);
    const updateTarget = useMutation(api.targets.update);

    const executives = useMemo(() => {
        return profiles.filter(p => ['sales_executive', 'team_leader'].includes(p.role) && p.is_active);
    }, [profiles]);

    const [formData, setFormData] = useState({
        userId: '',
        month: new Date().toISOString().slice(0, 7), // 2023-11
        sqft: ''
    });

    useEffect(() => {
        if (isOpen) {
            if (editingTarget) {
                setFormData({
                    userId: editingTarget.user_id,
                    month: (editingTarget.start_date || '').slice(0, 7),
                    sqft: (editingTarget.target_sqft || 0).toString()
                });
            } else {
                setFormData({
                    userId: '',
                    month: new Date().toISOString().slice(0, 7),
                    sqft: ''
                });
            }
        }
    }, [isOpen, editingTarget]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            // Calculate Start/End dates
            const date = new Date(formData.month + '-01');
            const startDate = startOfMonth(date);
            const endDate = endOfMonth(date);
            const now = new Date().toISOString();

            const payload = {
                user_id: formData.userId as any, // Convex Id
                period_type: 'monthly',
                start_date: format(startDate, 'yyyy-MM-dd'),
                end_date: format(endDate, 'yyyy-MM-dd'),
                target_sqft: parseFloat(formData.sqft) || 0,
                target_amount: 0,
                target_units: 0,
                created_at: editingTarget?.created_at || now,
                updated_at: now
            };

            if (editingTarget) {
                await updateTarget({
                    id: editingTarget._id,
                    ...payload,
                });
            } else {
                await addTarget(payload);
            }

            await dialog.alert(editingTarget ? 'Target updated!' : 'Target assigned successfully!', { variant: 'success' });
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            await dialog.alert(err.message || 'Failed to save target.', { variant: 'danger' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingTarget ? "Edit Target" : "Assign Monthly Target"}
            size="md"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Select
                    label="Sales Executive / Leader"
                    value={formData.userId}
                    onChange={e => setFormData({ ...formData, userId: e.target.value })}
                    options={executives.map(ex => ({ label: `${ex.full_name} (${ex.role.replace('_', ' ')})`, value: ex._id }))}
                    required
                    disabled={!!editingTarget}
                />

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Select Month"
                        type="month"
                        value={formData.month}
                        onChange={e => setFormData({ ...formData, month: e.target.value })}
                        required
                    />
                    <Input
                        label="Target Area (Sq Ft)"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.sqft}
                        onChange={e => setFormData({ ...formData, sqft: e.target.value })}
                        required
                    />
                </div>

                <p className="text-xs text-gray-500">
                    * Targets are strictly monthly and measured in Square Feet.
                </p>

                <div className="flex justify-end pt-4">
                    <Button type="button" variant="ghost" onClick={onClose} className="mr-2">Cancel</Button>
                    <Button type="submit" variant="primary" isLoading={submitting}>Save Target</Button>
                </div>
            </form>
        </Modal>
    );
}
