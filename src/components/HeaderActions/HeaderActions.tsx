import { Share2, Pencil, ArrowDownToLine } from "lucide-react";

const ActionButton = ({ icon: Icon, label, primary = false }: any) => (
  <button
    className={`flex items-center gap-2 px-5 py-3 rounded-3xl transition ${
      primary
        ? "bg-sky-600 text-white hover:bg-sky-700"
        : "bg-white text-gray-700 hover:bg-gray-200"
    }`}
  >
    <Icon size={18} />
    <span>{label}</span>
  </button>
);

const HeaderActions = () => {
  return (
    <div className="flex flex-wrap max-sm:pt-6 gap-4">
      <ActionButton icon={Share2} label="Share" />
      <ActionButton icon={Pencil} label="Edit" />
      <ActionButton icon={ArrowDownToLine} label="Save" primary />
    </div>
  );
};

export default HeaderActions;