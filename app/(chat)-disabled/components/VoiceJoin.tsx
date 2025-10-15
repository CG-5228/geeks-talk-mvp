"use client";

import React from 'react';

const VoiceJoin: React.FC = () => {
    const handleJoinVoiceRoom = () => {
        // Logic to join the voice room
    };

    return (
        <aside className="card relative overflow-hidden">
            <div className="absolute inset-0 rounded-2xl bg-animated opacity-20" aria-hidden />
            <div className="relative z-10">
                <h2 className="text-xl font-semibold mb-2">Join Voice Room</h2>
                <p className="text-sm text-gray-600 mb-4">Voice unlocks after your first approved message.</p>
                <button
                    onClick={handleJoinVoiceRoom}
                    className="btn-glow rounded-full px-6 py-2"
                >
                    Join Now
                </button>
            </div>
        </aside>
    );
};

export default VoiceJoin;