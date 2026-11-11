import React, { useState } from 'react';
import {
  ACHIEVEMENT_BADGES,
  type LeaderboardEntry
} from '../data/pemimpinCilikData';
import { type StudentState } from '../game/rules';
import { playUiClick } from '../utils/sound';
import { type User } from '../firebase';

interface LeaderboardTpModalProps {
  isOpen: boolean;
  studentState: StudentState;
  leaderboard: LeaderboardEntry[];
  firebaseUser: User | null;
  isSyncingCloud: boolean;
  onClose: () => void;
  onUpdateProfileInfo: (displayName: string, className: string) => void;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
}

const TP_DESCRIPTORS: { level: number; title: string; desc: string }[] = [
  {
    level: 1,
    title: 'TP 1 — Sangat Terhad',
    desc: 'Membaca perkataan asas dengan bimbingan penuh guru atau audio contoh.'
  },
  {
    level: 2,
    title: 'TP 2 — Terhad',
    desc: 'Membaca sekurang-kurangnya 1 perenggan Pemimpin Cilik atau melawati 1 stesen tanggungjawab.'
  },
  {
    level: 3,
    title: 'TP 3 — Memuaskan',
    desc: 'Membaca 2 perenggan dengan sebutan jelas dan memahami tanggungjawab asas pengawas.'
  },
  {
    level: 4,
    title: 'TP 4 — Baik',
    desc: 'Membaca 3 perenggan dengan intonasi sesuai serta meneroka 2+ stesen dunia 3D.'
  },
  {
    level: 5,
    title: 'TP 5 — Sangat Baik',
    desc: 'Membaca 4+ perenggan dengan intonasi dialog yang baik serta melengkapkan isi rumusan.'
  },
  {
    level: 6,
    title: 'TP 6 — Mithali (Suri Teladan)',
    desc: 'Menguasai semua 5 perenggan dengan kejelasan >= 85%, melawati semua 5 stesen 3D, dan menghasilkan rumusan lengkap.'
  }
];

