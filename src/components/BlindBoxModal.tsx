import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  AVATAR_ACCESSORIES,
  type AvatarAccessory
} from '../data/pemimpinCilikData';
import { BLIND_BOX_COST } from '../game/rules';
import {
  playBlindBoxShakeSound,
  playVictoryFanfare,
  playUiClick
} from '../utils/sound';

interface BlindBoxModalProps {
  isOpen: boolean;
  tokens: number;
  unlockedAccessories: string[];
  equippedHat: string;
  equippedTie: string;
  equippedBack: string;
  equippedGlasses: string;
  onClose: () => void;
  onRollBlindBox: () => {
    success: boolean;
    error?: string;
    accessory?: AvatarAccessory;
    isDuplicate: boolean;
  };
  onEquipAccessory: (slot: 'hat' | 'tie' | 'back' | 'glasses', id: string) => void;
}

export const BlindBoxModal: React.FC<BlindBoxModalProps> = ({
  isOpen,
  tokens,
  unlockedAccessories,
  equippedHat,
  equippedTie,
  equippedBack,
  equippedGlasses,
  onClose,
  onRollBlindBox,
  onEquipAccessory
}) => {
  const [boxPhase, setBoxPhase] = useState<'idle' | 'shaking' | 'revealed'>('idle');
  const [revealedItem, setRevealedItem] = useState<AvatarAccessory | null>(null);
  const [wasDuplicate, setWasDuplicate] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeSlotFilter, setActiveSlotFilter] = useState<'all' | 'hat' | 'tie' | 'back' | 'glasses'>('all');

  if (!isOpen) return null;

  const handleTriggerUnbox = () => {
    setErrorMsg(null);
    if (tokens < BLIND_BOX_COST) {
      setErrorMsg(
        `Token tidak mencukupi! Anda memerlukan ${BLIND_BOX_COST} Token. Sila baca perenggan di Studio Baca Bersama atau kutip token di Dunia 3D.`
      );
      return;
    }

    setBoxPhase('shaking');
    playBlindBoxShakeSound();

    setTimeout(() => {
      const outcome = onRollBlindBox();
      if (!outcome.success || !outcome.accessory) {
        setBoxPhase('idle');
        setErrorMsg(outcome.error ?? 'Gagal membuka kotak misteri.');
        return;
      }
      setRevealedItem(outcome.accessory);
      setWasDuplicate(outcome.isDuplicate);
      setBoxPhase('revealed');
      playVictoryFanfare();
      try {
        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.55 }
        });
      } catch {}
    }, 750);
  };

  const filteredAccessories = AVATAR_ACCESSORIES.filter((item) =>
    activeSlotFilter === 'all' ? true : item.slot === activeSlotFilter
  );

  const isEquipped = (item: AvatarAccessory) => {
    if (item.slot === 'hat') return equippedHat === item.id;
    if (item.slot === 'tie') return equippedTie === item.id;
    if (item.slot === 'back') return equippedBack === item.id;
    return equippedGlasses === item.id;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Kotak Misteri Blind Box dan Almari Avatar 3D"
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 pointer-events-auto"
    >
      <div className="w-full max-w-5xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 bg-slate-800/90 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-xl">
              🎁
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Kotak Misteri (Blink Box) & Studio Avatar 3D
              </h2>
              <p className="text-xs text-slate-300">
                Tebus Token Bacaan untuk membuka aksesori eksklusif Ketua Pengawas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-amber-400/50 text-amber-300 font-mono tabular-nums text-sm font-bold">
              🪙 {tokens} Token
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              Kembali ke Dunia 3D
            </button>
          </div>
        </div>

        {/* Main Content Split */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Blink Box / Blind Box Gacha Stage */}
          <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-between text-center space-y-5">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-amber-400">
                GANJARAN EKSKLUSIF PEMIMPIN CILIK
              </span>
              <h3 className="text-xl font-bold text-white">
                Blink Box Aksesori 3D
              </h3>
              <p className="text-xs text-slate-400">
                Setiap kotak mengandungi aksesori 3D untuk menghias avatar pengawas anda di dunia maya!
              </p>
            </div>

            {/* Animated 3D-Styled Mystery Box */}
            <div className="my-4 relative flex items-center justify-center min-h-[190px] w-full">
              {boxPhase !== 'revealed' ? (
                <div
                  className={`w-36 h-36 rounded-3xl bg-amber-400 border-4 border-amber-200 shadow-2xl flex flex-col items-center justify-center text-slate-950 cursor-pointer transition-transform ${
                    boxPhase === 'shaking' ? 'animate-blindbox-shake' : 'hover:scale-105'
                  }`}
                  onClick={handleTriggerUnbox}
                >
                  <span className="text-5xl">🎁</span>
                  <span className="text-xs font-extrabold tracking-wider mt-2">
                    {boxPhase === 'shaking' ? 'MEMBUKA...' : 'BLINK BOX'}
                  </span>
                </div>
              ) : (
                revealedItem && (
                  <div
                    data-testid="blindbox-reveal-card"
                    className="w-full p-5 rounded-2xl bg-slate-900 border-2 border-amber-400 space-y-2 animate-fadeIn"
                  >
                    <div className="text-xs font-bold text-amber-300">
                      ✨ TAHNIAH! AKSESORI DIPEROLEH ({revealedItem.rarity})
                    </div>
                    <div className="text-lg font-extrabold text-white">
                      {revealedItem.name}
                    </div>
                    <p className="text-xs text-slate-300">{revealedItem.description}</p>
                    {wasDuplicate && (
                      <p className="text-xs text-sky-300 font-semibold">
                        Item telah dimiliki — +20 Token dikembalikan sebagai Bonus Bintang!
                      </p>
                    )}
                    <p className="text-[11px] text-emerald-400 font-bold pt-1">
                      ✓ Dipakai secara automatik pada Avatar 3D anda!
                    </p>
                  </div>
                )
              )}
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-400/50 text-rose-200 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <div className="w-full space-y-2">
              <button
                type="button"
                data-testid="open-blindbox-btn"
                disabled={boxPhase === 'shaking'}
                onClick={handleTriggerUnbox}
                className="w-full py-3.5 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-extrabold text-sm shadow-lg transition-transform active:scale-98"
              >
                {boxPhase === 'shaking'
                  ? 'Sedang Membuka Blink Box...'
                  : `✨ Tebus & Buka Blink Box (${BLIND_BOX_COST} Token)`}
              </button>
              <p className="text-[11px] text-slate-400">
                Koleksi Dimiliki: {unlockedAccessories.length} / {AVATAR_ACCESSORIES.length} Aksesori
              </p>
            </div>
          </div>

          {/* Right: Avatar Wardrobe & Instant Equipper */}
          <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-bold text-white">
                Almari Aksesori Avatar Pengawas 3D
              </h3>

              {/* Slot Filter Buttons */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                {(
                  [
                    ['all', 'Semua'],
                    ['hat', 'Topi/Mahkota'],
                    ['tie', 'Tali Leher'],
                    ['back', 'Belakang/Sayap'],
                    ['glasses', 'Kaca Mata']
                  ] as const
                ).map(([slotKey, label]) => (
                  <button
                    key={slotKey}
                    type="button"
                    onClick={() => {
                      playUiClick();
                      setActiveSlotFilter(slotKey);
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      activeSlotFilter === slotKey
                        ? 'bg-sky-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-[380px] pr-1">
              {filteredAccessories.map((item) => {
                const owned = unlockedAccessories.includes(item.id);
                const active = isEquipped(item);
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                      active
                        ? 'bg-sky-500/15 border-sky-400'
                        : owned
                        ? 'bg-slate-900 border-slate-700'
                        : 'bg-slate-900/40 border-slate-800/80 opacity-75'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                        <span>
                          {item.slot.toUpperCase()} · {item.rarity}
                        </span>
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0"
                          style={{ backgroundColor: item.colorHex }}
                        />
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1">{item.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-mono tabular-nums text-slate-400">
                        {owned ? 'Dimiliki ✓' : `Blink Box (${BLIND_BOX_COST} Token)`}
                      </span>

                      <button
                        type="button"
                        disabled={!owned || active}
                        onClick={() => {
                          playUiClick();
                          onEquipAccessory(item.slot, item.id);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                            : owned
                            ? 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {active ? 'Sedang Dipakai' : owned ? 'Pakai pada Avatar' : 'Terkunci 🔒'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
