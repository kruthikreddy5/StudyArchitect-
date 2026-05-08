// --- CONFIGURATION ---
// IMPORTANT: If testing locally, replace these with your actual keys!
// If deploying to GitHub, keep these placeholders for the GitHub Action.
const SUPABASE_URL = "___SUPABASE_URL___"; 
const SUPABASE_KEY = "___SUPABASE_KEY___";
const GEMINI_API_KEY = "___GEMINI_API_KEY___";

// FIXED: Changed variable name to 'supabaseClient' to avoid conflict
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- AI ENGINE ---
async function sendMessage(overridePrompt = null) {
    const inputField = document.getElementById('user-input');
    const chatOutput = document.getElementById('chat-output');
    const prompt = overridePrompt || inputField.value;

    if (!prompt) return;
    if (GEMINI_API_KEY.includes("___")) {
        chatOutput.innerHTML += `<p style="color:red"><b>Error:</b> API Key not set. Paste your key in app.js for local testing!</p>`;
        return;
    }

    chatOutput.innerHTML += `<p><b>You:</b> ${prompt}</p>`;
    inputField.value = "";

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        const aiText = data.candidates[0].content.parts[0].text;
        
        chatOutput.innerHTML += `<p><b>AI:</b> ${aiText}</p>`;
        chatOutput.scrollTop = chatOutput.scrollHeight;

        if (aiText.includes("TASKS:")) {
            parseTasks(aiText);
        }
    } catch (error) {
        console.error(error);
        chatOutput.innerHTML += `<p style="color:red">Error connecting to the brain. Check Console (F12).</p>`;
    }
}

// --- AUTO-TASKING PARSER ---
async function parseTasks(text) {
    const taskMatch = text.match(/TASKS: \[(.*?)\]/);
    if (taskMatch) {
        const tasks = taskMatch[1].split(',');
        for (let t of tasks) {
            await supabaseClient.from('tasks').insert([
                { user_id: 'Kruthik', task: t.trim(), is_completed: false }
            ]);
        }
        loadTasks();
    }
}

// --- SUPABASE TASK HANDLER ---
async function loadTasks() {
    if (SUPABASE_KEY.includes("___")) {
        document.getElementById('task-list').innerText = "Supabase keys missing. Connect to see tasks.";
        return;
    }

    const { data, error } = await supabaseClient
        .from('tasks')
        .select('*')
        .eq('user_id', 'Kruthik')
        .order('id', { ascending: false });

    if (error) {
        console.error("Supabase Error:", error);
        return;
    }

    const taskList = document.getElementById('task-list');
    if (!data || data.length === 0) {
        taskList.innerHTML = "No missions assigned yet.";
    } else {
        taskList.innerHTML = data.map(t => `
            <div class="task-item">
                <input type="checkbox" ${t.is_completed ? 'checked' : ''} onchange="toggleTask(${t.id}, ${t.is_completed})">
                <span>${t.task}</span>
            </div>
        `).join('');
    }
}

async function toggleTask(id, currentStatus) {
    await supabaseClient.from('tasks').update({ is_completed: !currentStatus }).eq('id', id);
    loadTasks();
}

// --- POMODORO TIMER (This should work regardless of keys) ---
let timerInterval;
let timeLeft = 25 * 60;
let isRunning = false;

function toggleTimer() {
    const btn = document.getElementById('timer-btn');
    if (isRunning) {
        clearInterval(timerInterval);
        btn.innerText = "Start Session";
    } else {
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                alert("Session Complete! Take a break.");
            }
        }, 1000);
        btn.innerText = "Pause";
    }
    isRunning = !isRunning;
}

function updateTimerDisplay() {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    document.getElementById('timer').innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// --- VOICE-TO-TEXT ---
function handleVoice() {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.onresult = (event) => {
        document.getElementById('user-input').value = event.results[0][0].transcript;
    };
    recognition.start();
}

// --- PANIC MODE ---
function panicMode() {
    const topic = document.getElementById('user-input').value || "current subject";
    sendMessage(`PANIC MODE: I have 10 minutes. Give me the 5 most frequently asked questions and one-sentence answers for ${topic}.`);
}

// --- EXAM COUNTDOWN ---
function updateCountdown() {
    const examDate = new Date('2027-04-01'); 
    const now = new Date();
    const diff = examDate - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    document.getElementById('countdown').innerText = `${days} Days`;
}

// Initialize
window.onload = () => {
    loadTasks();
    updateCountdown();
};
