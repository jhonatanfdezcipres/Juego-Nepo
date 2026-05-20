// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// Servir los archivos estáticos del juego
app.use(express.static(__dirname));

// Estructura para almacenar a los alumnos conectados
let players = {};

io.on('connection', (socket) => {
    console.log(`Un estudiante se ha conectado: ${socket.id}`);

    // 1. Registrar al alumno cuando ingresa su nombre
    socket.on('registerPlayer', (username) => {
        players[socket.id] = {
            id: socket.id,
            username: username,
            score: 0,
            level: 1
        };
        // Enviar la lista de jugadores actualizada a TODOS
        io.emit('updateLeaderboard', Object.values(players));
    });

    // 2. Escuchar cuando un alumno suma puntos
    socket.on('updateScore', (data) => {
        if (players[socket.id]) {
            players[socket.id].score = data.score;
            players[socket.id].level = data.level;
            // Notificar a todos el cambio en la tabla de posiciones
            io.emit('updateLeaderboard', Object.values(players));
        }
    });

    // 3. Manejar la desconexión del alumno
    socket.on('disconnect', () => {
        console.log(`Estudiante desconectado: ${socket.id}`);
        delete players[socket.id];
        io.emit('updateLeaderboard', Object.values(players));
    });
});

// Arrancar el servidor en el puerto 3000
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`=== Servidor Nepohualtzintzin Multijugador Activo ===`);
    console.log(`Los alumnos deben ingresar a la IP de esta PC en el puerto :${PORT}`);
});