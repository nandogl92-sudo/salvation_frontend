// ==========================================
// Configuración de la API.
//
// Los adaptadores en src/api/ importarán API_URL cuando hagan llamadas
// reales al backend. Hoy no se usa (todo es mock), pero el punto de
// entrada ya está definido.
//
// Para desarrollo local: añadir VITE_API_URL=http://localhost:4000 en .env
// Para producción:       configurar VITE_API_URL en el servicio de hosting
// ==========================================

export const API_URL: string = import.meta.env['VITE_API_URL'] ?? '';
