/**
 * Ecosistema Digital Claveriano - Controlador Principal (JS)
 * I.E.P. Teniente Manuel Clavero Muga - Punchana, Iquitos
 * Gestiona el Mural de Anuncios y Actividades dinámicas mediante localStorage.
 * 
 * @version 2.0
 * @author Área de Innovación Pedagógica
 */

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    PIN_ACCESO: 'clavero2026',
    LOCAL_STORAGE_KEY: 'clavero_mural_posts',
    SESSION_AUTH_KEY: 'clavero_admin_logged_in',
    NOTIFICATION_DURATION: 4000,
    MAX_RECENT_POSTS: 3,
    DEFAULT_IMAGE: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=600'
};

// ==================== DATOS POR DEFECTO ====================
const SAMPLE_POSTS = [
    {
        id: 'sample-1',
        title: 'Modernización integral de las aulas y soporte del Aula de Innovación (AIP)',
        content: 'Gracias al convenio estratégico con Fundación Telefónica y la gestión directiva, se han repotenciado 35 estaciones de modelado digital y una pantalla Smart TV de 55" en las secciones piloto. Esto permitirá asegurar el cumplimiento de las competencias transversales 28 y 29 de nuestro currículo escolar, brindando a los jóvenes claverianos internet de fibra óptica y recursos educativos interactivos de vanguardia.',
        type: 'comunicado',
        category: 'Innovación',
        author: 'Director',
        authorName: 'Prof. Luis Nilo Zambrano Peña',
        mediaUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600',
        date: '2026-05-20',
        pinned: true
    },
    {
        id: 'sample-2',
        title: 'Inmersión Práctica con Wayground para Estudiantes',
        content: 'Los docentes del AIP culminaron la clase grabada sobre la plataforma de gamificación Wayground. Esta herramienta interactiva permite a los alumnos de secundaria fortalecer sus competencias de resolución de problemas lógicos mediante el uso de inteligencia artificial en entornos simulados de aprendizaje.',
        type: 'video',
        category: 'Innovación',
        author: 'Docente AIP',
        authorName: 'Coordinación Pedagógica TIC',
        mediaUrl: 'https://www.youtube.com/embed/fi3OJnt0kjo',
        date: '2026-05-18',
        pinned: false
    },
    {
        id: 'sample-3',
        title: 'Brillante participación en los Juegos Florales Escolares (Fase Interna)',
        content: 'Nuestros estudiantes claverianos destacaron con hermosas composiciones poéticas y ensayos literarios enfocados en la preservación de la biodiversidad de la cuenca amazónica. Felicitaciones a todos los participantes por su pundonor, talento y amor por la cultura regional. ¡Camino a la fase regional de Loreto!',
        type: 'foto',
        category: 'Cultura y Deporte',
        author: 'Subdirector',
        authorName: 'Prof. de Ciencias Sociales',
        mediaUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=600',
        date: '2026-05-15',
        pinned: false
    },
    {
        id: 'sample-4',
        title: 'Taller de Wordwall: Aprendiendo Jugando en Clases Virtuales',
        content: 'Se comparte el videotutorial grabado por la plana docente de innovación pedagógica sobre la creación y uso de plantillas gamificadas en Wordwall. Este recurso ya se encuentra integrado en nuestras aulas virtuales y permite a los alumnos retroalimentar sus aprendizajes mediante retos lúdicos semanales.',
        type: 'video',
        category: 'Académico',
        author: 'Docente AIP',
        authorName: 'Coordinación Pedagógica TIC',
        mediaUrl: 'https://www.youtube.com/embed/u_Ll0nfZnno',
        date: '2026-05-10',
        pinned: false
    },
    {
        id: 'sample-5',
        title: 'Primera Sesión Extraordinaria de Escuela para Padres del 2026',
        content: 'Con una asistencia masiva de padres de familia de primero a quinto de secundaria, se llevó a cabo el debate sobre la ciudadanía digital y las pautas para el acompañamiento tecnológico en el hogar. La comunidad claveriana reafirma su compromiso de trabajar de la mano en el binomio escuela-familia.',
        type: 'comunicado',
        category: 'Comunidad',
        author: 'Director',
        authorName: 'Prof. Luis Nilo Zambrano Peña',
        mediaUrl: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=600',
        date: '2026-05-08',
        pinned: false
    }
];

// ==================== MAPEOS Y CONSTANTES ====================
const CATEGORY_COLORS = {
    'Institucional': 'text-blue-700 bg-blue-50 border-blue-200',
    'Académico': 'text-green-700 bg-green-50 border-green-200',
    'Innovación': 'text-indigo-700 bg-indigo-50 border-indigo-200',
    'Cultura y Deporte': 'text-purple-700 bg-purple-50 border-purple-200',
    'Comunidad': 'text-amber-700 bg-amber-50 border-amber-200'
};

const AUTHOR_NAMES = {
    'Director': 'Prof. Luis Nilo Zambrano Peña',
    'Subdirector': 'Plana Directiva Institucional',
    'Docente AIP': 'Área de Innovación Pedagógica (AIP)',
    'Coordinador': 'Coordinación Académica',
    'Estudiante': 'Consejo Estudiantil Claveriano'
};

// ==================== CONFIGURACIÓN DE BASE DE DATOS (SERVIDOR API) ====================

const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000' : '';

// Cachés globales en memoria
window.postsCache = [];
window.mediaCache = [];

// Estado de carga inicial
let isDatabaseLoaded = false;

/**
 * Obtiene cabeceras HTTP que incluyen el token de autenticación JWT si existe
 * @returns {Object} Cabeceras de la petición
 */
function getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = sessionStorage.getItem('clavero_jwt');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

/**
 * Carga los datos del servidor API e inicializa las vistas de forma segura
 */
async function loadDatabaseFromServer() {
    try {
        console.log('Cargando datos desde el servidor en:', API_BASE || 'mismo origen');
        
        const postsRes = await fetch(`${API_BASE}/api/posts`);
        if (postsRes.ok) {
            window.postsCache = await postsRes.json();
        } else {
            console.warn('No se pudo leer posts del servidor, usando temporales');
            window.postsCache = [...SAMPLE_POSTS];
        }
        
        const mediaRes = await fetch(`${API_BASE}/api/media`);
        if (mediaRes.ok) {
            window.mediaCache = await mediaRes.json();
        } else {
            console.warn('No se pudo leer medios del servidor');
            window.mediaCache = [];
        }
        
        isDatabaseLoaded = true;
        
        // Ejecutar renders de forma segura cuando el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', triggerInitialRenders);
        } else {
            triggerInitialRenders();
        }
    } catch (error) {
        console.error('Error al conectar con la base de datos:', error);
        window.postsCache = [...SAMPLE_POSTS];
        isDatabaseLoaded = true;
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', triggerInitialRenders);
        } else {
            triggerInitialRenders();
        }
    }
}

