/** Carga la página principal desde cero para soltar la partida anterior. */
export const reloadHome = () => {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
  window.scrollTo(0, 0)
  const atRoot = window.location.pathname === '/' && window.location.search === '' && window.location.hash === ''
  if (atRoot) {
    window.location.reload()
    return
  }
  window.location.assign('/')
}
