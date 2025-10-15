"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { io, type Socket } from 'socket.io-client';

type ChatMessage = {
    user: string;
    text: string;
};

const Chat: React.FC = () => {
    const { data: session } = useSession();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        if (!socketRef.current) {
            socketRef.current = io({
                path: '/api/socket',
                auth: {
                    name: session?.user?.name ?? 'Anonymous',
                },
            });
        }

        const s = socketRef.current;
        const handleMessage = (message: ChatMessage) => {
            setMessages((prevMessages) => [...prevMessages, message]);
        };

        s?.on('message', handleMessage);

        return () => {
            s?.off('message', handleMessage);
            s?.disconnect();
            socketRef.current = null;
        };
    }, [session?.user?.name]);

    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        const text = input.trim();
        if (!text) return;

        const payload: ChatMessage = {
            user: session?.user?.name ?? 'Anonymous',
            text,
        };

        socketRef.current?.emit('message', payload);
        setInput('');
    };

    return (
        <section className="relative h-full">
            <div className="card h-full flex flex-col bg-white/50">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 && (
                        <p className="text-sm text-gray-600">No messages yet. Say hello! 👋</p>
                    )}
                    {messages.map((msg, index) => (
                        <div key={index} className="flex items-start gap-2">
                            <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                            <div className="leading-relaxed">
                                <span className="font-semibold text-gray-800">{msg.user}</span>
                                <span className="ml-2 text-gray-700">{msg.text}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Floating input bar */}
            <form onSubmit={sendMessage} className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-1/2">
                <div className="container">
                    <div className="pointer-events-auto mx-auto max-w-3xl flex items-center gap-2 bg-white/80 backdrop-blur rounded-full shadow-glass border border-white/40 p-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="input-base bg-transparent"
                            placeholder="Type your message..."
                            aria-label="Message"
                        />
                        <button type="submit" className="btn-primary rounded-full px-5 py-2">Send</button>
                    </div>
                </div>
            </form>
        </section>
    );
};

export default Chat;