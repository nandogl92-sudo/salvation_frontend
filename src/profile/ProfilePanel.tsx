import { useEffect, useRef, useState } from 'react';
import { Trophy, Gamepad2, Pencil, RefreshCcw, Settings } from 'lucide-react';
import type { MatchHistoryRecord, UserProfile } from '../types';
import { formatPoints } from '../components/utils/formatPoints';
import { handleActivateKey } from '../components/utils/handleActivateKey';
import { monthPointsOf } from '../components/utils/monthPointsOf';
import DailyRaffle from './DailyRaffle';
import AccountSettingsDialog from './AccountSettingsDialog';
import { INITIAL_COLORS, initialColorOf, saveInitialColor } from './initialColor';
import { usePlayerStats } from './usePlayerStats';

const RESULT_LABELS: Record<MatchHistoryRecord['result'], string> = {
  win: 'Victoria',
  loss: 'Derrota',
  refund: 'Reembolso',
};

const CHIPS_PER_PLAY_DAY = 2;

const madridCalendar = (): { year: number; month: number; day: number } => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date());
  const read = (type: string): number => Number(parts.find((part) => part.type === type)?.value ?? '1');
  return { year: read('year'), month: read('month'), day: read('day') };
};

const isMonthPlayDay = (day: number): boolean => {
  const index = day <= 7 ? day - 1 : day <= 14 ? day - 8 : day <= 21 ? day - 15 : day - 22;
  return index === 0 || index === 2 || index === 4;
};

const chipsLeftForMonth = (balance: number): { enough: boolean; note: string } => {
  const { year, month, day } = madridCalendar();
  const lastDay = new Date(year, month, 0).getDate();
  let playDays = 0;
  for (let cursor = day; cursor <= lastDay; cursor += 1) {
    if (isMonthPlayDay(cursor)) playDays += 1;
  }
  const needed = playDays * CHIPS_PER_PLAY_DAY;
  if (needed === 0) return { enough: true, note: 'Este mes ya no quedan partidas.' };
  if (balance >= needed) return { enough: true, note: 'Hay fichas para las partidas que quedan este mes.' };
  return { enough: false, note: 'Faltan fichas para las partidas que quedan este mes.' };
};

function ChipBalanceCard({ balance }: { balance: number }) {
  const cover = chipsLeftForMonth(balance);
  const cardClass = cover.enough ? 'bg-accent-200 text-accent-100' : 'bg-primary-300 text-primary-100';
  return (
    <div className={`${cardClass} rounded-2xl p-5`}>
      <p className="text-xs font-bold uppercase tracking-widest">Fichas para jugar</p>
      <p className="text-3xl font-bold">{formatPoints(balance)}</p>
      <p className="text-xs mt-1">{cover.note}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: 'green' | 'red' | 'neutral';
}) {
  const valueColor =
    accent === 'green'
      ? 'text-accent-100'
      : accent === 'red'
      ? 'text-primary-100'
      : 'text-text-100';

  return (
    <div className="bg-bg-100 rounded-2xl border border-bg-300 p-5 flex flex-col gap-1">
      <span className="text-xs font-bold text-text-200 uppercase tracking-widest">{label}</span>
      <span className={`text-3xl font-bold ${valueColor}`}>{value}</span>
      {sub && <span className="text-xs text-text-200">{sub}</span>}
    </div>
  );
}

