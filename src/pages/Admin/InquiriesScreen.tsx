import React, { useEffect, useState } from "react";
import { Loader2, Mail, Phone, MessageSquare, Inbox } from "lucide-react";
import { adminService, type Inquiry, type InquiryStatus } from "../../hooks/adminService";
import { useToastContext } from "../../context/ToastContext";

const STATUS_STYLE: Record<InquiryStatus, string> = {
  new: "bg-sky-50 text-sky-600",
  contacted: "bg-amber-50 text-amber-600",
  closed: "bg-slate-100 text-slate-500",
};

const FILTERS: ("all" | InquiryStatus)[] = ["all", "new", "contacted", "closed"];

const InquiriesScreen: React.FC = () => {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const { showToast } = useToastContext();

  useEffect(() => {
    adminService.getInquiries()
      .then(setInquiries)
      .catch((e: Error) => showToast(e.message, "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStatus = async (id: string, status: InquiryStatus) => {
    setBusyId(id);
    try {
      await adminService.updateInquiryStatus(id, status);
      setInquiries(prev => prev.map(i => (i.id === id ? { ...i, status } : i)));
      showToast(`Inquiry marked as ${status}`, "success");
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setBusyId(null);
    }
  };

  const visible = filter === "all" ? inquiries : inquiries.filter(i => i.status === filter);
  const newCount = inquiries.filter(i => i.status === "new").length;

  return (
    <div className="">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900">Inquiries</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            "I'm interested" requests from deal cards — forward them to the agency
          </p>
        </div>
        {newCount > 0 && (
          <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-600 text-[13px] font-bold">
            {newCount} new
          </span>
        )}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mt-5">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold capitalize transition ${
              filter === f
                ? "bg-[#2653d9] text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-10 flex justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-[#2653d9]" />
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-8 bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Inbox size={28} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm text-slate-400">
            {inquiries.length === 0
              ? "No inquiries yet — they appear when a visitor clicks \"I'm interested\" on a deal."
              : `No ${filter} inquiries.`}
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {visible.map(inq => (
            <li key={inq.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800 text-[14px]">{inq.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_STYLE[inq.status]}`}>
                      {inq.status}
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-500 mt-0.5">
                    wants: <span className="font-semibold text-slate-700">{inq.deal?.title ?? "deleted deal"}</span>
                    {inq.deal && <> · {inq.deal.city}, {inq.deal.country}</>}
                    {inq.deal?.agency && <> · via {inq.deal.agency}</>}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[12px] text-slate-500">
                    <a href={`mailto:${inq.email}`} className="flex items-center gap-1 hover:text-[#2653d9]">
                      <Mail size={11} /> {inq.email}
                    </a>
                    {inq.phone && (
                      <a href={`tel:${inq.phone}`} className="flex items-center gap-1 hover:text-[#2653d9]">
                        <Phone size={11} /> {inq.phone}
                      </a>
                    )}
                    <span className="text-slate-400">
                      {new Date(inq.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })},{" "}
                      {new Date(inq.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {inq.message && (
                    <p className="flex items-start gap-1.5 mt-2 text-[13px] text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                      <MessageSquare size={12} className="mt-0.5 shrink-0 text-slate-400" />
                      {inq.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {busyId === inq.id ? (
                    <Loader2 size={16} className="animate-spin text-[#2653d9]" />
                  ) : (
                    <select
                      value={inq.status}
                      onChange={e => setStatus(inq.id, e.target.value as InquiryStatus)}
                      className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-slate-600 bg-white"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="closed">Closed</option>
                    </select>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default InquiriesScreen;
