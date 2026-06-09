const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { User, Post, Media, initDB } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_super_segura_claveriano_2026';

// Detectar Railway
const isRailway = !!process.env.RAILWAY_VOLUME_MOUNT_PATH;

// ✅ CORREGIDO: Solo una declaración de UPLOADS_DIR
const UPLOADS_DIR = isRailway 
    ? '/data/uploads' 
    : path.join(__dirname, 'uploads');

// Asegurar que la carpeta exista
(async () => {
    try {
        await fs.mkdir(UPLOADS_DIR, { recursive: true });
        console.log(`📁 Uploads directory: ${UPLOADS_DIR}`);
    } catch (err) {
        console.error('Error creating uploads directory:', err);
    }
})();

// Habilitar CORS y parsear JSON
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Servir la carpeta de subidas de imágenes
app.use('/uploads', express.static(UPLOADS_DIR));

// Servir los archivos estáticos de la página web (raíz del proyecto)
app.use(express.static(__dirname));

// ==================== MIDDLEWARES DE SEGURIDAD ====================

// Middleware para autenticar solicitudes mediante token JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Acceso no autorizado. Token requerido.' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido, vencido o manipulado.' });
        }
        req.user = decodedUser;
        next();
    });
}

// Middleware para validar roles
function requireRole(roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'No tienes privilegios suficientes para realizar esta acción.' });
        }
        next();
    };
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
            
            await fs.mkdir(UPLOADS_DIR, { recursive: true });
            await fs.writeFile(filepath, buffer);
            console.log(`Imagen guardada físicamente en: ${filepath}`);
            return `/uploads/${filename}`;
        }
    }
    return mediaUrl;
}

// ==================== ENDPOINTS DE LA API ====================

// --- Autenticación (Login) ---
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const loginUser = username || req.body.username;
        const loginPin = req.body.pin || password;
        
        if (req.body.type === 'teacher' || (!loginUser && loginPin)) {
            if (loginPin === 'clavero2026') {
                const teacher = await User.findOne({ where: { username: 'docente' } });
                if (!teacher) {
                    return res.status(500).json({ error: 'Usuario docente no inicializado.' });
                }
                
                const token = jwt.sign(
                    { id: teacher.id, username: teacher.username, role: 'teacher' },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );
                
                return res.json({
                    success: true,
                    token,
                    user: { name: req.body.name || teacher.name, role: req.body.role || 'Docente' }
                });
            }
        } else {
            const user = await User.findOne({ where: { username: loginUser } });
            if (user) {
                const isPasswordValid = await bcrypt.compare(loginPin, user.password_hash);
                if (isPasswordValid) {
                    const token = jwt.sign(
                        { id: user.id, username: user.username, role: user.role },
                        JWT_SECRET,
                        { expiresIn: '24h' }
                    );
                    
                    return res.json({
                        success: true,
                        token,
                        user: { name: user.name, role: user.role === 'admin' ? 'Administrador' : 'Docente' }
                    });
                }
            }
        }
        
        return res.status(401).json({ success: false, message: 'Usuario o PIN/contraseña incorrectos' });
    } catch (err) {
        console.error('Error en autenticación:', err);
        res.status(500).json({ error: 'Error interno en el servidor de autenticación' });
    }
});

// --- Publicaciones (Mural) ---

app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.findAll({
            order: [['pinned', 'DESC'], ['createdAt', 'DESC']]
        });
        res.json(posts);
    } catch (err) {
        console.error('Error al obtener publicaciones SQL:', err);
        res.status(500).json({ error: 'Error al cargar las publicaciones de la base de datos.' });
    }
});

app.post('/api/posts', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
        const postData = req.body;
        
        if (postData.mediaUrl) {
            postData.mediaUrl = await saveBase64Image(postData.mediaUrl);
        }
        
        postData.userId = req.user.id;
        const newPost = await Post.create(postData);
        res.status(201).json(newPost);
    } catch (err) {
        console.error('Error al agregar publicación SQL:', err);
        res.status(500).json({ error: 'Error interno al guardar la publicación en base de datos.' });
    }
});

