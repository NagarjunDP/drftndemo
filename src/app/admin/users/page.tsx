'use client';

import React, { useEffect, useState } from 'react';
import { Search, Users, ShieldAlert, Smartphone, Globe } from 'lucide-react';
import { useToast } from '@/components/ToastContainer';
import { useUser } from '@clerk/nextjs';

interface UserItem {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  createdAt: string;
  authProvider: 'phone' | 'google';
  totalOrders: number;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminUsers() {
  const { addToast } = useToast();
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const role = clerkUser?.publicMetadata?.role;
  const isIntern = role === 'intern';

  const fetchUsers = async (pageNumber = 1, query = '') => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/users?page=${pageNumber}&search=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(data.users);
        setPagination(data.pagination);
      } else {
        addToast(data.error || 'Failed to load users', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Error loading users', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (clerkLoaded && !isIntern) {
      fetchUsers(page, searchTerm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clerkLoaded, isIntern, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers(1, searchTerm);
  };

  if (!clerkLoaded) {
    return <div className="p-8 text-center text-zinc-400 text-sm">Loading authorization...</div>;
  }

  if (isIntern) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-red-100 rounded-2xl shadow-sm space-y-4">
        <ShieldAlert className="w-12 h-12 text-red-500" />
        <h1 className="text-xl font-black uppercase text-zinc-900 tracking-wider">Access Forbidden</h1>
        <p className="text-zinc-500 max-w-md text-sm">
          Intern accounts do not have the required permissions to view customer Personally Identifiable Information (PII) such as names and phone numbers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-zinc-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-200/80 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-widest uppercase text-zinc-900 flex items-center gap-3">
            <Users className="w-6 h-6 text-zinc-900" />
            Registered Customers
          </h1>
          <p className="text-zinc-500 text-sm mt-1">View registered users, signup dates, and customer profile stats.</p>
        </div>
      </div>

      <div className="bg-white border border-zinc-200/60 rounded-[16px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
        <div className="p-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-50/50 border border-zinc-200 text-zinc-900 pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-zinc-900 transition-colors rounded-lg font-mono"
              />
            </div>
            <button
              type="submit"
              className="bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors"
            >
              Search
            </button>
          </form>

          {pagination && (
            <div className="text-xs text-zinc-500 font-mono">
              Total Users: {pagination.total}
            </div>
          )}
        </div>

        <div>
          {isLoading ? (
            <div className="p-8 text-center text-zinc-400 text-sm font-mono">Loading users list...</div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/70">
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-zinc-400">Name</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-zinc-400">Phone Number</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-zinc-400">Email Address</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-zinc-400">Auth Method</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-zinc-400">Signup Date</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-zinc-400 text-right">Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-zinc-400 text-sm">No registered users found.</td>
                      </tr>
                    ) : (
                      users.map((userItem) => (
                        <tr key={userItem.id} className="border-b border-zinc-100 hover:bg-zinc-50/20 transition-colors">
                          <td className="p-4">
                            <p className="text-sm font-bold text-zinc-900 uppercase tracking-wide">{userItem.name}</p>
                            <span className="text-[9px] text-zinc-400 font-mono uppercase">{userItem.id}</span>
                          </td>
                          <td className="p-4 font-mono text-sm text-zinc-700">
                            {userItem.phone ? userItem.phone : <span className="text-zinc-350">—</span>}
                          </td>
                          <td className="p-4 font-mono text-sm text-zinc-650">
                            {userItem.email ? userItem.email : <span className="text-zinc-350">—</span>}
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${
                              userItem.authProvider === 'google'
                                ? 'bg-zinc-50 text-zinc-600 border-zinc-200'
                                : 'bg-zinc-900 text-white border-zinc-900'
                            }`}>
                              {userItem.authProvider === 'google' ? (
                                <>
                                  <Globe className="w-3 h-3 text-zinc-500" />
                                  Google
                                </>
                              ) : (
                                <>
                                  <Smartphone className="w-3 h-3 text-white" />
                                  Mobile
                                </>
                              )}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-zinc-500 font-mono">
                            {new Date(userItem.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="p-4 text-right">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                              userItem.totalOrders > 0
                                ? 'bg-zinc-900 text-white'
                                : 'bg-zinc-100 text-zinc-400'
                            }`}>
                              {userItem.totalOrders}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="md:hidden divide-y divide-zinc-100">
                {users.length === 0 ? (
                  <div className="p-8 text-center text-zinc-400 text-sm">No registered users found.</div>
                ) : (
                  users.map((userItem) => (
                    <div key={userItem.id} className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-bold text-zinc-900 uppercase tracking-wide">{userItem.name}</p>
                          <span className="text-[9px] text-zinc-400 font-mono uppercase">{userItem.id}</span>
                        </div>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                          userItem.totalOrders > 0
                            ? 'bg-zinc-900 text-white'
                            : 'bg-zinc-100 text-zinc-400'
                        }`}>
                          {userItem.totalOrders} Orders
                        </span>
                      </div>

                      <div className="space-y-1 text-xs font-mono text-zinc-650">
                        {userItem.phone && <p>Phone: {userItem.phone}</p>}
                        {userItem.email && <p>Email: {userItem.email}</p>}
                        <p>Signup: {new Date(userItem.createdAt).toLocaleDateString()}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${
                          userItem.authProvider === 'google'
                            ? 'bg-zinc-50 text-zinc-600 border-zinc-200'
                            : 'bg-zinc-900 text-white border-zinc-900'
                        }`}>
                          {userItem.authProvider === 'google' ? 'Google' : 'Mobile'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination Controls */}
              {pagination && pagination.totalPages > 1 && (
                <div className="p-4 border-t border-zinc-100 flex items-center justify-between">
                  <button
                    disabled={page <= 1 || isLoading}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="px-4 py-2 border border-zinc-200 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-zinc-50 disabled:opacity-50 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-zinc-500 font-mono">
                    Page {page} of {pagination.totalPages}
                  </span>
                  <button
                    disabled={page >= pagination.totalPages || isLoading}
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                    className="px-4 py-2 border border-zinc-200 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-zinc-50 disabled:opacity-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
