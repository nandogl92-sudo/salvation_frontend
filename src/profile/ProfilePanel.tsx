import { Trophy, AlertCircle, TrendingUp, TrendingDown, Gamepad2, RefreshCcw } from 'lucide-react';
import type { MatchHistoryRecord, UserProfile } from '../types';
import { formatPoints } from '../components/utils/formatPoints';
import { usePlayerStats } from './usePlayerStats';

const RESULT_LABELS: Record<MatchHistoryRecord['result'], string> = {
  win: 'Victoria',
  loss: 'Derrota',
  refund: 'Reembolso',
};

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

  return (
    <div className="flex items-center justify-between py-3 border-b border-bg-300 last:border-0">
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
          {isRefund ? (
            <RefreshCcw className="w-4 h-4" />
          ) : isWin ? (
            <Trophy className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
        </div>
        <div>
          <p className="text-sm font-bold text-text-100">{record.gameName}</p>
          <p className="text-xs text-text-200">
            {RESULT_LABELS[record.result]} · {formatPoints(record.betAmount)} puntos
          </p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p
          className={`text-sm font-bold ${
            isRefund ? 'text-text-200' : isWin ? 'text-accent-100' : 'text-primary-100'
          }`}
        >
          {isRefund
            ? 'Reembolsado'
            : `${isWin ? '+' : ''}${formatPoints(record.profit)} pts`}
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
  const winRate =
    stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : 0;
  const handleRetry = () => {
    retry();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      {/* Cabecera */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary-300 text-primary-100 flex items-center justify-center text-2xl font-bold">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-100">{user.username}</h1>
          <p className="text-sm text-text-200">{user.email}</p>
        </div>
      </div>

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
          value={`${stats.totalProfit >= 0 ? '+' : ''}${formatPoints(stats.totalProfit)} pts`}
          accent={stats.totalProfit >= 0 ? 'green' : 'red'}
        />
      </div>

      {/* Puntos actuales */}
      <div className="bg-primary-300 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-primary-100 uppercase tracking-widest">Puntos</p>
          <p className="text-3xl font-bold text-primary-100">{formatPoints(user.balance)}</p>
        </div>
        {stats.totalProfit >= 0 ? (
          <TrendingUp className="w-8 h-8 text-primary-100 opacity-50" />
        ) : (
          <TrendingDown className="w-8 h-8 text-primary-100 opacity-50" />
        )}
      </div>

      {/* Historial de partidas */}
      <div>
        <h2 className="text-lg font-bold text-text-100 mb-4">Últimas partidas</h2>
        <div className="bg-bg-100 rounded-2xl border border-bg-300 divide-y divide-bg-300">
          {stats.history.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-text-200">
              <Gamepad2 className="w-8 h-8 opacity-40" />
              <p className="text-sm">Aún no has jugado ninguna partida oficial.</p>
              <p className="text-xs">Las partidas vs bot no se guardan en el historial.</p>
            </div>
          ) : (
            stats.history.map((record) => <HistoryRow key={record.id} record={record} />)
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
