import React, { useState, useMemo } from "react";
import { Staff, UserProfile, POSTransaction, Order, Product } from "../../../types";
import { deleteStorageImage, compressAndResizeImage, processAndUploadImage } from "../../../utils/storageUtils";
import { customAlert, customConfirm } from '../../../utils/dialog';
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Key,
  ShieldCheck,
  Award,
  CheckCircle,
  AlertTriangle,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Activity,
  Check,
  X,
  Lock,
  UserCheck,
  UserX,
  Upload,
  RefreshCw,
  Eye,
  BarChart3,
  Percent,
  Download,
  ShoppingCart,
  Grid,
  List,
  Sparkles,
  Copy
} from "lucide-react";

export interface AdminStaffTabProps {
  staff?: Staff[];
  onAddStaff?: (staff: any) => Promise<any> | void;
  onUpdateStaff?: (staff: any) => Promise<any> | void;
  addStaff?: (staff: any) => Promise<any> | void;
  updateStaff?: (staff: any) => Promise<any> | void;
  deleteStaff?: (staffId: string) => Promise<any> | void;
  resetStaffPassword?: (staffId: string, newPassword?: string) => Promise<any> | void;
  posTransactions?: POSTransaction[];
  orders?: Order[];
  products?: Product[];
  currentUser?: UserProfile | null;
  isDark: boolean;
  cardBg: string;
  textTitle: string;
  textSub: string;
  inputBg: string;
  modalBg: string;
  tableHeaderBg: string;
  tableRowHover: string;
  formatTZS: (val: number) => string;
  formatToGMT3?: (date: any) => string;
  showAlert: (title: string, msg: string, type?: any) => void;
  ensureOnline: (actionName?: string) => boolean;
}