function HistoryRow({ record }: { record: MatchHistoryRecord }) {
  const isWin = record.result === 'win';
  const isRefund = record.result === 'refund';
  const pointLabel = isRefund
    ? 'Reembolsado'
    : record.monthPoint > 0
      ? '+ 1 punto mes'
      : 'Sin punto';
  const chipLabel = record.ranked
    ? pointLabel
    : isRefund
      ? 'Reembolsado'
      : isWin
        ? '+ ficha'
        : '- ficha';
  const chipClass = record.ranked
    ? record.monthPoint > 0
      ? 'text-accent-100'
      : 'text-text-200'
    : isRefund
      ? 'text-text-200'
      : isWin
        ? 'text-accent-100'
        : 'text-primary-100';

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-bg-300 last:border-0">
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            isRefund
              ? 'bg-bg-300 text-text-200'
              : isWin
              ? 'bg-accent-100/10 text-accent-100'
              : 'bg-primary-100/10 text-primary-100'
          }`}
        >
          {isRefund ? <RefreshCcw className="w-4 h-4" /> : <Trophy className="w-4 h-4" />}
        </div>
        <div>
          <p className="text-sm font-bold text-text-100">{record.gameName}</p>
          <p className="text-xs text-text-200">
            {RESULT_LABELS[record.result]} · {formatPoints(record.betAmount)} ficha
          </p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-bold ${chipClass}`}>
          {chipLabel}
        </p>
        <p className="text-xs text-text-200">
          {new Date(record.playedAt).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}