app.put('/api/posts/:id', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
        const { id } = req.params;
        const post = await Post.findByPk(id);
        
        if (!post) {
            return res.status(404).json({ error: 'Publicación no encontrada.' });
        }
        
        if (req.user.role !== 'admin' && post.userId !== req.user.id) {
            return res.status(403).json({ error: 'No tienes privilegios para editar publicaciones de otros autores.' });
        }
        
        const updatedData = req.body;
        if (updatedData.mediaUrl) {
            updatedData.mediaUrl = await saveBase64Image(updatedData.mediaUrl);
        }
        
        await post.update(updatedData);
        
        if (updatedData.title) {
            await Media.update({ title: updatedData.title }, { where: { postId: id } });
        }
        
        res.json(post);
    } catch (err) {
        console.error('Error al editar publicación SQL:', err);
        res.status(500).json({ error: 'Error al actualizar la publicación en base de datos.' });
    }
});

app.delete('/api/posts/:id', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
        const { id } = req.params;
        const post = await Post.findByPk(id);
        
        if (!post) {
            return res.status(404).json({ error: 'Publicación no encontrada.' });
        }
        
        if (req.user.role !== 'admin' && post.userId !== req.user.id) {
            return res.status(403).json({ error: 'No tienes privilegios para eliminar publicaciones de otros autores.' });
        }
        
        await post.destroy();
        res.json({ success: true, message: 'Publicación eliminada correctamente de SQL' });
    } catch (err) {
        console.error('Error al eliminar publicación SQL:', err);
        res.status(500).json({ error: 'Error al eliminar la publicación en base de datos.' });
    }
});

// --- Historial de Medios ---

app.get('/api/media', async (req, res) => {
    try {
        const media = await Media.findAll({ order: [['createdAt', 'DESC']] });
        res.json(media);
    } catch (err) {
        console.error('Error al obtener medios SQL:', err);
        res.status(500).json({ error: 'Error al obtener el historial multimedia.' });
    }
});

app.post('/api/media', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
        const mediaData = req.body;
        
        if (mediaData.url) {
            mediaData.url = await saveBase64Image(mediaData.url);
        }
        
        mediaData.uploaderId = req.user.id;
        const mediaItem = await Media.create(mediaData);
        res.status(201).json(mediaItem);
    } catch (err) {
        console.error('Error al agregar a historial de medios SQL:', err);
        res.status(500).json({ error: 'Error al registrar archivo en base de datos.' });
    }
});

app.put('/api/media/:id', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
        const { id } = req.params;
        const mediaItem = await Media.findByPk(id);
        
        if (!mediaItem) {
            return res.status(404).json({ error: 'Medio no encontrado.' });
        }
        
        if (req.user.role !== 'admin' && mediaItem.uploaderId !== req.user.id) {
            return res.status(403).json({ error: 'No tienes privilegios para modificar archivos de otros remitentes.' });
        }
        
        await mediaItem.update(req.body);
        res.json(mediaItem);
    } catch (err) {
        console.error('Error al actualizar historial de medios SQL:', err);
        res.status(500).json({ error: 'Error al actualizar el archivo en base de datos.' });
    }
});

app.delete('/api/media/:id', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
        const { id } = req.params;
        const mediaItem = await Media.findByPk(id);
        
        if (!mediaItem) {
            return res.status(404).json({ error: 'Archivo no encontrado.' });
        }
        
        if (req.user.role !== 'admin' && mediaItem.uploaderId !== req.user.id) {
            return res.status(403).json({ error: 'No tienes privilegios para eliminar archivos de otros remitentes.' });
        }
        
        await mediaItem.destroy();
        res.json({ success: true, message: 'Elemento multimedia eliminado del historial SQL.' });
    } catch (err) {
        console.error('Error al eliminar de historial de medios SQL:', err);
        res.status(500).json({ error: 'Error al eliminar el archivo de la base de datos.' });
    }
});

app.delete('/api/media', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        await Media.destroy({ truncate: true });
        res.json({ success: true, message: 'Historial de medios vaciado correctamente de SQL.' });
    } catch (err) {
        console.error('Error al vaciar historial de medios SQL:', err);
        res.status(500).json({ error: 'Error al vaciar el historial multimedia de la base de datos.' });
    }
});

// Inicializar base de datos SQL y arrancar servidor
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`==================================================`);
        console.log(`Servidor SQL de Ecosistema Digital Clavero.`);
        console.log(`URL local: http://localhost:${PORT}`);
        console.log(`==================================================`);
    });
}).catch(err => {
    console.error('No se pudo arrancar el servidor debido a fallos en la base de datos:', err);
});