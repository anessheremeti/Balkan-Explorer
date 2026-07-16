import React, { useEffect, useRef, useState } from "react";
import { Search, MoreHorizontal, Loader2, X, Pencil, Trash2, UserPlus } from "lucide-react";
import { adminService, type AdminUser, type NewUser } from "../../hooks/adminService";
import { useToastContext } from "../../context/ToastContext";

const AVATAR_COLORS = ["bg-sky-100 text-sky-700", "bg-violet-100 text-violet-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700"];

function avatarCls(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

const UsersScreen: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<NewUser>({ full_name: "", email: "", password: "" });
  const [adding, setAdding] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToastContext();

  const load = () => {
    adminService.getUsers()
      .then(setUsers)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  // Close row menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = users.filter(u => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (u.full_name ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q);
  });

  const saveEdit = async () => {
    if (!editUser || !editName.trim()) return;
    setBusyId(editUser.id);
    try {
      await adminService.updateUser(editUser.id, editName.trim());
      setUsers(prev => prev.map(u => (u.id === editUser.id ? { ...u, full_name: editName.trim() } : u)));
      setEditUser(null);
      showToast(`User renamed to "${editName.trim()}"`, "success");
    } catch (e) {
      setError((e as Error).message);
      showToast((e as Error).message, "error");
    }
    finally { setBusyId(null); }
  };

  const confirmDelete = async () => {
    if (!deleteUser) return;
    setBusyId(deleteUser.id);
    try {
      const { deletedTrips } = await adminService.deleteUser(deleteUser.id);
      setUsers(prev => prev.filter(u => u.id !== deleteUser.id));
      setDeleteUser(null);
      showToast(
        `Deleted ${deleteUser.full_name ?? deleteUser.email}${deletedTrips ? ` and ${deletedTrips} trip${deletedTrips !== 1 ? "s" : ""}` : ""}`,
        "success"
      );
    } catch (e) {
      setError((e as Error).message);
      showToast((e as Error).message, "error");
    }
    finally { setBusyId(null); }
  };

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAdding(true);
    try {
      await adminService.createUser(addForm);
      setShowAdd(false);
      showToast(`User "${addForm.full_name}" created`, "success");
      setAddForm({ full_name: "", email: "", password: "" });
      setLoading(true);
      load();
    } catch (err) {
      setError((err as Error).message);
      showToast((err as Error).message, "error");
    }
    finally { setAdding(false); }
  };

  const inputCls = "w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400";

  return (
    <div className="">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-bold text-slate-900">User Management</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search"
              className="pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-[13px] w-44 sm:w-56 placeholder:text-slate-400"
            />
          </div>
          <button
            onClick={() => { setShowAdd(true); setError(null); }}
            className="px-4 py-2 rounded-lg bg-[#2653d9] hover:bg-[#1e44b8] text-white text-[13px] font-semibold transition"
          >
            Add New User
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="mt-5 bg-white border border-slate-200 rounded-xl overflow-x-auto">
        {loading ? (
          <div className="p-14 flex justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-[#2653d9]" />
          </div>
        ) : (
          <table className="w-full text-sm min-w-170 overflow-x">
            <thead>
              <tr className="text-left text-[12px] text-slate-400 font-semibold border-b border-slate-100">
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Email</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Trips</th>
                <th className="px-5 py-3.5">Joined Date</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    {users.length === 0 ? "No registered users yet." : "No users match your search."}
                  </td>
                </tr>
              )}
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarCls(u.id)}`}>
                        {(u.full_name ?? u.email ?? "?").charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-800 whitespace-nowrap">
                        {u.full_name ?? "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{u.email}</td>
                  <td className="px-5 py-3 text-slate-600">{u.role}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                      u.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`font-semibold ${u.trip_count > 0 ? "text-slate-700" : "text-slate-300"}`}>
                      {u.trip_count}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                    {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-5 py-3">
                    <div className="relative flex justify-end" ref={menuId === u.id ? menuRef : undefined}>
                      {busyId === u.id ? (
                        <Loader2 size={16} className="animate-spin text-[#2653d9]" />
                      ) : (
                        <button
                          onClick={() => setMenuId(menuId === u.id ? null : u.id)}
                          aria-label={`Actions for ${u.full_name ?? u.email}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        >
                          <MoreHorizontal size={17} />
                        </button>
                      )}
                      {menuId === u.id && (
                        <div className="absolute right-0 top-8 z-20 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5">
                          <button
                            onClick={() => { setEditUser(u); setEditName(u.full_name ?? ""); setMenuId(null); }}
                            className="w-full flex items-center gap-2 px-3.5 py-2 text-[13px] text-slate-700 hover:bg-slate-50"
                          >
                            <Pencil size={13} /> Edit name
                          </button>
                          <button
                            onClick={() => { setDeleteUser(u); setMenuId(null); }}
                            className="w-full flex items-center gap-2 px-3.5 py-2 text-[13px] text-red-500 hover:bg-red-50"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-3">
        {users.length} user{users.length !== 1 ? "s" : ""} · Active = signed in within the last 30 days
      </p>

      {/* ── Add user modal ─────────────────────────────────────────────── */}
      {showAdd && (
        <Modal title="Add New User" onClose={() => setShowAdd(false)}>
          <form onSubmit={submitAdd} className="space-y-3">
            <input required value={addForm.full_name} maxLength={80}
              onChange={e => setAddForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="Full name" className={inputCls} />
            <input required type="email" value={addForm.email}
              onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
              placeholder="Email" className={inputCls} />
            <input required type="password" value={addForm.password} minLength={6}
              onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Password (min 6 characters)" className={inputCls} />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button type="submit" disabled={adding}
              className="w-full flex items-center justify-center gap-2 bg-[#2653d9] hover:bg-[#1e44b8] text-white py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50">
              {adding ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
              {adding ? "Creating…" : "Create user"}
            </button>
          </form>
        </Modal>
      )}

      {/* ── Edit modal ─────────────────────────────────────────────────── */}
      {editUser && (
        <Modal title={`Edit ${editUser.email}`} onClose={() => setEditUser(null)}>
          <input value={editName} maxLength={80} autoFocus
            onChange={e => setEditName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") saveEdit(); }}
            placeholder="Full name" className={inputCls} />
          <button onClick={saveEdit} disabled={busyId === editUser.id || !editName.trim()}
            className="mt-3 w-full bg-[#2653d9] hover:bg-[#1e44b8] text-white py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50">
            {busyId === editUser.id ? "Saving…" : "Save changes"}
          </button>
        </Modal>
      )}

      {/* ── Delete confirm modal ───────────────────────────────────────── */}
      {deleteUser && (
        <Modal title="Delete user?" onClose={() => setDeleteUser(null)}>
          <p className="text-sm text-slate-600">
            <span className="font-semibold">{deleteUser.full_name ?? deleteUser.email}</span> and their{" "}
            <span className="font-semibold">{deleteUser.trip_count} trip{deleteUser.trip_count !== 1 ? "s" : ""}</span>{" "}
            will be permanently removed. This cannot be undone.
          </p>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setDeleteUser(null)}
              className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button onClick={confirmDelete} disabled={busyId === deleteUser.id}
              className="flex-1 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition disabled:opacity-50">
              {busyId === deleteUser.id ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── Minimal modal ────────────────────────────────────────────────────────────

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-900 text-[15px] truncate pr-2">{title}</h3>
        <button onClick={onClose} aria-label="Close" className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
          <X size={16} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

export default UsersScreen;