export default function ProfilePanel({
  user,
  onBack,
}: {
  user: UserProfile;
  onBack: () => void;
}) {
  const { status, stats, error, retry } = usePlayerStats(user.id);
  const [historyTab, setHistoryTab] = useState<'ranked' | 'friendly'>('ranked');
  const [colorId, setColorId] = useState(() => initialColorOf(user.id).id);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);
  const badgeColor = INITIAL_COLORS.find((color) => color.id === colorId) ?? INITIAL_COLORS[0];
  const showRanked = () => setHistoryTab('ranked');
  const showFriendly = () => setHistoryTab('friendly');
  const visibleHistory = stats.history
    .filter((record) => (historyTab === 'ranked' ? record.ranked : !record.ranked))
    .slice(0, 10);
  const emptyHistory = historyTab === 'ranked'
    ? 'Aún no has jugado ninguna ranqueada.'
    : 'Aún no has jugado ningún amistoso.';
  const tabClass = (selected: boolean) => selected
    ? 'bg-accent-100 text-white'
    : 'bg-bg-200 text-text-100';
  const winRate =
    stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : 0;
  const handleRetry = () => {
    retry();
  };
  const handleOpenPalette = () => {
    setPaletteOpen((open) => !open);
  };
  const handleOpenSettings = () => {
    setSettingsOpen(true);
  };
  const handleCloseSettings = () => {
    setSettingsOpen(false);
  };
  const handlePickColor = (id: string) => {
    setColorId(id as typeof colorId);
    saveInitialColor(user.id, id);
    setPaletteOpen(false);
  };

  useEffect(() => {
    if (!paletteOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (paletteRef.current?.contains(target)) return;
      setPaletteOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [paletteOpen]);

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      {/* Cabecera */}
      <div className="flex items-center gap-4">
        <div ref={paletteRef} className="relative shrink-0">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold ${badgeColor.badge}`}>
            {user.username.charAt(0).toUpperCase()}
          </div>
          <button
            type="button"
            aria-label="Abrir las preferencias de la cuenta"
            tabIndex={0}
            onClick={handleOpenSettings}
            onKeyDown={(event) => handleActivateKey(event, handleOpenSettings)}
            className="absolute -bottom-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full border border-[#d5dcf0] bg-[#0e1528] text-[#f4f6fb]"
          >
            <Settings className="h-2.5 w-2.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Cambiar el color de la inicial"
            aria-expanded={paletteOpen}
            tabIndex={0}
            onClick={handleOpenPalette}
            onKeyDown={(event) => handleActivateKey(event, handleOpenPalette)}
            className="absolute -bottom-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full border border-[#d5dcf0] bg-[#0e1528] text-[#f4f6fb]"
          >
            <Pencil className="h-2.5 w-2.5" aria-hidden="true" />
          </button>
          {paletteOpen && (
            <div className="absolute left-0 top-full z-10 mt-3 flex w-56 flex-wrap gap-2 rounded-2xl border border-bg-300 bg-[#0e1528] p-3" role="group" aria-label="Colores de la inicial">
              {INITIAL_COLORS.map((color) => {
                const pickThis = () => handlePickColor(color.id);
                const selected = color.id === badgeColor.id;
                const ring = selected ? 'border-white' : 'border-transparent';
                return (
                  <button
                    key={color.id}
                    type="button"
                    aria-label={color.label}
                    aria-pressed={selected}
                    tabIndex={0}
                    onClick={pickThis}
                    onKeyDown={(event) => handleActivateKey(event, pickThis)}
                    className={`h-8 w-8 rounded-full border-2 ${color.swatch} ${ring}`}
                  />
                );
              })}
            </div>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-100">{user.username}</h1>
          <p className="text-sm text-text-200">{user.email}</p>
        </div>
      </div>

      {settingsOpen && <AccountSettingsDialog user={user} onClose={handleCloseSettings} />}

      <DailyRaffle />

      {status === 'loading' && (
        <p className="text-sm text-text-200" role="status">Cargando historial...</p>
      )}

      {status === 'error' && (
        <div className="bg-red-50 text-red-500 rounded-2xl p-4 space-y-3" role="alert">
          <p className="text-sm">{error}</p>
          <button
            type="button"
            aria-label="Reintentar cargar el historial"
            onClick={handleRetry}
            className="text-sm font-bold underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {status === 'success' && (
      <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Partidas" value={stats.totalGames.toString()} />
        <StatCard
          label="Victorias"
          value={stats.wins.toString()}
          sub={stats.totalGames > 0 ? `${winRate}% win rate` : undefined}
          accent="green"
        />
        <StatCard label="Derrotas" value={stats.losses.toString()} accent="red" />
        <StatCard
          label="Profit total"
          value={`${stats.totalProfit >= 0 ? '+' : ''}${formatPoints(stats.totalProfit)} fichas`}
          accent={stats.totalProfit >= 0 ? 'green' : 'red'}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ChipBalanceCard balance={user.balance} />
        <div className="bg-bg-100 rounded-2xl border border-bg-300 p-5">
          <p className="text-xs font-bold text-text-200 uppercase tracking-widest">Puntos del mes</p>
          <p className="text-3xl font-bold text-text-100">{formatPoints(monthPointsOf(user))}</p>
          <p className="text-xs text-text-200 mt-1">Suma de tus 3 mejores semanas</p>
        </div>
      </div>

      {/* Historial de partidas */}
      <div>
        <h2 className="text-lg font-bold text-text-100 mb-4">Últimas partidas</h2>
        <div className="grid grid-cols-2 gap-2 mb-4" role="tablist" aria-label="Tipo de historial">
          <button
            type="button"
            role="tab"
            aria-selected={historyTab === 'ranked'}
            aria-label="Ver partidas ranqueadas"
            tabIndex={0}
            onClick={showRanked}
            onKeyDown={(event) => handleActivateKey(event, showRanked)}
            className={`py-3 rounded-xl text-sm font-bold ${tabClass(historyTab === 'ranked')}`}
          >
            Ranqueadas
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={historyTab === 'friendly'}
            aria-label="Ver partidas amistosas"
            tabIndex={0}
            onClick={showFriendly}
            onKeyDown={(event) => handleActivateKey(event, showFriendly)}
            className={`py-3 rounded-xl text-sm font-bold ${tabClass(historyTab === 'friendly')}`}
          >
            Amistosas
          </button>
        </div>
        <div className="bg-bg-100 rounded-2xl border border-bg-300 divide-y divide-bg-300">
          {visibleHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-text-200">
              <Gamepad2 className="w-8 h-8 opacity-40" />
              <p className="text-sm">{emptyHistory}</p>
            </div>
          ) : (
            visibleHistory.map((record) => <HistoryRow key={record.id} record={record} />)
          )}
        </div>
      </div>
      </>
      )}

      {/* Botón volver */}
      <button
        onClick={onBack}
        className="text-sm text-text-200 hover:text-text-100 font-medium transition-colors"
      >
        ← Volver al inicio
      </button>
    </div>
  );
}
