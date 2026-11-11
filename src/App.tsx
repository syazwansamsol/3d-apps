/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  STORY_PARAGRAPHS,
  SEED_CLASS_LEADERBOARD,
  type ResponsibilityStation,
  type LeaderboardEntry
} from './data/pemimpinCilikData';
import {
  calculateTpLevel,
  computeUnlockedBadges,
  openBlindBox,
  sanitizeStudentStateForFirestore,
  type StudentState,
  type ReadingEvaluationResult
} from './game/rules';
import {
  auth,
  db,
  doc,
  setDoc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  onAuthStateChanged,
  signInWithGoogle,
  signOutUser,
  handleFirestoreError,
  OperationType,
  type User
} from './firebase';
import { World3D } from './components/World3D';
import { VirtualJoystick } from './components/VirtualJoystick';
import { ReadAlongModal } from './components/ReadAlongModal';
import { BlindBoxModal } from './components/BlindBoxModal';
import { LeaderboardTpModal } from './components/LeaderboardTpModal';
import {
  playUiClick,
  playStationUnlockSound,
  playVictoryFanfare,
  setSoundMuted,
  getSoundMuted
} from './utils/sound';

const LOCAL_STORAGE_KEY = 'baca3d_pemimpin_cilik_state_v1';

const createDefaultStudentState = (): StudentState => ({
  uid: 'local_murid_1',
  displayName: 'Afifi Cemerlang',
  className: '6 Bestari',
  tokens: 65,
  totalXp: 120,
  tpLevel: 2,
  avgClarity: 88,
  avgIntonation: 86,
  completedParagraphs: ['p1'],
  completedCheckpoints: ['st_1'],
  unlockedBadges: ['badge_first_read'],
  unlockedAccessories: [
    'hat_none',
    'tie_red_default',
    'back_none',
    'glasses_none',
    'back_schoolbag_pro'
  ],
  equippedHat: 'hat_none',
  equippedTie: 'tie_red_default',
  equippedBack: 'back_schoolbag_pro',
  equippedGlasses: 'glasses_none',
  rumusanAnswer: ''
});

