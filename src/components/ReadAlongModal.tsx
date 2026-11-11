import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  PEMIMPIN_CILIK_INTRO,
  STORY_PARAGRAPHS,
  RESPONSIBILITY_STATIONS,
  RUMUSAN_CHECKLIST_ITEMS,
  type StoryParagraph
} from '../data/pemimpinCilikData';
import {
  evaluateReadingAttempt,
  normalizeMalayWord,
  type ReadingEvaluationResult
} from '../game/rules';
import {
  speakMalayText,
  playUiClick,
  playVictoryFanfare,
  playTokenCollectSound
} from '../utils/sound';

interface ReadAlongModalProps {
  isOpen: boolean;
  initialTab?: 'baca' | 'poster' | 'rumusan';
  initialParagraphId?: string;
  completedParagraphs: string[];
  completedCheckpoints: string[];
  rumusanAnswer: string;
  onClose: () => void;
  onCompleteParagraph: (
    paragraphId: string,
    evalResult: ReadingEvaluationResult
  ) => void;
  onCompleteStationCheck: (stationId: string, bonusTokens: number) => void;
  onSaveRumusan: (rumusanText: string) => void;
}

export const ReadAlongModal: React.FC<ReadAlongModalProps> = ({
  isOpen,
  initialTab = 'baca',
  initialParagraphId = 'p1',
  completedParagraphs,
  completedCheckpoints,
  rumusanAnswer,
  onClose,
  onCompleteParagraph,
  onCompleteStationCheck,
  onSaveRumusan
}) => {
  const [activeTab, setActiveTab] = useState<'baca' | 'poster' | 'rumusan'>(initialTab);
  const [selectedPid, setSelectedPid] = useState<string>(initialParagraphId);
  const [activeWordIdx, setActiveWordIdx] = useState<number | null>(null);
  const [isSpeakingTts, setIsSpeakingTts] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [evalResult, setEvalResult] = useState<ReadingEvaluationResult | null>(null);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState<string>('st_1');
  const [draftRumusan, setDraftRumusan] = useState(
    rumusanAnswer ||
      'Seorang pemimpin yang baik perlulah menjaga sikap kerana dia akan menjadi suri teladan kepada semua orang. Dia juga perlu memimpin pengawas lain dengan bahasa yang sopan, menepati masa, melaksanakan tugasan secara rasional tanpa pilih kasih, serta memastikan murid mematuhi peraturan sekolah.'
  );
  const [selectedTraits, setSelectedTraits] = useState<string[]>([
    RUMUSAN_CHECKLIST_ITEMS[0],
    RUMUSAN_CHECKLIST_ITEMS[1],
    RUMUSAN_CHECKLIST_ITEMS[2]
  ]);
  const [rumusanSavedBanner, setRumusanSavedBanner] = useState(false);

  const stopTtsRef = useRef<(() => void) | null>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialParagraphId) {
      setSelectedPid(initialParagraphId);
    }
  }, [initialParagraphId]);

  useEffect(() => {
    return () => {
      stopTtsRef.current?.();
      recognitionRef.current?.stop();
    };
  }, []);

  if (!isOpen) return null;

  const currentParagraph: StoryParagraph =
    STORY_PARAGRAPHS.find((p) => p.id === selectedPid) ?? STORY_PARAGRAPHS[0];
  const words = currentParagraph.text.split(/\s+/);

  const handleSelectParagraph = (pid: string) => {
    playUiClick();
    stopTtsRef.current?.();
    setIsSpeakingTts(false);
    setSelectedPid(pid);
    setActiveWordIdx(null);
    setSpokenText('');
    setEvalResult(null);
    setSelectedQuizOption(null);
    setQuizSubmitted(false);
  };

  const handleListenTts = () => {
    playUiClick();
    if (isSpeakingTts) {
      stopTtsRef.current?.();
      setIsSpeakingTts(false);
      setActiveWordIdx(null);
      return;
    }
    setIsSpeakingTts(true);
    stopTtsRef.current = speakMalayText(
      currentParagraph.text,
      (idx) => setActiveWordIdx(idx),
      () => {
        setIsSpeakingTts(false);
        setActiveWordIdx(null);
      }
    );
  };

  const handleWordClick = (word: string, index: number) => {
    setActiveWordIdx(index);
    const clean = word.replace(/[^a-zA-Z0-9\-]/g, '');
    speakMalayText(clean, undefined, () => {
      setTimeout(() => setActiveWordIdx(null), 350);
    });
  };

  const runEvaluation = (transcript: string, pitchScore: number) => {
    setSpokenText(transcript);
    const res = evaluateReadingAttempt(currentParagraph.id, transcript, pitchScore);
    setEvalResult(res);
    if (res.clarityScore >= 60) {
      playVictoryFanfare();
      try {
        confetti({ particleCount: 45, spread: 60, origin: { y: 0.7 } });
      } catch {}
      onCompleteParagraph(currentParagraph.id, res);
    }
  };

  const handleStartVoiceRecognition = () => {
    playUiClick();
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;

    if (!SpeechRec) {
      // Graceful fallback if browser doesn't support SpeechRecognition API
      handleSimulateClearReading();
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = 'ms-MY';
      rec.continuous = false;
      rec.interimResults = true;

      let latestTranscript = '';
      rec.onresult = (event: any) => {
        let interim = '';
        for (let i = 0; i < event.results.length; i++) {
          interim += event.results[i][0].transcript + ' ';
        }
        latestTranscript = interim.trim();
        setSpokenText(latestTranscript);
      };

      rec.onerror = () => {
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
        if (latestTranscript.trim().length > 0) {
          runEvaluation(latestTranscript, 92);
        }
      };

      recognitionRef.current = rec;
      setIsRecording(true);
      rec.start();
    } catch {
      setIsRecording(false);
      handleSimulateClearReading();
    }
  };

  const handleSimulateClearReading = () => {
    playUiClick();
    // Karaoke word sweep animation followed by evaluation
    let idx = 0;
    setActiveWordIdx(0);
    const interval = window.setInterval(() => {
      idx += 1;
      if (idx < words.length) {
        setActiveWordIdx(idx);
      } else {
        clearInterval(interval);
        setActiveWordIdx(null);
        runEvaluation(currentParagraph.text, 95);
      }
    }, 65);
  };

  const toggleTraitInRumusan = (trait: string) => {
    playUiClick();
    setSelectedTraits((prev) =>
      prev.includes(trait) ? prev.filter((t) => t !== trait) : [...prev, trait]
    );
  };

  const handleSaveRumusanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (draftRumusan.trim().length < 15) return;
    playTokenCollectSound();
    onSaveRumusan(draftRumusan.trim());
    setRumusanSavedBanner(true);
    setTimeout(() => setRumusanSavedBanner(false), 3500);
  };

  const activeStation =
    RESPONSIBILITY_STATIONS.find((s) => s.id === selectedStationId) ?? RESPONSIBILITY_STATIONS[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Studio Baca Bersama Pemimpin Cilik"
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 pointer-events-auto"
    >
      <div className="w-full max-w-5xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Modal Header */}
        <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-800/90 border-b border-slate-700">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-base shrink-0">
              📖
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight whitespace-nowrap">
                Membaca: Pemimpin Cilik
              </h2>
              <p className="text-[11px] text-slate-300 whitespace-nowrap">
                Read Along Interaktif · Sebutan &amp; Intonasi · Aktiviti Rumusan
              </p>
            </div>
          </div>

          {/* Interactive Filter Controls / Mode Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => {
                playUiClick();
                setActiveTab('baca');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'baca'
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              1. Baca Bersama
            </button>
            <button
              type="button"
              onClick={() => {
                playUiClick();
                setActiveTab('poster');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'poster'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              2. Poster 5 Tanggungjawab
            </button>
            <button
              type="button"
              onClick={() => {
                playUiClick();
                setActiveTab('rumusan');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'rumusan'
                  ? 'bg-emerald-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              3. Aktiviti Rumusan
            </button>
          </div>

          <button
            type="button"
            aria-label="Tutup Studio Bacaan"
            onClick={() => {
              stopTtsRef.current?.();
              onClose();
            }}
            className="px-3.5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            Kembali ke Dunia 3D [Esc]
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {activeTab === 'baca' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Story Paragraph Selector & Progress */}
              <div className="lg:col-span-4 space-y-2.5">
                <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700 text-xs text-slate-200 leading-relaxed">
                  <p className="font-semibold text-sky-300 mb-0.5">Pengenalan Teks Buku Teks:</p>
                  <p>{PEMIMPIN_CILIK_INTRO}</p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-slate-400 px-1">
                    Pilih Perenggan Bacaan ({completedParagraphs.length}/{STORY_PARAGRAPHS.length} Selesai):
                  </p>
                  {STORY_PARAGRAPHS.map((p) => {
                    const isDone = completedParagraphs.includes(p.id);
                    const isCurrent = p.id === currentParagraph.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectParagraph(p.id)}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                          isCurrent
                            ? 'bg-sky-500/15 border-sky-400 text-white'
                            : 'bg-slate-800/50 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">
                            Perenggan {p.order}: {p.title}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Nada: {p.intonationType.replace('_', ' ')} · +{p.tokenReward} Token
                          </div>
                        </div>
                        <span
                          className={`text-xs font-bold shrink-0 ${
                            isDone ? 'text-emerald-400' : 'text-slate-500'
                          }`}
                        >
                          {isDone ? '✓ Selesai' : 'Baca →'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Google Read Along Karaoke Reader + Voice Evaluator */}
              <div className="lg:col-span-8 space-y-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div>
                      <span className="text-xs text-sky-400 font-semibold">
                        Perenggan {currentParagraph.order} daripada {STORY_PARAGRAPHS.length} · Watak: {currentParagraph.speaker}
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-white">{currentParagraph.title}</h3>
                    </div>
                    <div className="text-xs text-amber-300 font-mono tabular-nums">
                      Ganjaran: +{currentParagraph.tokenReward} Token · +{currentParagraph.xpReward} XP
                    </div>
                  </div>

                  {/* Intonation Guide Callout */}
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2">
                    <span className="text-sm shrink-0">🎯</span>
                    <span>
                      <strong>Panduan Intonasi:</strong> {currentParagraph.intonationTip}
                    </span>
                  </div>

                  {/* Interactive Word-by-Word Karaoke Text Box (Read Along style) */}
                  <div
                    data-testid="read-along-words"
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 leading-relaxed text-base sm:text-lg font-medium flex flex-wrap gap-x-2 gap-y-2"
                  >
                    {words.map((word, idx) => {
                      const cleanW = normalizeMalayWord(word);
                      const isMatched = evalResult?.matchedWords.includes(cleanW);
                      const isKeyword = currentParagraph.targetKeywords.some(
                        (k) => normalizeMalayWord(k) === cleanW
                      );
                      const isHighlighted = activeWordIdx === idx;

                      return (
                        <button
                          key={`${word}-${idx}`}
                          type="button"
                          onClick={() => handleWordClick(word, idx)}
                          title="Klik untuk dengar sebutan perkataan ini"
                          className={`px-2 py-0.5 rounded-lg transition-transform duration-100 cursor-pointer ${
                            isHighlighted
                              ? 'bg-amber-400 text-slate-950 font-bold scale-110 shadow-md'
                              : isMatched
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : isKeyword
                              ? 'text-sky-300 underline decoration-sky-400/60 decoration-2 underline-offset-4 hover:bg-slate-800'
                              : 'text-slate-100 hover:bg-slate-800'
                          }`}
                        >
                          {word}
                        </button>
                      );
                    })}
                  </div>

                  {/* Action Controls: Listen TTS, Microphone Read, or Simulate Clear Reading */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleListenTts}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/40 font-semibold text-xs transition-colors whitespace-nowrap shrink-0"
                    >
                      {isSpeakingTts ? '⏹ Henti Audio Contoh' : '🔊 Dengar Contoh Bacaan'}
                    </button>

                    <button
                      type="button"
                      onClick={handleStartVoiceRecognition}
                      className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-colors whitespace-nowrap shrink-0 ${
                        isRecording
                          ? 'bg-rose-500 text-white'
                          : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                      }`}
                    >
                      {isRecording ? '🎙️ Sedang Mendengar... (Klik Selesai)' : '🎙️ Baca dengan Mikrofon'}
                    </button>

                    <button
                      type="button"
                      data-testid="simulate-clear-read-btn"
                      onClick={handleSimulateClearReading}
                      className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors whitespace-nowrap shrink-0"
                    >
                      ✨ Uji Sebutan &amp; Intonasi Jelas (+Token)
                    </button>
                  </div>

                  {/* Evaluation Score Results Panel */}
                  {evalResult && (
                    <div
                      data-testid="reading-eval-result"
                      className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold text-emerald-300">
                            Keputusan Penilaian Suara &amp; Intonasi
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-white mt-0.5">
                            {evalResult.feedbackText}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 font-mono tabular-nums">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">KEJELASAN</span>
                            <span className="text-base font-bold text-emerald-300">
                              {evalResult.clarityScore}%
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">INTONASI</span>
                            <span className="text-base font-bold text-sky-300">
                              {evalResult.intonationScore}%
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">GANJARAN</span>
                            <span className="text-base font-bold text-amber-300">
                              +{evalResult.tokensEarned} Token
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Lingokids-style Interactive Comprehension Check */}
                <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-3">
                  <div className="text-xs font-semibold text-amber-300">
                    Cabaran Kefahaman Pantas (Lingokids Quiz)
                  </div>
                  <p className="text-sm font-bold text-white">{currentParagraph.question.prompt}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {currentParagraph.question.options.map((opt, idx) => {
                      const isPicked = selectedQuizOption === idx;
                      const isCorrect = idx === currentParagraph.question.correctIndex;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            playUiClick();
                            setSelectedQuizOption(idx);
                            setQuizSubmitted(true);
                          }}
                          className={`p-3 rounded-xl border text-left text-xs font-medium transition-colors ${
                            quizSubmitted && isCorrect
                              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold'
                              : quizSubmitted && isPicked && !isCorrect
                              ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                              : 'bg-slate-900/90 border-slate-700 text-slate-200 hover:border-sky-400'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {quizSubmitted && (
                    <p className="text-xs text-slate-300 pt-1">
                      <strong>Penjelasan:</strong> {currentParagraph.question.explanation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'poster' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left: Original Textbook Page Image Reference */}
              <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Rujukan Lembaran Buku Teks: Pemimpin Cilik
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Teks asal dan grafik &ldquo;Tanggungjawab Ketua Pengawas&rdquo;
                  </p>
                </div>
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
                  <img
                    src="/assets/aistudio/Screenshot_2026-11-11_at_9.30.56_AM_38f8a0b1.png"
                    alt="Halaman Buku Teks Membaca Pemimpin Cilik dan Tanggungjawab Ketua Pengawas"
                    referrerPolicy="no-referrer"
                    className="w-full h-auto object-contain max-h-[420px] mx-auto"
                  />
                </div>
              </div>

              {/* Right: Interactive 5 Responsibilities Explorer */}
              <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-white">
                      Risalah Interaktif: 5 Tanggungjawab Ketua Pengawas
                    </h3>
                    <span className="text-xs text-emerald-300 font-mono tabular-nums">
                      Stesen Dilawati: {completedCheckpoints.length}/5
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Klik setiap ciri di bawah untuk meneliti panduan Razi menjadi murid yang berketerampilan dan menuntut Token Stesen (+15 Token).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {RESPONSIBILITY_STATIONS.map((st) => {
                    const isVisited = completedCheckpoints.includes(st.id);
                    const isSelected = st.id === activeStation.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          playUiClick();
                          setSelectedStationId(st.id);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-sky-500/20 border-sky-400 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-bold text-xs flex items-center justify-center">
                            {st.number}
                          </span>
                          {isVisited && <span className="text-emerald-400 text-xs font-bold">✓</span>}
                        </div>
                        <div className="text-xs font-bold mt-2 line-clamp-2">{st.title}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Responsibility Detail Card */}
                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-base font-bold text-amber-300">
                      Ciri #{activeStation.number}: {activeStation.title}
                    </h4>
                    <span className="text-xs text-slate-400 font-mono tabular-nums">
                      Bonus: +{activeStation.tokenBonus} Token
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">
                    {activeStation.detailText}
                  </p>
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => speakMalayText(`${activeStation.title}. ${activeStation.detailText}`)}
                      className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                    >
                      🔊 Dengar Penerangan Ciri Ini
                    </button>

                    <button
                      type="button"
                      onClick={() => onCompleteStationCheck(activeStation.id, activeStation.tokenBonus)}
                      disabled={completedCheckpoints.includes(activeStation.id)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                        completedCheckpoints.includes(activeStation.id)
                          ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-600/40 cursor-default'
                          : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                      }`}
                    >
                      {completedCheckpoints.includes(activeStation.id)
                        ? '✓ Stesen Telah Disemak'
                        : `Tandakan Faham & Tebus +${activeStation.tokenBonus} Token`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rumusan' && (
            <form onSubmit={handleSaveRumusanSubmit} className="space-y-5">
              <div className="p-4 rounded-xl bg-amber-400/15 border border-amber-400/40 space-y-1.5">
                <div className="text-xs font-bold text-amber-300">
                  Aktiviti Buku Teks: Meneliti kandungan bahan untuk membuat rumusan
                </div>
                <p className="text-sm text-white leading-relaxed">
                  &ldquo;Seorang pemimpin yang baik perlulah menjaga sikap kerana dia akan menjadi suri teladan kepada semua orang. Dia juga perlu <strong>____________________</strong>.&rdquo;
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Pilih Isi Penting Ciri Ketua Pengawas yang Berketerampilan:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {RUMUSAN_CHECKLIST_ITEMS.map((item) => {
                    const checked = selectedTraits.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleTraitInRumusan(item)}
                        className={`p-3 rounded-xl border text-left text-xs font-medium flex items-center gap-2.5 transition-colors ${
                          checked
                            ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200'
                            : 'bg-slate-950 border-slate-800 text-slate-300'
                        }`}
                      >
                        <span className="font-bold text-sm">{checked ? '☑' : '☐'}</span>
                        <span>{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="rumusan-textarea" className="text-xs font-semibold text-slate-300">
                    Tulis Rumusan Lengkap Anda (Disimpan ke Pangkalan Data TP Murid):
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      playUiClick();
                      const combined = `Seorang pemimpin yang baik perlulah menjaga sikap kerana dia akan menjadi suri teladan kepada semua orang. Dia juga perlu ${selectedTraits
                        .map((t) => t.toLowerCase())
                        .join(', ')}.`;
                      setDraftRumusan(combined);
                    }}
                    className="text-xs text-sky-400 hover:text-sky-300 font-semibold"
                  >
                    + Jana Ayat daripada Isi Dipilih
                  </button>
                </div>
                <textarea
                  id="rumusan-textarea"
                  rows={4}
                  maxLength={500}
                  value={draftRumusan}
                  onChange={(e) => setDraftRumusan(e.target.value)}
                  placeholder="Lengkapkan rumusan anda tentang ciri seorang ketua pengawas yang berketerampilan..."
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 p-3.5 text-sm text-white focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="text-xs text-slate-400">
                  Menyimpan rumusan lengkap akan meningkatkan rekod Tahap Penguasaan (TP) anda dan memberi +30 Token!
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0"
                >
                  Simpan Rumusan & Rekod TP
                </button>
              </div>

              {rumusanSavedBanner && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-200 text-xs font-bold">
                  ✓ Rumusan berjaya disimpan ke rekod TP Murid!
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