function triggerInitialRenders() {
    if (typeof renderLatestIndexNews === 'function') renderLatestIndexNews();
    if (typeof renderMural === 'function') {
        const activeTypeBtn = document.querySelector('.btn-filtro-tipo.active');
        const filterType = activeTypeBtn?.dataset.type || 'all';
        const filterCategory = document.getElementById('filtro-categoria')?.value || 'all';
        const searchQuery = document.getElementById('busqueda-mural')?.value || '';
        renderMural(filterType, filterCategory, searchQuery);
    }
    if (typeof window.inicializarDashboard === 'function') {
        const isLoggedIn = sessionStorage.getItem('clavero_admin_portal_logged_in') === 'true';
        if (isLoggedIn) {
            window.inicializarDashboard();
        }
    }
}

// Iniciar la carga inmediatamente
loadDatabaseFromServer();

/**
 * Obtiene todas las publicaciones de la caché sincronizada
 * @returns {Array} Lista de publicaciones
 */
function getPosts() {
    return window.postsCache && window.postsCache.length > 0 ? window.postsCache : SAMPLE_POSTS;
}

/**
 * Guarda las publicaciones (mantiene compatibilidad, actualiza la caché local)
 * @param {Array} posts - Lista de publicaciones
 */
function savePosts(posts) {
    window.postsCache = posts;
}

/**
 * Agrega una nueva publicación al servidor y actualiza la caché
 * @param {Object} post - Publicación a agregar
 */
async function addPost(post) {
    try {
        const response = await fetch(`${API_BASE}/api/posts`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(post)
        });
        if (response.ok) {
            const savedPost = await response.json();
            window.postsCache.unshift(savedPost);
            
            // Re-renderizar interfaces locales
            triggerInitialRenders();
            
            // Si estamos en el portal de administración, actualizar estadísticas y tablas
            if (typeof window.cargarEstadisticas === 'function') window.cargarEstadisticas();
            if (typeof window.renderTablePosts === 'function') window.renderTablePosts();
            if (typeof window.renderTableMedia === 'function') window.renderTableMedia();
            
            return savedPost;
        } else {
            const errData = await response.json();
            throw new Error(errData.error || 'Error al guardar en el servidor');
        }
    } catch (error) {
        console.error('Error al agregar publicación en el servidor:', error);
        mostrarNotificacion(`No autorizado o error: ${error.message}`, 'danger');
        window.postsCache.unshift(post);
        triggerInitialRenders();
    }
}

/**
 * Elimina una publicación por ID del servidor y actualiza la caché
 * @param {string} id - ID de la publicación
 */
async function deletePost(id) {
    try {
        const response = await fetch(`${API_BASE}/api/posts/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (response.ok) {
            window.postsCache = window.postsCache.filter(post => post.id !== id);
            window.mediaCache = window.mediaCache.filter(item => item.postId !== id);
            
            triggerInitialRenders();
            
            if (typeof window.cargarEstadisticas === 'function') window.cargarEstadisticas();
            if (typeof window.renderTablePosts === 'function') window.renderTablePosts();
            if (typeof window.renderTableMedia === 'function') window.renderTableMedia();
        } else {
            const errData = await response.json();
            throw new Error(errData.error || 'Error al borrar en el servidor');
        }
    } catch (error) {
        console.error('Error al eliminar publicación en el servidor:', error);
        mostrarNotificacion(`No autorizado o error: ${error.message}`, 'danger');
        window.postsCache = window.postsCache.filter(post => post.id !== id);
        triggerInitialRenders();
    }
}

/**
 * Actualiza una publicación existente en el servidor y la caché
 * @param {string} id - ID de la publicación
 * @param {Object} updatedData - Datos actualizados
 * @returns {boolean} - True si se actualizó correctamente
 */
async function updatePost(id, updatedData) {
    try {
        const response = await fetch(`${API_BASE}/api/posts/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(updatedData)
        });
        if (response.ok) {
            const result = await response.json();
            const index = window.postsCache.findIndex(post => post.id === id);
            if (index !== -1) {
                window.postsCache[index] = result;
            }
            
            triggerInitialRenders();
            
            if (typeof window.cargarEstadisticas === 'function') window.cargarEstadisticas();
            if (typeof window.renderTablePosts === 'function') window.renderTablePosts();
            if (typeof window.renderTableMedia === 'function') window.renderTableMedia();
            return true;
        } else {
            const errData = await response.json();
            mostrarNotificacion(`No autorizado o error: ${errData.error}`, 'danger');
            return false;
        }
    } catch (error) {
        console.error('Error al actualizar publicación en el servidor:', error);
        mostrarNotificacion('Error al actualizar la publicación', 'danger');
        return false;
    }
}

/**
 * Obtiene el historial de medios de la caché sincronizada
 * @returns {Array} Lista de items multimedia del historial
 */
function getMediaHistory() {
    return window.mediaCache || [];
}

/**
 * Guarda el historial de medios (actualiza caché local)
 * @param {Array} history - Lista de items de medios
 */
function saveMediaHistory(history) {
    window.mediaCache = history;
}

/**
 * Agrega un nuevo elemento al historial de medios en el servidor
 * @param {Object} mediaItem - Item multimedia a registrar
 */
async function addMediaToHistory(mediaItem) {
    try {
        const response = await fetch(`${API_BASE}/api/media`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(mediaItem)
        });
        if (response.ok) {
            const savedItem = await response.json();
            window.mediaCache.unshift(savedItem);
            
            if (typeof window.cargarEstadisticas === 'function') window.cargarEstadisticas();
            if (typeof window.renderTableMedia === 'function') window.renderTableMedia();
        } else {
            const errData = await response.json();
            console.error('Error al registrar medio:', errData.error);
        }
    } catch (error) {
        console.error('Error al registrar medio en el servidor:', error);
    }
}

/**
 * Elimina un elemento del historial de medios por ID en el servidor
 * @param {string} id - ID del item del historial
 */
async function deleteMediaFromHistory(id) {
    try {
        const response = await fetch(`${API_BASE}/api/media/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (response.ok) {
            window.mediaCache = window.mediaCache.filter(item => item.id !== id);
            
            if (typeof window.cargarEstadisticas === 'function') window.cargarEstadisticas();
            if (typeof window.renderTableMedia === 'function') window.renderTableMedia();
        } else {
            const errData = await response.json();
            console.error('Error al borrar medio:', errData.error);
        }
    } catch (error) {
        console.error('Error al borrar medio en el servidor:', error);
    }
}

/**
 * Actualiza un elemento de medio en el servidor y la caché
 * @param {string} id - ID del medio
 * @param {Object} updatedData - Datos a actualizar
 */
async function updateMediaHistory(id, updatedData) {
    try {
        const response = await fetch(`${API_BASE}/api/media/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(updatedData)
        });
        if (response.ok) {
            const result = await response.json();
            const index = window.mediaCache.findIndex(item => item.id === id);
            if (index !== -1) {
                window.mediaCache[index] = result;
            }
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error al actualizar historial de medios:', error);
        return false;
    }
}

