import React, { useState, useRef, useEffect } from 'react';
import Vapi from '@vapi-ai/web';
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  Mic, 
  Volume2, 
  Sparkles, 
  AlertCircle, 
  Radio, 
  CheckCircle2,
  MessageSquare
} from 'lucide-react';
import { Language } from '../types';
import { maskSensitiveData } from '../utils/resolutionBrain';

interface VapiVoiceIntakeProps {
  language: Language;
  onTranscriptComplete: (maskedTranscript: string) => void;
  disabled?: boolean;
}

export const VapiVoiceIntake: React.FC<VapiVoiceIntakeProps> = ({
  language,
  onTranscriptComplete,
  disabled = false
}) => {
  const vapiPublicKey = (import.meta.env.VITE_VAPI_PUBLIC_KEY || "").trim();
  const vapiAssistantId = (import.meta.env.VITE_VAPI_ASSISTANT_ID || "").trim();
  const isVapiConfigured = Boolean(vapiPublicKey);

  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'active'>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [vapiError, setVapiError] = useState<string | null>(null);
  const [micErrorName, setMicErrorName] = useState<string | null>(null);
  const [liveMessages, setLiveMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; id: string }>>([]);
  const [partialTranscript, setPartialTranscript] = useState<{ role: 'user' | 'assistant'; text: string } | null>(null);
  const [callEndedNotice, setCallEndedNotice] = useState<string | null>(null);

  const vapiRef = useRef<any>(null);
  const userUtterancesRef = useRef<string[]>([]);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll live transcript to bottom
  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [liveMessages, partialTranscript]);

  // Cleanup Vapi on unmount
  useEffect(() => {
    return () => {
      if (vapiRef.current) {
        try {
          vapiRef.current.stop();
          vapiRef.current.removeAllListeners();
        } catch {}
      }
    };
  }, []);

  const handleStartCall = async () => {
    setVapiError(null);
    setMicErrorName(null);
    setCallEndedNotice(null);

    // Call navigator.mediaDevices.getUserMedia({ audio: true }) inside the click handler
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        testStream.getTracks().forEach(t => t.stop());
      } catch (micErr: any) {
        console.log("[VAPI MIC NOTICE]", micErr?.name, micErr?.message);
        const errName = micErr?.name || "NotAllowedError";
        setMicErrorName(errName);
        setCallStatus('idle');
        return;
      }
    } else {
      setMicErrorName("NotSupportedError");
      setCallStatus('idle');
      return;
    }

    if (!isVapiConfigured) {
      setVapiError("Vapi Public Key is not configured. Set VITE_VAPI_PUBLIC_KEY in .env.");
      return;
    }

    setCallStatus('connecting');
    setLiveMessages([]);
    setPartialTranscript(null);
    userUtterancesRef.current = [];

    try {
      const VapiConstructor = typeof Vapi === 'function' ? Vapi : ((Vapi as any)?.default || Vapi);
      const vapi = new VapiConstructor(vapiPublicKey);
      vapiRef.current = vapi;

      vapi.on('call-start', () => {
        setCallStatus('active');
        setVapiError(null);
      });

      vapi.on('speech-start', () => {
        setIsSpeaking(true);
        setIsListening(false);
      });

      vapi.on('speech-end', () => {
        setIsSpeaking(false);
        setIsListening(true);
      });

      vapi.on('message', (message: any) => {
        if (message && message.type === 'transcript') {
          const role: 'user' | 'assistant' = message.role === 'user' ? 'user' : 'assistant';
          const text = (message.transcript || '').trim();

          if (message.transcriptType === 'final') {
            if (text) {
              if (role === 'user') {
                userUtterancesRef.current.push(text);
              }
              setLiveMessages(prev => [
                ...prev, 
                { role, text, id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }
              ]);
            }
            setPartialTranscript(null);
          } else if (message.transcriptType === 'partial') {
            if (role === 'user') {
              setIsListening(true);
              setIsSpeaking(false);
            }
            setPartialTranscript({ role, text });
          }
        }
      });

      vapi.on('error', (err: any) => {
        console.log("[VAPI NOTICE]", err?.message || err);
        const errMsg = err?.message || (typeof err === 'string' ? err : "Voice call encountered an issue.");
        setVapiError(errMsg);
        handleEndCall();
      });

      vapi.on('call-end', () => {
        handleEndCall();
      });

      // Start call with configured Assistant ID or inline assistant config
      if (vapiAssistantId) {
        await vapi.start(vapiAssistantId);
      } else {
        await vapi.start({
          name: "DISHA Case Intake Assistant",
          firstMessage: language === 'hi'
            ? "नमस्ते! मैं दिशा हूँ। कृपया मुझे बताएं कि आपकी कौन सी अर्जी या सरकारी सेवा में समस्या आ रही है।"
            : "Hello! I am DISHA, your public services case resolution assistant. Please tell me about the issue you are facing or the notice you received.",
          model: {
            provider: "openai",
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "You are DISHA, an AI case resolution intake assistant for Indian citizens dealing with complex public services (scholarships, certificates, defect notices, entrance exams). Ask friendly, concise questions to understand: (1) what service or scheme they are applying for, (2) what problem or error occurred, and (3) any key dates, amounts, or reasons. Keep your spoken responses concise and supportive."
              }
            ]
          }
        });
      }

    } catch (initErr: any) {
      console.log("[VAPI INITIALIZATION NOTICE]", initErr?.message || initErr);
      const errMsg = initErr?.message || "Failed to start Vapi voice intake.";
      setVapiError(errMsg);
      setCallStatus('idle');
    }
  };

  const handleEndCall = () => {
    if (vapiRef.current) {
      try {
        vapiRef.current.stop();
        vapiRef.current.removeAllListeners();
      } catch {}
      vapiRef.current = null;
    }

    setCallStatus('idle');
    setIsSpeaking(false);
    setIsListening(false);
    setPartialTranscript(null);

    // Requirement 3 & 4: Extract USER utterances, mask sensitive data, and put into problem description box
    const userCombined = userUtterancesRef.current.join(" ").trim();
    if (userCombined) {
      const { maskedText } = maskSensitiveData(userCombined);
      if (maskedText) {
        onTranscriptComplete(maskedText);
        setCallEndedNotice(
          language === 'hi'
            ? "आपकी बातचीत का विवरण नीचे समस्या विवरण बॉक्स में जोड़ दिया गया है।"
            : "Voice transcript added to problem description below. Please review or edit before submitting."
        );
      }
    }
  };

  // If Vapi keys are missing: render disabled button with helpful small message (Requirement 5)
  if (!isVapiConfigured) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
        <button
          type="button"
          onClick={handleStartCall}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 cursor-pointer"
          title="Voice intake requires VITE_VAPI_PUBLIC_KEY in .env"
        >
          <Phone className="w-3.5 h-3.5 text-slate-400" />
          <span>{language === 'hi' ? "दिशा से बात करें" : "Talk to DISHA"}</span>
        </button>
        {micErrorName && (
          <span className="text-[10px] text-slate-400 font-mono">
            ({micErrorName})
          </span>
        )}
        <span className="text-[10px] text-slate-400">
          (Optional voice intake requires VITE_VAPI_PUBLIC_KEY in .env)
        </span>
      </div>
    );
  }

  // Active or connecting call UI (Requirement 2 & 3)
  if (callStatus === 'connecting' || callStatus === 'active') {
    return (
      <div className="w-full bg-gradient-to-b from-blue-50/70 to-indigo-50/40 border border-blue-200 rounded-3xl p-5 space-y-4 shadow-sm animate-in fade-in duration-200">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 animate-spin text-blue-200" style={{ animationDuration: '4s' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">
                  {language === 'hi' ? "दिशा वॉयस इनटेक कॉल" : "DISHA Voice Intake Call"}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {language === 'hi'
                  ? "बोलें और अपनी समस्या समझाएं; समाप्ति पर यह टेक्स्ट बॉक्स में आ जाएगी।"
                  : "Speak naturally. When you end the call, your spoken details will appear below."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Listening / Speaking Indicator */}
            {isSpeaking ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-100/90 border border-blue-300 px-3 py-1.5 rounded-xl shadow-2xs animate-pulse">
                <Volume2 className="w-3.5 h-3.5 text-blue-600 animate-bounce" />
                <span>{language === 'hi' ? "दिशा बोल रही हैं..." : "DISHA speaking..."}</span>
              </span>
            ) : isListening ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100/90 border border-emerald-300 px-3 py-1.5 rounded-xl shadow-2xs animate-pulse">
                <Mic className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
                <span>{language === 'hi' ? "आपकी बात सुन रहे हैं..." : "Listening to you..."}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl">
                <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                <span>{language === 'hi' ? "कनेक्टेड" : "Connected"}</span>
              </span>
            )}

            {/* End Call Button */}
            <button
              type="button"
              onClick={handleEndCall}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? "कॉल समाप्त करें" : "End call"}</span>
            </button>
          </div>
        </div>

        {/* Live Transcript Stream */}
        <div 
          ref={transcriptScrollRef}
          className="bg-white/95 rounded-2xl border border-blue-100 p-4 max-h-48 min-h-24 overflow-y-auto space-y-2.5 text-left text-xs shadow-inner"
        >
          {liveMessages.length === 0 && !partialTranscript ? (
            <div className="py-4 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1.5">
              <MessageSquare className="w-5 h-5 text-slate-300 animate-pulse" />
              <span>
                {language === 'hi' 
                  ? "दिशा से बात शुरू करें, लाइव ट्रांसक्रिप्ट यहाँ दिखेगा..." 
                  : "Start speaking with DISHA. Live transcript will appear here..."}
              </span>
            </div>
          ) : (
            <>
              {liveMessages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    {msg.role === 'user' 
                      ? (language === 'hi' ? "आप (नागरिक)" : "You (Citizen)") 
                      : "DISHA"}
                  </span>
                  <div 
                    className={`p-2.5 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white font-medium rounded-tr-xs'
                        : 'bg-slate-100 text-slate-800 border border-slate-200 rounded-tl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {/* Partial In-Flight Speech */}
              {partialTranscript && (
                <div className={`flex flex-col ${partialTranscript.role === 'user' ? 'items-end' : 'items-start'} opacity-75`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    {partialTranscript.role === 'user' ? "You..." : "DISHA..."}
                  </span>
                  <div 
                    className={`p-2 rounded-xl text-xs italic ${
                      partialTranscript.role === 'user'
                        ? 'bg-blue-50 text-blue-800 border border-blue-200'
                        : 'bg-slate-50 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {partialTranscript.text}...
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <p className="text-[10px] text-slate-500 text-center sm:text-left">
          {language === 'hi'
            ? "कॉल खत्म होने पर केवल आपके बोले गए शब्द नीचे टेक्स्ट बॉक्स में आ जाएंगे। कोई स्वतः सबमिशन नहीं होगा।"
            : "When you click 'End call', only your statements will transfer to the text box for editing before you resolve."}
        </p>
      </div>
    );
  }

  // Idle state with Talk to DISHA button
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={handleStartCall}
        className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs hover:shadow transition-all group disabled:opacity-50 cursor-pointer"
        title="Start AI voice conversation with DISHA"
      >
        <PhoneCall className="w-3.5 h-3.5 text-blue-200 group-hover:scale-110 transition-transform" />
        <span>{language === 'hi' ? "दिशा से बात करें" : "Talk to DISHA"}</span>
        <span className="text-[9px] font-semibold bg-white/20 px-1.5 py-0.5 rounded-md">Vapi Voice</span>
      </button>

      {micErrorName && (
        <span className="text-[10px] text-slate-400 font-mono">
          ({micErrorName})
        </span>
      )}

      {vapiError && !micErrorName && (
        <span className="text-[10px] text-slate-400 font-mono">
          ({vapiError})
        </span>
      )}

      {callEndedNotice && !vapiError && (
        <span className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl animate-in fade-in">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{callEndedNotice}</span>
        </span>
      )}
    </div>
  );
};
