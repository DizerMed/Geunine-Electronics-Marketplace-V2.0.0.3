import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Product, Order, CustomerProfile, UserProfile, StoreSettings } from "../../../types";
import { exportSalesToCSV } from "../../../utils/exportData";
import { customAlert, customConfirm } from '../../../utils/dialog';
import {
  Users,
  Search,
  Download,
  Star,
  Award,
  Mail,
  Phone,
  MapPin,
  Eye,
  ShoppingCart,
  MessageCircle,
  Truck,
  Package,
  X,
  CheckCircle,
  Trash2,
  Key,
  Calendar,
  ArrowUpRight,
  Filter,
  Activity,
  UserCheck,
  RefreshCw,
  DollarSign
} from "lucide-react";

export interface AdminCustomersTabProps {
  profiles?: UserProfile[];
  orders?: Order[];
  isDark: boolean;
  cardBg: string;
  textTitle: string;
  textSub: string;
  inputBg: string;
  modalBg?: string;
  tableHeaderBg?: string;
  tableRowHover?: string;
  formatTZS: (val: number) => string;
  updateOrderStatus?: (orderId: string, status: Order["status"]) => Promise<void> | void;
  onOpenDispatch?: (order: Order) => void;
  deleteCustomerProfile?: (customerId: string) => Promise<void> | void;
  showAlert?: (title: string, msg: string, type?: any) => void;
  resetCustomerPassword?: (customerId: string, newPassword?: string, email?: string) => Promise<any> | void;
  deleteCustomer?: (customerId: string, email?: string) => Promise<any> | void;
  deleteUser?: (customerId: string, email?: string) => Promise<any> | void;
  setSelectedCustomerForCrm: (cust: (CustomerProfile & { ordersList: Order[] }) | null) => void;
  setResetPasswordCustomer: (cust: any) => void;
  setNewCustomerPasswordInput: (val: string) => void;
  setCustomerResetSuccessMessage: (val: string | null) => void;
}

