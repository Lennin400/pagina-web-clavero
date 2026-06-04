const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de base de datos y subidas
const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'database.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Habilitar CORS y parsear JSON con límite alto para imágenes base64
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Servir la carpeta de subidas de imágenes
app.use('/uploads', express.static(UPLOADS_DIR));

// Servir los archivos estáticos de la página web (raíz del proyecto)
app.use(express.static(__dirname));

// Datos por defecto originales
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
        content: 'Con una asistencia masiva de padres de familia de primero a quinto de secundaria, se llevó a cabo el debate sobre la ciudadanía digital y las pautas para el acompañamiento tecnológico en el hogar. La comunidad claveriona reafirma su compromiso de trabajar de la mano en el binomio escuela-familia.',
        type: 'comunicado',
        category: 'Comunidad',
        author: 'Director',
        authorName: 'Prof. Luis Nilo Zambrano Peña',
        mediaUrl: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=600',
        date: '2026-05-08',
        pinned: false
    }
];

// Inicializar base de datos
async function initDB() {
    try {
        await fs.mkdir(DB_DIR, { recursive: true });
        await fs.mkdir(UPLOADS_DIR, { recursive: true });
        
        try {
            await fs.access(DB_FILE);
            console.log('Base de datos existente cargada.');
        } catch {
            console.log('Base de datos no encontrada. Inicializando con datos de muestra...');
            
            // Generar historial de medios inicial
            const initialMedia = [];
            SAMPLE_POSTS.forEach(post => {
                if (post.type === 'foto' || post.type === 'video') {
                    initialMedia.push({
                        id: 'media-' + post.id,
                        title: post.title,
                        type: post.type,
                        url: post.mediaUrl,
                        uploaderName: post.authorName,
                        uploaderRole: post.author,
                        date: post.date,
                        postId: post.id
                    });
                }
            });

            const initialDB = {
                posts: SAMPLE_POSTS,
                media: initialMedia
            };
            
            await fs.writeFile(DB_FILE, JSON.stringify(initialDB, null, 2), 'utf8');
        }
    } catch (err) {
        console.error('Error al inicializar la base de datos:', err);
    }
}

