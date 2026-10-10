import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Upload, 
  FileText, 
  Briefcase, 
  Mic, 
  MicOff, 
  X, 
  ShieldAlert, 
  HelpCircle, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  FolderUp,
  FileCheck2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Language, TextOnlyConsultation } from '../types';
import { t } from '../utils/translations';
import { VapiVoiceIntake } from './VapiVoiceIntake';

interface IntakeScreenProps {
  onResolve: (payload: { files: File[]; problemText: string }) => void;
  onBack: () => void;
  hasActiveCase?: boolean;
  onBackToCase?: () => void;
  isLoading: boolean;
  loadingMessage?: string;
  loadingStage?: 1 | 2 | 3 | 4;
  language: Language;
  initialProblemText?: string;
  textOnlyResult?: TextOnlyConsultation | null;
  onClearTextOnlyResult?: () => void;
}

export const IntakeScreen: React.FC<IntakeScreenProps> = ({ 
  onResolve, 
  onBack, 
  hasActiveCase = false,
  onBackToCase,
  isLoading,
  loadingMessage,
  loadingStage,
  language,
  initialProblemText = "",
  textOnlyResult = null,
  onClearTextOnlyResult
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [problemText, setProblemText] = useState(initialProblemText);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechMicError, setSpeechMicError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Check SpeechRecognition browser support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';

        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript) {
            setProblemText(prev => {
              const cleanedPrev = prev.trim();
              const addition = transcript.trim();
              if (cleanedPrev.endsWith(addition)) return prev;
              const combined = cleanedPrev ? `${cleanedPrev} ${addition}` : addition;
              return combined.slice(0, 2000);
            });
          }
        };

        recognition.onerror = (event: any) => {
          setIsListening(false);
          if (event?.error) {
            const errName = event.error === 'not-allowed' ? 'NotAllowedError' : event.error === 'no-speech' ? null : event.error;
            if (errName) setSpeechMicError(errName);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } catch (err) {
        setSpeechSupported(false);
      }
    } else {
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [language]);

  const toggleListening = async () => {
    if (!speechSupported || !recognitionRef.current) return;
    if (isListening) {
      try { recognitionRef.current.stop(); } catch {}
      setIsListening(false);
    } else {
      setSpeechMicError(null);
      // Pre-flight mic permission check via getUserMedia inside click handler
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(t => t.stop());
        } catch (err: any) {
          const errName = err?.name || "NotAllowedError";
          console.log("[WEB SPEECH MIC NOTICE]", errName, err?.message);
          setSpeechMicError(errName);
          setIsListening(false);
          return;
        }
      } else {
        setSpeechMicError("NotSupportedError");
        return;
      }

      try {
        recognitionRef.current.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e: any) {
        const errName = e?.name || "NotAllowedError";
        setSpeechMicError(errName);
        setIsListening(false);
      }
    }
  };

  const handleFilesAdded = (newFiles: FileList | File[]) => {
    const addedArray = Array.from(newFiles);
    setSelectedFiles(prev => {
      // Avoid duplicate file names if identical
      const existingNames = new Set(prev.map(f => `${f.name}-${f.size}`));
      const filtered = addedArray.filter(f => !existingNames.has(`${f.name}-${f.size}`));
      return [...prev, ...filtered];
    });
    if (textOnlyResult && onClearTextOnlyResult) {
      onClearTextOnlyResult();
    }
  };

  const handleRemoveFile = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0 && !problemText.trim()) return;
    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      setIsListening(false);
    }
    onResolve({
      files: selectedFiles,
      problemText: problemText.trim()
    });
  };

  const handleVapiTranscriptComplete = (transcript: string) => {
    setProblemText(prev => {
      const trimmed = prev.trim();
      if (!trimmed) return transcript.slice(0, 2000);
      return `${trimmed}\n${transcript}`.slice(0, 2000);
    });
  };

  // Detect sensitive pattern in text for live reminder
  const hasSensitivePattern = /\b\d{4}[ -]?\d{4}[ -]?\d{4}\b|\b\d{12}\b|\b(?:otp|password|pwd)\b/i.test(problemText);

  const canSubmit = selectedFiles.length > 0 || problemText.trim().length > 0;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 min-h-screen flex flex-col justify-center">
      {/* Top Nav Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors w-fit group text-sm"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Home</span>
        </button>

        {hasActiveCase && onBackToCase && (
          <button
            onClick={onBackToCase}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all shadow-2xs group"
          >
            <Briefcase className="w-3.5 h-3.5 text-blue-600" />
            <span>Back to current case</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-blue-600">
            Case Intake & Problem Resolution
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-1 mb-2">
            {hasActiveCase ? "Add Document or Context" : t(language, 'uploadToStart')}
          </h2>
          <p className="text-sm text-slate-500 max-w-xl">
            Upload your filled application, defect notice, or certificates, and tell DISHA what went wrong. You can upload files, describe your issue, or both.
          </p>
        </div>

        {/* Text-Only Consultation Banner (Requirement 3: when user submitted text without documents) */}
        {textOnlyResult && (
          <div className="bg-amber-50/90 border border-amber-200 rounded-3xl p-6 text-left shadow-sm space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-base">
                <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                <span>{t(language, 'problemAssessment')}</span>
                <span className="text-[11px] font-semibold bg-amber-200/80 text-amber-800 px-2.5 py-0.5 rounded-full">
                  No documents attached yet
                </span>
              </div>
              {onClearTextOnlyResult && (
                <button 
                  onClick={onClearTextOnlyResult}
                  className="text-amber-500 hover:text-amber-700 p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid md:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3 rounded-2xl border border-amber-100">
                <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider mb-0.5">
                  Likely Service
                </span>
                <span className="font-bold text-slate-800">{textOnlyResult.understanding.service_name}</span>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-amber-100">
                <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider mb-0.5">
                  Problem Type
                </span>
                <span className="font-bold text-amber-700 uppercase">{textOnlyResult.understanding.problem_type}</span>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-amber-100">
                <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider mb-0.5">
                  Citizen Stage
                </span>
                <span className="font-semibold text-slate-700">{textOnlyResult.understanding.user_stage}</span>
              </div>
            </div>

            {/* Documents to upload list */}
            {textOnlyResult.understanding.documents_to_upload && textOnlyResult.understanding.documents_to_upload.length > 0 && (
              <div className="bg-white p-4 rounded-2xl border border-amber-100">
                <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <FolderUp className="w-4 h-4 text-blue-600" />
                  <span>{t(language, 'documentsToUpload')}:</span>
                </h4>
                <ul className="grid sm:grid-cols-2 gap-2 text-xs text-slate-600">
                  {textOnlyResult.understanding.documents_to_upload.map((doc, idx) => (
                    <li key={idx} className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 font-medium">
                      <FileCheck2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{doc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Decision critical questions */}
            {textOnlyResult.understanding.missing_info_questions && textOnlyResult.understanding.missing_info_questions.length > 0 && (
              <div className="bg-white/80 p-4 rounded-2xl border border-amber-100">
                <h4 className="text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  <span>Key Clarification Questions:</span>
                </h4>
                <ul className="space-y-1 text-xs text-slate-600 list-disc list-inside">
                  {textOnlyResult.understanding.missing_info_questions.map((q, idx) => (
                    <li key={idx} className="leading-relaxed">{q}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-amber-800 font-medium">
                Attach your documents below to verify literal evidence and build your submission plan.
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Documents Now</span>
              </button>
            </div>
          </div>
        )}

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Area */}
          <div 
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full py-10 px-8 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-4 transition-all cursor-pointer text-center relative ${
              dragActive 
                ? "border-blue-500 bg-blue-50/80 scale-[1.005]" 
                : "border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 bg-white shadow-2xs"
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              accept=".pdf,.png,.jpg,.jpeg"
              multiple
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFilesAdded(e.target.files);
                }
              }}
            />

            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl shadow-2xs">
              <Upload className="w-7 h-7" />
            </div>

            <div>
              <p className="text-base font-bold text-slate-800">
                {t(language, 'uploadDocument')}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {t(language, 'supportedFormats')} · Select one or multiple files in one go
              </p>
            </div>

            {/* List of selected files */}
            {selectedFiles.length > 0 && (
              <div 
                className="w-full max-w-lg mt-2 pt-3 border-t border-slate-100 flex flex-wrap gap-2 justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                {selectedFiles.map((file, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-2 bg-slate-100/90 hover:bg-slate-200/80 text-slate-800 px-3 py-1.5 rounded-xl text-xs border border-slate-200 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="font-medium truncate max-w-[170px]" title={file.name}>{file.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({(file.size / 1024).toFixed(0)} KB)</span>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveFile(idx, e)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-0.5 rounded-md"
                      title={t(language, 'removeFile')}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium bg-slate-50 border border-slate-100 px-3 py-1 rounded-full">
              <span>Vision model transcribes visible paperwork</span>
              <span>·</span>
              <span>Zero hallucination</span>
            </div>
          </div>

          {/* Multiline "Describe your problem" Text Box (Requirement 1 & 7) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3 text-left">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <label 
                  htmlFor="problemText"
                  className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5"
                >
                  <span>{t(language, 'describeYourProblem')}</span>
                </label>

                {/* Vapi AI Voice Intake (Requirement 2, 3, 4, 5) */}
                <VapiVoiceIntake
                  language={language}
                  onTranscriptComplete={handleVapiTranscriptComplete}
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center gap-2">
                {speechSupported && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                        isListening 
                          ? "bg-red-50 text-red-600 border border-red-200 animate-pulse" 
                          : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                      }`}
                      title={isListening ? "Stop standard voice input" : "Browser voice input"}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="w-3.5 h-3.5 text-red-600" />
                          <span>Listening...</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5 text-blue-600" />
                          <span>Web Speech</span>
                        </>
                      )}
                    </button>
                    {speechMicError && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({speechMicError})
                      </span>
                    )}
                  </div>
                )}

                <span className="text-[11px] font-mono text-slate-400">
                  {problemText.length}/2000
                </span>
              </div>
            </div>

            <textarea
              id="problemText"
              rows={3}
              maxLength={2000}
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              placeholder={t(language, 'describePlaceholder')}
              className="w-full text-xs font-normal p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-y leading-relaxed"
            />

            {/* Safety Note & PII Guidance (Requirement 6) */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{t(language, 'safetyNote')}</span>
              </p>

              {hasSensitivePattern && (
                <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg flex items-center gap-1 font-medium">
                  <ShieldAlert className="w-3 h-3 text-amber-600" />
                  <span>Sensitive OTP/12-digit numbers will be masked automatically</span>
                </span>
              )}
            </div>
          </div>

          {/* Primary Action Button: "Upload & Resolve" */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <span className="text-xs text-slate-400 text-center sm:text-left">
              {selectedFiles.length > 0 && problemText.trim()
                ? `Ready: ${selectedFiles.length} file(s) + context description`
                : selectedFiles.length > 0
                  ? `Ready: ${selectedFiles.length} file(s) selected`
                  : problemText.trim()
                    ? `Ready: Text analysis (no documents yet)`
                    : `Upload documents, type your situation, or both`}
            </span>

            <button
              type="submit"
              disabled={!canSubmit || isLoading}
              className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-blue-200" />
              <span>{t(language, 'uploadAndResolve')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </motion.div>

      <div className="mt-12 text-center text-xs text-slate-400">
        <p>DISHA does not store sensitive personal credentials. Verification rules are grounded in literal evidence.</p>
      </div>
    </div>
  );
};
