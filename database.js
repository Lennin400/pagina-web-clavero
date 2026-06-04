const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

const dialect = process.env.DB_DIALECT || 'sqlite';
let sequelize;

if (dialect === 'sqlite') {
    const storagePath = process.env.DB_STORAGE || './data/database.sqlite';
    // Asegurar que la carpeta de la base de datos exista
    const storageDir = path.dirname(path.resolve(storagePath));
    
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: storagePath,
        logging: false
    });
} else {
    sequelize = new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASS,
        {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || (dialect === 'postgres' ? 5432 : 3306),
            dialect: dialect,
            logging: false
        }
    );
}

// ==================== DEFINICIÓN DE MODELOS SQL ====================

// Modelo de Usuarios
const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password_hash: {
        type: DataTypes.STRING,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('admin', 'teacher'),
        allowNull: false
    }
});

// Modelo de Publicaciones (Mural)
const Post = sequelize.define('Post', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING, // 'comunicado', 'foto', 'video'
        allowNull: false
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false
    },
    author: {
        type: DataTypes.STRING, // Rol o Cargo expuesto, ej. 'Director'
        allowNull: false
    },
    authorName: {
        type: DataTypes.STRING, // Nombre del autor expuesto, ej. 'Prof. Luis Nilo'
        allowNull: false
    },
    mediaUrl: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    date: {
        type: DataTypes.STRING, // Fecha en formato YYYY-MM-DD
        allowNull: false
    },
    pinned: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
});

// Modelo de Historial de Medios
const Media = sequelize.define('Media', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING, // 'foto', 'video'
        allowNull: false
    },
    url: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    uploaderName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    uploaderRole: {
        type: DataTypes.STRING,
        allowNull: false
    },
    date: {
        type: DataTypes.STRING, // YYYY-MM-DD
        allowNull: false
    },
    postId: {
        type: DataTypes.STRING,
        allowNull: true
    }
});

// ==================== RELACIONES (ASOCIACIONES) ====================
User.hasMany(Post, { foreignKey: 'userId', as: 'posts' });
Post.belongsTo(User, { foreignKey: 'userId', as: 'creator' });

User.hasMany(Media, { foreignKey: 'uploaderId', as: 'mediaHistory' });
Media.belongsTo(User, { foreignKey: 'uploaderId', as: 'uploader' });

// ==================== SEMILLAS E INICIALIZACIÓN ====================

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

// Función para inicializar base de datos y sembrar datos de prueba
async function initDB() {
    try {
        // Asegurar que la carpeta 'data' exista si usamos SQLite
        if (dialect === 'sqlite') {
            const storagePath = process.env.DB_STORAGE || './data/database.sqlite';
            const storageDir = path.dirname(path.resolve(storagePath));
            await fs.mkdir(storageDir, { recursive: true });
        }

        // Probar conexión
        await sequelize.authenticate();
        console.log(`Conexión exitosa a la base de datos SQL (${dialect}).`);

        // Sincronizar tablas (crear si no existen)
        await sequelize.sync({ alter: true });
        console.log('Tablas SQL sincronizadas correctamente.');

        // 1. Sembrar Usuarios si no existen
        const userCount = await User.count();
        let adminUser, teacherUser;

        if (userCount === 0) {
            console.log('Sembrando usuarios iniciales...');
            
            // Hashear contraseñas de forma segura
            const adminPassHash = await bcrypt.hash('admin2026', 10);
            const teacherPassHash = await bcrypt.hash('clavero2026', 10);

            adminUser = await User.create({
                username: 'admin',
                password_hash: adminPassHash,
                name: 'Lennin Jair Canaquiri Curitima',
                role: 'admin'
            });

            teacherUser = await User.create({
                username: 'docente',
                password_hash: teacherPassHash,
                name: 'Área de Innovación Pedagógica (AIP)',
                role: 'teacher'
            });
            
            console.log('Usuarios de prueba creados.');
            console.log('  Admin: user "admin", pass "admin2026"');
            console.log('  Docente: user "docente", pass "clavero2026"');
        } else {
            adminUser = await User.findOne({ where: { username: 'admin' } });
            teacherUser = await User.findOne({ where: { username: 'docente' } });
        }

        // 2. Sembrar Publicaciones si no existen
        const postCount = await Post.count();
        if (postCount === 0) {
            console.log('Sembrando publicaciones de muestra...');
            
            for (const postData of SAMPLE_POSTS) {
                // Asociar las publicaciones al Director (admin) o AIP (docente) según corresponda
                const creator = postData.author === 'Director' ? adminUser : teacherUser;
                
                await Post.create({
                    ...postData,
                    userId: creator ? creator.id : null
                });
            }
            console.log('Publicaciones sembradas.');
        }

        // 3. Sembrar Historial de Medios si no existe
        const mediaCount = await Media.count();
        if (mediaCount === 0) {
            console.log('Sembrando historial multimedia de muestra...');
            const posts = await Post.findAll();
            
            for (const post of posts) {
                if (post.type === 'foto' || post.type === 'video') {
                    const uploader = post.author === 'Director' ? adminUser : teacherUser;
                    
                    await Media.create({
                        id: 'media-' + post.id,
                        title: post.title,
                        type: post.type,
                        url: post.mediaUrl,
                        uploaderName: post.authorName,
                        uploaderRole: post.author,
                        date: post.date,
                        postId: post.id,
                        uploaderId: uploader ? uploader.id : null
                    });
                }
            }
            console.log('Historial multimedia sembrado.');
        }

    } catch (error) {
        console.error('Error al inicializar la base de datos SQL:', error);
        throw error;
    }
}

module.exports = {
    sequelize,
    User,
    Post,
    Media,
    initDB
};
