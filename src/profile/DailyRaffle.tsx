import { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { chooseRaffleHour, getTodayRaffle, rejectRaffleHour, type DailyRaffle as DailyRaffleView, type RaffleSeat } from '../api/raffleApi';
import { rankedGameName } from './rankedGames';

const FALLBACK_HOURS = [15, 16, 17, 18, 19, 20, 21, 22, 23];

const hourLabel = (hour: number): string => `${hour}:00`;

const hourClass = (blocked: boolean, selected: boolean, rivalPick: boolean): string => {
  if (blocked) return 'bg-bg-200 text-text-200 line-through';
  if (selected) return 'bg-[#f5c518] text-[#1a1403]';
  if (rivalPick) return 'bg-bg-300 text-text-100 ring-2 ring-[#f5c518]';
  return 'bg-bg-300 text-text-100';
};

const DailyRaffle = () => {
  const [raffle, setRaffle] = useState<DailyRaffleView | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const hasRaffle = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let loading = false;
    const load = () => {
      if (loading) return;
      loading = true;
      getTodayRaffle().then((result) => {
        loading = false;
        if (cancelled) return;
        if (result.ok === true) {
          hasRaffle.current = true;
          setRaffle(result.raffle);
          setMessage(null);
          return;
        }
        if (hasRaffle.current) return;
        if (result.message === 'El sorteo está tardando. Se vuelve a intentar.') return;
        setMessage(result.message);
      });
    };
    load();
    const timer = window.setInterval(load, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const applyHour = (seatId: string, hour: number, reject: boolean) => {
    if (!raffle || savingKey !== null) return;
    const seat = raffle.seats.find((item) => item.id === seatId);
    if (!seat?.yours || seat.agreedHour !== null) return;
    if (!reject && seat.blocked.includes(hour)) return;
    setSavingKey(`${seatId}:${reject ? 'reject' : 'choose'}:${hour}`);
    const request = reject ? rejectRaffleHour(hour, seatId) : chooseRaffleHour(hour, seatId);
    request.then((result) => {
      setSavingKey(null);
      if (result.ok === true) {
        setRaffle(result.raffle);
        setMessage(null);
        return;
      }
      setMessage(result.message);
    });
  };

  const handleChoose = (seatId: string, hour: number) => {
    applyHour(seatId, hour, false);
  };

  const handleReject = (seatId: string, hour: number) => {
    applyHour(seatId, hour, true);
  };

  const mine = raffle?.seats.filter((seat) => seat.yours) ?? [];
  const rivals = mine.map((seat) => seat.rivalName).filter((name) => name !== null);
  const hours = raffle && raffle.hours.length > 0 ? raffle.hours : FALLBACK_HOURS;
  const sharedHour = mine.length > 1
    && mine.every((seat) => seat.rivalHour !== null && seat.rivalHour === mine[0].rivalHour)
    ? mine[0].rivalHour
    : null;

  return (
    <section className="bg-bg-100 rounded-2xl border border-bg-300 p-5 space-y-3" aria-label="Sorteo de hoy">
      <h2 className="text-xs font-bold text-text-200 uppercase tracking-widest">Sorteo de hoy</h2>
      {message && <p className="text-sm text-red-500" role="alert">{message}</p>}
      {!raffle && !message && <p className="text-sm text-text-200">Cargando el sorteo...</p>}
      {raffle && (
        <>
          {raffle.youRest && (
            <p className="text-lg font-bold text-text-100">Hoy es día libre.</p>
          )}
          {raffle.youPlay && rivals.length === 1 && (
            <p className="text-sm font-bold text-accent-100">Hoy juegas contra {rivals[0]}.</p>
          )}
          {raffle.youPlay && rivals.length > 1 && (
            <p className="text-sm font-bold text-accent-100">
              Hoy juegas dos partidos, contra {rivals.join(' y ')}. Aunque ganes los dos, hoy solo suma 1 punto.
            </p>
          )}
          {raffle.youPlay && (
            <p className="text-xs text-text-200">Quien gana su partido del día suma 1 punto a la semana del ranking.</p>
          )}
          {sharedHour !== null && (
            <p className="text-sm font-bold text-text-100" role="status">
              {rivals.join(' y ')} han elegido la misma hora: las {hourLabel(sharedHour)}.
            </p>
          )}
          {raffle.youPlay && mine.map((seat) => (
            <SeatHours
              key={seat.id}
              seat={seat}
              hours={hours}
              savingKey={savingKey}
              onChoose={handleChoose}
              onReject={handleReject}
            />
          ))}
          {raffle.youPlay && mine.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-text-200">Código para acceder</p>
              {mine.map((seat) => (
                <PairCode key={seat.id} seat={seat} showRival={mine.length > 1} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
};

const SeatHours = ({
  seat,
  hours,
  savingKey,
  onChoose,
  onReject,
}: {
  seat: RaffleSeat;
  hours: number[];
  savingKey: string | null;
  onChoose: (seatId: string, hour: number) => void;
  onReject: (seatId: string, hour: number) => void;
}) => {
  const canChoose = seat.agreedHour === null;
  const waitingOnYou = canChoose && seat.rivalHour !== null && seat.yourHour === null;
  const waitingOnRival = canChoose && seat.yourHour !== null && seat.rivalHour === null;
  const handleHour = (hour: number) => {
    onChoose(seat.id, hour);
  };
  const handleReject = (hour: number) => {
    onReject(seat.id, hour);
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-text-100">Hora contra {seat.rivalName}</h3>
      {seat.agreedHour !== null && (
        <p className="text-sm font-bold text-text-100">Hora acordada: {hourLabel(seat.agreedHour)}.</p>
      )}
      {canChoose && seat.cleared && (
        <p className="text-sm font-bold text-red-500" role="status">Hora rechazada. Esa hora ya no se puede elegir.</p>
      )}
      {waitingOnYou && seat.rivalHour !== null && (
        <p className="text-sm font-bold text-text-100" role="status">
          {seat.rivalName} ha elegido las {hourLabel(seat.rivalHour)}. Confirma o rechaza.
        </p>
      )}
      {waitingOnRival && seat.yourHour !== null && (
        <p className="text-sm text-text-200">Has elegido las {hourLabel(seat.yourHour)}. {seat.rivalName} puede confirmarla o rechazarla.</p>
      )}
      {canChoose && !waitingOnYou && !waitingOnRival && (
        <p className="text-xs text-text-200">Elige una hora, de 15:00 a 23:00. La otra persona la confirma o la rechaza.</p>
      )}
      <div className="grid grid-cols-3 gap-2" role="group" aria-label={`Horas contra ${seat.rivalName}`}>
        {hours.map((hour) => {
          const blocked = seat.blocked.includes(hour);
          const selected = !blocked && (seat.agreedHour === hour || seat.yourHour === hour);
          const proposed = waitingOnYou && !blocked && seat.rivalHour === hour;
          const chooseThisHour = () => {
            if (blocked || waitingOnYou || waitingOnRival) return;
            handleHour(hour);
          };
          const confirmThisHour = () => {
            handleHour(hour);
          };
          const rejectThisHour = () => {
            handleReject(hour);
          };
          if (proposed) {
            return (
              <div key={hour} className="rounded-lg bg-bg-300 px-2 py-2 text-center ring-2 ring-[#f5c518]">
                <p className="text-sm font-bold text-text-100">{hourLabel(hour)}</p>
                <div className="mt-2 flex justify-center gap-2">
                  <button
                    type="button"
                    aria-label={`Confirmar las ${hourLabel(hour)}`}
                    disabled={savingKey !== null}
                    onClick={confirmThisHour}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f5c518] text-[#1a1403] disabled:opacity-50"
                  >
                    <Check className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Rechazar las ${hourLabel(hour)}`}
                    disabled={savingKey !== null}
                    onClick={rejectThisHour}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 text-white disabled:opacity-50"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          }
          const label = blocked
            ? `Las ${hourLabel(hour)} ya no se pueden elegir`
            : `Elegir las ${hourLabel(hour)} contra ${seat.rivalName}`;
          return (
            <button
              key={hour}
              type="button"
              aria-label={label}
              aria-pressed={selected}
              disabled={blocked || !canChoose || waitingOnYou || waitingOnRival || savingKey !== null}
              onClick={chooseThisHour}
              className={`rounded-lg px-3 py-3 text-sm font-bold disabled:opacity-50 ${hourClass(blocked, selected, false)}`}
            >
              {hourLabel(hour)}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const leftLabel = (ms: number): string => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const chosenHour = (seat: RaffleSeat): number | null => seat.agreedHour ?? seat.yourHour;

const PairCode = ({ seat, showRival }: { seat: RaffleSeat; showRival: boolean }) => {
  const [now, setNow] = useState(Date.now());
  const hour = chosenHour(seat);

  useEffect(() => {
    if (seat.codeState !== 'open' && seat.waitingUntil === null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [seat.codeState, seat.waitingUntil]);

  const left = seat.codeUntil === null ? 0 : seat.codeUntil - now;
  const codeClosed = seat.codeState === 'closed' || (seat.codeState === 'open' && left <= 0);
  const showCode = seat.code !== null && !codeClosed;
  const playLeft = seat.waitingUntil === null ? 0 : seat.waitingUntil - now;
  const gameLabel = seat.waitingGameId ? rankedGameName(seat.waitingGameId) : '';
  const todayGames = seat.games.map((gameId) => rankedGameName(gameId)).join(' y ');
  const todayLabel = seat.games.length === 1 ? 'Juego de hoy' : 'Juegos de hoy';

  return (
    <div className="space-y-1">
      {showRival && (
        <p className="text-xs font-bold text-text-100">Contra {seat.rivalName}</p>
      )}
      {showCode && todayGames.length > 0 && (
        <p className="text-xs text-text-200">{todayLabel}: {todayGames}.</p>
      )}
      {showCode && (
        <p className="font-pixel text-lg tracking-[0.35em] text-[#f5c518]" aria-label={`Código ${seat.code}`}>
          {seat.code}
        </p>
      )}
      {playLeft > 0 && gameLabel.length > 0 && (
        <>
          <p className="text-sm font-bold text-[#3ec8ff]" role="status">
            {seat.waitingYours
              ? `Estás esperando a ${seat.rivalName} en ${gameLabel}.`
              : `${seat.waitingName} te está esperando en ${gameLabel}.`}
          </p>
          <p className="text-sm font-bold text-[#3ec8ff]" role="timer">Quedan {leftLabel(playLeft)} para jugar</p>
        </>
      )}
      {codeClosed && (
        <p className="text-sm font-bold text-red-500">El código ya no es válido.</p>
      )}
      {seat.noShowNote && (
        <p className="text-sm font-bold text-accent-100" role="status">{seat.noShowNote}</p>
      )}
      {!codeClosed && hour !== null && (
        <p className="text-xs text-text-200">
          El código tendrá validez hasta 10 minutos después de las {hourLabel(hour)}.
        </p>
      )}
      {!codeClosed && hour === null && (
        <p className="text-xs text-text-200">El código aparece cuando seleccionéis la hora.</p>
      )}
    </div>
  );
};

export default DailyRaffle;
