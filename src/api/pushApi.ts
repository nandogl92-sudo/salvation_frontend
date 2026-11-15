import { API_URL } from './config'
import { getAccessToken } from './authApi'

type PushKey = { publicKey?: unknown }

const request = async (path: string, init: RequestInit): Promise<Response | null> => {
  const token = getAccessToken()
  if (!token) return null
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)
  if (init.body) headers.set('Content-Type', 'application/json')
  return fetch(`${API_URL}${path}`, { ...init, headers })
}

const keyBytes = (value: string): Uint8Array => {
  const padded = `${value}${'='.repeat((4 - (value.length % 4)) % 4)}`.replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(padded)
  const bytes = new Uint8Array(raw.length)
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index)
  return bytes
}

const iosBrowser = (): boolean => /iPhone|iPad|iPod/i.test(window.navigator.userAgent)

const installedApp = (): boolean => {
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true
}

const HOME_KEY = 'frizeplay.home'

export const rememberHomeScreen = (): void => {
  if (typeof window === 'undefined' || !installedApp()) return
  window.localStorage.setItem(HOME_KEY, '1')
}

const homeScreenSaved = (): boolean => {
  try {
    return window.localStorage.getItem(HOME_KEY) === '1'
  } catch {
    return false
  }
}

export const pushSetup = (): 'ios' | 'ask' | 'blocked' | null => {
  if (typeof window === 'undefined') return null
  rememberHomeScreen()
  if (iosBrowser() && !installedApp()) {
    if (homeScreenSaved()) return null
    return 'ios'
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return null
  if (Notification.permission === 'denied') return 'blocked'
  return 'ask'
}

let activeRegistration: ServiceWorkerRegistration | null = null
let preparedKey: string | null = null

const waitUntilActive = (registration: ServiceWorkerRegistration): Promise<void> => {
  if (registration.active) return Promise.resolve()
  const worker = registration.installing ?? registration.waiting
  if (!worker) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('timeout')), 8000)
    let settled = false
    const finish = (failed: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      if (failed) reject(new Error('redundant'))
      else resolve()
    }
    if (registration.active || worker.state === 'activated') {
      finish(false)
      return
    }
    worker.addEventListener('statechange', () => {
      if (worker.state === 'activated' || registration.active) finish(false)
      if (worker.state === 'redundant') finish(true)
    })
  })
}

const registrationOf = async (): Promise<ServiceWorkerRegistration> => {
  if (activeRegistration?.active) return activeRegistration
  const registration = await navigator.serviceWorker.register('/sw.js')
  activeRegistration = registration
  await waitUntilActive(registration)
  return registration
}

export const preparePush = (): void => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  void registrationOf().catch(() => {
    activeRegistration = null
  })
  if (preparedKey) return
  void publicKeyOf().then((key) => {
    if (key) preparedKey = key
  })
}

const publicKeyOf = async (): Promise<string | null> => {
  const response = await request('/users/push-key', { method: 'GET' })
  if (!response?.ok) return null
  const body = (await response.json()) as PushKey
  return typeof body.publicKey === 'string' && body.publicKey.length > 0 ? body.publicKey : null
}

const storeSubscription = async (subscription: PushSubscription): Promise<boolean> => {
  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return false
  const response = await request('/users/push', {
    method: 'PUT',
    body: JSON.stringify({
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    }),
  })
  return response?.ok === true
}

export type PushResult = { ok: true } | { ok: false; message: string }

const keyBuffer = (value: string): ArrayBuffer => {
  const bytes = keyBytes(value)
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

const messageOf = (error: unknown): string => {
  if (error instanceof Error && error.message === 'timeout') {
    return 'Está tardando. Cierra Frizeplay, ábrelo desde el icono y pulsa otra vez.'
  }
  const name = error instanceof Error ? error.name : ''
  if (name === 'NotAllowedError') return 'Pulsa otra vez para guardar este móvil.'
  if (name === 'InvalidStateError') return 'Cierra Frizeplay, ábrelo otra vez y pulsa el botón.'
  return 'No se ha podido activar. Pulsa otra vez.'
}

const subscribeAndStore = async (): Promise<PushResult> => {
  const registration = activeRegistration?.active ? activeRegistration : await registrationOf()
  const publicKey = preparedKey ?? await publicKeyOf()
  if (publicKey) preparedKey = publicKey
  if (!publicKey) return { ok: false, message: 'El servidor no ha podido preparar los avisos.' }
  const current = await registration.pushManager.getSubscription()
  if (current && await storeSubscription(current)) return { ok: true }
  if (current) await current.unsubscribe()
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyBuffer(publicKey),
  })
  if (!await storeSubscription(subscription)) return { ok: false, message: 'El móvil no se ha guardado. Pulsa otra vez.' }
  return { ok: true }
}

export const refreshPush = async (): Promise<boolean> => {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false
  if (pushSetup() !== 'ask') return false
  try {
    const result = await subscribeAndStore()
    return result.ok
  } catch {
    return false
  }
}

export const enablePush = async (): Promise<PushResult> => {
  if (!('Notification' in window)) return { ok: false, message: 'Este navegador no puede recibir avisos.' }
  if (pushSetup() === 'ios') return { ok: false, message: 'En el iPhone, abre Frizeplay desde el icono de la pantalla de inicio.' }
  if (pushSetup() === 'blocked' || Notification.permission === 'denied') {
    return { ok: false, message: 'Los avisos están bloqueados en el navegador.' }
  }
  if (Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return { ok: false, message: 'Hay que permitir los avisos para recibirlos.' }
  }
  try {
    return await subscribeAndStore()
  } catch (error) {
    return { ok: false, message: messageOf(error) }
  }
}

export const dropPush = async (): Promise<void> => {
  try {
    if (!('serviceWorker' in navigator)) return
    const registration = await navigator.serviceWorker.getRegistration()
    const subscription = await registration?.pushManager.getSubscription()
    if (!subscription) return
    await request('/users/push', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    })
  } catch {
    // Si el aviso no se puede quitar, la sesión se cierra igual.
  }
}