// Exponer funciones globales para la administración en admin.html
window.getMediaHistory = getMediaHistory;
window.saveMediaHistory = saveMediaHistory;
window.addMediaToHistory = addMediaToHistory;
window.deleteMediaFromHistory = deleteMediaFromHistory;
window.updateMediaHistory = updateMediaHistory;
window.getPosts = getPosts;
window.savePosts = savePosts;
window.addPost = addPost;
window.deletePost = deletePost;
window.updatePost = updatePost;
window.isAdminLoggedIn = isAdminLoggedIn;
window.loginAdmin = loginAdmin;
window.logoutAdmin = logoutAdmin;

// ==================== UTILERÍAS ====================

/**
 * Escapa caracteres HTML para prevenir XSS
 * @param {string} str - Texto a escapar
 * @returns {string} Texto escapado
 */
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Trunca un texto a una longitud máxima
 * @param {string} text - Texto a truncar
 * @param {number} maxLength - Longitud máxima
 * @returns {string} Texto truncado
 */
function truncateText(text, maxLength = 120) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}

/**
 * Convierte URL de YouTube a formato embed
 * @param {string} url - URL de YouTube
 * @returns {string} URL embed
 */
function getYouTubeEmbedUrl(url) {
    if (!url || typeof url !== 'string') return '';
    
    const cleanUrl = url.trim();
    
    if (cleanUrl.includes('youtube.com/embed/')) {
        return cleanUrl;
    }
    
    let videoId = '';
    
    try {
        if (cleanUrl.includes('youtube.com/watch')) {
            const urlParams = new URLSearchParams(new URL(cleanUrl).search);
            videoId = urlParams.get('v');
        } else if (cleanUrl.includes('youtu.be/')) {
            videoId = cleanUrl.split('youtu.be/')[1]?.split('?')[0];
        } else if (cleanUrl.includes('youtube.com/shorts/')) {
            videoId = cleanUrl.split('shorts/')[1]?.split('?')[0];
        }
    } catch (e) {
        const match = cleanUrl.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})(?:[?&]|$)/);
        if (match) videoId = match[1];
    }
    
    return videoId ? `https://www.youtube.com/embed/${videoId}` : cleanUrl;
}

/**
 * Obtiene la miniatura de un video de YouTube
 * @param {string} embedUrl - URL embed de YouTube
 * @returns {string} URL de la miniatura
 */
function getYouTubeThumbnail(embedUrl) {
    if (!embedUrl) return CONFIG.DEFAULT_IMAGE;
    const match = embedUrl.match(/embed\/([^?]+)/);
    if (match && match[1]) {
        return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
    }
    return CONFIG.DEFAULT_IMAGE;
}

/**
 * Formatea una fecha a formato legible en español
 * @param {string} dateString - Fecha en formato YYYY-MM-DD
 * @returns {string} Fecha formateada
 */
function formatReadableDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    } catch (error) {
        console.error('Error al formatear fecha:', error);
        return dateString;
    }
}

/**
 * Valida que una URL sea segura
 * @param {string} url - URL a validar
 * @returns {boolean} - True si la URL es segura
 */
function isValidUrl(url) {
    if (!url) return false;
    const cleanUrl = url.trim().toLowerCase();
    if (cleanUrl.startsWith('javascript:')) return false;
    return true;
}

// ==================== ADMINISTRACIÓN Y CONTROL DE ROLES ====================

/**
 * Verifica si el administrador está logueado
 * @returns {boolean}
 */
function isAdminLoggedIn() {
    return sessionStorage.getItem(CONFIG.SESSION_AUTH_KEY) === 'true';
}

/**
 * Inicia sesión del administrador
 * @param {string} pin - PIN de acceso
 * @returns {boolean}
 */
function loginAdmin(pin) {
    if (pin === CONFIG.PIN_ACCESO) {
        sessionStorage.setItem(CONFIG.SESSION_AUTH_KEY, 'true');
        return true;
    }
    return false;
}

/**
 * Cierra sesión del administrador
 */
function logoutAdmin() {
    sessionStorage.removeItem(CONFIG.SESSION_AUTH_KEY);
    sessionStorage.removeItem('clavero_admin_name');
    sessionStorage.removeItem('clavero_admin_role');
    sessionStorage.removeItem('clavero_jwt');
}

// ==================== NOTIFICACIONES ====================

/**
 * Muestra una notificación flotante
 * @param {string} mensaje - Mensaje a mostrar
 * @param {string} tipo - Tipo: 'success', 'info', 'danger'
 */
function mostrarNotificacion(mensaje, tipo = 'success') {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'fixed bottom-5 right-5 z-[100] flex flex-col gap-3 pointer-events-none';
        document.body.appendChild(container);
    }

    const colorMap = {
        success: 'bg-green-700 border-green-600 text-white',
        info: 'bg-[#0B2545] border-blue-900 text-white',
        danger: 'bg-red-700 border-red-600 text-white'
    };
    
    const colorBg = colorMap[tipo] || colorMap.info;
    
    const card = document.createElement('div');
    card.className = `p-4 rounded-2xl border shadow-2xl ${colorBg} flex items-center gap-2 transition-all duration-300 pointer-events-auto transform translate-y-10 opacity-0 min-w-[250px]`;
    card.innerHTML = `
        <span class="text-sm font-semibold">${escapeHtml(mensaje)}</span>
        <button class="ml-2 text-white/70 hover:text-white transition text-lg leading-none">&times;</button>
    `;
    
    const closeBtn = card.querySelector('button');
    closeBtn.addEventListener('click', () => {
        card.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => card.remove(), 300);
    });

    container.appendChild(card);

    setTimeout(() => {
        card.classList.remove('translate-y-10', 'opacity-0');
    }, 10);

    setTimeout(() => {
        if (card.parentNode) {
            card.classList.add('translate-y-10', 'opacity-0');
            setTimeout(() => {
                if (card.parentNode) card.remove();
            }, 300);
        }
    }, CONFIG.NOTIFICATION_DURATION);
}

// ==================== RENDERIZADORES DE VISTAS ====================

/**
 * Renderiza las últimas publicaciones en el index
 */
