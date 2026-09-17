const SUPABASE_URL = 'https://bmegkgonjdektvywwnkx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Adv3RXQsXuA-sQT2Nudq-w_HbyIZ893';

// CDN을 통해 주입된 window.supabase 객체 초기화
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const messageList = document.getElementById('message-list');
const loadingText = document.getElementById('loading-text');
const errorBox = document.getElementById('error-box');

// 에러 화면 출력  함수
function showError(msg) {
    errorBox.textContent = `통신 에러: ${msg}`;
    errorBox.style.display = 'block';
}

// 1. 데이터 읽기 (Select)
async function loadMessages() {
    errorBox.style.display = 'none';
    loadingText.style.display = 'block';
    messageList.innerHTML = '';

    const { data, error } = await client
        .from('test_messages')
        .select('*')
        .order('created_at', { ascending: false });

    loadingText.style.display = 'none';

    if (error) {
        showError(error.message);
        return;
    }

    if (!data || data.length === 0) {
        loadingText.textContent = '저장된 데이터가 없습니다.';
        loadingText.style.display = 'block';
        return;
    }

    data.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.content;
        messageList.appendChild(li);
    });
}

// 2. 데이터 저장 (Insert)
messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = messageInput.value.trim();
    if (!content) return;

    const { error } = await client
        .from('test_messages')
        .insert([{ content }]);

    if (error) {
        showError(error.message);
        return;
    }

    messageInput.value = '';
    loadMessages();
});

// 초기 구동
loadMessages();