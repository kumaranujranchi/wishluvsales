import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Doc } from '../../../convex/_generated/dataModel';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { AlertTriangle } from 'lucide-react';

interface SalesCancellationModalProps {
    sale: (Doc<"sales"> & { 
        customer?: Doc<"customers"> | null; 
        project?: Doc<"projects"> | null;
    }) | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function SalesCancellationModal({ sale, isOpen, onClose, onSuccess }: SalesCancellationModalProps) {
    const { user } = useAuth();
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const updateSale = useMutation(api.sales.update);

    const handleCancel = async () => {
        if (!sale || !user) return;
        
        if (!reason || reason.trim().length < 10) {
            setError('Please provide a detailed reason (minimum 10 characters).');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const updatedMetadata = {
                ...(sale.metadata || {}),
                booking_status: 'cancelled',
                cancellation_reason: reason,
                cancelled_at: new Date().toISOString(),
                cancelled_by: user.id
            };

            await updateSale({
                id: sale._id,
                metadata: updatedMetadata,
                updated_at: new Date().toISOString(),
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error cancelling sale:', err);
            setError(err.message || 'Failed to cancel sale.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Cancel Sale"
            size="md"
            footer={
                <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Close
                    </Button>
                    <Button variant="danger" onClick={handleCancel} disabled={loading}>
                        {loading ? 'Cancelling...' : 'Confirm Cancellation'}
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />
                    <div>
                        <h4 className="font-semibold text-red-800 text-sm">Warning: Irreversible Action</h4>
                        <p className="text-red-700 text-xs mt-1">
                            Cancelling this sale will remove it from all active metrics and calculations.
                            The record will still be visible but marked as cancelled.
                        </p>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sale Details
                    </label>
                    <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-600 space-y-1">
                        <p><span className="font-medium">Customer:</span> {sale?.customer?.name || 'N/A'}</p>
                        <p><span className="font-medium">Project:</span> {sale?.project?.name || 'N/A'} - {sale?.unit_number || 'N/A'}</p>
                        <p><span className="font-medium">Date:</span> {sale?.sale_date}</p>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cancellation Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                        rows={4}
                        placeholder="Please explain why this sale is being cancelled..."
                    />
                    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                </div>
            </div>
        </Modal>
    );
}
