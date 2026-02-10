// app/static/app.js

const chatEl = document.getElementById("chat");
const statusEl = document.getElementById("status");
const formEl = document.getElementById("form");
const textEl = document.getElementById("text");
const micBtn = document.getElementById("micBtn");
const stopBtn = document.getElementById("stopBtn");
const ttsToggle = document.getElementById("ttsToggle");

let history = []; // [{role:"user"|"assistant", content:"..."}]

function addMsg(role, text) {
  const div = document.createElement("div");
  div.className = `msg ${role === "user" ? "user" : "ai"}`;
  div.textContent = text;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function setStatus(s) {
  statusEl.textContent = s;
}

async function callCoach(message) {
  setStatus("Calling coach...");
  const res = await fetch("/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t);
  }
  return await res.json();
}

function speak(text) {
  if (!ttsToggle.checked) return;
  if (!("speechSynthesis" in window)) return;

  // Cancel any ongoing speech to keep demo crisp
  window.speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.0;
  window.speechSynthesis.speak(u);
}

/** Build a friendly, structured coach message for the chat window */
function formatCoach(data) {
  return (
    `Coach:
${data.coach_reply}

Correction:
- ${data.correction}

Better sentence:
- ${data.better_sentence}

Explanation:
- ${data.explanation}`
  );
}

formEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = textEl.value.trim();
  if (!msg) return;

  addMsg("user", msg);
  history.push({ role: "user", content: msg });
  textEl.value = "";

  try {
    const data = await callCoach(msg);

    const formatted = formatCoach(data);
    addMsg("assistant", formatted);
    history.push({ role: "assistant", content: formatted });

    setStatus("Ready");

    // ✅ Speak FULL coaching response (not only the first line)
    const spokenText = `
${data.coach_reply}

Correction.
${data.correction}

A better sentence would be.
${data.better_sentence}

Explanation.
${data.explanation}
`.trim();

    speak(spokenText);
  } catch (err) {
    setStatus("Error (see console)");
    console.error(err);
    addMsg("assistant", "Error calling the coach API. Check console/logs.");
  }
});

// --- Voice input (Speech-to-Text) ---
let recognition = null;

function initRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const r = new SR();
  r.lang = "en-US";
  r.interimResults = true;
  r.continuous = false;
  return r;
}

recognition = initRecognition();

if (!recognition) {
  micBtn.disabled = true;
  micBtn.textContent = "Mic not supported in this browser";
} else {
  let finalTranscript = "";

  recognition.onstart = () => {
    finalTranscript = "";
    setStatus("Listening...");
    micBtn.disabled = true;
    stopBtn.disabled = false;
  };

  recognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalTranscript += t;
      else interim += t;
    }
    textEl.value = (finalTranscript + " " + interim).trim();
  };

  recognition.onerror = (e) => {
    console.error("SpeechRecognition error:", e);
    setStatus("Mic error");
    micBtn.disabled = false;
    stopBtn.disabled = true;
  };

  recognition.onend = () => {
    setStatus("Ready");
    micBtn.disabled = false;
    stopBtn.disabled = true;

    // Auto-send if we captured something
    const msg = textEl.value.trim();
    if (msg.length > 0) formEl.requestSubmit();
  };

  micBtn.addEventListener("click", () => recognition.start());
  stopBtn.addEventListener("click", () => recognition.stop());
}
