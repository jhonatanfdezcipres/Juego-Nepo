// server.js - COMPLETO CON SISTEMA DE SESIONES (SALAS)
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// Servir los archivos de la carpeta (como el index.html)
app.use(express.static(__dirname));

// Estructura en memoria para organizar los salones
// Formato: { '3A': { socketId: { alumno } }, '5B': { ... } }
let sessions = {};

io.on('connection', (socket) => {
    let currentRoom = null;

    // 1. Escuchar cuando un alumno se registra con su Nombre y Código de Sesión
    socket.on('registerPlayer', (data) => {
        const { username, roomCode } = data;
        
        // Limpiamos el código: todo a mayúsculas y sin espacios raros
        const room = roomCode.trim().toUpperCase();
        currentRoom = room;

        // Si el salón/sala no existe todavía en el servidor, lo creamos vacío
        if (!sessions[room]) {
            sessions[room] = {};
        }

        // Registramos al alumno dentro de SU salón específico
        sessions[room][socket.id] = {
            id: socket.id,
            username: username,
            score: 0,
            level: 1
        };

        // Metemos el dispositivo del alumno a la sala virtual de Socket.io
        socket.join(room);

        // Enviamos la tabla de posiciones ACTUALIZADA solo a ese salón
        io.to(room).emit('updateLeaderboard', Object.values(sessions[room]));
    });

    // 2. Escuchar cuando un alumno suma puntos o sube de nivel
    socket.on('updateScore', (data) => {
        if (currentRoom && sessions[currentRoom] && sessions[currentRoom][socket.id]) {
            sessions[currentRoom][socket.id].score = data.score;
            sessions[currentRoom][socket.id].level = data.level;
            
            // Refrescamos el Leaderboard en vivo solo para sus compañeros de sala
            io.to(currentRoom).emit('updateLeaderboard', Object.values(sessions[currentRoom]));
        }
    });

    // 3. Manejar cuando un alumno se desconecta o cierra la pestaña
    socket.on('disconnect', () => {
        if (currentRoom && sessions[currentRoom] && sessions[currentRoom][socket.id]) {
            // Lo borramos de la sala
            delete sessions[currentRoom][socket.id];
            
            // Si ya no queda nadie en ese salón, borramos la sala para no gastar memoria
            if (Object.keys(sessions[currentRoom]).length === 0) {
                delete sessions[currentRoom];
            } else {
                // Si aún quedan alumnos jugando, actualizamos la tabla para los que se quedaron
                io.to(currentRoom).emit('updateLeaderboard', Object.values(sessions[currentRoom]));
            }
        }
    });
});

// Render asignará el puerto automáticamente en Internet usando process.env.PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`=== Servidor Nepohualtzintzin por Sesiones Activo en puerto ${PORT} ===`);
});