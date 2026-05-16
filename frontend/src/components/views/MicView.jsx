import React from "react";
import { Mic } from "lucide-react";

export default function MicView() {
  return (
    <section
      className="glass-card rounded-2xl window-border glow-turquoise-subtle p-6 flex flex-col items-center justify-center min-h-[420px] text-center space-y-5"
      data-testid="mic-view"
    >
      <div className="w-20 h-20 rounded-full neo-icon-active flex items-center justify-center animate-glow">
        <Mic className="w-9 h-9 text-brand-turquoise" strokeWidth={1.5} />
      </div>
      <div>
        <div className="text-brand-turquoise text-xs uppercase tracking-widest font-light">
          voice.module
        </div>
        <div className="text-slate-200 text-lg mt-2">Coming soon</div>
        <div className="text-slate-500 text-[11px] mt-2 max-w-xs">
          Голос подключается в следующей фазе: Whisper (STT) → DeepSeek →
          OpenAI TTS, WebRTC стриминг.
        </div>
      </div>
      <button
        disabled
        className="neo-btn px-5 py-2 rounded-full text-brand-turquoise text-[10px] uppercase tracking-widest opacity-50 cursor-not-allowed"
        data-testid="mic-button"
      >
        Hold to talk
      </button>
    </section>
  );
}
