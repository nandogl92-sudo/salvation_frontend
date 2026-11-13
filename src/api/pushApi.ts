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

export const pushSetup = (): 'ios' | 'ask' | 'blocked' | null => {
  if (typeof window === 'undefined') return null
  if (iosBrowser() && !installedApp()) return 'ios'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return null
  if (Notification.permission === 'denied') return 'blocked'
  if (Notification.permission === 'granted') return null
  return 'ask'
}

const registrationOf = async (): Promise<ServiceWorkerRegistration> => {
  await navigator.serviceWorker.register('/sw.js')
  return navigator.serviceWorker.ready
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

export const refreshPush = async (): Promise<boolean> => {
  if (pushSetup() !== null || Notification.permission !== 'granted') return false
  const registration = await registrationOf()
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    const publicKey = await publicKeyOf()
    if (!publicKey) return false
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(publicKey) as BufferSource,
    })
  }
  return storeSubscription(subscription)
}

export const enablePush = async (): Promise<boolean> => {
  if (pushSetup() === 'ios' || !('Notification' in window)) return false
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false
  const registration = await registrationOf()
  const current = await registration.pushManager.getSubscription()
  if (current) await current.unsubscribe()
  const publicKey = await publicKeyOf()
  if (!publicKey) return false
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyBytes(publicKey) as BufferSource,
  })
  return storeSubscription(subscription)
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
