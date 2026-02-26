import { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/format';
import { useAuth } from '../../contexts/AuthContext';
import { useDialog } from '../../contexts/DialogContext';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Doc, Id } from '../../../convex/_generated/dataModel';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal, ModalFooter } from '../ui/Modal';
import { User, DollarSign, FileText, Calendar, Trash2 } from 'lucide-react';

interface SalesFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingSale?: Doc<"sales"> | null;
}

export function SalesFormModal({ isOpen, onClose, onSuccess, editingSale }: SalesFormModalProps) {
    const { user } = useAuth();
    const dialog = useDialog();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Convex Queries
    const projects = useQuery(api.projects.list) || [];
    const executives = useQuery(api.profiles.list) || [];
    const customersList = useQuery(api.customers.listAll) || [];

    // Convex Mutations
    const addCustomer = useMutation(api.customers.add);
    const updateCustomer = useMutation(api.customers.update);
    const addSale = useMutation(api.sales.add);
    const updateSale = useMutation(api.sales.update);
    const addPayment = useMutation(api.payments.add);
    const logActivity = useMutation(api.activity_logs.log);

    // Form State

    // Form State
    const [formData, setFormData] = useState({
        // Customer
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        allowDuplicate: false,
        coOwners: [] as string[],

        // Assignment
        executiveId: '',

        // Transaction
        bookingDate: new Date().toISOString().slice(0, 10),
        projectId: '',
        unitNumber: '', // Plot No

        // Pricing
        areaSqft: '',
        ratePerSqft: '',
        plc: '0',
        devCharges: '0',
        otherCharges: '0',
        discount: '0',

        // Legal
        isAgreementDone: false,
        agreementDate: '',
        isRegistryDone: false,
        registryDate: '',
        
        // Initial Payment
        bookingAmount: '',
        paymentMode: 'cheque',
        paymentType: 'booking',
        transactionRef: ''
    });

    useEffect(() => {
        if (isOpen) {
            if (editingSale) {
                // We need to fetch customer details if editing
                // For now polyfill from editingSale metadata/props if possible
                // or assume we have it. In Convex, we might need a separate query for customer.
                // But let's assume editingSale has enough info or we fetch it.
                setFormData({
                    customerName: (editingSale as any).customer?.name || '',
                    customerPhone: (editingSale as any).customer?.phone || '',
                    customerEmail: (editingSale as any).customer?.email || '',
                    allowDuplicate: false,
                    coOwners: editingSale.co_owners as string[] || [],

                    executiveId: editingSale.sales_executive_id,
                    bookingDate: editingSale.sale_date,
                    projectId: editingSale.project_id,
                    unitNumber: editingSale.unit_number || '',
                    areaSqft: editingSale.area_sqft?.toString() || '',
                    ratePerSqft: editingSale.rate_per_sqft?.toString() || '',
                    plc: editingSale.plc?.toString() || '0',
                    devCharges: editingSale.dev_charges?.toString() || '0',
                    otherCharges: editingSale.additional_charges?.toString() || '0',
                    discount: editingSale.discount?.toString() || '0',
                    isAgreementDone: editingSale.is_agreement_done || false,
                    agreementDate: editingSale.agreement_date || '',
                    isRegistryDone: editingSale.is_registry_done || false,
                    registryDate: editingSale.registry_date || '',
                    
                    bookingAmount: '',
                    paymentMode: 'cheque',
                    paymentType: 'booking',
                    transactionRef: ''
                });
            } else {
                resetForm();
            }
        }
    }, [isOpen, editingSale]);

    const resetForm = () => {
        setFormData({
            customerName: '',
            customerPhone: '',
            customerEmail: '',
            allowDuplicate: false,
            coOwners: [],
            executiveId: '',
            bookingDate: new Date().toISOString().slice(0, 10),
            projectId: '',
            unitNumber: '',
            areaSqft: '',
            ratePerSqft: '',
            plc: '0',
            devCharges: '0',
            otherCharges: '0',
            discount: '0',
            isAgreementDone: false,
            agreementDate: '',
            isRegistryDone: false,
            registryDate: '',
            bookingAmount: '',
            paymentMode: 'cheque',
            paymentType: 'booking',
            transactionRef: ''
        });
    };

    const calculateTotal = () => {
        const area = parseFloat(formData.areaSqft) || 0;
        const baseRate = parseFloat(formData.ratePerSqft) || 0;
        const dcRate = parseFloat(formData.devCharges) || 0;
        const plcPercent = parseFloat(formData.plc) || 0;
        const other = parseFloat(formData.otherCharges) || 0;
        const discount = parseFloat(formData.discount) || 0;

        const baseCost = area * baseRate;
        const dcAmount = area * dcRate;
        const plcAmount = baseCost * (plcPercent / 100);

        return baseCost + dcAmount + plcAmount + other - discount;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let customerId = editingSale?.customer_id;

            if (!editingSale || !customerId) {
                // Always create or find customer for new sale
                // Simplified for Convex: just create new for now or implement getByPhone
                customerId = await addCustomer({
                    name: formData.customerName,
                    phone: formData.customerPhone,
                    email: formData.customerEmail || undefined,
                    created_by: user?.id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });
            } else {
                // Update customer
                await updateCustomer({
                    id: customerId as Id<"customers">,
                    name: formData.customerName,
                    phone: formData.customerPhone,
                    email: formData.customerEmail || undefined,
                    updated_at: new Date().toISOString(),
                });
            }

            const totalRev = calculateTotal();
            const now = new Date().toISOString();

            const saleData = {
                customer_id: customerId,
                project_id: formData.projectId,
                sales_executive_id: formData.executiveId,
                unit_number: formData.unitNumber,
                area_sqft: parseFloat(formData.areaSqft),
                rate_per_sqft: parseFloat(formData.ratePerSqft),
                plc: parseFloat(formData.plc),
                dev_charges: parseFloat(formData.devCharges),
                additional_charges: parseFloat(formData.otherCharges),
                discount: parseFloat(formData.discount),
                total_revenue: totalRev,
                sale_date: formData.bookingDate,
                co_owners: formData.coOwners.filter(n => n.trim() !== ''),
                is_agreement_done: formData.isAgreementDone,
                agreement_date: formData.isAgreementDone ? formData.agreementDate || undefined : undefined,
                is_registry_done: formData.isRegistryDone,
                registry_date: formData.isRegistryDone ? formData.registryDate || undefined : undefined,
                metadata: {},
                updated_at: now,
            };

            let savedSaleId;

            if (editingSale) {
                await updateSale({
                    id: editingSale._id,
                    ...saleData,
                });
                savedSaleId = editingSale._id;
                await logActivity({
                    user_id: user?.id,
                    action: 'SALE_UPDATED',
                    entity_type: 'sale',
                    entity_id: savedSaleId,
                    details: { unit_number: formData.unitNumber },
                    created_at: now,
                });
            } else {
                savedSaleId = await addSale({
                    ...saleData,
                    sale_number: `SALE-${Date.now()}`,
                    booking_amount: parseFloat(formData.bookingAmount) || 0,
                    created_at: now,
                });
                await logActivity({
                    user_id: user?.id,
                    action: 'SALE_CREATED',
                    entity_type: 'sale',
                    entity_id: savedSaleId,
                    details: { unit_number: formData.unitNumber },
                    created_at: now,
                });
            }

            // Handle Initial Payment
            if (!editingSale && parseFloat(formData.bookingAmount) > 0) {
                const bookingAmt = parseFloat(formData.bookingAmount);
                await addPayment({
                    sale_id: savedSaleId,
                    payment_date: formData.bookingDate,
                    amount: bookingAmt,
                    payment_type: formData.paymentType,
                    payment_mode: formData.paymentMode,
                    transaction_reference: formData.transactionRef,
                    remarks: 'Initial Booking Amount',
                    recorded_by: user?.id,
                    created_at: now,
                    updated_at: now,
                });
            }

            await dialog.alert(
                editingSale ? 'Sale updated successfully!' : 'Sale created successfully!',
                { variant: 'success', title: 'Success' }
            );
            onSuccess();
            onClose();

        } catch (err: any) {
            console.error('Error saving sale:', err);
            await dialog.alert(err.message || 'Failed to save sale.', { variant: 'danger' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingSale ? "Edit Sales Record" : "New Sales Record"}
            size="xl"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Customer Section */}
                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-lg space-y-4 border border-gray-200 dark:border-white/10">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-[#0A1C37] dark:text-white flex items-center gap-2">
                            <User size={18} className="text-[#1673FF] dark:text-[#1673FF]" />
                            Customer Information
                        </h3>
                        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={formData.allowDuplicate}
                                onChange={e => setFormData({ ...formData, allowDuplicate: e.target.checked })}
                                className="rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-black/20 text-[#1673FF] focus:ring-[#1673FF]"
                            />
                            Allow Duplicate Entry
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Primary Owner Name *" value={formData.customerName} onChange={e => setFormData({ ...formData, customerName: e.target.value })} required maxLength={100} />
                        <Input label="Mobile Number *" value={formData.customerPhone} onChange={e => setFormData({ ...formData, customerPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })} required placeholder="10-digit number" />
                        <Input label="Email Address" type="email" value={formData.customerEmail} onChange={e => setFormData({ ...formData, customerEmail: e.target.value })} className="md:col-span-2" />
                    </div>

                    <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-white/10 mt-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">Co-Owners / Joint Applicants</label>
                        {formData.coOwners.map((name, index) => (
                            <div key={index} className="flex gap-2 items-center">
                                <span className="text-gray-400 text-sm w-6">{index + 1}.</span>
                                <Input
                                    placeholder="Full Name"
                                    value={name}
                                    onChange={(e) => {
                                        const newOwners = [...formData.coOwners];
                                        newOwners[index] = e.target.value;
                                        setFormData({ ...formData, coOwners: newOwners });
                                    }}
                                    className="flex-1"
                                />
                                <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 h-10 w-10 p-0" onClick={() => {
                                    const newOwners = formData.coOwners.filter((_, i) => i !== index);
                                    setFormData({ ...formData, coOwners: newOwners });
                                }}>
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        ))}
                        <Button type="button" variant="ghost" size="sm" className="text-[#1673FF] hover:bg-blue-50 mt-1" onClick={() => setFormData({ ...formData, coOwners: [...formData.coOwners, ''] })}>
                            + Add Co-Owner
                        </Button>
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-lg space-y-4 border border-gray-200 dark:border-white/10">
                    <h3 className="font-semibold text-[#0A1C37] dark:text-white flex items-center gap-2">
                        <Calendar size={18} className="text-[#1673FF]" />
                        Transaction Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                            label="Project Name *"
                            value={formData.projectId}
                            onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                            options={projects.map(p => ({ label: p.name, value: p._id }))}
                            required
                        />
                        <Select
                            label="Sales Executive *"
                            value={formData.executiveId}
                            onChange={e => setFormData({ ...formData, executiveId: e.target.value })}
                            options={executives.map(e => ({ label: e.full_name, value: e._id }))}
                            required
                        />
                        <Input label="Plot No (Unit No) *" value={formData.unitNumber} onChange={e => setFormData({ ...formData, unitNumber: e.target.value })} required />
                        <Input label="Booking Date *" type="date" value={formData.bookingDate} onChange={e => setFormData({ ...formData, bookingDate: e.target.value })} required />
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-lg space-y-4 border border-gray-200 dark:border-white/10">
                    <h3 className="font-semibold text-[#0A1C37] dark:text-white flex items-center gap-2">
                        <DollarSign size={18} className="text-[#1673FF]" />
                        Pricing & Area
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Area (sq ft) *" type="number" step="0.01" value={formData.areaSqft} onChange={e => setFormData({ ...formData, areaSqft: e.target.value })} required />
                        <Input label="Base Price / sq ft *" type="number" value={formData.ratePerSqft} onChange={e => setFormData({ ...formData, ratePerSqft: e.target.value })} required />
                        <Input label="Discount" type="number" value={formData.discount} onChange={e => setFormData({ ...formData, discount: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Dev Charges (+ Rate/sqft)" type="number" value={formData.devCharges} onChange={e => setFormData({ ...formData, devCharges: e.target.value })} />
                        <Input label="PLC (%)" type="number" value={formData.plc} onChange={e => setFormData({ ...formData, plc: e.target.value })} />
                        <Input label="Other Charges" type="number" value={formData.otherCharges} onChange={e => setFormData({ ...formData, otherCharges: e.target.value })} />
                    </div>

                    <div className="flex justify-between items-center bg-white dark:bg-black/20 p-3 rounded border border-gray-200 dark:border-white/10 mt-2">
                        <span className="text-gray-600 dark:text-gray-400 font-medium h-fit">Total Revenue Calculation:</span>
                        <span className="text-xl font-bold text-[#2BA67A] dark:text-[#00E576]">{formatCurrency(calculateTotal())}</span>
                    </div>
                </div>

                {!editingSale && (
                    <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-lg space-y-4 border border-gray-200 dark:border-white/10">
                        <h3 className="font-semibold text-[#0A1C37] dark:text-white flex items-center gap-2">
                            <DollarSign size={18} className="text-[#1673FF]" />
                            Initial Payment Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input 
                                label="Booking / Token Amount" 
                                type="number" 
                                value={formData.bookingAmount} 
                                onChange={e => setFormData({ ...formData, bookingAmount: e.target.value })} 
                                placeholder="Enter amount if received"
                            />
                             <Select
                                label="Payment Type"
                                value={formData.paymentType}
                                onChange={e => setFormData({ ...formData, paymentType: e.target.value })}
                                options={[
                                    { label: 'Booking Amount', value: 'booking' },
                                    { label: 'Token Amount', value: 'token' },
                                    { label: 'Advance', value: 'advance' },
                                ]}
                            />
                            <Select
                                label="Mode of Payment"
                                value={formData.paymentMode}
                                onChange={e => setFormData({ ...formData, paymentMode: e.target.value })}
                                options={[
                                    { label: 'Cheque', value: 'cheque' },
                                    { label: 'Cash', value: 'cash' },
                                    { label: 'Account Transfer', value: 'account_transfer' },
                                    { label: 'UPI', value: 'upi' },
                                    { label: 'Demand Draft (DD)', value: 'dd' },
                                ]}
                            />
                            <Input 
                                label="Transaction Ref / Chq No" 
                                value={formData.transactionRef} 
                                onChange={e => setFormData({ ...formData, transactionRef: e.target.value })} 
                                placeholder="Optional"
                            />
                        </div>
                    </div>
                )}

                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-lg space-y-4 border border-gray-200 dark:border-white/10">
                    <h3 className="font-semibold text-[#0A1C37] dark:text-white flex items-center gap-2">
                        <FileText size={18} className="text-[#1673FF]" />
                        Legal Status
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-[#1673FF] rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-black/20 focus:ring-[#1673FF]"
                                    checked={formData.isAgreementDone}
                                    onChange={e => setFormData({ ...formData, isAgreementDone: e.target.checked })}
                                />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Agreement Done?</span>
                            </label>
                            {formData.isAgreementDone && (
                                <Input label="Agreement Date" type="date" value={formData.agreementDate} onChange={e => setFormData({ ...formData, agreementDate: e.target.value })} required />
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-[#1673FF] rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-black/20 focus:ring-[#1673FF]"
                                    checked={formData.isRegistryDone}
                                    onChange={e => setFormData({ ...formData, isRegistryDone: e.target.checked })}
                                />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Registry Done?</span>
                            </label>
                            {formData.isRegistryDone && (
                                <Input label="Registry Date" type="date" value={formData.registryDate} onChange={e => setFormData({ ...formData, registryDate: e.target.value })} required />
                            )}
                        </div>
                    </div>
                </div>

                <ModalFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button variant="primary" type="submit" isLoading={isSubmitting}>
                        {editingSale ? (
                            <>
                                <span className="hidden sm:inline">Update Record</span>
                                <span className="sm:hidden">Update</span>
                            </>
                        ) : (
                            <>
                                <span className="hidden sm:inline">Create Record</span>
                                <span className="sm:hidden">Create</span>
                            </>
                        )}
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
}
