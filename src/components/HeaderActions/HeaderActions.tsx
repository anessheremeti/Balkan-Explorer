import {  ArrowDownToLine, Loader2 } from 'lucide-react';

interface HeaderActionsProps {
  onDownloadPDF?: () => void;
  pdfLoading?: boolean;
}

const HeaderActions = ({ onDownloadPDF, pdfLoading = false }: HeaderActionsProps) => {
  return (
    <div className="flex flex-wrap max-sm:pt-6 gap-4">
      

      <button
        onClick={onDownloadPDF}
        disabled={pdfLoading}
        className="flex items-center gap-2 px-5 py-3 rounded-3xl bg-sky-600 text-white hover:bg-sky-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pdfLoading
          ? <Loader2 size={18} className="animate-spin" />
          : <ArrowDownToLine size={18} />
        }
        <span>{pdfLoading ? 'Generating...' : 'Download PDF'}</span>
      </button>
    </div>
  );
};

export default HeaderActions;