function renderLatestIndexNews() {
    const container = document.getElementById('contenedor-noticias-dinamicas');
    if (!container) return;

    try {
        const posts = getPosts();
        
        // Filter out any invalid/empty post objects to prevent errors
        const validPosts = posts.filter(p => p && typeof p === 'object' && p.title);
        
        const sortedPosts = [...validPosts].sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.date) - new Date(a.date);
        });
        
        const latestPosts = sortedPosts.slice(0, CONFIG.MAX_RECENT_POSTS);
        
        if (latestPosts.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12 text-gray-500 bg-white rounded-3xl border border-gray-100 shadow-sm">
                    <p>No hay anuncios publicados en el mural en este momento.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = latestPosts.map(post => renderIndexPostCard(post)).join('');
    } catch (err) {
        console.error("Error al renderizar las noticias dinámicas:", err);
    }
}

/**
 * Renderiza una tarjeta de publicación para el index
 * @param {Object} post - Publicación
 * @returns {string} HTML de la tarjeta
 */
function renderIndexPostCard(post) {
    const typeBadgeColor = post.type === 'comunicado' ? 'bg-green-600' : 
                          (post.type === 'foto' ? 'bg-[#0B2545]' : 'bg-amber-500');
    const typeLabel = post.type === 'comunicado' ? 'Comunicado' : 
                     (post.type === 'foto' ? 'Actividad' : 'Video');
    
    let imageHtml = '';
    let thumbnailUrl = post.mediaUrl || CONFIG.DEFAULT_IMAGE;
    
    if (post.type === 'video' && post.mediaUrl) {
        thumbnailUrl = getYouTubeThumbnail(post.mediaUrl);
        imageHtml = `
            <div class="w-full h-full cursor-pointer" onclick="verDetalleNoticia('${post.id}')">
                <img src="${thumbnailUrl}" alt="${escapeHtml(post.title)}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy">
                <div class="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div class="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white text-xl shadow-lg">▶</div>
                </div>
            </div>
        `;
    } else {
        imageHtml = `<img src="${thumbnailUrl}" alt="${escapeHtml(post.title)}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500 cursor-pointer" loading="lazy" onclick="verDetalleNoticia('${post.id}')">`;
    }
    
    return `
        <article class="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition duration-300 flex flex-col h-full group">
            <div class="h-48 bg-gray-200 relative overflow-hidden">
                ${imageHtml}
                <span class="absolute top-4 left-4 text-[10px] font-bold uppercase tracking-wider text-white px-3 py-1 rounded-full shadow-md ${typeBadgeColor}">
                    ${typeLabel}
                </span>
                ${post.pinned ? `
                    <span class="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                        📌 Fijado
                    </span>
                ` : ''}
            </div>
            <div class="p-6 flex flex-col flex-grow justify-between space-y-4">
                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <time class="text-[11px] text-gray-400 font-medium">${formatReadableDate(post.date)}</time>
                        <span class="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-md uppercase">${escapeHtml(post.category)}</span>
                    </div>
                    <h3 class="font-title text-lg font-bold text-[#0B2545] leading-snug hover:text-green-700 transition cursor-pointer" onclick="verDetalleNoticia('${post.id}')">
                        ${escapeHtml(post.title)}
                    </h3>
                    <p class="text-gray-600 text-xs sm:text-sm font-light leading-relaxed line-clamp-3">${escapeHtml(truncateText(post.content, 100))}</p>
                </div>
                <div class="border-t pt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>👤 ${escapeHtml(post.authorName)}</span>
                    <button onclick="verDetalleNoticia('${post.id}')" class="text-green-700 hover:text-green-800 font-semibold transition">Leer más &rarr;</button>
                </div>
            </div>
        </article>
    `;
}

/**
 * Renderiza el mural completo con filtros
 * @param {string} filterType - Filtro por tipo
 * @param {string} filterCategory - Filtro por categoría
 * @param {string} searchQuery - Búsqueda por texto
 */
function renderMural(filterType = 'all', filterCategory = 'all', searchQuery = '') {
    const container = document.getElementById('contenedor-mural');
    if (!container) return;
    
    const posts = getPosts();
    const isAdmin = isAdminLoggedIn();
    
    let filteredPosts = [...posts].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.date) - new Date(a.date);
    });
    
    if (filterType !== 'all') {
        filteredPosts = filteredPosts.filter(post => post.type === filterType);
    }
    if (filterCategory !== 'all') {
        filteredPosts = filteredPosts.filter(post => post.category === filterCategory);
    }
    if (searchQuery && searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        filteredPosts = filteredPosts.filter(post => 
            post.title.toLowerCase().includes(query) || 
            post.content.toLowerCase().includes(query) ||
            post.authorName.toLowerCase().includes(query)
        );
    }
    
    if (filteredPosts.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-16 text-gray-500 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <p class="text-lg font-medium">No se encontraron publicaciones en el mural.</p>
                <p class="text-sm text-gray-400 mt-1">Prueba cambiando los filtros o realizando otra búsqueda.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredPosts.map(post => renderMuralPostCard(post, isAdmin)).join('');
}

/**
 * Renderiza una tarjeta de publicación para el mural
 * @param {Object} post - Publicación
 * @param {boolean} isAdmin - Si el usuario es administrador
 * @returns {string} HTML de la tarjeta
 */
