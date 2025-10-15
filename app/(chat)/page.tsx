import React from 'react';
import Chat from './components/Chat';
import VoiceJoin from './components/VoiceJoin';

export default function ChatPage() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[70vh]">
            <div className="lg:col-span-2">
                <Chat />
            </div>
            <div>
                <VoiceJoin />
            </div>
        </div>
    );
}