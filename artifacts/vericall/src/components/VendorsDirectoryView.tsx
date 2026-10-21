import React, { useState, useEffect } from 'react';
import {
  Building2, Plus, Lock, ShieldCheck, AlertCircle, Trash2, Edit2, History,
  CheckCircle2, RefreshCw, X, ArrowRight, UserCheck
} from 'lucide-react';
import type { AuthUser, Vendor, AuditLog } from '@/types/veil';

interface VendorsDirectoryViewProps {
  currentUser: AuthUser | null;
  onOpenAuth: () => void;
  onQuickSwitchUser: (email: string) => void;
  onToast: (msg: string) => void;
}

export function VendorsDirectoryView({
  currentUser,
  onOpenAuth,
  onQuickSwitchUser,
  onToast,
}: VendorsDirectoryViewProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'Directory' | 'AuditTrail'>('Directory');

  // Vendor Form Modal (Add / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [name, setName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [routingCode, setRoutingCode] = useState('');
  const [approvalLimit, setApprovalLimit] = useState(1000000);
  const [saving, setSaving] = useState(false);

  const isAdmin = currentUser?.role === 'Admin';

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('veil_auth_token');
      const resp = await fetch('/api/vendors', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (resp.ok) {
        const json = await resp.json();
        setVendors(json.vendors || []);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const token = localStorage.getItem('veil_auth_token');
      const resp = await fetch('/api/audit-logs', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (resp.ok) {
        const json = await resp.json();
        setAuditLogs(json.auditLogs || []);
      }
    } catch {
      // Non-fatal
    }
  };

  useEffect(() => {
    fetchVendors();
    if (currentUser?.role === 'Admin' || currentUser?.role === 'Approver') {
      fetchAuditLogs();
    }
  }, [currentUser]);

  const openAddModal = () => {
    if (!isAdmin) {
      onToast('Access Denied: Only Admin (David Vance) can add or modify approved vendor bank accounts.');
      return;
    }
    setEditingVendor(null);
    setName('');
    setBankName('');
    setBankAccount('');
    setRoutingCode('');
    setApprovalLimit(1000000);
    setModalOpen(true);
  };

  const openEditModal = (v: Vendor) => {
    if (!isAdmin) {
      onToast('Access Denied: Only Admin (David Vance) can modify approved vendor bank accounts.');
      return;
    }
    setEditingVendor(v);
    setName(v.name);
    setBankName(v.bankName);
    setBankAccount(v.bankAccount);
    setRoutingCode(v.routingCode);
    setApprovalLimit(v.approvalLimit);
    setModalOpen(true);
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      onToast('Access Denied: Admin role required.');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('veil_auth_token');
      const isEdit = Boolean(editingVendor);
      const url = isEdit ? `/api/vendors/${editingVendor!.id}` : '/api/vendors';
      const method = isEdit ? 'PUT' : 'POST';

      const resp = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name,
          bankName,
          bankAccount,
          routingCode,
          approvalLimit: Number(approvalLimit),
          verified: true,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.message || 'Failed to save vendor details');
      }

      onToast(isEdit ? `Vendor "${name}" updated!` : `New vendor "${name}" added to approved directory!`);
      setModalOpen(false);
      fetchVendors();
      fetchAuditLogs();
    } catch (err: any) {
      onToast(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVendor = async (v: Vendor) => {
    if (!isAdmin) {
      onToast('Access Denied: Only Admin can remove approved vendors.');
      return;
    }
    if (!confirm(`Are you sure you want to delete vendor "${v.name}" from the approved directory? This action is recorded in the audit trail.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('veil_auth_token');
      const resp = await fetch(`/api/vendors/${v.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (resp.ok) {
        onToast(`Vendor "${v.name}" removed from approved directory.`);
        fetchVendors();
        fetchAuditLogs();
      }
    } catch (err: any) {
      onToast(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Building2 className="text-cyan-400" size={22} />
              Approved Vendors & Bank Accounts Directory
            </h1>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
              Baseline Vault
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Pre-authorized vendor beneficiaries and verified bank routing details. 
            All payment requests are validated against this baseline before dual-custody approval.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchVendors}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
            title="Refresh directory"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={openAddModal}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow ${
              isAdmin
                ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {isAdmin ? <Plus size={15} /> : <Lock size={13} />}
            Add Approved Vendor {isAdmin ? '' : '(Admin Only)'}
          </button>
        </div>
      </div>

      {/* Role Notice Banner */}
      {!isAdmin && (
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Lock size={15} className="text-cyan-400 shrink-0" />
            <span>
              <strong>RBAC Permission Notice:</strong> You are currently viewing as <strong>{currentUser?.name || 'Guest'} ({currentUser?.role || 'Guest'})</strong>. 
              Only users with the <strong>Admin</strong> role can add, modify, or delete vendor banking records.
            </span>
          </div>
          <button
            onClick={() => onQuickSwitchUser('admin@veil.corp')}
            className="px-3 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 rounded text-xs font-semibold shrink-0 ml-3 transition"
          >
            Switch to Admin (David Vance)
          </button>
        </div>
      )}

      {/* Tabs: Directory vs Audit Trail */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('Directory')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              activeTab === 'Directory'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Building2 size={13} />
            Approved Directory ({vendors.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('AuditTrail');
              fetchAuditLogs();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              activeTab === 'AuditTrail'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <History size={13} />
            Directory Audit Trail
          </button>
        </div>
      </div>

      {/* View: Directory Table */}
      {activeTab === 'Directory' ? (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Vendor Entity Name</th>
                  <th className="py-3 px-3">Bank Institution</th>
                  <th className="py-3 px-3">Account Number</th>
                  <th className="py-3 px-3">Routing / IFSC</th>
                  <th className="py-3 px-3">Threshold Limit</th>
                  <th className="py-3 px-3">Verification</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {vendors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-semibold text-slate-200 flex items-center gap-2">
                      <Building2 size={15} className="text-cyan-400 shrink-0" />
                      {v.name}
                    </td>
                    <td className="py-3 px-3 text-slate-300">{v.bankName}</td>
                    <td className="py-3 px-3 font-mono text-cyan-300 font-medium">{v.bankAccount}</td>
                    <td className="py-3 px-3 font-mono text-slate-400">{v.routingCode}</td>
                    <td className="py-3 px-3 font-mono text-slate-200">
                      ₹{v.approvalLimit.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 w-fit font-bold">
                        <CheckCircle2 size={11} /> Verified
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(v)}
                          className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
                          title="Edit vendor"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteVendor(v)}
                          className="p-1.5 rounded text-red-400 hover:text-red-300 hover:bg-red-950/50 transition"
                          title="Delete vendor"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* View: Audit Trail */
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-3">User & Role</th>
                  <th className="py-3 px-3">Action</th>
                  <th className="py-3 px-3">Target</th>
                  <th className="py-3 px-4">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                      No audit events recorded yet. Actions by Admin and Approvers are logged here immutably.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="text-slate-200 font-sans font-semibold">{log.userName}</span>
                        <span className="text-[10px] ml-1.5 px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {log.userRole}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{log.target}</td>
                      <td className="py-2.5 px-4 text-slate-300 font-sans">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Vendor */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Building2 size={18} className="text-cyan-400" />
                  {editingVendor ? 'Edit Approved Vendor' : 'Add Approved Vendor'}
                </h2>
                <p className="text-xs text-slate-400">
                  Admin authorization: Changes are recorded to the immutable audit trail.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVendor} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Vendor Entity Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Tech Solutions Escrow"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Bank Name</label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Standard Chartered"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Bank Account Number</label>
                  <input
                    type="text"
                    required
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="ACCT-8821-SCB"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Routing / IFSC Code</label>
                  <input
                    type="text"
                    required
                    value={routingCode}
                    onChange={(e) => setRoutingCode(e.target.value)}
                    placeholder="SCBLINBBXXX"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Approval Limit (₹ INR)</label>
                  <input
                    type="number"
                    required
                    min={10000}
                    value={approvalLimit}
                    onChange={(e) => setApprovalLimit(Number(e.target.value))}
                    placeholder="1000000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingVendor ? 'Update Vendor' : 'Add Vendor'}
                  <ArrowRight size={13} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
