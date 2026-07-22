import React, { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Loader2, Tag, CalendarClock, Building2, ImagePlus, X } from "lucide-react";
import { ALLOWED_COUNTRIES } from "../../constants/allowedDestinations";
import { adminService, type Deal, type NewDeal } from "../../hooks/adminService";
import { useToastContext } from "../../context/ToastContext";

const PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const PHOTO_MAX_BYTES = 2.5 * 1024 * 1024;

const EMPTY_FORM: NewDeal = { city: "", country: ALLOWED_COUNTRIES[0], title: "", description: "", agency: "", currency: "EUR" };

const today = new Date().toISOString().split("T")[0];

const DealsScreen: React.FC = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<NewDeal>(EMPTY_FORM);
  const [price, setPrice] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToastContext();

  useEffect(() => {
    adminService.getDeals().then(setDeals).finally(() => setLoading(false));
  }, []);

  const set = (patch: Partial<NewDeal>) => setForm(prev => ({ ...prev, ...patch }));

  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      showToast("Photo must be PNG, JPEG or WebP", "error");
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      showToast("Photo must be under 2.5 MB", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.city.trim() || !form.title.trim()) {
      setError("City and deal title are required.");
      return;
    }
    setSaving(true);
    try {
      const { deal } = await adminService.createDeal({
        ...form,
        price: price ? Number(price) : undefined,
        valid_until: validUntil || undefined,
        photo: photo ?? undefined,
      });
      setDeals(prev => [deal, ...prev]);
      setForm(EMPTY_FORM);
      setPrice("");
      setValidUntil("");
      setPhoto(null);
      showToast(`Deal "${deal.title}" added`, "success");
    } catch (err) {
      setError((err as Error).message);
      showToast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setBusyId(id);
    try {
      await adminService.deleteDeal(id);
      setDeals(prev => prev.filter(d => d.id !== id));
      showToast("Deal deleted", "success");
    } catch (err) {
      setError((err as Error).message);
      showToast((err as Error).message, "error");
    } finally {
      setBusyId(null);
    }
  };

  const inputCls = "w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400";
  const labelCls = "block text-xs font-semibold mb-1.5 text-slate-600";

  return (
    <div className="">
      <div>
        <h1 className="text-[22px] font-bold text-slate-900">Deals</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">
          Travel-agency offers attached to destinations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
        {/* Add deal */}
        <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-5 h-fit">
          <h2 className="font-bold text-slate-900 text-[15px] flex items-center gap-2">
            <Plus size={16} className="text-[#2653d9]" />
            Add a destination deal
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Deal title *</label>
              <input value={form.title} onChange={e => set({ title: e.target.value })}
                placeholder="7 nights in Budva — half board" maxLength={120} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>City *</label>
              <input value={form.city} onChange={e => set({ city: e.target.value })}
                placeholder="Budva" maxLength={60} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Country *</label>
              <select value={form.country} onChange={e => set({ country: e.target.value })} className={inputCls}>
                {ALLOWED_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Price</label>
              <div className="flex gap-2">
                <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
                  placeholder="499" className={inputCls} />
                <select value={form.currency} onChange={e => set({ currency: e.target.value })}
                  className={`${inputCls} w-24`}>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Valid until</label>
              <input type="date" value={validUntil} min={today} onChange={e => setValidUntil(e.target.value)} className={inputCls} />
              <p className="text-[11px] text-slate-400 mt-1">Deals past this date stop showing on the public site.</p>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Agency</label>
              <input value={form.agency ?? ""} onChange={e => set({ agency: e.target.value })}
                placeholder="Balkan Travel Agency" maxLength={80} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Description</label>
              <textarea value={form.description ?? ""} onChange={e => set({ description: e.target.value })}
                placeholder="What's included, conditions…" rows={2} maxLength={500} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Photo</label>
              <input ref={fileRef} type="file" accept={PHOTO_TYPES.join(",")} onChange={onPickPhoto} className="hidden" />
              {photo ? (
                <div className="relative w-full h-36 rounded-lg overflow-hidden border border-slate-200">
                  <img src={photo} alt="Deal preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setPhoto(null)} aria-label="Remove photo"
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/60 text-white hover:bg-slate-900/80">
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full h-24 rounded-lg border-2 border-dashed border-slate-200 hover:border-[#2653d9] hover:bg-slate-50 transition flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-[#2653d9]">
                  <ImagePlus size={20} />
                  <span className="text-xs font-medium">Upload photo (PNG/JPEG/WebP, max 2.5 MB)</span>
                </button>
              )}
            </div>
          </div>

          {error && <p className="text-xs text-red-500 mt-3">{error}</p>}

          <button type="submit" disabled={saving}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-[#2653d9] hover:bg-[#1e44b8] text-white py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            {saving ? "Saving…" : "Add deal"}
          </button>
        </form>

        {/* Deals list */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 h-fit">
          <h2 className="font-bold text-slate-900 text-[15px]">
            Active deals <span className="font-normal text-sm text-slate-400">({deals.length})</span>
          </h2>

          {loading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#2653d9]" />
            </div>
          ) : deals.length === 0 ? (
            <p className="text-sm py-10 text-center text-slate-400">
              No deals yet — add the first one on the left.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {deals.map(d => (
                <li key={d.id} className="border border-slate-100 rounded-xl overflow-hidden">
                  {d.image_url && (
                    <img src={d.image_url} alt={d.title} className="w-full h-32 object-cover" loading="lazy" />
                  )}
                  <div className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-slate-800">{d.title}</p>
                        {d.valid_until && d.valid_until < today && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-red-50 text-red-500">
                            Expired — hidden from site
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5 text-slate-500">{d.city}, {d.country}</p>
                      {d.description && (
                        <p className="text-xs mt-1.5 leading-relaxed text-slate-500">{d.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
                        {d.price != null && (
                          <span className="flex items-center gap-1 font-semibold text-[#2653d9]">
                            <Tag size={11} />
                            {d.price} {d.currency}
                          </span>
                        )}
                        {d.agency && (
                          <span className="flex items-center gap-1">
                            <Building2 size={11} />
                            {d.agency}
                          </span>
                        )}
                        {d.valid_until && (
                          <span className="flex items-center gap-1">
                            <CalendarClock size={11} />
                            until {new Date(d.valid_until).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => remove(d.id)} disabled={busyId === d.id}
                      aria-label={`Delete deal ${d.title}`}
                      className="p-1.5 rounded-lg shrink-0 text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50">
                      {busyId === d.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default DealsScreen;