export default function App() {
  const initialAutostart = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') === '1';
  }, []);

  const [gameState, setGameState] = useState<'title' | 'playing' | 'paused' | 'gameover'>(
    initialAutostart ? 'playing' : 'title'
  );

  const [studentState, setStudentState] = useState<StudentState>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return sanitizeStudentStateForFirestore({
          ...createDefaultStudentState(),
          ...parsed
        });
      }
    } catch {}
    return createDefaultStudentState();
  });

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [cloudLeaderboard, setCloudLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  const [nearbyStation, setNearbyStation] = useState<ResponsibilityStation | null>(null);
  const [toastBanner, setToastBanner] = useState<string | null>(null);
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [muted, setMuted] = useState(false);

  // Active Feature Modals
  const [readAlongModal, setReadAlongModal] = useState<{
    open: boolean;
    tab: 'baca' | 'poster' | 'rumusan';
    paragraphId?: string;
  }>({ open: false, tab: 'baca', paragraphId: 'p1' });
  const [blindBoxOpen, setBlindBoxOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  // Refs for 3D Avatar Movement
  const joystickInputRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const jumpTriggerRef = useRef<boolean>(false);

  // Sync gameState to document.body.dataset.state as required by game_title_and_hud.md
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // Persist locally
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(studentState));
    } catch {}
  }, [studentState]);

  const showToast = useCallback((msg: string) => {
    setToastBanner(msg);
    setTimeout(() => {
      setToastBanner((prev) => (prev === msg ? null : prev));
    }, 3400);
  }, []);

  // Sync studentState to Cloud Firestore when authenticated
  const syncProfileToFirestore = useCallback(
    async (stateToSave: StudentState, user: User | null) => {
      if (!user || !user.emailVerified) return;
      const clean = sanitizeStudentStateForFirestore({
        ...stateToSave,
        uid: user.uid
      });
      const path = `students/${user.uid}`;
      setIsSyncingCloud(true);
      try {
        await setDoc(doc(db, 'students', user.uid), {
          ...clean,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      } finally {
        setIsSyncingCloud(false);
      }
    },
    []
  );

  // Listen to Firebase Auth state & attach Firestore Leaderboard listener when signed in
  useEffect(() => {
    let unsubLeaderboard: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (unsubLeaderboard) {
        unsubLeaderboard();
        unsubLeaderboard = null;
      }

      if (user) {
        setStudentState((prev) => {
          const updated: StudentState = {
            ...prev,
            uid: user.uid,
            displayName:
              prev.displayName === 'Afifi Cemerlang' && user.displayName
                ? user.displayName.slice(0, 60)
                : prev.displayName
          };
          syncProfileToFirestore(updated, user).catch(() => {});
          return updated;
        });

        const q = query(collection(db, 'students'), orderBy('totalXp', 'desc'), limit(20));
        unsubLeaderboard = onSnapshot(
          q,
          (snap) => {
            const entries: LeaderboardEntry[] = [];
            snap.forEach((docSnap) => {
              const d = docSnap.data();
              entries.push({
                uid: d.uid || docSnap.id,
                displayName: d.displayName || 'Murid',
                className: d.className || '6 Bestari',
                tokens: Number(d.tokens ?? 0),
                totalXp: Number(d.totalXp ?? 0),
                tpLevel: Number(d.tpLevel ?? 1),
                avgClarity: Number(d.avgClarity ?? 0),
                avgIntonation: Number(d.avgIntonation ?? 0),
                unlockedBadgesCount: Array.isArray(d.unlockedBadges) ? d.unlockedBadges.length : 0
              });
            });
            setCloudLeaderboard(entries);
          },
          (err) => {
            handleFirestoreError(err, OperationType.LIST, 'students');
          }
        );
      }
    });

    return () => {
      unsubAuth();
      if (unsubLeaderboard) unsubLeaderboard();
    };
  }, [syncProfileToFirestore]);

  const startNewGameOrResume = useCallback(() => {
    playUiClick();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    document.body.dataset.state = 'playing';
    setGameState('playing');
  }, []);

  // Keyboard shortcuts for Title Screen (Enter/Space), Pause (Esc/P), Mute (M), Restart (R), Dock (H)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)
      ) {
        return;
      }

      if (gameState === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        startNewGameOrResume();
        return;
      }

      if (e.code === 'Escape') {
        if (readAlongModal.open) {
          setReadAlongModal((prev) => ({ ...prev, open: false }));
          return;
        }
        if (blindBoxOpen) {
          setBlindBoxOpen(false);
          return;
        }
        if (leaderboardOpen) {
          setLeaderboardOpen(false);
          return;
        }
        setGameState((prev) => (prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev));
        return;
      }

      if (e.code === 'KeyP' && !readAlongModal.open && !blindBoxOpen && !leaderboardOpen) {
        setGameState((prev) => (prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev));
      } else if (e.code === 'KeyM') {
        const nextMute = !getSoundMuted();
        setSoundMuted(nextMute);
        setMuted(nextMute);
      } else if (e.code === 'KeyH' && gameState === 'playing') {
        setIsDockCollapsed((prev) => !prev);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState, readAlongModal.open, blindBoxOpen, leaderboardOpen, startNewGameOrResume]);

  // Handlers for Student Progress Mutations
  const applyStudentStateUpdate = useCallback(
    (updater: (prev: StudentState) => StudentState) => {
      setStudentState((prev) => {
        const rawNext = updater(prev);
        rawNext.tpLevel = calculateTpLevel(rawNext);
        rawNext.unlockedBadges = computeUnlockedBadges(rawNext);
        const clean = sanitizeStudentStateForFirestore(rawNext);
        if (firebaseUser) {
          syncProfileToFirestore(clean, firebaseUser).catch(() => {});
        }
        return clean;
      });
    },
    [firebaseUser, syncProfileToFirestore]
  );

  const handleCompleteParagraph = useCallback(
    (paragraphId: string, evalResult: ReadingEvaluationResult) => {
      applyStudentStateUpdate((prev) => {
        const nextParagraphs = prev.completedParagraphs.includes(paragraphId)
          ? prev.completedParagraphs
          : [...prev.completedParagraphs, paragraphId];
        const nextClarity = Math.round((prev.avgClarity + evalResult.clarityScore) / 2);
        const nextIntonation = Math.round((prev.avgIntonation + evalResult.intonationScore) / 2);

        return {
          ...prev,
          tokens: prev.tokens + evalResult.tokensEarned,
          totalXp: prev.totalXp + evalResult.xpEarned,
          avgClarity: nextClarity,
          avgIntonation: nextIntonation,
          completedParagraphs: nextParagraphs
        };
      });
      showToast(
        `Tahniah! +${evalResult.tokensEarned} Token & +${evalResult.xpEarned} XP diperoleh daripada bacaan jelas!`
      );
    },
    [applyStudentStateUpdate, showToast]
  );

  const handleCompleteStationCheck = useCallback(
    (stationId: string, bonusTokens: number) => {
      playStationUnlockSound();
      applyStudentStateUpdate((prev) => {
        if (prev.completedCheckpoints.includes(stationId)) return prev;
        return {
          ...prev,
          tokens: prev.tokens + bonusTokens,
          totalXp: prev.totalXp + 35,
          completedCheckpoints: [...prev.completedCheckpoints, stationId]
        };
      });
      showToast(`Stesen Tanggungjawab disemak! +${bonusTokens} Token & +35 XP!`);
    },
    [applyStudentStateUpdate, showToast]
  );

  const handleStationInteractFrom3D = useCallback(
    (station: ResponsibilityStation) => {
      handleCompleteStationCheck(station.id, station.tokenBonus);
      // Map station 1..5 to paragraph p1..p5 and open ReadAlongModal
      const matchingPid = `p${station.number}`;
      setReadAlongModal({
        open: true,
        tab: 'baca',
        paragraphId: matchingPid
      });
    },
    [handleCompleteStationCheck]
  );

  const handleCollectWorldToken = useCallback(
    (amount: number) => {
      applyStudentStateUpdate((prev) => ({
        ...prev,
        tokens: prev.tokens + amount,
        totalXp: prev.totalXp + 10
      }));
      showToast(`+${amount} Token Bacaan dikutip di Dunia 3D!`);
    },
    [applyStudentStateUpdate, showToast]
  );

  const handleSaveRumusan = useCallback(
    (rumusanText: string) => {
      applyStudentStateUpdate((prev) => {
        const isFirstTime = prev.rumusanAnswer.trim().length < 25;
        return {
          ...prev,
          tokens: isFirstTime ? prev.tokens + 30 : prev.tokens,
          totalXp: isFirstTime ? prev.totalXp + 60 : prev.totalXp,
          rumusanAnswer: rumusanText
        };
      });
      showToast('Rumusan Pemimpin Cilik disimpan ke Rekod TP Murid!');
    },
    [applyStudentStateUpdate, showToast]
  );

  const handleRollBlindBox = useCallback(() => {
    let rollOutcome: ReturnType<typeof openBlindBox> | null = null;
    setStudentState((prev) => {
      const res = openBlindBox(prev);
      rollOutcome = res;
      if (res.success && firebaseUser) {
        syncProfileToFirestore(res.updatedState, firebaseUser).catch(() => {});
      }
      return res.updatedState;
    });
    return (
      rollOutcome ?? {
        success: false,
        error: 'Gagal membuka Blink Box.',
        isDuplicate: false,
        updatedState: studentState
      }
    );
  }, [firebaseUser, studentState, syncProfileToFirestore]);

  const handleEquipAccessory = useCallback(
    (slot: 'hat' | 'tie' | 'back' | 'glasses', id: string) => {
      applyStudentStateUpdate((prev) => ({
        ...prev,
        equippedHat: slot === 'hat' ? id : prev.equippedHat,
        equippedTie: slot === 'tie' ? id : prev.equippedTie,
        equippedBack: slot === 'back' ? id : prev.equippedBack,
        equippedGlasses: slot === 'glasses' ? id : prev.equippedGlasses
      }));
      showToast('Aksesori dipasang pada Avatar 3D anda!');
    },
    [applyStudentStateUpdate, showToast]
  );

  const handleUpdateProfileInfo = useCallback(
    (displayName: string, className: string) => {
      applyStudentStateUpdate((prev) => ({
        ...prev,
        displayName,
        className
      }));
      showToast('Profil murid dikemaskini!');
    },
    [applyStudentStateUpdate, showToast]
  );

  // Merge current student, cloud entries, and seed classmates into a sorted Leaderboard
  const mergedLeaderboard = useMemo(() => {
    const map = new Map<string, LeaderboardEntry>();
    SEED_CLASS_LEADERBOARD.forEach((entry) => map.set(entry.uid, { ...entry }));
    cloudLeaderboard.forEach((entry) => map.set(entry.uid, { ...entry }));

    map.set(studentState.uid, {
      uid: studentState.uid,
      displayName: studentState.displayName,
      className: studentState.className,
      tokens: studentState.tokens,
      totalXp: studentState.totalXp,
      tpLevel: studentState.tpLevel,
      avgClarity: studentState.avgClarity,
      avgIntonation: studentState.avgIntonation,
      unlockedBadgesCount: studentState.unlockedBadges.length,
      isCurrentUser: true
    });

    return Array.from(map.values()).sort((a, b) => b.totalXp - a.totalXp);
  }, [cloudLeaderboard, studentState]);

  const currentRank = useMemo(() => {
    const idx = mergedLeaderboard.findIndex((e) => e.uid === studentState.uid);
    return idx >= 0 ? idx + 1 : 1;
  }, [mergedLeaderboard, studentState.uid]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
      {/* 1. Persistent Three.js 3D Roblox-Style School Campus Viewport */}
      <World3D
        gameState={gameState}
        equippedHat={studentState.equippedHat}
        equippedTie={studentState.equippedTie}
        equippedBack={studentState.equippedBack}
        equippedGlasses={studentState.equippedGlasses}
        completedCheckpoints={studentState.completedCheckpoints}
        joystickInputRef={joystickInputRef}
        jumpTriggerRef={jumpTriggerRef}
        onNearbyStationChange={setNearbyStation}
        onStationInteract={handleStationInteractFrom3D}
        onCollectWorldToken={handleCollectWorldToken}
      />

      {/* 2. TITLE SCREEN STAGE (gameState === 'title') */}
      {gameState === 'title' && (
        <div className="fixed inset-0 z-30 flex flex-col justify-between p-6 sm:p-12 bg-slate-950/65 pointer-events-auto">
          {/* Top-Left Minimal Context Kicker */}
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold tracking-wider text-sky-300">
              BAHASA MELAYU TAHUN 6 · TEMA KEPEMIMPINAN · READ ALONG & DUNIA 3D
            </div>
            <div className="text-xs text-slate-300 font-mono tabular-nums">
              Rekod Semasa: TP {studentState.tpLevel} · {studentState.tokens} Token
            </div>
          </div>

          {/* Asymmetric Left-Third Hero Lockup over Calm Negative Space */}
          <div className="max-w-xl my-auto space-y-6">
            {/* Custom Inline SVG Title Emblem Lockup */}
            <div className="space-y-2">
              <svg
                className="w-full max-w-md h-auto overflow-visible"
                viewBox="0 0 520 115"
                role="img"
                aria-label="Baca3D: Pemimpin Cilik"
              >
                <defs>
                  <linearGradient id="goldBadgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FDE047" />
                    <stop offset="100%" stopColor="#F59E0B" />
                  </linearGradient>
                </defs>
                {/* Shield Emblem */}
                <path
                  d="M12 16 L58 6 L104 16 L104 58 C104 84 58 104 58 104 C58 104 12 84 12 58 Z"
                  fill="#1E3A8A"
                  stroke="url(#goldBadgeGrad)"
                  strokeWidth="5"
                />
                <path
                  d="M36 42 L58 30 L80 42 L80 68 L58 80 L36 68 Z"
                  fill="url(#goldBadgeGrad)"
                />
                <text
                  x="58"
                  y="62"
                  textAnchor="middle"
                  fill="#0F172A"
                  fontFamily="Fredoka, sans-serif"
                  fontWeight="700"
                  fontSize="24"
                >
                  3D
                </text>

                {/* Main Title Typography */}
                <text
                  x="124"
                  y="54"
                  fill="#FFFFFF"
                  stroke="#0F172A"
                  strokeWidth="6"
                  style={{ paintOrder: 'stroke fill' }}
                  fontFamily="Fredoka, Plus Jakarta Sans, sans-serif"
                  fontWeight="700"
                  fontSize="44"
                >
                  PEMIMPIN CILIK
                </text>
                <text
                  x="126"
                  y="90"
                  fill="#38BDF8"
                  stroke="#0F172A"
                  strokeWidth="4"
                  style={{ paintOrder: 'stroke fill' }}
                  fontFamily="Plus Jakarta Sans, sans-serif"
                  fontWeight="700"
                  fontSize="20"
                  letterSpacing="1.5"
                >
                  DUNIA LITERASI &amp; READ ALONG 3D
                </text>
              </svg>

              <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-lg">
                Terokai halaman sekolah 3D bersama avatar Ketua Pengawas Razi, baca kisah{' '}
                <strong className="text-amber-300">Pemimpin Cilik</strong> dengan sebutan serta intonasi yang betul untuk mengumpul Token, dan buka{' '}
                <strong className="text-sky-300">Blink Box Misteri</strong>!
              </p>
            </div>

            {/* Primary CTA + Secondary Quick Studio Button (<= 3 Menu Actions) */}
            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <button
                type="button"
                data-start="true"
                onClick={startNewGameOrResume}
                className="px-7 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-base sm:text-lg shadow-xl border-2 border-amber-200 transition-transform active:scale-95 whitespace-nowrap shrink-0"
              >
                ▶ Mula Mengembara di Dunia 3D
              </button>

              <button
                type="button"
                onClick={() => {
                  startNewGameOrResume();
                  setReadAlongModal({ open: true, tab: 'baca', paragraphId: 'p1' });
                }}
                className="px-5 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-sky-300 border-2 border-sky-400/50 font-bold text-sm sm:text-base transition-colors whitespace-nowrap shrink-0"
              >
                📖 Terus ke Baca Bersama (Read Along)
              </button>
            </div>
          </div>

          {/* Flat Borderless Control Hint Line in Bottom Safe Margin */}
          <div className="text-xs text-slate-300 font-medium tracking-wide">
            WASD / Joystick Bergerak · Space Lompat · E Buka Stesen Bacaan · H Sembunyi Dock · Esc Jeda
          </div>
        </div>
      )}

      {/* 3. ACTIVE PLAYING HUD & UNIFIED BOTTOM DOCK (gameState === 'playing') */}
      {gameState === 'playing' && (
        <div className="fixed inset-0 z-20 pointer-events-none">
          {/* Top-Left Perimeter Cluster: Student Avatar Status, TP Level, Tokens & Intonation */}
          <div className="fixed top-4 left-4 sm:top-5 sm:left-6 pointer-events-auto flex items-center gap-4 bg-slate-900/90 border-2 border-sky-400/40 rounded-2xl px-4 py-2.5 shadow-xl">
            {/* TP Mastery Emblem */}
            <button
              type="button"
              onClick={() => {
                playUiClick();
                setLeaderboardOpen(true);
              }}
              className="flex items-center gap-2.5 text-left group"
              title="Klik untuk buka Rekod TP Murid & Papan Pendahulu"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-400 text-slate-950 flex flex-col items-center justify-center font-extrabold leading-none border-2 border-emerald-200 shadow">
                <span className="text-[10px]">TAHAP</span>
                <span className="text-lg font-mono tabular-nums">TP{studentState.tpLevel}</span>
              </div>
              <div className="hidden sm:block">
                <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  {studentState.className} · KEDUDUKAN #{currentRank}
                </div>
                <div className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                  {studentState.displayName}
                </div>
              </div>
            </button>

            <div className="h-8 w-px bg-slate-700" />

            {/* Hero-to-Kicker Tabular Readouts */}
            <div className="flex items-center gap-4 font-mono tabular-nums">
              <div>
                <span className="text-[10px] font-bold text-amber-300/80 block tracking-wider">
                  TOKEN BACAAN
                </span>
                <span
                  data-testid="hud-tokens"
                  className="text-xl sm:text-2xl font-extrabold text-amber-300"
                  style={{ paintOrder: 'stroke fill' }}
                >
                  {studentState.tokens}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-sky-300/80 block tracking-wider">
                  PERENGGAN
                </span>
                <span
                  data-testid="hud-paragraphs"
                  className="text-xl sm:text-2xl font-extrabold text-sky-300"
                >
                  {studentState.completedParagraphs.length}/{STORY_PARAGRAPHS.length}
                </span>
              </div>

              <div className="hidden md:block">
                <span className="text-[10px] font-bold text-emerald-300/80 block tracking-wider">
                  INTONASI
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-emerald-300">
                  {studentState.avgIntonation}%
                </span>
              </div>
            </div>
          </div>

          {/* Top-Right Perimeter Cluster: Compact Utility Controls (Mute [M], Pause [P], Stage Clear) */}
          <div className="fixed top-4 right-4 sm:top-5 sm:right-6 pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              tabIndex={-1}
              aria-label={muted ? 'Buka Suara Audio' : 'Senyapkan Audio'}
              onClick={(e) => {
                e.currentTarget.blur();
                const next = !muted;
                setSoundMuted(next);
                setMuted(next);
              }}
              className="w-10 h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center shadow-lg transition-colors"
              title="Audio [M]"
            >
              {muted ? (
                <svg className="w-5 h-5 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-sky-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Jeda Permainan"
              onClick={(e) => {
                e.currentTarget.blur();
                playUiClick();
                setGameState('paused');
              }}
              className="w-10 h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center shadow-lg transition-colors"
              title="Jeda [P / Esc]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Paparan Rumusan Pencapaian"
              onClick={(e) => {
                e.currentTarget.blur();
                playVictoryFanfare();
                setGameState('gameover');
              }}
              className="px-3 h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-amber-400/50 text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-lg transition-colors whitespace-nowrap shrink-0"
              title="Lihat Kad Pencapaian Tamat"
            >
              <span>🏅 Tamat Sesi</span>
            </button>
          </div>

          {/* Toast Feedback Notification */}
          {toastBanner && (
            <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl bg-slate-900/95 border border-amber-400 text-amber-200 text-xs sm:text-sm font-bold shadow-xl whitespace-nowrap">
              {toastBanner}
            </div>
          )}

          {/* Virtual On-Screen Joystick + Jump & Nearby Station Action Button */}
          <VirtualJoystick
            onMove={(dx, dy) => {
              joystickInputRef.current = { dx, dy };
            }}
            onJump={() => {
              jumpTriggerRef.current = true;
            }}
            onInteract={() => {
              if (nearbyStation) {
                handleStationInteractFrom3D(nearbyStation);
              }
            }}
            nearbyLabel={nearbyStation ? `${nearbyStation.number}. ${nearbyStation.title}` : null}
          />

          {/* UNIFIED COLLAPSIBLE BOTTOM CONTROL DOCK (per threejs Section 5) */}
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-[min(920px,95vw)] flex flex-col items-center pointer-events-auto">
            <button
              type="button"
              onClick={() => {
                playUiClick();
                setIsDockCollapsed((prev) => !prev);
              }}
              className="px-3.5 py-1 rounded-t-xl bg-slate-900/95 border border-b-0 border-slate-700 text-[11px] font-bold text-slate-300 hover:text-white transition-colors"
            >
              {isDockCollapsed ? '▴ Papar Menu Literasi [H]' : '▾ Sembunyi Kawalan [H]'}
            </button>

            {!isDockCollapsed && (
              <div className="w-full bg-slate-900/95 border-2 border-slate-700 rounded-2xl px-3 py-2.5 shadow-2xl flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playUiClick();
                    setReadAlongModal({ open: true, tab: 'baca', paragraphId: 'p1' });
                  }}
                  className="flex-1 min-w-[140px] py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>📖 Baca Bersama</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playUiClick();
                    setReadAlongModal({ open: true, tab: 'poster' });
                  }}
                  className="flex-1 min-w-[135px] py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/40 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>🛡️ 5 Tanggungjawab ({studentState.completedCheckpoints.length}/5)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playUiClick();
                    setReadAlongModal({ open: true, tab: 'rumusan' });
                  }}
                  className="flex-1 min-w-[130px] py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-400/40 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>✍️ Aktiviti Rumusan</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playUiClick();
                    setBlindBoxOpen(true);
                  }}
                  className="flex-1 min-w-[135px] py-2.5 px-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>🎁 Blink Box &amp; Avatar</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playUiClick();
                    setLeaderboardOpen(true);
                  }}
                  className="flex-1 min-w-[135px] py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>🏆 Kedudukan &amp; TP{studentState.tpLevel}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. PAUSED MODAL CARD (gameState === 'paused') */}
      {gameState === 'paused' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Permainan Dijeda"
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/80 pointer-events-auto"
        >
          <div className="w-full max-w-md bg-slate-900 border-2 border-sky-400/50 rounded-2xl p-6 text-center space-y-5 shadow-2xl">
            <div className="space-y-1">
              <span className="text-xs font-bold text-sky-400 tracking-wider">SESI DIJEDA</span>
              <h2 className="text-2xl font-bold text-white">Dunia Baca3D: Pemimpin Cilik</h2>
            </div>

            <div className="grid grid-cols-3 gap-2.5 font-mono tabular-nums">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">TAHAP TP</span>
                <span className="text-lg font-bold text-emerald-300">TP {studentState.tpLevel}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">TOKEN</span>
                <span className="text-lg font-bold text-amber-300">{studentState.tokens}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">JUMLAH XP</span>
                <span className="text-lg font-bold text-sky-300">{studentState.totalXp}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  playUiClick();
                  setGameState('playing');
                }}
                className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm"
              >
                ▶ Sambung Mengembara [Esc]
              </button>
              <button
                type="button"
                onClick={() => {
                  playUiClick();
                  setGameState('title');
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs"
              >
                Kembali ke Skrin Utama
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. VICTORY / STAGE CLEAR MODAL CARD (gameState === 'gameover') */}
      {gameState === 'gameover' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Rumusan Pencapaian Pemimpin Cilik"
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/85 pointer-events-auto"
        >
          <div className="w-full max-w-lg bg-slate-900 border-2 border-amber-400 rounded-2xl p-6 text-center space-y-5 shadow-2xl">
            <div className="space-y-1">
              <span className="text-xs font-bold text-amber-300 tracking-wider">
                SIJIL PENCAPAIAN LITERASI PEMIMPIN CILIK
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Syabas, {studentState.displayName}!
              </h2>
              <p className="text-xs text-slate-300">
                Rekod kemajuan bacaan dan Tahap Penguasaan (TP) anda telah dikemaskini.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 font-mono tabular-nums">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">TAHAP PENGUASAAN</span>
                <span className="text-xl font-extrabold text-emerald-300">
                  TP {studentState.tpLevel}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">SKOR INTONASI</span>
                <span className="text-xl font-extrabold text-sky-300">
                  {studentState.avgIntonation}%
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">JUMLAH XP / TOKEN</span>
                <span className="text-xl font-extrabold text-amber-300">
                  {studentState.totalXp} XP
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                data-start="true"
                onClick={() => {
                  playUiClick();
                  setGameState('playing');
                }}
                className="flex-1 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm"
              >
                ▶ Teruskan Penerokaan 3D
              </button>
              <button
                type="button"
                onClick={() => {
                  playUiClick();
                  setGameState('playing');
                  setLeaderboardOpen(true);
                }}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm"
              >
                🏆 Lihat Papan Pendahulu &amp; TP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. INTERACTIVE MODALS (Read Along, Blind Box, Leaderboard & TP) */}
      <ReadAlongModal
        isOpen={readAlongModal.open}
        initialTab={readAlongModal.tab}
        initialParagraphId={readAlongModal.paragraphId}
        completedParagraphs={studentState.completedParagraphs}
        completedCheckpoints={studentState.completedCheckpoints}
        rumusanAnswer={studentState.rumusanAnswer}
        onClose={() => setReadAlongModal((prev) => ({ ...prev, open: false }))}
        onCompleteParagraph={handleCompleteParagraph}
        onCompleteStationCheck={handleCompleteStationCheck}
        onSaveRumusan={handleSaveRumusan}
      />

      <BlindBoxModal
        isOpen={blindBoxOpen}
        tokens={studentState.tokens}
        unlockedAccessories={studentState.unlockedAccessories}
        equippedHat={studentState.equippedHat}
        equippedTie={studentState.equippedTie}
        equippedBack={studentState.equippedBack}
        equippedGlasses={studentState.equippedGlasses}
        onClose={() => setBlindBoxOpen(false)}
        onRollBlindBox={handleRollBlindBox}
        onEquipAccessory={handleEquipAccessory}
      />

      <LeaderboardTpModal
        isOpen={leaderboardOpen}
        studentState={studentState}
        leaderboard={mergedLeaderboard}
        firebaseUser={firebaseUser}
        isSyncingCloud={isSyncingCloud}
        onClose={() => setLeaderboardOpen(false)}
        onUpdateProfileInfo={handleUpdateProfileInfo}
        onGoogleSignIn={() => {
          signInWithGoogle().catch(() => {});
        }}
        onGoogleSignOut={() => {
          signOutUser().catch(() => {});
        }}
      />
    </div>
  );
}