function renderMuralPostCard(post, isAdmin) {
    const badgeColor = CATEGORY_COLORS[post.category] || 'text-gray-700 bg-gray-50 border-gray-200';
    
    let mediaHtml = '';
    if ((post.type === 'foto' || post.type === 'comunicado') && post.mediaUrl && isValidUrl(post.mediaUrl)) {
        mediaHtml = `
            <div class="w-full overflow-hidden aspect-video border-b border-gray-100 relative group">
                <img src="${post.mediaUrl}" alt="${escapeHtml(post.title)}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy">
            </div>
        `;
    } else if (post.type === 'video' && post.mediaUrl) {
        const embedUrl = getYouTubeEmbedUrl(post.mediaUrl);
        mediaHtml = `
            <div class="w-full aspect-video border-b border-gray-100 relative bg-black">
                <iframe 
                    class="w-full h-full"
                    src="${embedUrl}" 
                    title="${escapeHtml(post.title)}" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen
                    loading="lazy">
                </iframe>
            </div>
        `;
    }
    
    return `
        <div class="bg-white rounded-3xl shadow-md border border-gray-100 overflow-hidden flex flex-col justify-between hover:shadow-xl transition duration-300 relative group/card">
            ${post.pinned ? `
                <div class="absolute top-3 right-3 z-10 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                    📌 Fijado
                </div>
            ` : ''}
            
            <div>
                ${mediaHtml}
                <div class="p-6 space-y-4">
                    <div class="flex flex-wrap gap-2 items-center justify-between">
                        <span class="text-xs font-semibold px-3 py-1 rounded-full border ${badgeColor}">${escapeHtml(post.category)}</span>
                        <span class="text-xs text-gray-400 font-medium">${formatReadableDate(post.date)}</span>
                    </div>
                    <h3 class="font-title text-xl font-bold text-[#0B2545] leading-snug">${escapeHtml(post.title)}</h3>
                    <p class="text-gray-600 text-sm font-light leading-relaxed whitespace-pre-line">${escapeHtml(post.content)}</p>
                </div>
            </div>
            
            <div class="p-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 mt-auto">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold">
                        ${escapeHtml(post.author.charAt(0))}
                    </div>
                    <div>
                        <p class="font-semibold text-gray-700">${escapeHtml(post.authorName)}</p>
                        <p class="text-[10px] uppercase text-gray-400">${escapeHtml(post.author)}</p>
                    </div>
                </div>
                ${isAdmin ? `
                    <button onclick="eliminarPublicacionMural('${post.id}')" class="text-red-500 hover:text-white hover:bg-red-600 border border-red-500/20 hover:border-red-600 bg-red-50 px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1">
                        🗑️ Eliminar
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

// ==================== ACCIONES GLOBALES ====================

/**
 * Elimina una publicación desde la interfaz
 * @param {string} id - ID de la publicación
 */
window.eliminarPublicacionMural = function(id) {
    if (confirm('¿Estás seguro de que deseas eliminar esta publicación del mural permanentemente?')) {
        deletePost(id);
        
        const activeTypeBtn = document.querySelector('.btn-filtro-tipo.active');
        const filterType = activeTypeBtn?.dataset.type || 'all';
        const filterCategory = document.getElementById('filtro-categoria')?.value || 'all';
        const searchQuery = document.getElementById('busqueda-mural')?.value || '';
        
        renderMural(filterType, filterCategory, searchQuery);
        renderLatestIndexNews();
        mostrarNotificacion('Publicación eliminada correctamente 🗑️', 'info');
    }
};

// ==================== INICIALIZACIÓN DE PÁGINAS ====================

/**
 * Inicializa la página del mural
 */
function inicializarMuralPage() {
    const searchInput = document.getElementById('busqueda-mural');
    const catFilter = document.getElementById('filtro-categoria');
    const typeButtons = document.querySelectorAll('.btn-filtro-tipo');
    
    renderMural();
    actualizarVistaAdminMural();
    
    typeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            typeButtons.forEach(b => {
                b.classList.remove('active', 'bg-[#139A43]', 'text-white');
                b.classList.add('bg-white', 'text-[#0B2545]');
            });
            
            btn.classList.remove('bg-white', 'text-[#0B2545]');
            btn.classList.add('active', 'bg-[#139A43]', 'text-white');
            const filterType = btn.dataset.type;
            renderMural(filterType, catFilter?.value || 'all', searchInput?.value || '');
        });
    });
    
    if (catFilter) {
        catFilter.addEventListener('change', () => {
            const activeBtn = document.querySelector('.btn-filtro-tipo.active');
            const filterType = activeBtn?.dataset.type || 'all';
            renderMural(filterType, catFilter.value, searchInput?.value || '');
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const activeBtn = document.querySelector('.btn-filtro-tipo.active');
            const filterType = activeBtn?.dataset.type || 'all';
            renderMural(filterType, catFilter?.value || 'all', searchInput.value);
        });
    }
    
    inicializarModalPublicacion();
    inicializarModalLogin();
}

/**
 * Función para comprimir imágenes
 * @param {File} file - Archivo de imagen
 * @param {number} maxWidth - Ancho máximo
 * @param {number} maxHeight - Alto máximo
 * @returns {Promise<string>} URL base64 de la imagen comprimida
 */
function compressImage(file, maxWidth = 800, maxHeight = 600) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = () => resolve(event.target.result);
        };
        reader.onerror = () => resolve('');
    });
}

/**
 * Inicializa el modal de publicación
 */