export const AdminCustomersTab: React.FC<AdminCustomersTabProps> = ({
  profiles = [],
  orders = [],
  isDark,
  cardBg,
  textTitle,
  textSub,
  inputBg,
  modalBg = isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900",
  tableHeaderBg = isDark ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500",
  tableRowHover = isDark ? "hover:bg-slate-800" : "hover:bg-slate-50",
  formatTZS,
  updateOrderStatus,
  onOpenDispatch,
  deleteCustomerProfile,
  showAlert,
  resetCustomerPassword,
  deleteCustomer,
  deleteUser,
  setSelectedCustomerForCrm,
  setResetPasswordCustomer,
  setNewCustomerPasswordInput,
  setCustomerResetSuccessMessage
}) => {
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerTierFilter, setCustomerTierFilter] = useState("All");
  const [customerSortBy, setCustomerSortBy] = useState<"lifetimeValue" | "totalOrders" | "lastOrder" | "name">("lifetimeValue");
  const [customerCrmNotes, setCustomerCrmNotes] = useState("");
  const [isSavingCustomerNotes, setIsSavingCustomerNotes] = useState(false);

  // Compute Aggregated Customers from Profiles and Orders

          const map = new Map<string, CustomerProfile & { ordersList: Order[] }>();



          // Ingest profiles

          (profiles || []).forEach((p) => {

            const email = String(p.email || '').toLowerCase().trim() || `user-${p.id}@genuine-electronics.com`;

            map.set(email, {

              id: p.id,

              name: p.fullName || p.full_name || p.displayName || email.split('@')[0],

              email: p.email || email,

              phone: p.phone || '',

              address: p.address || '',

              city: '',

              totalOrders: 0,

              totalItemsPurchased: 0,

              lifetimeValue: 0,

              lastOrder: undefined,

              notes: '',

              tier: 'Standard',

              registeredAt: (p as any).created_at || (p as any).createdAt,

              ordersList: [],

            });

          });



          // Ingest Orders

          orders.forEach((ord) => {

            const email = (ord.customerEmail || '').toLowerCase().trim();

            if (!email) return;



            let cust = map.get(email);

            if (!cust) {

              cust = {

                id: `cust-${email.replace(/[^a-zA-Z0-9]/g, '_')}`,

                name: ord.customerName || email.split('@')[0],

                email: ord.customerEmail,

                phone: ord.customerPhone || ord.phone || '',

                address: ord.shippingAddress || '',

                city: ord.city || '',

                totalOrders: 0,

                totalItemsPurchased: 0,

                lifetimeValue: 0,

                lastOrder: undefined,

                notes: '',

                tier: 'Standard',

                ordersList: [],

              };

              map.set(email, cust);

            }



            const itemsInOrd = (ord.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);

            cust.totalOrders += 1;

            cust.totalItemsPurchased = (cust.totalItemsPurchased || 0) + itemsInOrd;

            cust.lifetimeValue += (ord.totalAmount || 0);

            cust.ordersList.push(ord);

            if (!cust.phone && (ord.customerPhone || ord.phone)) {

              cust.phone = ord.customerPhone || ord.phone || '';

            }

            if (!cust.address && ord.shippingAddress) {

              cust.address = ord.shippingAddress;

            }

            if (!cust.city && ord.city) {

              cust.city = ord.city;

            }

            if (!cust.lastOrder || new Date(ord.createdAt) > new Date(cust.lastOrder)) {

              cust.lastOrder = ord.createdAt;

            }

          });



          // Compute tiers & sort orders by date

          const customerList = Array.from(map.values()).map((c) => {

            let tier: CustomerProfile['tier'] = 'Standard';

            if (c.lifetimeValue >= 2000000) {

              tier = 'Platinum VIP';

            } else if (c.lifetimeValue >= 1000000) {

              tier = 'Gold VIP';

            } else if (c.lifetimeValue >= 500000 || c.totalOrders >= 3) {

              tier = 'Silver';

            }

            c.tier = tier;

            c.ordersList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            return c;

          });



          const totalCustomerCount = customerList.length;

          const vipCustomerCount = customerList.filter((c) => c.tier?.includes('VIP') || c.tier === 'Platinum VIP' || c.tier === 'Gold VIP').length;

          const repeatCustomerCount = customerList.filter((c) => c.totalOrders >= 2).length;

          const totalCrmLifetimeValue = customerList.reduce((acc, c) => acc + c.lifetimeValue, 0);



          const filteredList = customerList.filter((c) => {

            const q = (customerSearchQuery || '').toLowerCase().trim();
            const matchesSearch = !q || 
              String(c.name || '').toLowerCase().includes(q) || 
              String(c.email || '').toLowerCase().includes(q) || 
              String(c.phone || '').includes(q) || 
              String(c.city || '').toLowerCase().includes(q) || 
              String(c.address || '').toLowerCase().includes(q);

            const matchesTier = customerTierFilter === 'All' || c.tier === customerTierFilter;

            return matchesSearch && matchesTier;

          }).sort((a, b) => {

            if (customerSortBy === 'lifetimeValue') return b.lifetimeValue - a.lifetimeValue;

            if (customerSortBy === 'totalOrders') return b.totalOrders - a.totalOrders;

            if (customerSortBy === 'lastOrder') {

              const timeA = a.lastOrder ? new Date(a.lastOrder).getTime() : 0;

              const timeB = b.lastOrder ? new Date(b.lastOrder).getTime() : 0;

              return timeB - timeA;

            }

            return a.name.localeCompare(b.name);

          });



          const handleExportCsv = () => {

            const headers = ['Name', 'Email', 'Phone', 'Address', 'City', 'Tier', 'Total Orders', 'Lifetime Value (TZS)', 'Last Order Date'];

            const rows = filteredList.map((c) => [

              `"${c.name.replace(/"/g, '""')}"`,

              `"${c.email}"`,

              `"${c.phone || ''}"`,

              `"${(c.address || '').replace(/"/g, '""')}"`,

              `"${c.city || ''}"`,

              `"${c.tier || 'Standard'}"`,

              c.totalOrders,

              c.lifetimeValue,

              c.lastOrder ? `"${new Date(c.lastOrder).toLocaleDateString()}"` : '""'

            ]);



            const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

            const encodedUri = encodeURI(csvContent);

            const link = document.createElement('a');

            link.setAttribute('href', encodedUri);

            link.setAttribute('download', `genuine_electronics_customers_${new Date().toISOString().slice(0, 10)}.csv`);

            document.body.appendChild(link);

            link.click();

            document.body.removeChild(link);

          };



          return (

            <div className="space-y-6 animate-in fade-in duration-300">

              {/* CRM Header */}

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">

                <div className="flex items-center gap-2.5">

                  <div className="p-2.5 bg-emerald-600/10 text-emerald-500 rounded-2xl border border-emerald-500/20">

                    <UserCheck className="w-6 h-6" />

                  </div>

                  <div>

                    <h1 className={`text-2xl font-black tracking-tight ${textTitle}`}>Customer Relationship Management (CRM)</h1>

                    <p className={`text-xs mt-0.5 ${textSub}`}>Unified customer profiles, purchasing history, VIP tier segments, and direct communication.</p>

                  </div>

                </div>



                <div className="flex items-center gap-3 w-full md:w-auto">

                  <button

                    type="button"

                    onClick={handleExportCsv}

                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${

                      isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-sm'

                    }`}

                  >

                    <Download className="w-4 h-4 text-emerald-500" />

                    <span>Export Customers (CSV)</span>

                  </button>

                </div>

              </div>



              {/* CRM Metrics Overview */}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

                <div className={`p-4 rounded-2xl border ${cardBg}`}>

                  <div className="flex items-center justify-between">

                    <span className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Customer Base</span>

                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">

                      <Users className="w-4 h-4" />

                    </div>

                  </div>

                  <div className={`text-2xl font-black mt-2 ${textTitle}`}>{totalCustomerCount}</div>

                  <div className="text-[11px] mt-1 text-slate-500">Active accounts & buyers</div>

                </div>



                <div className={`p-4 rounded-2xl border ${cardBg}`}>

                  <div className="flex items-center justify-between">

                    <span className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>VIP Clients</span>

                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">

                      <Award className="w-4 h-4" />

                    </div>

                  </div>

                  <div className={`text-2xl font-black mt-2 text-indigo-400`}>{vipCustomerCount}</div>

                  <div className="text-[11px] mt-1 text-slate-500">&gt; 1M TZS lifetime spend</div>

                </div>



                <div className={`p-4 rounded-2xl border ${cardBg}`}>

                  <div className="flex items-center justify-between">

                    <span className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Repeat Buyers</span>

                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">

                      <RefreshCw className="w-4 h-4" />

                    </div>

                  </div>

                  <div className={`text-2xl font-black mt-2 text-emerald-400`}>{repeatCustomerCount}</div>

                  <div className="text-[11px] mt-1 text-slate-500">2+ completed orders</div>

                </div>



                <div className={`p-4 rounded-2xl border ${cardBg}`}>

                  <div className="flex items-center justify-between">

                    <span className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Total Spend</span>

                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">

                      <DollarSign className="w-4 h-4" />

                    </div>

                  </div>

                  <div className={`text-lg font-black mt-2 text-amber-400 truncate`}>{formatTZS(totalCrmLifetimeValue)}</div>

                  <div className="text-[11px] mt-1 text-slate-500">Gross customer lifetime value</div>

                </div>

              </div>



              {/* Filters, Search & Sort */}

              <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${cardBg}`}>

                <div className="flex flex-1 items-center gap-3 w-full">

                  <div className="relative flex-1">

                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />

                    <input

                      type="text"

                      value={customerSearchQuery}

                      onChange={(e) => setCustomerSearchQuery(e.target.value)}

                      placeholder="Search customers by name, email, phone, city, or address..."

                      className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs font-medium border ${inputBg}`}

                    />

                    {customerSearchQuery && (

                      <button

                        onClick={() => setCustomerSearchQuery('')}

                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"

                      >

                        <X className="w-3.5 h-3.5" />

                      </button>

                    )}

                  </div>



                  <select

                    value={customerTierFilter}

                    onChange={(e) => setCustomerTierFilter(e.target.value)}

                    className={`px-3 py-2 rounded-xl text-xs font-semibold border ${inputBg}`}

                  >

                    <option value="All">All Tiers</option>

                    <option value="Platinum VIP">Platinum VIP (&gt;2M TZS)</option>

                    <option value="Gold VIP">Gold VIP (&gt;1M TZS)</option>

                    <option value="Silver">Silver (&gt;500k TZS)</option>

                    <option value="Standard">Standard</option>

                  </select>



                  <select

                    value={customerSortBy}

                    onChange={(e) => setCustomerSortBy(e.target.value as any)}

                    className={`px-3 py-2 rounded-xl text-xs font-semibold border ${inputBg}`}

                  >

                    <option value="lifetimeValue">Sort: Highest Value (TZS)</option>

                    <option value="totalOrders">Sort: Most Orders</option>

                    <option value="lastOrder">Sort: Most Recent Order</option>

                    <option value="name">Sort: Name (A-Z)</option>

                  </select>

                </div>

              </div>



              {/* Customers CRM Table */}

              <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>

                <div className="overflow-x-auto">

                  <table className="w-full text-left text-xs">

                    <thead>

                      <tr className={`border-b font-bold uppercase tracking-wider ${tableHeaderBg}`}>

                        <th className="p-4">Customer Profile</th>

                        <th className="p-4">Contact Details</th>

                        <th className="p-4">Location / City</th>

                        <th className="p-4">Tier</th>

                        <th className="p-4">Orders</th>

                        <th className="p-4">Lifetime Value</th>

                        <th className="p-4">Last Activity</th>

                        <th className="p-4 text-right">Actions</th>

                      </tr>

                    </thead>

                    <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>

                      {filteredList.length === 0 ? (

                        <tr>

                          <td colSpan={8} className="p-8 text-center text-slate-400">

                            No matching customer profiles found in database.

                          </td>

                        </tr>

                      ) : (

                        filteredList.map((cust) => (

                          <tr key={cust.id} className={`transition-colors ${tableRowHover}`}>

                            <td className="p-4">

                              <div className="flex items-center gap-3">

                                <div className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center text-xs shrink-0 ${

                                  cust.tier === 'Platinum VIP'

                                    ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20'

                                    : cust.tier === 'Gold VIP'

                                    ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20'

                                    : cust.tier === 'Silver'

                                    ? 'bg-gradient-to-tr from-slate-600 to-slate-500 text-white'

                                    : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'

                                }`}>

                                  {cust.name.substring(0, 2).toUpperCase()}

                                </div>

                                <div>

                                  <div className={`font-bold ${textTitle}`}>{cust.name}</div>

                                  <div className="text-[10px] text-slate-500 font-mono">{cust.email}</div>

                                </div>

                              </div>

                            </td>



                            <td className="p-4">

                              <div className="space-y-0.5">

                                {cust.phone ? (

                                  <a

                                    href={`tel:${cust.phone}`}

                                    className="text-slate-300 hover:text-blue-400 flex items-center gap-1 font-mono"

                                  >

                                    <Phone className="w-3 h-3 text-emerald-500" />

                                    <span>{cust.phone}</span>

                                  </a>

                                ) : (

                                  <span className="text-slate-500 italic text-[10px]">No phone on file</span>

                                )}

                              </div>

                            </td>



                            <td className="p-4">

                              <div className="text-slate-400 truncate max-w-[140px]">

                                {cust.city || (cust.address ? cust.address.slice(0, 20) + '...' : 'Dar es Salaam')}

                              </div>

                            </td>



                            <td className="p-4">

                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${

                                cust.tier === 'Platinum VIP'

                                  ? 'bg-purple-950/50 text-purple-300 border-purple-700/60'

                                  : cust.tier === 'Gold VIP'

                                  ? 'bg-amber-950/50 text-amber-300 border-amber-700/60'

                                  : cust.tier === 'Silver'

                                  ? 'bg-slate-800 text-slate-300 border-slate-700'

                                  : 'bg-blue-950/40 text-blue-300 border-blue-800/50'

                              }`}>

                                {cust.tier}

                              </span>

                            </td>



                            <td className="p-4">

                              <div className="font-extrabold text-slate-200">{cust.totalOrders} {cust.totalOrders === 1 ? 'order' : 'orders'}</div>

                              <div className="text-[10px] text-purple-400 font-bold flex items-center gap-1 mt-0.5">

                                <Package className="w-3 h-3 text-purple-400 shrink-0" />

                                <span>{cust.totalItemsPurchased || 0} items purchased</span>

                              </div>

                            </td>



                            <td className="p-4 font-mono font-black text-emerald-400 whitespace-nowrap">

                              {formatTZS(cust.lifetimeValue)}

                            </td>



                            <td className="p-4 text-slate-400 whitespace-nowrap">

                              {cust.lastOrder ? new Date(cust.lastOrder).toLocaleDateString() : 'N/A'}

                            </td>



                            <td className="p-4 text-right">

                              <div className="flex items-center justify-end gap-1.5">

                                {cust.phone && (

                                  <a

                                    href={`https://wa.me/${cust.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${cust.name}, this is Genuine Electronics Tanzania regarding your orders.`)}`}

                                    target="_blank"

                                    rel="noreferrer"

                                    className="p-1.5 rounded-lg bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20"

                                    title="Chat on WhatsApp"

                                  >

                                    <MessageCircle className="w-4 h-4" />

                                  </a>

                                )}

                                <button

                                  type="button"

                                  onClick={() => setSelectedCustomerForCrm(cust)}

                                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-blue-600/20 transition-all"

                                >

                                  <Eye className="w-3.5 h-3.5" />

                                  <span>View CRM Profile</span>

                                </button>

                                {resetCustomerPassword && (

                                  <button

                                    type="button"

                                    onClick={() => {

                                      setResetPasswordCustomer(cust);

                                      setNewCustomerPasswordInput(`GE@${Math.floor(100000 + Math.random() * 900000)}`);

                                      setCustomerResetSuccessMessage(null);

                                    }}

                                    className="p-1.5 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"

                                    title="Direct Password Reset (No Email Needed)"

                                  >

                                    <Key className="w-4 h-4" />

                                  </button>

                                )}

                                {(deleteCustomer || deleteUser) && (

                                  <button

                                    type="button"

                                    onClick={async () => {
                                      const confirmed = await customConfirm(
                                        `Are you sure you want to delete customer account "${cust.name}" (${cust.email})? This action cannot be undone.`,
                                        'Delete Customer Account',
                                        'warning',
                                        'Delete Account'
                                      );
                                      if (confirmed) {
                                        const handler = deleteCustomer || deleteUser;
                                        if (handler) handler(cust.id, cust.email);
                                      }
                                    }}

                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"

                                    title="Delete Customer Account"

                                  >

                                    <Trash2 className="w-4 h-4" />

                                  </button>

                                )}

                              </div>

                            </td>

                          </tr>

                        ))

                      )}

                    </tbody>

                  </table>

                </div>

              </div>

            </div>

          );

        
};
