import { useEffect, useRef, useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import { acceptRaffleHour, chooseRaffleHours, getTodayRaffle, rejectRaffleHours, type DailyRaffle as DailyRaffleView, type RaffleSeat } from '../api/raffleApi';
import { rankedGameName } from './rankedGames';
import { phoneCalendarLink, saveAgreedHour } from './calendarEvent';

const FALLBACK_HOURS = [15, 16, 17, 18, 19, 20, 21, 22, 23];

const hourLabel = (hour: number): string => `${hour}:00`;

const hoursPhrase = (list: number[]): string => {
  const labels = [...list].sort((left, right) => left - right).map((hour) => hourLabel(hour));
  if (labels.length <= 1) return `las ${labels[0] ?? ''}`;
  const last = labels[labels.length - 1];
  return `las ${labels.slice(0, -1).join(', las ')} y ${last}`;
};

const hourEndLabel = (hour: number): string => `${hour}:10`;

const hourClass = (blocked: boolean, selected: boolean, rivalPick: boolean): string => {
  if (blocked) return 'bg-bg-200 text-text-200 line-through';
  if (selected) return 'bg-[#f5c518] text-[#1a1403]';
  if (rivalPick) return 'bg-bg-300 text-text-100 ring-2 ring-[#f5c518]';
  return 'bg-bg-300 text-text-100';
};

const DailyRaffle = ({
  playedGameIds,
  onPlayGame,
}: {
  playedGameIds: string[];
  onPlayGame: (gameId: string, code: string) => void;
}) => {
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

  const saveHours = (seatId: string, key: string, request: ReturnType<typeof chooseRaffleHours>) => {
    if (!raffle || savingKey !== null) return;
    const seat = raffle.seats.find((item) => item.id === seatId);
    if (!seat?.yours || seat.agreedHour !== null) return;
    setSavingKey(key);
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

  const handlePropose = (seatId: string, hours: number[]) => {
    if (hours.some((hour) => raffle?.seats.find((item) => item.id === seatId)?.blocked.includes(hour))) return;
    saveHours(seatId, `${seatId}:choose`, chooseRaffleHours(hours, seatId));
  };

  const handleAccept = (seatId: string, hour: number) => {
    saveHours(seatId, `${seatId}:accept:${hour}`, acceptRaffleHour(hour, seatId));
  };

  const handleReject = (seatId: string) => {
    saveHours(seatId, `${seatId}:reject`, rejectRaffleHours(seatId));
  };

  const mine = raffle?.seats.filter((seat) => seat.yours) ?? [];
  const rivals = mine.map((seat) => seat.rivalName).filter((name) => name !== null);
  const hours = raffle && raffle.hours.length > 0 ? raffle.hours : FALLBACK_HOURS;
  const sharedHours = mine.length > 1 && mine.every((seat) => seat.agreedHour === null)
    ? mine.slice(1).reduce(
      (common, seat) => common.filter((hour) => seat.rivalHours.includes(hour)),
      mine[0].rivalHours,
    )
    : [];

  return (
    <section className="bg-bg-100 rounded-2xl border border-bg-300 p-5 space-y-3" aria-label="Sorteo de hoy">
      <h2 className="text-xs font-bold text-text-200 uppercase tracking-widest">Sorteo de hoy</h2>
      {message && <p className="text-sm text-red-500" role="alert">{message}</p>}
      {!raffle && !message && <p className="text-sm text-text-200">Cargando el sorteo...</p>}
      {raffle && (
        <>
          {raffle.tiebreakNote && (
            <p className="text-lg font-bold text-text-100">{raffle.tiebreakNote}</p>
          )}
          {raffle.youRest && !raffle.tiebreakNote && (
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
          {sharedHours.length > 0 && (
            <p className="text-sm font-bold text-text-100" role="status">
              {rivals.join(' y ')} coinciden en {hoursPhrase(sharedHours)}.
            </p>
          )}
          {raffle.youPlay && mine.map((seat) => (
            <SeatHours
              key={seat.id}
              day={raffle.day}
              seat={seat}
              hours={hours}
              savingKey={savingKey}
              onPropose={handlePropose}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          ))}
          {raffle.youPlay && mine.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-text-200">Código para acceder a los juegos de hoy.</p>
              {mine.map((seat) => (
                <PairCode
                  key={seat.id}
                  seat={seat}
                  showRival={mine.length > 1}
                  playedGameIds={playedGameIds}
                  onPlayGame={onPlayGame}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
};

const SeatHours = ({
  day,
  seat,
  hours,
  savingKey,
  onPropose,
  onAccept,
  onReject,
}: {
  day: string;
  seat: RaffleSeat;
  hours: number[];
  savingKey: string | null;
  onPropose: (seatId: string, hours: number[]) => void;
  onAccept: (seatId: string, hour: number) => void;
  onReject: (seatId: string) => void;
}) => {
  const [calendarNote, setCalendarNote] = useState<string | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  useEffect(() => {
    setPicked((current) => {
      const next = current.filter((hour) => !seat.blocked.includes(hour));
      if (next.length === current.length && next.every((hour, index) => hour === current[index])) return current;
      return next;
    });
  }, [seat.blocked]);
  const canChoose = seat.agreedHour === null;
  const waitingOnYou = canChoose && seat.rivalHours.length > 0 && seat.yourHours.length === 0;
  const waitingOnRival = canChoose && seat.yourHours.length > 0 && seat.rivalHours.length === 0;
  const canPick = canChoose && seat.yourTurn && !waitingOnYou && !waitingOnRival;
  const openHours = hours.filter((hour) => !seat.blocked.includes(hour));
  const offerSize = Math.min(3, openHours.length);
  const earliestHour = seat.rivalHours.length > 0 ? Math.min(...seat.rivalHours) : null;
  const handleToggle = (hour: number) => {
    if (!canPick || seat.blocked.includes(hour)) return;
    setPicked((current) => {
      if (current.includes(hour)) return current.filter((item) => item !== hour);
      if (current.length >= offerSize) return current;
      return [...current, hour];
    });
  };
  const handlePropose = () => {
    if (!canPick || picked.length !== offerSize || offerSize < 2) return;
    onPropose(seat.id, picked);
  };
  const handleRejectOffer = () => {
    onReject(seat.id);
  };
  const gamesLabel = seat.games.map((gameId) => rankedGameName(gameId)).join(' y ');
  const phoneLink = seat.agreedHour === null
    ? null
    : phoneCalendarLink(day, seat.agreedHour, seat.id, seat.rivalName ?? '', gamesLabel);
  const handleAddCalendar = () => {
    if (seat.agreedHour === null) return;
    const saved = saveAgreedHour(day, seat.agreedHour, seat.id, seat.rivalName ?? '', gamesLabel);
    if (saved) {
      setCalendarNote('Se ha descargado la cita. Ábrela para guardarla en el calendario.');
      return;
    }
    setCalendarNote('No se ha podido abrir el calendario.');
  };
  const calendarNoteClass = calendarNote === 'No se ha podido abrir el calendario.'
    ? 'text-sm font-bold text-red-500'
    : 'text-sm text-text-200';
  const calendarLabel = `Añadir al calendario las ${hourLabel(seat.agreedHour ?? 0)} contra ${seat.rivalName ?? 'tu pareja'}`;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-text-100">Hora contra {seat.rivalName}</h3>
      {seat.agreedHour !== null && (
        <p className="text-sm font-bold text-text-100">Hora acordada: {hourLabel(seat.agreedHour)}.</p>
      )}
      {phoneLink && (
        <a
          href={phoneLink.href}
          target={phoneLink.kind === 'android' ? '_blank' : undefined}
          rel={phoneLink.kind === 'android' ? 'noopener noreferrer' : undefined}
          aria-label={calendarLabel}
          className="text-sm font-bold text-[#3ec8ff] underline"
        >
          Añadir al calendario
        </a>
      )}
      {!phoneLink && seat.agreedHour !== null && (
        <button
          type="button"
          aria-label={calendarLabel}
          tabIndex={0}
          onClick={handleAddCalendar}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            handleAddCalendar();
          }}
          className="text-sm font-bold text-[#3ec8ff] underline"
        >
          Añadir al calendario
        </button>
      )}
      {calendarNote && (
        <p className={calendarNoteClass} role="status">
          {calendarNote}
        </p>
      )}
      {seat.agreedHour !== null && hours.filter((hour) => !seat.blocked.includes(hour)).length === 1 && (
        <p className="text-sm text-text-200">Era la única hora que quedaba.</p>
      )}
      {canChoose && seat.cleared && canPick && (
        <p className="text-sm font-bold text-red-500" role="status">Horas rechazadas. Esas horas ya no se pueden elegir. Te toca elegir otras.</p>
      )}
      {canChoose && !canPick && !waitingOnYou && !waitingOnRival && (
        <p className="text-sm font-bold text-text-100" role="status">
          Le toca a {seat.rivalName} elegir tres horas. Tú aceptas una.
        </p>
      )}
      {waitingOnYou && !seat.offerLocked && (
        <p className="text-sm font-bold text-text-100" role="status">
          {seat.rivalName} ha elegido {hoursPhrase(seat.rivalHours)}. Acepta una. Si rechazas la primera, o si llega a media hora sin respuesta, solo podrás aceptar una de las otras.
        </p>
      )}
      {waitingOnYou && seat.offerLocked && (
        <p className="text-sm font-bold text-text-100" role="status">
          La primera hora ya no vale. Acepta una de {hoursPhrase(seat.rivalHours)}. Ya no puedes rechazar.
        </p>
      )}
      {waitingOnRival && !seat.offerLocked && (
        <p className="text-sm text-text-200">
          Has elegido {hoursPhrase(seat.yourHours)}. {seat.rivalName} puede aceptar una, o rechazar solo la primera.
        </p>
      )}
      {waitingOnRival && seat.offerLocked && (
        <p className="text-sm text-text-200">
          La primera hora ya no vale. {seat.rivalName} solo puede aceptar una de {hoursPhrase(seat.yourHours)}.
        </p>
      )}
      {canPick && offerSize > 1 && (
        <p className="text-xs text-text-200">
          {offerSize === 3
            ? 'Elige tres horas, de 15:00 a 23:00. La otra persona acepta una.'
            : `Quedan ${offerSize} horas. Elígelas. La otra persona acepta una.`}
          {' '}Llevas {picked.length} de {offerSize}.
        </p>
      )}
      {(canPick || waitingOnYou) && <div className="grid grid-cols-3 gap-2" role="group" aria-label={`Horas contra ${seat.rivalName}`}>
        {(waitingOnYou ? seat.rivalHours : hours).map((hour) => {
          const blocked = seat.blocked.includes(hour);
          const selected = canPick && picked.includes(hour);
          const offered = waitingOnYou && seat.rivalHours.includes(hour);
          const acceptThisHour = () => {
            onAccept(seat.id, hour);
          };
          if (offered) {
            const canRejectThis = !seat.offerLocked && hour === earliestHour && seat.rivalHours.length > 1;
            return (
              <div key={hour} className="rounded-lg bg-bg-300 px-2 py-2 text-center ring-2 ring-[#f5c518]">
                <p className="text-sm font-bold text-text-100">{hourLabel(hour)}</p>
                <div className="mt-2 flex justify-center gap-2">
                  <button
                    type="button"
                    aria-label={`Aceptar las ${hourLabel(hour)}`}
                    disabled={savingKey !== null}
                    onClick={acceptThisHour}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f5c518] text-[#1a1403] disabled:opacity-50"
                  >
                    <Check className="h-5 w-5" aria-hidden="true" />
                  </button>
                  {canRejectThis && (
                    <button
                      type="button"
                      aria-label={`Rechazar las ${hourLabel(hour)}`}
                      disabled={savingKey !== null}
                      onClick={handleRejectOffer}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 text-white disabled:opacity-50"
                    >
                      <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            );
          }
          const label = blocked
            ? `Las ${hourLabel(hour)} ya no se pueden elegir`
            : selected
              ? `Quitar las ${hourLabel(hour)}`
              : `Elegir las ${hourLabel(hour)} contra ${seat.rivalName}`;
          return (
            <button
              key={hour}
              type="button"
              aria-label={label}
              aria-pressed={selected}
              disabled={blocked || !canPick || savingKey !== null}
              onClick={() => handleToggle(hour)}
              className={`rounded-lg px-3 py-3 text-sm font-bold disabled:opacity-50 ${hourClass(blocked, selected, false)}`}
            >
              {hourLabel(hour)}
            </button>
          );
        })}
      </div>}
      {canPick && offerSize > 1 && (
        <button
          type="button"
          aria-label={offerSize === 3 ? 'Proponer estas tres horas' : 'Proponer estas horas'}
          disabled={picked.length !== offerSize || savingKey !== null}
          onClick={handlePropose}
          className="rounded-lg bg-[#f5c518] px-3 py-3 text-sm font-bold text-[#1a1403] disabled:opacity-50"
        >
          {offerSize === 3 ? 'Proponer estas tres horas' : 'Proponer estas horas'}
        </button>
      )}
    </div>
  );
};

const copyText = async (text: string): Promise<boolean> => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // En el móvil el portapapeles a veces falla. Se intenta el método antiguo.
    }
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
};

const leftLabel = (ms: number): string => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const chosenHour = (seat: RaffleSeat): number | null => seat.agreedHour;

const PairCode = ({
  seat,
  showRival,
  playedGameIds,
  onPlayGame,
}: {
  seat: RaffleSeat;
  showRival: boolean;
  playedGameIds: string[];
  onPlayGame: (gameId: string, code: string) => void;
}) => {
  const [now, setNow] = useState(Date.now());
  const [copyNote, setCopyNote] = useState<string | null>(null);
  const copiedTimer = useRef<number | null>(null);
  const hour = chosenHour(seat);

  useEffect(() => {
    if (seat.codeState !== 'open' && seat.codeState !== 'waiting' && seat.waitingUntil === null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [seat.codeState, seat.waitingUntil]);

  useEffect(() => {
    return () => {
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
    };
  }, []);

  const handleCopyCode = () => {
    if (!seat.code) return;
    void copyText(seat.code).then((ok) => {
      setCopyNote(ok ? 'Copiado' : 'No se ha podido copiar.');
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopyNote(null), 2000);
    });
  };

  const windowStart = seat.codeState === 'waiting' ? seat.codeUntil : null;
  const windowEnd = seat.codeState === 'open'
    ? seat.codeUntil
    : windowStart === null
      ? null
      : windowStart + 10 * 60 * 1000;
  const beforeHour = windowStart !== null && now < windowStart;
  const inWindow = windowEnd !== null && !beforeHour && now < windowEnd;
  const codeClosed = seat.codeState === 'closed' || (windowEnd !== null && now >= windowEnd);
  const showCode = seat.code !== null && !codeClosed;
  const playLeft = seat.waitingUntil === null ? 0 : seat.waitingUntil - now;
  const gameLabel = seat.waitingGameId ? rankedGameName(seat.waitingGameId) : '';
  const copyNoteClass = copyNote === 'Copiado' ? 'text-xs font-bold text-accent-100' : 'text-xs font-bold text-red-500';
  const handlePlayGame = (gameId: string) => {
    if (!seat.code || !inWindow || playedGameIds.includes(gameId)) return;
    onPlayGame(gameId, seat.code);
  };

  return (
    <div className="space-y-1">
      {showRival && (
        <p className="text-xs font-bold text-text-100">Contra {seat.rivalName}</p>
      )}
      {showCode && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-pixel text-lg tracking-[0.35em] text-[#f5c518]" aria-label={`Código para acceder a los juegos de hoy ${seat.code}`}>
              {seat.code}
            </p>
            <button
              type="button"
              aria-label={copyNote === 'Copiado' ? 'Código copiado' : 'Copiar código'}
              onClick={handleCopyCode}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#f5c518] hover:bg-bg-300"
            >
              {copyNote === 'Copiado' ? (
                <Check className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Copy className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
            {copyNote && (
              <span className={copyNoteClass} role="status">
                {copyNote}
              </span>
            )}
          </div>
        </div>
      )}
      {seat.games.length > 0 && (
        <div className="flex flex-col gap-2 pt-2">
          {seat.games.map((gameId) => {
            const name = rankedGameName(gameId);
            const played = playedGameIds.includes(gameId);
            const open = inWindow && !played && seat.code !== null;
            const playLabel = played
              ? `${name} ya jugado`
              : codeClosed
                ? `${name}. El código ya no vale`
                : hour === null
                  ? `${name}. Elige la hora`
                  : open
                    ? `Jugar ${name}`
                    : `${name} a las ${hourLabel(hour)}`;
            const playClass = open
              ? 'w-full rounded-lg bg-[#f5c518] px-3 py-3 text-sm font-bold text-[#1a1403] hover:bg-[#e0b10f]'
              : 'w-full rounded-lg bg-bg-300 px-3 py-3 text-sm font-bold text-text-200';
            return (
              <button
                key={gameId}
                type="button"
                disabled={!open}
                aria-label={playLabel}
                onClick={() => handlePlayGame(gameId)}
                className={playClass}
              >
                {playLabel}
              </button>
            );
          })}
        </div>
      )}
      {seat.waitingUntil !== null && gameLabel.length > 0 && playLeft > 0 && (
        <>
          <p className="text-sm font-bold text-[#3ec8ff]" role="status">
            {seat.waitingYours
              ? `Estás esperando a ${seat.rivalName} en ${gameLabel}.`
              : `${seat.waitingName} te está esperando en ${gameLabel}.`}
          </p>
          <p className="text-sm font-bold text-[#3ec8ff]" role="timer">Quedan {leftLabel(playLeft)} para jugar</p>
        </>
      )}
      {seat.waitingUntil !== null && gameLabel.length > 0 && playLeft <= 0 && (
        <p className="text-sm font-bold text-red-500" role="status">Se acabaron los 5 minutos para {gameLabel}.</p>
      )}
      {codeClosed && (
        <p className="text-sm font-bold text-red-500">El código ya no es válido.</p>
      )}
      {seat.noShowNote && (
        <p className="text-sm font-bold text-accent-100" role="status">{seat.noShowNote}</p>
      )}
      {!codeClosed && hour !== null && !inWindow && (
        <p className="text-xs text-text-200">
          El código y los juegos se desbloquean a las {hourLabel(hour)}. Luego vale 10 minutos.
        </p>
      )}
      {!codeClosed && hour !== null && inWindow && (
        <p className="text-xs text-text-200">
          El código vale hasta las {hourEndLabel(hour)}.
        </p>
      )}
      {!codeClosed && hour === null && (
        <p className="text-xs text-text-200">El código aparece cuando seleccionéis la hora.</p>
      )}
    </div>
  );
};

export default DailyRaffle;
