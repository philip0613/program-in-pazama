'use client';
import { useState, useEffect } from 'react';

export default function Home() {
    const [message, setMessage] = useState('');
    const [savedMessages, setSavedMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchMessages = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/message');
            const data = await res.json();
            if (Array.isArray(data)) setSavedMessages(data);
        } catch (error) {
            console.error("데이터를 불러오지 못했습니다.", error);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message) return;

        await fetch('/api/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: message }),
        });

        setMessage(''); 
        fetchMessages(); 
    };

    return (
        <div style={{ padding: '50px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
            <h1 style={{ color: '#333', textAlign: 'center' }}>DB 연결 테스트 사이트 🚀</h1>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '30px', marginTop: '20px' }}>
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="테스트 글을 입력해보세요"
                    style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none' }}
                />
                <button type="submit" style={{ padding: '12px 24px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                    저장하기
                </button>
            </form>

            <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '12px' }}>
                <h2 style={{ fontSize: '18px', marginBottom: '15px', color: '#555' }}>저장된 데이터 목록</h2>
                
                {isLoading ? (
                    <p style={{ color: '#888' }}>로딩 중...</p>
                ) : savedMessages.length === 0 ? (
                    <p style={{ color: '#888' }}>아직 데이터가 없습니다.</p>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {savedMessages.map((msg) => (
                            <li key={msg.id} style={{ padding: '12px', borderBottom: '1px solid #e0e0e0', color: '#222' }}>
                                {msg.content}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
