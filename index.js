const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
        origin: "*",
    }
});


let users = [];
let activeChats = [];
let allChats = [];

const addUser = (userId, userInfo, socketId) => {
    !users.some((user) => user.userId === userId && user.socketId === socketId) &&
        users.push({ userId, userInfo, socketId });
};

io.on('connection', (socket) => {

    socket.on('addActiveChat', ({ chatId, recieverId, senderId }) => {
        console.log('addActiveChat');
        !activeChats.some((chat) => chat.chatId === chatId && chat.recieverId === recieverId && chat.socketId === socket.id) &&
            activeChats.push({ chatId, recieverId, senderId, socketId: socket.id });

    });

    socket.on('removeActiveChat', ({ userId }) => {

        activeChats = activeChats.filter((chat) => chat.socketId !== socket.id);

    });

    socket.on('allChats', (userId) => {
        !allChats.some((chat) => chat.userId === userId && chat.socketId === socket.id) &&
            allChats.push({ userId, socketId: socket.id });
    });


    socket.on('addUser', (userId, userInfo) => {
        addUser(userId, userInfo, socket.id);
        io.emit('getUsers', users);
    });

    socket.on('send-message', (message) => {

        const activeChat = activeChats.find((chat) => chat.chatId === message.chatId && chat.recieverId === message.recieverId);

        const senderChats = activeChats.find((chat) => chat.chatId === message.chatId && chat.senderId === message.senderId && chat.socketId === socket.id);

        if (activeChat) {
            users.forEach((user) => {
                if (user.userId === activeChat.recieverId) {
                    console.log('user', user);
                    io.to(user.socketId).emit('receive-message', message);
                }
            });
        }

        if (senderChats) {
            users.forEach((user) => {
                if (user.userId === senderChats.senderId && user.socketId !== socket.id) {
                    console.log('user', user);
                    io.to(user.socketId).emit('receive-message', message);
                }
            });
        }

        const recAllChats = allChats.find((chat) => chat.userId === message.recieverId && chat.socketId === socket.id);

        const sendAllChats = allChats.find((chat) => chat.userId === message.senderId && chat.socketId === socket.id);

        if (recAllChats) {
            users.forEach((user) => {
                if (user.userId === recAllChats.userId) {
                    io.to(user.socketId).emit('receive-message', message);
                }
            });
        }

        if (sendAllChats) {
            users.forEach((user) => {
                if (user.userId === sendAllChats.userId && user.socketId !== socket.id) {
                    io.to(user.socketId).emit('receive-message', message);
                }
            });
        }


    });

    socket.on('removeUser', (user) => {

        users = users.filter((user) => user.socketId !== socket.id);
        io.emit('getUsers', users);
    });

    socket.on('disconnect', () => {
        users = users.filter((user) => user.socketId !== socket.id);
        io.emit('getUsers', users);
    }
    );



});

const port = process.env.PORT || 3000; 

server.listen(port, () => {
    console.log('listening on *:3000');
});