export const AdminStaffTab: React.FC<AdminStaffTabProps> = ({
  staff = [],
  onAddStaff,
  onUpdateStaff,
  addStaff = onAddStaff,
  updateStaff = onUpdateStaff,
  deleteStaff,
  resetStaffPassword,
  posTransactions = [],
  orders = [],
  products = [],
  currentUser,
  isDark,
  cardBg,
  textTitle,
  textSub,
  inputBg,
  modalBg,
  tableHeaderBg,
  tableRowHover,
  formatTZS,
  formatToGMT3 = (d) => String(d || ""),
  showAlert,
  ensureOnline
}) => {
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [staffRoleFilter, setStaffRoleFilter] = useState("All");
  const [staffStatusFilter, setStaffStatusFilter] = useState("All");
  const [staffViewMode, setStaffViewMode] = useState<"grid" | "table">("grid");
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaffMember, setEditingStaffMember] = useState<Staff | null>(null);
  const [viewingStaffProfile, setViewingStaffProfile] = useState<Staff | null>(null);
  const [resetPasswordStaff, setResetPasswordStaff] = useState<Staff | null>(null);
  const [newStaffPasswordInput, setNewStaffPasswordInput] = useState("");
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [staffAvatarUploading, setStaffAvatarUploading] = useState(false);
  const [staffForm, setStaffForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "Cashier / POS Associate",
    password: "",
    permissions: ["POS_ACCESS", "VIEW_CATALOG"] as string[],
    status: "Active" as "Active" | "Inactive",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80"
  });

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-300">

            {/* Header & Main Actions */}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">

              <div>

                <div className="flex items-center gap-2.5">

                  <div className="p-2.5 bg-blue-600/10 text-blue-500 rounded-2xl border border-blue-500/20">

                    <Users className="w-6 h-6" />

                  </div>

                  <div>

                    <h1 className={`text-2xl font-black tracking-tight ${textTitle}`}>Staff & Store Team Management</h1>

                    <p className={`text-xs mt-0.5 ${textSub}`}>Manage administrative access, point-of-sale cashiers, inventory specialists, and access credentials.</p>

                  </div>

                </div>

              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">

                <button

                  type="button"

                  onClick={() => {
                    window.dispatchEvent(new Event('force-store-refresh'));
                  }}

                  className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${

                    isDark

                      ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300'

                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm'

                  }`}

                  title="Fetch latest real-time data from database"

                >

                  <RefreshCw className="w-3.5 h-3.5" />

                  <span>Refresh Live Data</span>

                </button>

                <button

                  type="button"

                  onClick={() => {

                    setEditingStaffMember(null);

                    setStaffForm({

                      name: '',

                      email: '',

                      phone: '',

                      role: 'Cashier / POS Associate',

                      password: `GE@${Math.floor(100000 + Math.random() * 900000)}`,

                      permissions: ['POS_ACCESS', 'VIEW_CATALOG'],

                      status: 'Active',

                      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80`

                    });

                    setIsStaffModalOpen(true);

                  }}

                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all w-full md:w-auto"

                >

                  <Plus className="w-4 h-4" />

                  <span>Add New Staff Member</span>

                </button>

              </div>

            </div>



            {/* Staff KPI Summary Cards */}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

              <div className={`p-4 rounded-2xl border ${cardBg}`}>

                <div className="flex items-center justify-between">

                  <span className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Total Staff</span>

                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">

                    <Users className="w-4 h-4" />

                  </div>

                </div>

                <div className={`text-2xl font-black mt-2 ${textTitle}`}>{staff.length}</div>

                <div className={`text-[11px] mt-1 text-slate-500`}>Official store operators</div>

              </div>



              <div className={`p-4 rounded-2xl border ${cardBg}`}>

                <div className="flex items-center justify-between">

                  <span className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Active Today</span>

                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">

                    <UserCheck className="w-4 h-4" />

                  </div>

                </div>

                <div className={`text-2xl font-black mt-2 text-emerald-500`}>

                  {staff.filter((s) => s.status === 'Active').length}

                </div>

                <div className={`text-[11px] mt-1 text-slate-500`}>Operational accounts</div>

              </div>



              <div className={`p-4 rounded-2xl border ${cardBg}`}>

                <div className="flex items-center justify-between">

                  <span className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Store Cashiers</span>

                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">

                    <ShoppingCart className="w-4 h-4" />

                  </div>

                </div>

                <div className={`text-2xl font-black mt-2 text-amber-500`}>

                  {staff.filter((s) => (s.role && (String(s.role || '').toLowerCase().includes('cashier') || s.role.toLowerCase().includes('sales') || s.role.toLowerCase().includes('pos')))).length}

                </div>

                <div className={`text-[11px] mt-1 text-slate-500`}>POS terminal access</div>

              </div>



              <div className={`p-4 rounded-2xl border ${cardBg}`}>

                <div className="flex items-center justify-between">

                  <span className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>System Admins</span>

                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">

                    <ShieldCheck className="w-4 h-4" />

                  </div>

                </div>

                <div className={`text-2xl font-black mt-2 text-purple-500`}>

                  {staff.filter((s) => (s.role && (String(s.role || '').toLowerCase().includes('admin') || s.role.toLowerCase().includes('manager')))).length}

                </div>

                <div className={`text-[11px] mt-1 text-slate-500`}>Full permissions</div>

              </div>

            </div>



            {/* Filter & Search Bar */}

            <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${cardBg}`}>

              <div className="flex flex-1 items-center gap-3 w-full">

                <div className="relative flex-1">

                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />

                  <input

                    type="text"

                    value={staffSearchQuery}

                    onChange={(e) => setStaffSearchQuery(e.target.value)}

                    placeholder="Search staff by name, email, phone, or role..."

                    className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs font-medium border ${inputBg}`}

                  />

                  {staffSearchQuery && (

                    <button

                      onClick={() => setStaffSearchQuery('')}

                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"

                    >

                      <X className="w-3.5 h-3.5" />

                    </button>

                  )}

                </div>



                <select

                  value={staffRoleFilter}

                  onChange={(e) => setStaffRoleFilter(e.target.value)}

                  className={`px-3 py-2 rounded-xl text-xs font-semibold border ${inputBg}`}

                >

                  <option value="All">All Roles</option>

                  <option value="Admin">Admin</option>

                  <option value="Manager">Store Manager</option>

                  <option value="Cashier">Cashier / POS</option>

                  <option value="Inventory">Inventory Specialist</option>

                  <option value="Support">Customer Support</option>

                  <option value="Technician">Service Technician</option>

                </select>



                <select

                  value={staffStatusFilter}

                  onChange={(e) => setStaffStatusFilter(e.target.value)}

                  className={`px-3 py-2 rounded-xl text-xs font-semibold border ${inputBg}`}

                >

                  <option value="All">All Statuses</option>

                  <option value="Active">Active Only</option>

                  <option value="Inactive">Inactive / Suspended</option>

                </select>

              </div>



              {/* View Switcher */}

              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/50 dark:bg-slate-800/80 shrink-0">

                <button

                  type="button"

                  onClick={() => setStaffViewMode('grid')}

                  className={`p-1.5 rounded-lg transition-colors ${staffViewMode === 'grid' ? (isDark ? 'bg-slate-700 text-white shadow' : 'bg-white text-slate-900 shadow') : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}

                  title="Grid View"

                >

                  <Grid className="w-4 h-4" />

                </button>

                <button

                  type="button"

                  onClick={() => setStaffViewMode('table')}

                  className={`p-1.5 rounded-lg transition-colors ${staffViewMode === 'table' ? (isDark ? 'bg-slate-700 text-white shadow' : 'bg-white text-slate-900 shadow') : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}

                  title="Table View"

                >

                  <List className="w-4 h-4" />

                </button>

              </div>

            </div>



            {/* Staff Grid or Table */}

            {staff.length === 0 ? (

              <div className={`rounded-3xl border p-12 text-center ${cardBg}`}>

                <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-4 border border-blue-500/20">

                  <Users className="w-8 h-8" />

                </div>

                <h3 className={`text-lg font-bold ${textTitle}`}>No Staff Members Added Yet</h3>

                <p className={`text-xs mt-1.5 max-w-md mx-auto ${textSub}`}>

                  Add real store operators, managers, and POS cashiers to your database. Each member will have their own login access and permission settings.

                </p>

                <button

                  type="button"

                  onClick={() => {

                    setEditingStaffMember(null);

                    setStaffForm({

                      name: '',

                      email: '',

                      phone: '',

                      role: 'Cashier / POS Associate',

                      password: `GE@${Math.floor(100000 + Math.random() * 900000)}`,

                      permissions: ['POS_ACCESS', 'VIEW_CATALOG'],

                      status: 'Active',

                      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80`

                    });

                    setIsStaffModalOpen(true);

                  }}

                  className="mt-6 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-blue-500/25 transition-all"

                >

                  <Plus className="w-4 h-4" />

                  <span>Create First Staff Member</span>

                </button>

              </div>

            ) : (

              <div>

                {staffViewMode === 'grid' ? (

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">

                    {staff

                      .filter((st) => {

                        const q = (staffSearchQuery || '').toLowerCase().trim();

                        const matchesSearch = !q || (st.name && String(st.name).toLowerCase().includes(q)) || (st.email && String(st.email).toLowerCase().includes(q)) || (st.phone && st.phone.includes(q)) || (st.role && String(st.role).toLowerCase().includes(q));

                        const matchesRole = staffRoleFilter === 'All' || (st.role && String(st.role).toLowerCase().includes(String(staffRoleFilter || '').toLowerCase()));

                        const matchesStatus = staffStatusFilter === 'All' || st.status === staffStatusFilter;

                        return matchesSearch && matchesRole && matchesStatus;

                      })

                      .map((st) => {

                        const cashierSales = posTransactions.filter((tx) => 

                          (tx.cashierName && ((st.name && String(tx.cashierName || '').toLowerCase() === String(st.name).toLowerCase()) || (st.email && String(tx.cashierName || '').toLowerCase() === String(st.email).toLowerCase())))

                        );

                        const totalPosRevenue = cashierSales.reduce((acc, tx) => acc + (tx.total || 0), 0);



                        const isMemberAdmin = st.role ? String(st.role).toLowerCase().includes('admin') : false;

                        const isMemberManager = st.role ? String(st.role).toLowerCase().includes('manager') : false;

                        const isMemberCashier = st.role ? (String(st.role).toLowerCase().includes('cashier') || String(st.role || "").toLowerCase().includes('pos')) : false;



                        return (

                          <div

                            key={st.id}

                            className={`rounded-2xl border p-5 flex flex-col justify-between transition-all hover:shadow-xl hover:border-blue-500/40 relative group ${cardBg}`}

                          >

                            {/* Top Status & Role */}

                            <div>

                              <div className="flex items-start justify-between gap-2 mb-4">

                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${

                                  isMemberAdmin

                                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'

                                    : isMemberManager

                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'

                                    : isMemberCashier

                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'

                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'

                                }`}>

                                  {st.role}

                                </span>



                                <button

                                  type="button"

                                  onClick={() => {

                                    const nextStatus = st.status === 'Active' ? 'Inactive' : 'Active';

                                    if (updateStaff) {

                                      updateStaff({ ...st, status: nextStatus });

                                    }

                                  }}

                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${

                                    st.status === 'Active'

                                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-700/50 hover:bg-red-950/40 hover:text-red-300 hover:border-red-700/50'

                                      : 'bg-red-950/40 text-red-400 border-red-700/50 hover:bg-emerald-950/40 hover:text-emerald-300 hover:border-emerald-700/50'

                                  }`}

                                  title="Click to toggle Active / Inactive"

                                >

                                  {st.status === 'Active' ? '● Active' : '○ Inactive'}

                                </button>

                              </div>



                              {/* Staff Avatar & Info */}

                              <div className="flex flex-col items-center text-center space-y-2 mb-4">

                                <div className="relative">

                                  {st.avatar ? (

                                    <img

                                      src={st.avatar}

                                      alt={st.name}

                                      className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-200 dark:border-slate-700 shadow-md"

                                    />

                                  ) : (

                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-md">

                                      {st.name.substring(0, 2).toUpperCase()}

                                    </div>

                                  )}

                                  <div className={`w-3.5 h-3.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 ${isDark ? 'border-slate-900' : 'border-white'} ${st.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-500'}`} />

                                </div>



                                <div>

                                  <h3 className={`font-black text-base leading-tight ${textTitle}`}>{st.name}</h3>

                                  <p className={`text-xs font-mono mt-1 ${textSub} truncate max-w-[200px]`}>{st.email}</p>

                                  {st.phone && (

                                    <p className="text-[11px] font-semibold text-slate-500 flex items-center justify-center gap-1 mt-0.5">

                                      <Phone className="w-3 h-3 text-emerald-500" />

                                      <span>{st.phone}</span>

                                    </p>

                                  )}

                                </div>

                              </div>



                              {/* Performance & Permissions tags */}

                              <div className={`p-2.5 rounded-xl border mb-4 space-y-1.5 ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'}`}>

                                <div className="flex items-center justify-between text-[11px]">

                                  <span className="text-slate-400">POS Sales Volume:</span>

                                  <span className="font-extrabold text-blue-500 font-mono">

                                    {cashierSales.length} tx ({formatTZS(totalPosRevenue)})

                                  </span>

                                </div>

                                <div className="flex items-center justify-between text-[11px]">

                                  <span className="text-slate-400">System Access:</span>

                                  <span className="font-bold text-slate-300">

                                    {(st.permissions || ['POS_ACCESS']).length} modules

                                  </span>

                                </div>

                              </div>

                            </div>



                            {/* Action Buttons */}

                            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-4 gap-1.5">

                              <button

                                type="button"

                                onClick={() => setViewingStaffProfile(st)}

                                className={`p-2 rounded-xl flex items-center justify-center transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-blue-400' : 'bg-slate-100 hover:bg-slate-200 text-blue-600'}`}

                                title="View Full Profile & Stats"

                              >

                                <Eye className="w-4 h-4" />

                              </button>



                              <button

                                type="button"

                                onClick={() => {

                                  setEditingStaffMember(st);

                                  setStaffForm({

                                    name: st.name,

                                    email: st.email,

                                    phone: st.phone || '',

                                    role: st.role,

                                    password: '',

                                    permissions: st.permissions || ['POS_ACCESS', 'VIEW_CATALOG'],

                                    status: st.status,

                                    avatar: st.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'

                                  });

                                  setIsStaffModalOpen(true);

                                }}

                                className={`p-2 rounded-xl flex items-center justify-center transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-amber-400' : 'bg-slate-100 hover:bg-slate-200 text-amber-600'}`}

                                title="Edit Staff Member"

                              >

                                <Edit className="w-4 h-4" />

                              </button>



                              <button

                                type="button"

                                onClick={() => {

                                  setResetPasswordStaff(st);

                                  setNewStaffPasswordInput(`GE@${Math.floor(100000 + Math.random() * 900000)}`);

                                  setResetSuccessMessage(null);

                                }}

                                className={`p-2 rounded-xl flex items-center justify-center transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-purple-400' : 'bg-slate-100 hover:bg-slate-200 text-purple-600'}`}

                                title="Reset Staff Password"

                              >

                                <Key className="w-4 h-4" />

                              </button>



                              {deleteStaff && (

                                <button

                                  type="button"

                                  onClick={async () => {
                                    const confirmed = await customConfirm(
                                      `Are you sure you want to remove staff member "${st.name}"? This action will revoke their login access immediately.`,
                                      'Remove Staff Member',
                                      'warning',
                                      'Remove Staff'
                                    );
                                    if (confirmed) {
                                      if (st.avatar) {
                                        await deleteStorageImage(st.avatar);
                                      }
                                      deleteStaff(st.id);
                                    }
                                  }}

                                  className={`p-2 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors`}

                                  title="Delete Staff Member"

                                >

                                  <Trash2 className="w-4 h-4" />

                                </button>

                              )}

                            </div>

                          </div>

                        );

                      })}

                  </div>

                ) : (

                  /* Table View */

                  <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>

                    <div className="overflow-x-auto">

                      <table className="w-full text-left text-xs">

                        <thead>

                          <tr className={`border-b font-bold uppercase tracking-wider ${tableHeaderBg}`}>

                            <th className="p-4">Staff Member</th>

                            <th className="p-4">Role</th>

                            <th className="p-4">Contact Info</th>

                            <th className="p-4">POS Performance</th>

                            <th className="p-4">Status</th>

                            <th className="p-4 text-right">Actions</th>

                          </tr>

                        </thead>

                        <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>

                          {staff

                            .filter((st) => {

                              const q = (staffSearchQuery || '').toLowerCase().trim();

                              const matchesSearch = !q || (st.name && String(st.name).toLowerCase().includes(q)) || (st.email && String(st.email).toLowerCase().includes(q)) || (st.phone && st.phone.includes(q)) || (st.role && String(st.role).toLowerCase().includes(q));

                              const matchesRole = staffRoleFilter === 'All' || (st.role && String(st.role).toLowerCase().includes(String(staffRoleFilter || '').toLowerCase()));

                              const matchesStatus = staffStatusFilter === 'All' || st.status === staffStatusFilter;

                              return matchesSearch && matchesRole && matchesStatus;

                            })

                            .map((st) => {

                              const cashierSales = posTransactions.filter((tx) => 

                                (tx.cashierName && ((st.name && String(tx.cashierName || '').toLowerCase() === String(st.name).toLowerCase()) || (st.email && String(tx.cashierName || '').toLowerCase() === String(st.email).toLowerCase())))

                              );

                              const totalPosRevenue = cashierSales.reduce((acc, tx) => acc + (tx.total || 0), 0);



                              return (

                                <tr key={st.id} className={`transition-colors ${tableRowHover}`}>

                                  <td className="p-4">

                                    <div className="flex items-center gap-3">

                                      {st.avatar ? (

                                        <img src={st.avatar} alt={st.name} className="w-10 h-10 rounded-xl object-cover border" />

                                      ) : (

                                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center">

                                          {st.name.substring(0, 2).toUpperCase()}

                                        </div>

                                      )}

                                      <div>

                                        <div className={`font-bold ${textTitle}`}>{st.name}</div>

                                        <div className="text-[10px] text-slate-500 font-mono">ID: {st.id.substring(0, 12)}</div>

                                      </div>

                                    </div>

                                  </td>

                                  <td className="p-4">

                                    <span className="font-semibold text-blue-500">{st.role}</span>

                                  </td>

                                  <td className="p-4">

                                    <div className="space-y-0.5">

                                      <div className={`font-mono ${textSub}`}>{st.email}</div>

                                      {st.phone && <div className="text-slate-500 text-[11px]">{st.phone}</div>}

                                    </div>

                                  </td>

                                  <td className="p-4">

                                    <div className="font-mono">

                                      <span className="font-bold text-slate-200">{cashierSales.length} sales</span>

                                      <span className="text-slate-500 block text-[10px]">{formatTZS(totalPosRevenue)}</span>

                                    </div>

                                  </td>

                                  <td className="p-4">

                                    <button

                                      type="button"

                                      onClick={() => {

                                        const nextStatus = st.status === 'Active' ? 'Inactive' : 'Active';

                                        if (updateStaff) {

                                          updateStaff({ ...st, status: nextStatus });

                                        }

                                      }}

                                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${

                                        st.status === 'Active'

                                          ? 'bg-emerald-950/50 text-emerald-400 border-emerald-700/60'

                                          : 'bg-red-950/50 text-red-400 border-red-700/60'

                                      }`}

                                    >

                                      {st.status}

                                    </button>

                                  </td>

                                  <td className="p-4 text-right">

                                    <div className="flex items-center justify-end gap-1.5">

                                      <button

                                        type="button"

                                        onClick={() => setViewingStaffProfile(st)}

                                        className="p-1.5 rounded-lg bg-blue-600/10 text-blue-400 hover:bg-blue-600/20"

                                        title="View Profile"

                                      >

                                        <Eye className="w-4 h-4" />

                                      </button>

                                      <button

                                        type="button"

                                        onClick={() => {

                                          setEditingStaffMember(st);

                                          setStaffForm({

                                            name: st.name,

                                            email: st.email,

                                            phone: st.phone || '',

                                            role: st.role,

                                            password: '',

                                            permissions: st.permissions || ['POS_ACCESS', 'VIEW_CATALOG'],

                                            status: st.status,

                                            avatar: st.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'

                                          });

                                          setIsStaffModalOpen(true);

                                        }}

                                        className="p-1.5 rounded-lg bg-amber-600/10 text-amber-400 hover:bg-amber-600/20"

                                        title="Edit"

                                      >

                                        <Edit className="w-4 h-4" />

                                      </button>

                                      <button

                                        type="button"

                                        onClick={() => {

                                          setResetPasswordStaff(st);

                                          setNewStaffPasswordInput(`GE@${Math.floor(100000 + Math.random() * 900000)}`);

                                          setResetSuccessMessage(null);

                                        }}

                                        className="p-1.5 rounded-lg bg-purple-600/10 text-purple-400 hover:bg-purple-600/20"

                                        title="Reset Password"

                                      >

                                        <Key className="w-4 h-4" />

                                      </button>

                                      {deleteStaff && (

                                        <button

                                          type="button"

                                          onClick={async () => {

                                            if (await customConfirm(`Delete staff member ${st.name}?`, 'Delete Staff')) {
                                                if (st.avatar) {
                                                  await deleteStorageImage(st.avatar);
                                                }
                                                deleteStaff(st.id);
                                            }

                                          }}

                                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10"

                                          title="Delete"

                                        >

                                          <Trash2 className="w-4 h-4" />

                                        </button>

                                      )}

                                    </div>

                                  </td>

                                </tr>

                              );

                            })}

                        </tbody>

                      </table>

                    </div>

                  </div>

                )}

              </div>

            )}

          </div>

            {/* 1. ADD / EDIT STAFF MODAL */}

      {isStaffModalOpen && (

        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">

          <div className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border transition-all animate-in fade-in zoom-in-95 my-8 ${modalBg}`}>

            <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50'}`}>

              <div className="flex items-center gap-2.5">

                <div className="p-2 bg-blue-600/10 text-blue-500 rounded-xl">

                  {editingStaffMember ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}

                </div>

                <div>

                  <h2 className={`text-base font-black tracking-tight ${textTitle}`}>

                    {editingStaffMember ? `Edit Staff Member: ${editingStaffMember.name}` : 'Add New Real Staff Member'}

                  </h2>

                  <p className={`text-[11px] ${textSub}`}>

                    {editingStaffMember ? 'Update permissions and credentials' : 'Create authenticated store operator'}

                  </p>

                </div>

              </div>

              <button

                type="button"

                onClick={() => {

                  setIsStaffModalOpen(false);

                  setEditingStaffMember(null);

                }}

                className={`p-2 rounded-xl transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'}`}

              >

                <X className="w-5 h-5" />

              </button>

            </div>



            <form

              onSubmit={async (e) => {

                e.preventDefault();

                if (editingStaffMember) {

                  if (updateStaff) {

                    if (editingStaffMember.avatar && editingStaffMember.avatar !== staffForm.avatar) {

                      await deleteStorageImage(editingStaffMember.avatar);

                    }

                    await updateStaff({

                      ...editingStaffMember,

                      name: staffForm.name,

                      email: staffForm.email,

                      phone: staffForm.phone,

                      role: staffForm.role,

                      permissions: staffForm.permissions,

                      status: staffForm.status,

                      avatar: staffForm.avatar

                    });

                  }

                } else {

                  if (addStaff) {

                    await addStaff({

                      name: staffForm.name,

                      email: staffForm.email,

                      phone: staffForm.phone,

                      role: staffForm.role,

                      permissions: staffForm.permissions,

                      status: staffForm.status,

                      avatar: staffForm.avatar,

                      password: staffForm.password

                    });

                  }

                }

                setIsStaffModalOpen(false);

                setEditingStaffMember(null);

              }}

              className="p-5 space-y-4 max-h-[75vh] overflow-y-auto"

            >

              {/* Name & Phone */}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div>

                  <label className={`block text-xs font-bold mb-1.5 ${textSub}`}>Full Name *</label>

                  <input

                    type="text"

                    required

                    value={staffForm.name}

                    onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}

                    placeholder="e.g. Juma Ally"

                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium ${inputBg}`}

                  />

                </div>

                <div>

                  <label className={`block text-xs font-bold mb-1.5 ${textSub}`}>Phone Number</label>

                  <input

                    type="tel"

                    value={staffForm.phone}

                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}

                    placeholder="e.g. +255 754 000 111"

                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium ${inputBg}`}

                  />

                </div>

              </div>



              {/* Email Address */}

              <div>

                <label className={`block text-xs font-bold mb-1.5 ${textSub}`}>Email Address *</label>

                <input

                  type="email"

                  required

                  value={staffForm.email}

                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}

                  placeholder="e.g. juma@genuine-electronics.com"

                  className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium ${inputBg}`}

                />

              </div>



              {/* Role & Status */}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div>

                  <label className={`block text-xs font-bold mb-1.5 ${textSub}`}>Assigned Role *</label>

                  <select

                    value={staffForm.role}

                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}

                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium ${inputBg}`}

                  >

                    <option value="Store Manager">Store Manager</option>

                    <option value="Cashier / POS Associate">Cashier / POS Associate</option>

                    <option value="Inventory Specialist">Inventory Specialist</option>

                    <option value="Customer Support">Customer Support</option>

                    <option value="Service Technician">Service Technician</option>

                    <option value="Administrator">Administrator</option>

                  </select>

                </div>

                <div>

                  <label className={`block text-xs font-bold mb-1.5 ${textSub}`}>Account Status *</label>

                  <select

                    value={staffForm.status}

                    onChange={(e) => setStaffForm({ ...staffForm, status: e.target.value as any })}

                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium ${inputBg}`}

                  >

                    <option value="Active">Active (Permitted to Log In)</option>

                    <option value="Inactive">Inactive / Suspended</option>

                  </select>

                </div>

              </div>



              {/* Password for new staff */}

              {!editingStaffMember && (

                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>

                  <div className="flex items-center justify-between mb-1.5">

                    <label className={`block text-xs font-bold ${textSub}`}>Initial Account Password *</label>

                    <button

                      type="button"

                      onClick={() => setStaffForm({ ...staffForm, password: `GE@${Math.floor(100000 + Math.random() * 900000)}` })}

                      className="text-[11px] font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1"

                    >

                      <Sparkles className="w-3 h-3" /> Auto-Generate

                    </button>

                  </div>

                  <input

                    type="text"

                    required

                    value={staffForm.password}

                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}

                    placeholder="Enter or generate password..."

                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-mono font-bold ${inputBg}`}

                  />

                  <span className="text-[10px] text-slate-500 block mt-1">This password will be securely hashed in cloud authentication vault.</span>

                </div>

              )}



              {/* Avatar URL or Upload */}

              <div>

                <label className={`block text-xs font-bold mb-1.5 ${textSub}`}>Profile Photo</label>

                <div className="flex items-center gap-3">

                  <img

                    src={staffForm.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}

                    alt="Staff Avatar"

                    className="w-12 h-12 rounded-xl object-cover border border-slate-700"

                  />

                  <div className="flex-1 space-y-1.5">

                    <input

                      type="text"

                      value={staffForm.avatar}

                      onChange={(e) => setStaffForm({ ...staffForm, avatar: e.target.value })}

                      placeholder="Photo URL or upload image"

                      className={`w-full px-3 py-1.5 rounded-xl border text-[11px] font-mono ${inputBg}`}

                    />

                    <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-500 hover:text-blue-400 cursor-pointer">

                      <Upload className="w-3.5 h-3.5" />

                      <span>{staffAvatarUploading ? 'Uploading...' : 'Upload Profile Picture'}</span>

                      <input

                        type="file"

                        accept="image/*"

                        disabled={staffAvatarUploading}

                        onChange={async (e) => {

                          const file = e.target.files?.[0];

                          if (!file) return;

                          try {

                            setStaffAvatarUploading(true);

                            const url = await processAndUploadImage(file);

                            setStaffForm((prev) => ({ ...prev, avatar: url }));

                          } catch (err: any) {

                            console.error('Failed to upload avatar:', err);

                            showAlert('Upload error', err?.message || 'Failed to upload photo', 'error');

                          } finally {

                            setStaffAvatarUploading(false);

                          }

                        }}

                        className="hidden"

                      />

                    </label>

                  </div>

                </div>

              </div>



              {/* Granular Permissions */}

              <div className={`p-3.5 rounded-2xl border space-y-2.5 ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>

                <label className={`block text-xs font-bold ${textTitle}`}>System Permissions Granted</label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">

                  {[

                    { id: 'POS_ACCESS', label: 'POS Sales Terminal', desc: 'Process customer checkouts' },

                    { id: 'VIEW_CATALOG', label: 'Product Catalog', desc: 'Browse catalog & technical specs' },

                    { id: 'MANAGE_PRODUCTS', label: 'Product Manager', desc: 'Add / Edit / Delete items & prices' },

                    { id: 'MANAGE_ORDERS', label: 'Orders & Dispatch', desc: 'Update delivery status & tracking' },

                    { id: 'CRM_ACCESS', label: 'Customer CRM', desc: 'View customer contacts & history' },

                    { id: 'STORE_SETTINGS', label: 'Store Configuration', desc: 'Modify banner & brand settings' },

                  ].map((perm) => {

                    const isChecked = staffForm.permissions.includes(perm.id);

                    return (

                      <label

                        key={perm.id}

                        className={`flex items-start gap-2 p-2 rounded-xl border cursor-pointer transition-all ${

                          isChecked

                            ? isDark

                              ? 'bg-blue-950/40 border-blue-600/60 text-blue-300'

                              : 'bg-blue-50 border-blue-300 text-blue-900'

                            : isDark

                            ? 'bg-slate-900/40 border-slate-800 text-slate-400'

                            : 'bg-white border-slate-200 text-slate-600'

                        }`}

                      >

                        <input

                          type="checkbox"

                          checked={isChecked}

                          onChange={(e) => {

                            if (e.target.checked) {

                              setStaffForm({ ...staffForm, permissions: [...staffForm.permissions, perm.id] });

                            } else {

                              setStaffForm({ ...staffForm, permissions: staffForm.permissions.filter((p) => p !== perm.id) });

                            }

                          }}

                          className="mt-0.5 rounded text-blue-600"

                        />

                        <div>

                          <div className="font-bold text-[11px]">{perm.label}</div>

                          <div className="text-[10px] text-slate-500">{perm.desc}</div>

                        </div>

                      </label>

                    );

                  })}

                </div>

              </div>



              {/* Submit / Cancel Buttons */}

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3 shrink-0">

                <button

                  type="button"

                  onClick={() => {

                    setIsStaffModalOpen(false);

                    setEditingStaffMember(null);

                  }}

                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-colors ${

                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'

                  }`}

                >

                  Cancel

                </button>

                <button

                  type="submit"

                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition-all"

                >

                  <Check className="w-4 h-4" />

                  <span>{editingStaffMember ? 'Update Staff Member' : 'Save & Provision Access'}</span>

                </button>

              </div>

            </form>

          </div>

        </div>

      )}



      {/* 2. STAFF PROFILE & DETAILED PERFORMANCE MODAL */}

      {viewingStaffProfile && (

        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">

          <div className={`w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border transition-all animate-in fade-in zoom-in-95 my-8 ${modalBg}`}>

            {/* Header with profile banner */}

            <div className="relative p-6 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">

              <div className="flex items-center gap-4">

                {viewingStaffProfile.avatar ? (

                  <img

                    src={viewingStaffProfile.avatar}

                    alt={viewingStaffProfile.name}

                    className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 shadow-xl"

                  />

                ) : (

                  <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white font-black text-2xl flex items-center justify-center shadow-xl">

                    {viewingStaffProfile.name.substring(0, 2).toUpperCase()}

                  </div>

                )}

                <div>

                  <div className="flex items-center gap-2">

                    <h2 className="text-xl font-black">{viewingStaffProfile.name}</h2>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white uppercase tracking-wider">

                      {viewingStaffProfile.role}

                    </span>

                  </div>

                  <p className="text-xs text-blue-200 mt-0.5 font-mono">{viewingStaffProfile.email}</p>

                </div>

              </div>

              <button

                type="button"

                onClick={() => setViewingStaffProfile(null)}

                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"

              >

                <X className="w-5 h-5" />

              </button>

            </div>



            {/* Performance & Details Content */}

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

              {/* Contact and Status Info */}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>

                  <span className="text-[11px] text-slate-400 font-bold uppercase block">Phone Contact</span>

                  <span className={`text-xs font-mono font-bold mt-1 block ${textTitle}`}>

                    {viewingStaffProfile.phone || 'No phone registered'}

                  </span>

                </div>

                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>

                  <span className="text-[11px] text-slate-400 font-bold uppercase block">Account Status</span>

                  <span className={`text-xs font-bold mt-1 inline-flex items-center gap-1 ${viewingStaffProfile.status === 'Active' ? 'text-emerald-400' : 'text-red-400'}`}>

                    <span className={`w-2 h-2 rounded-full ${viewingStaffProfile.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`} />

                    {viewingStaffProfile.status}

                  </span>

                </div>

                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>

                  <span className="text-[11px] text-slate-400 font-bold uppercase block">Joined Date</span>

                  <span className={`text-xs font-bold mt-1 block ${textTitle}`}>

                    {viewingStaffProfile.createdAt ? new Date(viewingStaffProfile.createdAt).toLocaleDateString() : 'Verified Staff'}

                  </span>

                </div>

              </div>



              {/* POS Sales Metrics */}

              {(() => {

                const cashierTx = posTransactions.filter((tx) => 
                  Boolean(tx.cashierName) && (
                    Boolean(viewingStaffProfile.name && String(tx.cashierName).toLowerCase() === String(viewingStaffProfile.name).toLowerCase()) ||
                    Boolean(viewingStaffProfile.email && String(tx.cashierName).toLowerCase() === String(viewingStaffProfile.email).toLowerCase())
                  )
                );

                const totalSales = cashierTx.reduce((acc, tx) => acc + (tx.total || 0), 0);

                const avgTicket = cashierTx.length > 0 ? totalSales / cashierTx.length : 0;



                return (

                  <div className={`p-4 rounded-2xl border space-y-3 ${isDark ? 'bg-slate-800/20 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>

                    <h3 className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>Point of Sale Checkout Performance</h3>

                    <div className="grid grid-cols-3 gap-3">

                      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">

                        <span className="text-[10px] text-blue-400 font-bold uppercase">Total Transactions</span>

                        <div className="text-xl font-black text-blue-400 mt-1">{cashierTx.length}</div>

                      </div>

                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">

                        <span className="text-[10px] text-emerald-400 font-bold uppercase">Total POS Revenue</span>

                        <div className="text-sm font-black text-emerald-400 mt-1 truncate">{formatTZS(totalSales)}</div>

                      </div>

                      <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">

                        <span className="text-[10px] text-purple-400 font-bold uppercase">Average Basket</span>

                        <div className="text-sm font-black text-purple-400 mt-1 truncate">{formatTZS(avgTicket)}</div>

                      </div>

                    </div>

                  </div>

                );

              })()}



              {/* Granted Permissions List */}

              <div>

                <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${textTitle}`}>System Permissions & Access</h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">

                  {(viewingStaffProfile.permissions || ['POS_ACCESS']).map((perm) => (

                    <div

                      key={perm}

                      className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-semibold ${isDark ? 'bg-slate-800/50 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-800'}`}

                    >

                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />

                      <span className="truncate">{perm.replace(/_/g, ' ')}</span>

                    </div>

                  ))}

                </div>

              </div>



              {/* Actions */}

              <div className="pt-4 border-t border-slate-800 flex justify-between items-center">

                <button

                  type="button"

                  onClick={() => {

                    const st = viewingStaffProfile;

                    setViewingStaffProfile(null);

                    setResetPasswordStaff(st);

                    setNewStaffPasswordInput(`GE@${Math.floor(100000 + Math.random() * 900000)}`);

                    setResetSuccessMessage(null);

                  }}

                  className="px-4 py-2 rounded-xl text-xs font-bold text-purple-400 hover:bg-purple-950/40 border border-purple-800/40 flex items-center gap-1.5 transition-colors"

                >

                  <Key className="w-3.5 h-3.5" />

                  <span>Reset Staff Password</span>

                </button>



                <div className="flex items-center gap-2">

                  {deleteStaff && (

                    <button

                      type="button"

                      onClick={async () => {
                        const st = viewingStaffProfile;
                        if (!st) return;
                        const confirmed = await customConfirm(
                          `Are you sure you want to permanently delete staff member "${st.name}" (${st.email})? This action will revoke their login access immediately.`,
                          'Delete Staff Member',
                          'warning',
                          'Delete Staff'
                        );
                        if (confirmed) {
                          setViewingStaffProfile(null);
                          await deleteStaff(st.id);
                        }
                      }}

                      className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 flex items-center gap-1.5 transition-all"

                    >

                      <Trash2 className="w-3.5 h-3.5" />

                      <span>Delete Staff</span>

                    </button>

                  )}

                  <button

                    type="button"

                    onClick={() => {

                      const st = viewingStaffProfile;

                      setViewingStaffProfile(null);

                      setEditingStaffMember(st);

                      setStaffForm({

                        name: st.name,

                        email: st.email,

                        phone: st.phone || '',

                        role: st.role,

                        password: '',

                        permissions: st.permissions || ['POS_ACCESS', 'VIEW_CATALOG'],

                        status: st.status,

                        avatar: st.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'

                      });

                      setIsStaffModalOpen(true);

                    }}

                    className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-amber-600/20"

                  >

                    <Edit className="w-3.5 h-3.5" />

                    <span>Edit Staff Details</span>

                  </button>

                  <button

                    type="button"

                    onClick={() => setViewingStaffProfile(null)}

                    className={`px-4 py-2 rounded-xl text-xs font-bold ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}

                  >

                    Close

                  </button>

                </div>

              </div>

            </div>

          </div>

        </div>

      )}



      {/* 3. RESET STAFF PASSWORD MODAL */}

      {resetPasswordStaff && (

        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">

          <div className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border transition-all animate-in fade-in zoom-in-95 ${modalBg}`}>

            <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50'}`}>

              <div className="flex items-center gap-2.5">

                <div className="p-2 bg-purple-600/10 text-purple-400 rounded-xl">

                  <Key className="w-5 h-5" />

                </div>

                <div>

                  <h2 className={`text-base font-black tracking-tight ${textTitle}`}>Reset Staff Password</h2>

                  <p className={`text-[11px] ${textSub}`}>{resetPasswordStaff.name} ({resetPasswordStaff.email})</p>

                </div>

              </div>

              <button

                type="button"

                onClick={() => {

                  setResetPasswordStaff(null);

                  setResetSuccessMessage(null);

                }}

                className={`p-2 rounded-xl transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'}`}

              >

                <X className="w-5 h-5" />

              </button>

            </div>



            <div className="p-5 space-y-4">

              {resetSuccessMessage ? (

                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-700/60 text-center space-y-3">

                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">

                    <Check className="w-5 h-5" />

                  </div>

                  <div>

                    <h4 className="font-bold text-xs text-emerald-300">Password Reset Successfully!</h4>

                    <p className="text-[11px] text-slate-400 mt-0.5">The temporary login password for {resetPasswordStaff.name} is:</p>

                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-between font-mono text-sm font-black text-amber-400">

                    <span>{resetSuccessMessage}</span>

                    <button

                      type="button"

                      onClick={() => {

                        navigator.clipboard.writeText(resetSuccessMessage);

                        showAlert('Success', 'Password copied to clipboard!', 'alert');

                      }}

                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 font-sans"

                    >

                      <Copy className="w-3.5 h-3.5" /> Copy

                    </button>

                  </div>

                  <button

                    type="button"

                    onClick={() => {

                      setResetPasswordStaff(null);

                      setResetSuccessMessage(null);

                    }}

                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors"

                  >

                    Done

                  </button>

                </div>

              ) : (

                <div className="space-y-4">

                  <div>

                    <div className="flex items-center justify-between mb-1.5">

                      <label className={`block text-xs font-bold ${textSub}`}>New Secure Password</label>

                      <button

                        type="button"

                        onClick={() => setNewStaffPasswordInput(`GE@${Math.floor(100000 + Math.random() * 900000)}`)}

                        className="text-[11px] font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1"

                      >

                        <Sparkles className="w-3 h-3" /> Auto-Generate

                      </button>

                    </div>

                    <input

                      type="text"

                      required

                      value={newStaffPasswordInput}

                      onChange={(e) => setNewStaffPasswordInput(e.target.value)}

                      placeholder="Enter new password..."

                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold ${inputBg}`}

                    />

                    <span className="text-[10px] text-slate-500 block mt-1">

                      This updates the staff credentials in cloud authentication vault immediately.

                    </span>

                  </div>



                  <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">

                    <button

                      type="button"

                      onClick={() => setResetPasswordStaff(null)}

                      className={`px-4 py-2 rounded-xl text-xs font-bold ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}

                    >

                      Cancel

                    </button>

                    <button

                      type="button"

                      onClick={async () => {

                        if (!newStaffPasswordInput) return;

                        if (resetStaffPassword) {

                          await resetStaffPassword(resetPasswordStaff.id, newStaffPasswordInput);

                          setResetSuccessMessage(newStaffPasswordInput);

                        }

                      }}

                      className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 flex items-center gap-1.5 transition-all"

                    >

                      <Key className="w-3.5 h-3.5" />

                      <span>Confirm & Reset Password</span>

                    </button>

                  </div>

                </div>

              )}

            </div>

          </div>

        </div>

      )}




    </>
  );
};