function inicializarModalPublicacion() {
    const btnPublicar = document.getElementById('btn-abrir-publicar');
    const modalPublicar = document.getElementById('modal-publicar');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal');
    const btnLogout = document.getElementById('btn-admin-logout');
    const formPublicar = document.getElementById('form-publicar');
    const selectTipo = document.getElementById('post-tipo');
    const containerMediaInput = document.getElementById('container-media-input');
    const containerVideoInput = document.getElementById('container-video-input');
    const imgInputLocal = document.getElementById('post-img-local');
    const imgInputUrl = document.getElementById('post-img-url');
    const imgPreview = document.getElementById('post-img-preview');
    
    let base64ImageString = '';
    
    const abrirModal = () => {
        if (formPublicar) formPublicar.reset();
        base64ImageString = '';
        if (imgPreview) {
            imgPreview.src = '';
            imgPreview.classList.add('hidden');
        }
        if (containerMediaInput) containerMediaInput.classList.remove('hidden');
        if (containerVideoInput) containerVideoInput.classList.add('hidden');
        if (modalPublicar) {
            modalPublicar.classList.remove('hidden');
            modalPublicar.classList.add('flex');
        }
    };
    
    if (btnPublicar) {
        btnPublicar.addEventListener('click', () => {
            if (isAdminLoggedIn()) {
                abrirModal();
            } else {
                const modalLogin = document.getElementById('modal-login');
                if (modalLogin) {
                    modalLogin.classList.remove('hidden');
                    modalLogin.classList.add('flex');
                }
            }
        });
    }
    
    if (btnCerrarModal && modalPublicar) {
        btnCerrarModal.addEventListener('click', () => {
            modalPublicar.classList.add('hidden');
            modalPublicar.classList.remove('flex');
        });
        
        modalPublicar.addEventListener('click', (e) => {
            if (e.target === modalPublicar) {
                modalPublicar.classList.add('hidden');
                modalPublicar.classList.remove('flex');
            }
        });
    }
    
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            logoutAdmin();
            actualizarVistaAdminMural();
            mostrarNotificacion('Sesión de administrador cerrada 🔒', 'info');
        });
    }
    
    if (selectTipo) {
        selectTipo.addEventListener('change', (e) => {
            const tipo = e.target.value;
            if (containerMediaInput) containerMediaInput.classList.add('hidden');
            if (containerVideoInput) containerVideoInput.classList.add('hidden');
            
            if (tipo === 'foto' && containerMediaInput) {
                containerMediaInput.classList.remove('hidden');
            } else if (tipo === 'video' && containerVideoInput) {
                containerVideoInput.classList.remove('hidden');
            }
        });
    }
    
    if (imgInputLocal) {
        imgInputLocal.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                try {
                    base64ImageString = await compressImage(file);
                    if (imgPreview) {
                        imgPreview.src = base64ImageString;
                        imgPreview.classList.remove('hidden');
                    }
                    if (imgInputUrl) imgInputUrl.value = '';
                } catch (err) {
                    console.error('Error al comprimir la imagen:', err);
                    mostrarNotificacion('Error al procesar la imagen ❌', 'danger');
                }
            }
        });
    }
    
    if (formPublicar) {
        formPublicar.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const title = document.getElementById('post-titulo')?.value.trim();
            const content = document.getElementById('post-contenido')?.value.trim();
            const type = document.getElementById('post-tipo')?.value;
            const category = document.getElementById('post-categoria')?.value;
            const authorRole = document.getElementById('post-autor')?.value;
            const pinned = document.getElementById('post-fijado')?.checked || false;
            
            if (!title || !content || !type || !category || !authorRole) {
                mostrarNotificacion('Por favor, completa todos los campos obligatorios', 'danger');
                return;
            }
            
            if (title.length > 100) {
                mostrarNotificacion('El título no debe exceder los 100 caracteres', 'danger');
                return;
            }
            
            let authorName = AUTHOR_NAMES[authorRole] || 'Docente Claveriano';
            const loggedName = sessionStorage.getItem('clavero_admin_name');
            const loggedRole = sessionStorage.getItem('clavero_admin_role');
            
            if (loggedName && loggedRole === authorRole) {
                authorName = loggedName;
            }
            
            let mediaUrl = '';
            if (type === 'foto') {
                mediaUrl = base64ImageString || document.getElementById('post-img-url')?.value || CONFIG.DEFAULT_IMAGE;
            } else if (type === 'video') {
                const youtubeLink = document.getElementById('post-video-url')?.value;
                if (youtubeLink) {
                    mediaUrl = getYouTubeEmbedUrl(youtubeLink);
                }
            }
            
            const today = new Date().toISOString().split('T')[0];
            
            const newPost = {
                id: 'post-' + Date.now(),
                title,
                content,
                type,
                category,
                author: authorRole,
                authorName,
                mediaUrl,
                date: today,
                pinned
            };
            
            addPost(newPost);

            // Registrar automáticamente en el historial de archivos si es foto o video
            if (type === 'foto' || type === 'video') {
                const mediaItem = {
                    id: 'media-' + Date.now(),
                    title: title,
                    type: type,
                    url: mediaUrl,
                    uploaderName: authorName,
                    uploaderRole: authorRole,
                    date: today,
                    postId: newPost.id
                };
                addMediaToHistory(mediaItem);
            }
            
            formPublicar.reset();
            if (imgPreview) {
                imgPreview.src = '';
                imgPreview.classList.add('hidden');
            }
            base64ImageString = '';
            if (containerMediaInput) containerMediaInput.classList.add('hidden');
            if (containerVideoInput) containerVideoInput.classList.add('hidden');
            
            if (modalPublicar) {
                modalPublicar.classList.add('hidden');
                modalPublicar.classList.remove('flex');
            }
            
            renderMural();
            renderLatestIndexNews();
            mostrarNotificacion('¡Publicación agregada con éxito al mural! 🎉', 'success');
        });
    }
}

/**
 * Actualiza la barra de estado de administrador en el mural
 */
function actualizarVistaAdminMural() {
    const isLogged = isAdminLoggedIn();
    const btnPublicar = document.getElementById('btn-abrir-publicar');
    const btnLogout = document.getElementById('btn-admin-logout');
    const adminBadge = document.getElementById('admin-badge');
    
    if (isLogged) {
        if (btnPublicar) btnPublicar.innerHTML = '📝 Publicar en el Mural';
        if (btnLogout) btnLogout.classList.remove('hidden');
        if (adminBadge) {
            const loggedName = sessionStorage.getItem('clavero_admin_name') || 'Autorizado';
            const loggedRole = sessionStorage.getItem('clavero_admin_role') || 'Personal';
            adminBadge.innerHTML = `🔑 ${escapeHtml(loggedName)} (${escapeHtml(loggedRole)})`;
            adminBadge.classList.remove('hidden');
        }
    } else {
        if (btnPublicar) btnPublicar.innerHTML = '🔑 Acceso Personal Autorizado';
        if (btnLogout) btnLogout.classList.add('hidden');
        if (adminBadge) {
            adminBadge.innerHTML = '🔑 Autorizado';
            adminBadge.classList.add('hidden');
        }
    }
    
    renderMural();
}

/**
 * Inicializa el modal de login de profesores/directivos
 */