// Helper para leer base de datos
async function readDB() {
    try {
        const data = await fs.readFile(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error leyendo base de datos:', err);
        return { posts: [], media: [] };
    }
}

// Helper para escribir base de datos
async function writeDB(data) {
    try {
        await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error('Error escribiendo base de datos:', err);
    }
}

// Helper para guardar imágenes base64 como archivos locales
async function saveBase64Image(mediaUrl) {
    if (mediaUrl && mediaUrl.startsWith('data:image/')) {
        const matches = mediaUrl.match(/^data:image\/([A-Za-z+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
            const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
            const base64Data = matches[2];
            const buffer = Buffer.from(base64Data, 'base64');
            const filename = `img_${crypto.randomBytes(8).toString('hex')}.${ext}`;
            const filepath = path.join(UPLOADS_DIR, filename);
            
            await fs.writeFile(filepath, buffer);
            console.log(`Imagen guardada físicamente en: ${filepath}`);
            return `/uploads/${filename}`;
        }
    }
    return mediaUrl;
}

// ==================== ENDPOINTS DE LA API ====================

// --- Publicaciones (Posts) ---

// Obtener todas las publicaciones
app.get('/api/posts', async (req, res) => {
    const db = await readDB();
    res.json(db.posts);
});

// Agregar una publicación
app.post('/api/posts', async (req, res) => {
    try {
        const db = await readDB();
        const newPost = req.body;
        
        // Procesar imagen si viene en base64
        if (newPost.mediaUrl) {
            newPost.mediaUrl = await saveBase64Image(newPost.mediaUrl);
        }
        
        db.posts.unshift(newPost);
        await writeDB(db);
        
        res.status(201).json(newPost);
    } catch (err) {
        console.error('Error al agregar publicación:', err);
        res.status(500).json({ error: 'Error interno del servidor al guardar la publicación' });
    }
});

// Editar una publicación
app.put('/api/posts/:id', async (req, res) => {
    try {
        const db = await readDB();
        const { id } = req.params;
        const updatedData = req.body;
        
        const index = db.posts.findIndex(post => post.id === id);
        if (index !== -1) {
            // Procesar imagen si viene en base64
            if (updatedData.mediaUrl) {
                updatedData.mediaUrl = await saveBase64Image(updatedData.mediaUrl);
            }
            
            db.posts[index] = { ...db.posts[index], ...updatedData };
            
            // Sincronizar título en historial de medios si aplica
            const mediaIndex = db.media.findIndex(item => item.postId === id);
            if (mediaIndex !== -1 && updatedData.title) {
                db.media[mediaIndex].title = updatedData.title;
            }
            
            await writeDB(db);
            res.json(db.posts[index]);
        } else {
            res.status(404).json({ error: 'Publicación no encontrada' });
        }
    } catch (err) {
        console.error('Error al editar publicación:', err);
        res.status(500).json({ error: 'Error interno del servidor al editar la publicación' });
    }
});

// Eliminar una publicación
app.delete('/api/posts/:id', async (req, res) => {
    try {
        const db = await readDB();
        const { id } = req.params;
        
        db.posts = db.posts.filter(post => post.id !== id);
        // También podemos mantener la imagen física en /uploads o eliminarla
        
        await writeDB(db);
        res.json({ success: true, message: 'Publicación eliminada correctamente' });
    } catch (err) {
        console.error('Error al eliminar publicación:', err);
        res.status(500).json({ error: 'Error interno del servidor al eliminar la publicación' });
    }
});


// --- Historial de Medios ---

// Obtener todo el historial de medios
app.get('/api/media', async (req, res) => {
    const db = await readDB();
    res.json(db.media);
});

// Agregar elemento al historial de medios
app.post('/api/media', async (req, res) => {
    try {
        const db = await readDB();
        const mediaItem = req.body;
        
        // Procesar imagen si viene en base64
        if (mediaItem.url) {
            mediaItem.url = await saveBase64Image(mediaItem.url);
        }
        
        db.media.unshift(mediaItem);
        await writeDB(db);
        
        res.status(201).json(mediaItem);
    } catch (err) {
        console.error('Error al agregar a historial de medios:', err);
        res.status(500).json({ error: 'Error al registrar el medio en el historial' });
    }
});

// Editar elemento del historial de medios
app.put('/api/media/:id', async (req, res) => {
    try {
        const db = await readDB();
        const { id } = req.params;
        const updatedData = req.body;
        
        const index = db.media.findIndex(item => item.id === id);
        if (index !== -1) {
            db.media[index] = { ...db.media[index], ...updatedData };
            await writeDB(db);
            res.json(db.media[index]);
        } else {
            res.status(404).json({ error: 'Elemento multimedia no encontrado' });
        }
    } catch (err) {
        console.error('Error al editar elemento multimedia:', err);
        res.status(500).json({ error: 'Error al editar el medio en el historial' });
    }
});

// Eliminar elemento de historial de medios
app.delete('/api/media/:id', async (req, res) => {
    try {
        const db = await readDB();
        const { id } = req.params;
        
        db.media = db.media.filter(item => item.id !== id);
        await writeDB(db);
        
        res.json({ success: true, message: 'Elemento multimedia eliminado del historial' });
    } catch (err) {
        console.error('Error al eliminar de historial de medios:', err);
        res.status(500).json({ error: 'Error al eliminar el medio del historial' });
    }
});

// Eliminar todo el historial de medios (para botón Limpiar Todo)
app.delete('/api/media', async (req, res) => {
    try {
        const db = await readDB();
        db.media = [];
        await writeDB(db);
        res.json({ success: true, message: 'Historial de medios vaciado correctamente' });
    } catch (err) {
        console.error('Error al vaciar historial de medios:', err);
        res.status(500).json({ error: 'Error al vaciar el historial de medios' });
    }
});


// --- Autenticación (Login) ---

app.post('/api/login', (req, res) => {
    const { username, pin, type, name, role } = req.body;
    
    if (type === 'admin') {
        if (username === 'admin' && pin === 'admin2026') {
            return res.json({ 
                success: true, 
                token: 'session_admin_token_2026',
                user: { name: 'Lennin Jair Canaquiri Curitima', role: 'Administrador' }
            });
        }
    } else if (type === 'teacher') {
        if (pin === 'clavero2026') {
            return res.json({ 
                success: true, 
                token: 'session_teacher_token_2026',
                user: { name: name || 'Docente Claveriano', role: role || 'Docente' }
            });
        }
    }
    
    return res.status(401).json({ success: false, message: 'PIN o credenciales de acceso incorrectas' });
});


// Inicializar DB y arrancar servidor
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`==================================================`);
        console.log(`Servidor de base de datos Clavero corriendo.`);
        console.log(`URL local: http://localhost:${PORT}`);
        console.log(`==================================================`);
    });
});