export const LeaderboardTpModal: React.FC<LeaderboardTpModalProps> = ({
  isOpen,
  studentState,
  leaderboard,
  firebaseUser,
  isSyncingCloud,
  onClose,
  onUpdateProfileInfo,
  onGoogleSignIn,
  onGoogleSignOut
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'leaderboard' | 'badges' | 'tp_profile'>('leaderboard');
  const [nameInput, setNameInput] = useState(studentState.displayName);
  const [classInput, setClassInput] = useState(studentState.className);
  const [profileSavedMsg, setProfileSavedMsg] = useState(false);

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !classInput.trim()) return;
    playUiClick();
    onUpdateProfileInfo(nameInput.trim(), classInput.trim());
    setProfileSavedMsg(true);
    setTimeout(() => setProfileSavedMsg(false), 2500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Papan Pendahulu, Lencana Pencapaian dan Rekod TP Murid"
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 pointer-events-auto"
    >
      <div className="w-full max-w-5xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-800/90 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-400 text-slate-950 flex items-center justify-center font-bold text-xl">
              🏆
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Papan Pendahulu, Lencana & Rekod TP Murid (Real-Time)
              </h2>
              <p className="text-xs text-slate-300">
                Pantau kedudukan kompetitif, lencana pencapaian & Tahap Penguasaan (TP1–TP6)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => {
                playUiClick();
                setActiveSubTab('leaderboard');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeSubTab === 'leaderboard'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Papan Pendahulu
            </button>
            <button
              type="button"
              onClick={() => {
                playUiClick();
                setActiveSubTab('badges');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeSubTab === 'badges'
                  ? 'bg-sky-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Lencana ({studentState.unlockedBadges.length}/{ACHIEVEMENT_BADGES.length})
            </button>
            <button
              type="button"
              onClick={() => {
                playUiClick();
                setActiveSubTab('tp_profile');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeSubTab === 'tp_profile'
                  ? 'bg-emerald-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Rekod TP & Profil Murid
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            Kembali ke Dunia 3D
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {activeSubTab === 'leaderboard' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white">
                    Kedudukan Murid Terbaik — Bahasa Melayu (Pemimpin Cilik)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Disusun mengikut jumlah XP Bacaan, kejelasan intonasi, dan Tahap Penguasaan (TP).
                  </p>
                </div>
                <div className="text-xs text-slate-300 font-mono tabular-nums">
                  Status Pangkalan Data: {firebaseUser ? '☁️ Tersambung ke Cloud Firestore' : '💾 Mod Sesi Tempatan + Kelas'}
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400">
                      <th className="py-3.5 px-4">KEDUDUKAN</th>
                      <th className="py-3.5 px-4">NAMA MURID</th>
                      <th className="py-3.5 px-4">KELAS</th>
                      <th className="py-3.5 px-4 text-right">TAHAP TP</th>
                      <th className="py-3.5 px-4 text-right">INTONASI</th>
                      <th className="py-3.5 px-4 text-right">TOKEN</th>
                      <th className="py-3.5 px-4 text-right">JUMLAH XP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-xs sm:text-sm font-mono tabular-nums">
                    {leaderboard.map((row, idx) => (
                      <tr
                        key={row.uid}
                        className={
                          row.isCurrentUser
                            ? 'bg-sky-500/15 text-white font-bold'
                            : 'text-slate-200 hover:bg-slate-900/70'
                        }
                      >
                        <td className="py-3.5 px-4 font-bold">
                          #{idx + 1} {idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : ''}
                        </td>
                        <td className="py-3.5 px-4 font-sans">
                          <span>{row.displayName}</span>
                          {row.isCurrentUser && (
                            <span className="ml-2 text-xs text-sky-300 font-semibold">
                              (Anda)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-sans text-slate-400">{row.className}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-300">
                          TP {row.tpLevel}
                        </td>
                        <td className="py-3.5 px-4 text-right text-sky-300">
                          {row.avgIntonation}%
                        </td>
                        <td className="py-3.5 px-4 text-right text-amber-300">
                          {row.tokens}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-white">
                          {row.totalXp} XP
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSubTab === 'badges' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  Koleksi Lencana Pencapaian Pemimpin Cilik
                </h3>
                <p className="text-xs text-slate-400">
                  Kumpulkan kesemua 6 lencana menerusi bacaan lantang yang jelas, penerokaan dunia 3D, dan penulisan rumusan.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ACHIEVEMENT_BADGES.map((badge) => {
                  const unlocked = studentState.unlockedBadges.includes(badge.id);
                  return (
                    <div
                      key={badge.id}
                      className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 ${
                        unlocked
                          ? 'bg-slate-950 border-amber-400/60 shadow-lg'
                          : 'bg-slate-950/50 border-slate-800 opacity-65'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span
                            className="font-bold"
                            style={{ color: unlocked ? badge.accentColor : '#94a3b8' }}
                          >
                            {unlocked ? '★ LENCANA DIBUKA' : '🔒 BELUM DIBUKA'}
                          </span>
                          <span className="text-slate-400">{badge.requirementText}</span>
                        </div>
                        <h4 className="text-base font-bold text-white">{badge.title}</h4>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {badge.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeSubTab === 'tp_profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Student Profile & Firebase Cloud Sync */}
              <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-5">
                <div>
                  <h3 className="text-base font-bold text-white">
                    Profil Murid & Pangkalan Data Masa Nyata
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Kemaskini nama dan kelas anda untuk paparan Papan Pendahulu dan Rekod TP Guru.
                  </p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-3.5">
                  <div>
                    <label htmlFor="student-name-input" className="block text-xs font-semibold text-slate-300 mb-1">
                      Nama Penuh Murid
                    </label>
                    <input
                      id="student-name-input"
                      type="text"
                      required
                      maxLength={60}
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-400"
                    />
                  </div>

                  <div>
                    <label htmlFor="student-class-input" className="block text-xs font-semibold text-slate-300 mb-1">
                      Nama Kelas
                    </label>
                    <input
                      id="student-class-input"
                      type="text"
                      required
                      maxLength={30}
                      value={classInput}
                      onChange={(e) => setClassInput(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-400"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs sm:text-sm transition-colors"
                  >
                    Simpan Profil Murid
                  </button>

                  {profileSavedMsg && (
                    <p className="text-xs text-emerald-400 font-semibold">
                      ✓ Profil murid telah dikemaskini!
                    </p>
                  )}
                </form>

                <div className="pt-3 border-t border-slate-800 space-y-2.5">
                  <div className="text-xs font-semibold text-slate-300">
                    Penyegerakan Awan Firebase Firestore:
                  </div>
                  {firebaseUser ? (
                    <div className="space-y-2">
                      <p className="text-xs text-emerald-300">
                        ✓ Log Masuk sebagai: <strong>{firebaseUser.email || firebaseUser.displayName}</strong>
                        {isSyncingCloud ? ' (Menyimpan...)' : ' (Disimpan Real-Time)'}
                      </p>
                      <button
                        type="button"
                        onClick={onGoogleSignOut}
                        className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                      >
                        Log Keluar Google
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-400">
                        Log masuk dengan akaun Google untuk menyimpan rekod TP Murid merentas peranti di Firebase Firestore.
                      </p>
                      <button
                        type="button"
                        onClick={onGoogleSignIn}
                        className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs flex items-center justify-center gap-2"
                      >
                        <span>🔐 Log Masuk Google (Simpan ke Cloud Firestore)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Real-Time TP Murid Evaluation Rubric */}
              <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs font-semibold text-emerald-400">
                      PENTAKSIRAN BILIK DARJAH (PBD) BAHASA MELAYU
                    </span>
                    <h3 className="text-lg font-bold text-white">
                      Tahap Penguasaan Semasa: TP {studentState.tpLevel}
                    </h3>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <span className="text-xs text-slate-400 block">PURATA INTONASI</span>
                    <span className="text-lg font-bold text-sky-300">
                      {studentState.avgIntonation}%
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {TP_DESCRIPTORS.map((tp) => {
                    const achieved = studentState.tpLevel >= tp.level;
                    const isCurrent = studentState.tpLevel === tp.level;
                    return (
                      <div
                        key={tp.level}
                        className={`p-3 rounded-xl border transition-colors ${
                          isCurrent
                            ? 'bg-emerald-500/20 border-emerald-400 text-white'
                            : achieved
                            ? 'bg-slate-900 border-emerald-500/30 text-slate-200'
                            : 'bg-slate-900/40 border-slate-800 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span>{tp.title}</span>
                          <span>{achieved ? '✓ Dicapai' : 'Belum Dicapai'}</span>
                        </div>
                        <p className="text-xs mt-1 leading-relaxed">{tp.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