function inicializarModalLogin() {
    const modalLogin = document.getElementById('modal-login');
    const formLogin = document.getElementById('form-login');
    const btnCerrarLogin = document.getElementById('btn-cerrar-login');
    const btnCancelarLogin = document.getElementById('btn-cancelar-login');
    const loginNombre = document.getElementById('login-nombre');
    const loginRol = document.getElementById('login-rol');
    const loginPin = document.getElementById('login-pin');
    
    const cerrarModalLogin = () => {
        if (modalLogin) {
            modalLogin.classList.add('hidden');
            modalLogin.classList.remove('flex');
        }
        if (formLogin) formLogin.reset();
    };
    
    if (btnCerrarLogin) {
        btnCerrarLogin.addEventListener('click', cerrarModalLogin);
    }
    
    if (btnCancelarLogin) {
        btnCancelarLogin.addEventListener('click', cerrarModalLogin);
    }
    
    if (modalLogin) {
        modalLogin.addEventListener('click', (e) => {
            if (e.target === modalLogin) {
                cerrarModalLogin();
            }
        });
    }
    
    if (formLogin) {
        formLogin.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const nombre = loginNombre?.value.trim();
            const rol = loginRol?.value;
            const pin = loginPin?.value.trim();
            
            if (!nombre || !pin) {
                mostrarNotificacion('Por favor, completa todos los campos', 'danger');
                return;
            }
            
            // Validar credenciales con el servidor API
            fetch(`${API_BASE}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'teacher',
                    pin: pin,
                    name: nombre,
                    role: rol
                })
            })
            .then(res => {
                if (res.status === 401) throw new Error('pin');
                if (!res.ok) throw new Error('servidor');
                return res.json();
            })
            .then(data => {
                if (data.success) {
                    sessionStorage.setItem(CONFIG.SESSION_AUTH_KEY, 'true');
                    sessionStorage.setItem('clavero_admin_name', data.user.name);
                    sessionStorage.setItem('clavero_admin_role', data.user.role);
                    sessionStorage.setItem('clavero_jwt', data.token); // Guardar token JWT
                    
                    mostrarNotificacion(`¡Bienvenido(a), ${escapeHtml(data.user.name)}! 🔑`, 'success');
                    actualizarVistaAdminMural();
                    cerrarModalLogin();
                    
                    // Abrir modal de publicación
                    const modalPublicar = document.getElementById('modal-publicar');
                    const formPublicar = document.getElementById('form-publicar');
                    const containerMediaInput = document.getElementById('container-media-input');
                    const containerVideoInput = document.getElementById('container-video-input');
                    const imgPreview = document.getElementById('post-img-preview');
                    const postAutorSelect = document.getElementById('post-autor');
                    
                    if (postAutorSelect) {
                        postAutorSelect.value = data.user.role;
                    }
                    if (formPublicar) formPublicar.reset();
                    if (imgPreview) {
                        imgPreview.src = '';
                        imgPreview.classList.add('hidden');
                    }
                    if (containerMediaInput) containerMediaInput.classList.remove('hidden');
                    if (containerVideoInput) containerVideoInput.classList.add('hidden');
                    
                    if (modalPublicar) {
                        modalPublicar.classList.remove('hidden');
                        modalPublicar.classList.add('flex');
                    }
                }
            })
            .catch(err => {
                console.error(err);
                if (err.message === 'pin') {
                    mostrarNotificacion('PIN de acceso incorrecto ❌', 'danger');
                } else if (err.message === 'servidor') {
                    mostrarNotificacion('Error en el servidor de base de datos ❌', 'danger');
                } else {
                    mostrarNotificacion('No se pudo conectar con el servidor. ¿Iniciaste "node server.js"? 📡', 'danger');
                }
            });
        });
    }
}

// ==================== INICIALIZACIÓN PRINCIPAL ====================
document.addEventListener('DOMContentLoaded', () => {
    renderLatestIndexNews();
    inicializarChatbot();
    inicializarScrollReveal();
    
    if (document.getElementById('contenedor-mural')) {
        inicializarMuralPage();
    }
});

// ==================== DETALLE NOTICIA EN MODAL ====================

window.verDetalleNoticia = function(id) {
    const posts = getPosts();
    const post = posts.find(p => p.id === id);
    if (!post) return;

    const modal = document.getElementById('modal-detalle-noticia');
    const card = document.getElementById('modal-detalle-card');
    
    // Check if modal nodes exist (it will only exist on pages that include it)
    if (!modal || !card) {
        // Fallback: If modal not on page (e.g. some subpage), redirect to mural
        window.location.href = 'mural.html';
        return;
    }

    const categoria = document.getElementById('modal-detalle-categoria');
    const mediaContainer = document.getElementById('modal-detalle-media');
    const autor = document.getElementById('modal-detalle-autor');
    const fecha = document.getElementById('modal-detalle-fecha');
    const titulo = document.getElementById('modal-detalle-titulo');
    const texto = document.getElementById('modal-detalle-texto');

    // Rellenar datos
    categoria.innerText = post.category;
    autor.innerText = `👤 ${post.authorName} (${post.author})`;
    fecha.innerText = `📅 ${formatReadableDate(post.date)}`;
    titulo.innerText = post.title;
    texto.innerText = post.content;

    // Renderizar imagen o video
    let mediaHtml = '';
    if (post.type === 'video' && post.mediaUrl) {
        const embedUrl = getYouTubeEmbedUrl(post.mediaUrl);
        mediaHtml = `
            <iframe 
                class="w-full h-full"
                src="${embedUrl}" 
                title="${escapeHtml(post.title)}" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
            </iframe>
        `;
    } else {
        const imageUrl = post.mediaUrl || CONFIG.DEFAULT_IMAGE;
        mediaHtml = `<img src="${imageUrl}" alt="${escapeHtml(post.title)}" class="w-full h-full object-cover">`;
    }
    mediaContainer.innerHTML = mediaHtml;

    // Mostrar modal con animaciones
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        card.classList.remove('scale-95', 'opacity-0');
        card.classList.add('scale-100', 'opacity-100');
    }, 10);
};

window.cerrarModalDetalle = function() {
    const modal = document.getElementById('modal-detalle-noticia');
    const card = document.getElementById('modal-detalle-card');
    const mediaContainer = document.getElementById('modal-detalle-media');

    if (!modal || !card) return;

    card.classList.add('scale-95', 'opacity-0');
    card.classList.remove('scale-100', 'opacity-100');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        if (mediaContainer) mediaContainer.innerHTML = ''; // Detener video si está reproduciendo
    }, 300);
};


// ==================== CLAVERITO AI CHATBOT SYSTEM ====================

const CHATBOT_RESPONSES = {
    historia: "🏫 <strong>Reseña Histórica:</strong><br>Nuestra querida I.E.P. Teniente Manuel Clavero Muga fue fundada en <strong>1969</strong> en Punchana para brindar educación de calidad a la juventud de Iquitos.<br><br>Llevamos con orgullo el nombre del teniente de la Marina de Guerra del Perú, Manuel Clavero Muga, héroe naval del combate de Pedrera (1911), heredando su lema de pundonor y valentía.",
    admision: "📅 <strong>Admisión Escolar 2026:</strong><br>El proceso de admisión regular inicia cada año en el mes de <strong>noviembre</strong>. Contamos con vacantes para el nivel secundario.<br><br><strong>Requisitos principales:</strong><br>1. Ficha única de matrícula SIAGIE.<br>2. Copia de DNI del alumno y tutor.<br>3. Copia de tarjeta de vacunas.<br><br>Para más detalles o trámites de traslados, visítanos en Secretaría de lunes a viernes (8:00 AM - 1:00 PM).",
    director: "👨&zwj;🏫 <strong>Dirección Institucional:</strong><br>Nuestra institución está liderada por el <strong>Profesor Luis Nilo Zambrano Peña</strong>.<br><br>Bajo su gestión y fiel al lema claveriano, coordinamos permanentemente con el cuerpo docente y la APAFA para consolidar la vanguardia educativa y tecnológica en Loreto.",
    aip: "💻 <strong>Aula de Innovación Pedagógica (AIP):</strong><br>El AIP es el corazón tecnológico de nuestro colegio. En convenio estratégico con <strong>Fundación Telefónica</strong>, integramos recursos multimedia, actividades interactivas y realidad aumentada.<br><br>Aquí capacitamos a los alumnos en competencias digitales y fomentamos talleres introductorios sobre Inteligencia Artificial aplicada al aprendizaje.",
    contacto: "📞 <strong>Dirección y Contacto:</strong><br>📍 Av. Trujillo N° 745, Distrito de Punchana - Iquitos, Loreto (Perú).<br>📞 Teléfono: (065) 250385<br>✉️ Correo: colegioclaverom@gmail.com<br><br>¡El Área de Innovación TIC está a tu servicio! 😊"
};

function inicializarChatbot() {
    console.log("Inicializando Claverito AI...");
    const toggleBtn = document.getElementById('chatbot-toggle');
    const closeBtn = document.getElementById('chatbot-close');
    const windowChat = document.getElementById('chatbot-window');
    
    if (!toggleBtn || !windowChat) {
        console.error("No se encontraron los elementos del chatbot. toggleBtn:", toggleBtn, "windowChat:", windowChat);
        return;
    }

    console.log("Elementos del chatbot encontrados con éxito.");

    // Toggle Chatbot Window
    toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log("Clic detectado en chatbot-toggle.");
        
        try {
            // Check computed styles and class lists for maximum robustness
            const isHidden = windowChat.classList.contains('hidden') || 
                             windowChat.classList.contains('opacity-0') || 
                             windowChat.classList.contains('pointer-events-none') ||
                             windowChat.style.opacity === '0' ||
                             getComputedStyle(windowChat).display === 'none' ||
                             getComputedStyle(windowChat).opacity === '0';
                             
            console.log("¿Está oculto el chatbot?", isHidden);
            
            if (isHidden) {
                // Mostrar
                console.log("Mostrando ventana del chatbot...");
                windowChat.classList.remove('hidden', 'pointer-events-none');
                
                setTimeout(() => {
                    windowChat.classList.remove('scale-95', 'opacity-0');
                    windowChat.classList.add('scale-100', 'opacity-100');
                    console.log("Clases de visibilidad aplicadas.");
                }, 50);
                
                // Quitar pings de alerta
                toggleBtn.classList.remove('animate-bounce');
                const alertPing = toggleBtn.querySelector('span');
                if (alertPing) {
                    alertPing.remove();
                    console.log("Ping de alerta removido.");
                }
                
                // Intentar reproducir sonido
                try {
                    playChime(600, 'sine', 0.1, 0.05);
                } catch (audioErr) {
                    console.warn("No se pudo reproducir el sonido chime:", audioErr);
                }
            } else {
                // Ocultar
                console.log("Ocultando ventana del chatbot...");
                cerrarChatbot();
            }
        } catch (error) {
            console.error("Error en la ejecución del click de chatbot-toggle:", error);
        }
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Clic detectado en chatbot-close.");
            cerrarChatbot();
        });
    } else {
        console.warn("No se encontró el botón de cerrar del chatbot.");
    }
}

function cerrarChatbot() {
    const windowChat = document.getElementById('chatbot-window');
    if (!windowChat) return;
    
    windowChat.classList.add('scale-95', 'opacity-0');
    windowChat.classList.remove('scale-100', 'opacity-100');
    setTimeout(() => {
        windowChat.classList.add('hidden', 'pointer-events-none');
    }, 300);
}

window.preguntarChatbot = function(key) {
    const messagesContainer = document.getElementById('chatbot-messages');
    const responseText = CHATBOT_RESPONSES[key];
    if (!messagesContainer || !responseText) return;

    // Disable options container temporarily
    const optionsContainer = document.getElementById('chatbot-options');
    const optionButtons = optionsContainer.querySelectorAll('button');
    optionButtons.forEach(btn => btn.disabled = true);

    const questionText = {
        historia: "🏫 Historia del Colegio",
        admision: "📅 Admisión 2026",
        director: "👨&zwj;🏫 ¿Quién es el Director?",
        aip: "💻 Aula de Innovación (AIP)",
        contacto: "📞 Contacto y Dirección"
    }[key];

    // Append User Message
    messagesContainer.innerHTML += `
        <div class="flex gap-2 justify-end">
            <div class="bg-green-750 text-white p-3 rounded-2xl rounded-tr-none text-xs leading-relaxed max-w-[80%] shadow-sm bg-green-700">
                ${questionText}
            </div>
        </div>
    `;
    
    // Auto Scroll down
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Append Bot Typing Indicator
    const typingId = 'typing-' + Date.now();
    setTimeout(() => {
        messagesContainer.innerHTML += `
            <div class="flex gap-2 animate-pulse" id="${typingId}">
                <div class="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs">🤖</div>
                <div class="bg-white border border-gray-100 text-gray-400 p-3 rounded-2xl rounded-tl-none text-xs leading-relaxed max-w-[80%] shadow-sm flex items-center gap-1">
                    <span class="chat-typing-dot w-1.5 h-1.5 bg-gray-400 rounded-full inline-block"></span>
                    <span class="chat-typing-dot w-1.5 h-1.5 bg-gray-400 rounded-full inline-block"></span>
                    <span class="chat-typing-dot w-1.5 h-1.5 bg-gray-400 rounded-full inline-block"></span>
                </div>
            </div>
        `;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 300);

    // Append Bot Response
    setTimeout(() => {
        // Remove typing indicator
        const typingEl = document.getElementById(typingId);
        if (typingEl) typingEl.remove();

        messagesContainer.innerHTML += `
            <div class="flex gap-2">
                <div class="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs">🤖</div>
                <div class="bg-white border border-gray-100 text-gray-700 p-3 rounded-2xl rounded-tl-none text-xs leading-relaxed max-w-[80%] shadow-sm">
                    ${responseText}
                </div>
            </div>
        `;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Re-enable option buttons
        optionButtons.forEach(btn => btn.disabled = false);
    }, 1200); // 1.2 seconds delay for realistic feeling
};

// Cute sound chime helper
function playChime(freq, type = 'sine', duration = 0.3, volume = 0.08) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(volume, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration + 0.05);
    } catch(e) {
        // Fail silently if browser blocks audiocontext
    }
}


// ==================== SCROLL REVEAL ANIMATIONS ====================

function inicializarScrollReveal() {
    const reveals = document.querySelectorAll('.scroll-reveal');
    if (reveals.length === 0) return;

    // Hide them for scroll reveal only when JS is running successfully!
    reveals.forEach(reveal => reveal.classList.add('js-reveal'));

    // Ultimate safety timer: force reveal everything after 1.5 seconds if IntersectionObserver fails
    setTimeout(() => {
        reveals.forEach(reveal => reveal.classList.add('active'));
    }, 1500);

    // Safety Fallback: If IntersectionObserver is not supported, show everything immediately
    if (!('IntersectionObserver' in window)) {
        reveals.forEach(reveal => reveal.classList.add('active'));
        return;
    }

    try {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, {
            threshold: 0.05, // Trigger even at 5% visibility
            rootMargin: "0px 0px -10px 0px"
        });

        reveals.forEach(reveal => {
            observer.observe(reveal);
        });
    } catch (err) {
        console.error("Error al inicializar IntersectionObserver:", err);
        // Fallback on error
        reveals.forEach(reveal => reveal.classList.add('active'));
    }
}