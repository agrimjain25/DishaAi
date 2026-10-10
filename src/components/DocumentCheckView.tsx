import React, { useState } from 'react';
import { DocumentRecord, Language } from '../types';
import { t } from '../utils/translations';
import { 
  FileText, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Trash2,
  ArrowLeft,
  ChevronRight,
  AlertTriangle,
  Upload,
  Calendar,
  Layers
} from 'lucide-react';

interface DocumentCheckViewProps {
  documents: DocumentRecord[];
  onFileUpload?: (file: File) => void;
  onNavigateUpload: () => void;
  onSelectDocument: (docId: string) => void;
  onRemoveDocument: (docId: string) => void;
  onConfirmFields?: () => void;
  onBackToUpload: () => void;
  userConfirmed?: boolean;
  isLoading: boolean;
  language: Language;
}

export const DocumentCheckView: React.FC<DocumentCheckViewProps> = ({ 
  documents, 
  onFileUpload,
  onNavigateUpload,
  onSelectDocument,
  onRemoveDocument,
  onConfirmFields,
  onBackToUpload,
  userConfirmed = false,
  isLoading,
  language 
}) => {
  const [docToDeleteId, setDocToDeleteId] = useState<string | null>(null);

  const totalGroundedFields = documents.reduce(
    (acc, d) => acc + d.extraction.fields.filter(f => f.isGrounded).length, 
    0
  );
  const canConfirm = totalGroundedFields >= 3;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* On-screen Back Arrow to Upload Screen (Requirement 7) */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToUpload}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors w-fit group text-xs font-semibold py-1.5 px-3 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-50 shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Upload Screen</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Upload New Document / Add another document button (Requirement 1 & 5) */}
          <button 
            onClick={onNavigateUpload}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-xs disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload New Document</span>
          </button>

          {!userConfirmed && onConfirmFields && (
            <button
              onClick={onConfirmFields}
              disabled={!canConfirm}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-xs"
              title={canConfirm ? "Confirm all extracted facts" : "Requires at least 3 grounded fields"}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Confirm Extracted Facts</span>
            </button>
          )}
        </div>
      </div>

      {/* Header Info */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600 mb-1">
            <Layers className="w-3.5 h-3.5" />
            <span>Case Repository</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            Case Documents ({documents.length})
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Click on any document card below to open its full details, preview, and grounded facts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-slate-400 block font-medium">Total Grounded Facts</span>
            <span className="text-lg font-bold text-slate-800 font-mono">{totalGroundedFields}</span>
          </div>
        </div>
      </div>

      {/* Document cards list (Requirement 4: filename, document_type, grounded count, confirmed or not, clicking opens details, remove button with confirm) */}
      <div className="grid gap-4">
        {documents.map((doc, index) => {
          const ext = doc.extraction;
          const groundedCount = ext.fields.filter(f => f.isGrounded).length;
          const totalCount = ext.fields.length;
          const isDocConfirmed = Boolean(doc.userConfirmed || userConfirmed);
          const isConfirmingDelete = docToDeleteId === doc.id;

          return (
            <div
              key={doc.id}
              onClick={() => {
                if (!isConfirmingDelete) {
                  onSelectDocument(doc.id);
                }
              }}
              className="group bg-white rounded-3xl border border-slate-200/80 hover:border-blue-400 p-6 shadow-xs hover:shadow-md transition-all cursor-pointer text-left relative overflow-hidden"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Left: File icon and details */}
                <div className="flex items-start gap-4">
                  <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {doc.fileName}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                        Doc #{index + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span className="font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                        {ext.document_type || "Universal Document"}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Calendar className="w-3 h-3" />
                        {doc.uploadTimestamp || "Uploaded recently"}
                      </span>
                      <span>·</span>
                      <span className="text-slate-400">{doc.fileSize}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Badges & Action */}
                <div className="flex items-center gap-3 self-end md:self-center flex-wrap" onClick={(e) => e.stopPropagation()}>
                  {/* Grounded Count Badge */}
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                    {ext.groundedRatioText || `${groundedCount} of ${totalCount} fields found in document text. Please verify against the preview.`}
                  </span>

                  {/* Confirmed or Not Badge */}
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                    isDocConfirmed 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}>
                    {isDocConfirmed ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Confirmed by Citizen</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Extracted, please confirm</span>
                      </>
                    )}
                  </span>

                  {/* Small Remove button with confirm step (Requirement 4) */}
                  {!isConfirmingDelete ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDocToDeleteId(doc.id);
                      }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
                      title="Remove this document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : null}

                  {/* Open details arrow */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDocument(doc.id);
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:text-blue-700 pl-2"
                  >
                    <span>View Details</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Confirm Step for Document Removal (Requirement 4) */}
              {isConfirmingDelete && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="mt-4 pt-4 border-t border-red-100 bg-red-50/70 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-200"
                >
                  <div className="flex items-center gap-2 text-red-800 text-xs font-semibold">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Remove "{doc.fileName}" from this case? This cannot be undone.</span>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => setDocToDeleteId(null)}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onRemoveDocument(doc.id);
                        setDocToDeleteId(null);
                      }}
                      className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
                    >
                      Yes, Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
