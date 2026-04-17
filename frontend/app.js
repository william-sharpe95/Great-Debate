const state = {
  user: null,
  topic: null,
  selectedSide: null,
  debate: null,
  polls: {
    status: null,
    messages: null
  }
};

const api = {
  register: "/api/register",
  user: (id) => `/api/user/${id}`,
  topic: "/api/topic",
  joinQueue: "/api/join-queue",
  matchStatus: (userId) => `/api/match-status?user_id=${userId}`,
  debate: (id) => `/api/debate/${id}`,
  messages: (debateId) => `/api/messages?debate_id=${debateId}`,
  postMessage: "/api/messages",
  leave: "/api/leave",
  leaderboard: "/api/leaderboard",
  analytics: "/api/analytics",
  recentDebates: "/api/recent-debates"
};

const dom = {
  loginOverlay: document.getElementById("loginOverlay"),
  loginForm: document.getElementById("loginForm"),
  usernameInput: document.getElementById("usernameInput"),
  userBadge: document.getElementById("userBadge"),
  userRating: document.getElementById("userRating"),
  userTier: document.getElementById("userTier"),
  topicDate: document.getElementById("topicDate"),
  topicTitle: document.getElementById("topicTitle"),
  topicDescription: document.getElementById("topicDescription"),
  sidesContainer: document.getElementById("sidesContainer"),
  queueBtn: document.getElementById("joinQueueBtn"),
  queueNote: document.getElementById("queueNote"),
  matchStatus: document.getElementById("matchStatus"),
  leaderboardList: document.getElementById("leaderboardList"),
  analyticsTopicCount: document.getElementById("analyticsTopicCount"),
  analyticsWinnerBySide: document.getElementById("analyticsWinnerBySide"),
  debateSection: document.getElementById("debateSection"),
  resultSection: document.getElementById("resultSection"),
  debateTitle: document.getElementById("debateTitle"),
  debateStatus: document.getElementById("debateStatus"),
  debateTimer: document.getElementById("debateTimer"),
  participantA: document.getElementById("participantA"),
  participantB: document.getElementById("participantB"),
  messageList: document.getElementById("messageList"),
  messageForm: document.getElementById("messageForm"),
  messageInput: document.getElementById("messageInput"),
  leaveBtn: document.getElementById("leaveBtn"),
  resultWinner: document.getElementById("resultWinner"),
  resultSummary: document.getElementById("resultSummary"),
  resultVotes: document.getElementById("resultVotes"),
  recentDebatesList: document.getElementById("recentDebatesList")
};

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function setStatus(message, variant = "info") {
  dom.matchStatus.textContent = message;
  dom.matchStatus.className = `match-status ${variant}`;
}

function showElement(el) {
  el.classList.remove("hidden");
}

function hideElement(el) {
  el.classList.add("hidden");
}

function updateUserPanel() {
  if (!state.user) return;
  dom.userBadge.textContent = `@${state.user.username}`;
  dom.userRating.textContent = `${state.user.rating} pts`;
  dom.userTier.textContent = state.user.tier;
}

function renderTopic(topic) {
  state.topic = topic;
  const date = new Date(topic.start_time);
  dom.topicDate.textContent = `Topic for ${date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}`;
  dom.topicTitle.textContent = topic.title;
  dom.topicDescription.textContent = topic.description;

  dom.sidesContainer.innerHTML = "";
  [topic.option_a, topic.option_b].forEach((text, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "side-btn";
    button.textContent = text;
    button.addEventListener("click", () => {
      state.selectedSide = index;
      dom.queueNote.textContent = `Ready: ${text}`;
      setStatus("Side selected. Join queue when you are ready.");
      Array.from(dom.sidesContainer.children).forEach((child, childIndex) => {
        child.classList.toggle("active", childIndex === index);
      });
    });
    dom.sidesContainer.appendChild(button);
  });
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || response.statusText || "Request failed");
  }
  return response.json();
}

async function loadUser() {
  const id = localStorage.getItem("great_debate_user_id");
  if (!id) {
    showElement(dom.loginOverlay);
    return;
  }
  try {
    const result = await fetchJson(api.user(id));
    state.user = result.user;
    updateUserPanel();
    hideElement(dom.loginOverlay);
  } catch (error) {
    localStorage.removeItem("great_debate_user_id");
    showElement(dom.loginOverlay);
  }
}

async function registerUser(username) {
  const result = await fetchJson(api.register, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username })
  });
  state.user = result.user;
  localStorage.setItem("great_debate_user_id", state.user.id);
  updateUserPanel();
  hideElement(dom.loginOverlay);
}

async function loadTopic() {
  const result = await fetchJson(api.topic);
  renderTopic(result.topic);
}

async function loadLeaderboard() {
  const result = await fetchJson(api.leaderboard);
  dom.leaderboardList.innerHTML = "";
  result.leaderboard.forEach((user, index) => {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `<span>${index + 1}. @${user.username}</span><strong>${user.rating}</strong>`;
    dom.leaderboardList.appendChild(row);
  });
}

async function loadAnalytics() {
  const result = await fetchJson(api.analytics);
  dom.analyticsTopicCount.innerHTML = result.topic_counts
    .map((item) => `<div class="stat"><strong>${item.debates}</strong><span>${item.topic}</span></div>`)
    .join("");
  dom.analyticsWinnerBySide.innerHTML = result.winner_by_side
    .map((item) => `<div class="row"><span>Side ${item.winner_side || "?"}</span><strong>${item.count}</strong></div>`)
    .join("");
}

async function loadRecentDebates() {
  const result = await fetchJson(api.recentDebates);
  dom.recentDebatesList.innerHTML = "";
  result.debates.slice(0, 5).forEach((debate) => {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `<span>${new Date(debate.ended_at).toLocaleDateString()}</span><strong>Winner Side ${debate.winner_side}</strong>`;
    dom.recentDebatesList.appendChild(row);
  });
}

function formatPartyLabel(sideIndex) {
  return sideIndex === 0 ? "Side A" : "Side B";
}

function renderCurrentDebate(debate) {
  state.debate = debate;
  showElement(dom.debateSection);
  hideElement(dom.resultSection);

  dom.debateTitle.textContent = debate.topic.title;
  dom.debateStatus.textContent = debate.status === "active" ? "Live Debate Room" : "Debate Ended";
  dom.debateTimer.textContent = debate.status === "active"
    ? `Started: ${formatDate(debate.started_at)}`
    : `Ended: ${formatDate(debate.ended_at)}`;

  dom.participantA.innerHTML = `<strong>@${debate.side_a.user.username}</strong><span>${debate.side_a.label}</span>`;
  dom.participantB.innerHTML = `<strong>@${debate.side_b.user.username}</strong><span>${debate.side_b.label}</span>`;
  renderMessages([]);
  fetchMessages();

  if (debate.status === "completed") {
    dom.messageForm.classList.add("hidden");
    showResult(debate);
  } else {
    dom.messageForm.classList.remove("hidden");
  }
}

function renderMessages(messages) {
  dom.messageList.innerHTML = "";
  messages.forEach((message) => {
    const tile = document.createElement("div");
    tile.className = `message-row ${message.side === 0 ? "message-sideA" : "message-sideB"}`;
    tile.innerHTML = `
      <div class="message-meta">
        <span class="message-author">@${message.username}</span>
        <span class="message-time">${new Date(message.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      <div class="message-content">${message.content}</div>
    `;
    dom.messageList.appendChild(tile);
  });
  dom.messageList.scrollTop = dom.messageList.scrollHeight;
}

async function fetchMessages() {
  if (!state.debate) return;
  try {
    const result = await fetchJson(api.messages(state.debate.id));
    renderMessages(result.messages);
  } catch (error) {
    console.error(error);
  }
}

async function pollMatchStatus() {
  if (!state.user) return;
  try {
    const result = await fetchJson(api.matchStatus(state.user.id));
    if (result.status === "matched") {
      const debate = result.debate;
      renderCurrentDebate(debate);
      if (dom.messageForm.classList.contains("hidden")) {
        dom.messageForm.classList.remove("hidden");
      }
      startMessagePolling();
    } else if (result.status === "queued") {
      setStatus("Waiting for an opposing debater to join your side.");
      if (state.polls.status === null) {
        state.polls.status = window.setTimeout(pollMatchStatus, 2000);
      }
    } else {
      setStatus("Choose a side and join the queue to start a new debate.");
      stopMessagePolling();
    }
  } catch (error) {
    console.error(error);
  }
}

function startMatchPolling() {
  if (state.polls.status) return;
  state.polls.status = window.setInterval(pollMatchStatus, 2500);
}

function stopMatchPolling() {
  if (state.polls.status) {
    window.clearInterval(state.polls.status);
    state.polls.status = null;
  }
}

function startMessagePolling() {
  if (state.polls.messages) return;
  state.polls.messages = window.setInterval(fetchMessages, 2500);
}

function stopMessagePolling() {
  if (state.polls.messages) {
    window.clearInterval(state.polls.messages);
    state.polls.messages = null;
  }
}

function showResult(debate) {
  showElement(dom.resultSection);
  dom.resultWinner.textContent = `Winner: Side ${debate.winner_side}`;
  dom.resultSummary.textContent = debate.summary || "No summary available.";
  dom.resultVotes.innerHTML = debate.judge_votes
    .map((vote) => `
      <div class="judge-card">
        <strong>${vote.judge}</strong>
        <span>${vote.winner}</span>
        <p>${vote.reason}</p>
      </div>
    `)
    .join("");
}

async function sendMessage(event) {
  event.preventDefault();
  if (!state.debate || state.debate.status !== "active") {
    return;
  }
  const content = dom.messageInput.value.trim();
  if (!content) return;
  dom.messageInput.value = "";
  setStatus("Sending your message...");
  try {
    await fetchJson(api.postMessage, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: state.user.id, debate_id: state.debate.id, content })
    });
    fetchMessages();
    setStatus("Message sent.");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function joinQueue() {
  if (state.selectedSide === null) {
    setStatus("Pick a side before joining the queue.", "error");
    return;
  }
  dom.queueBtn.disabled = true;
  dom.queueBtn.textContent = "Searching...";
  setStatus("Finding an opposing debater...");
  try {
    const result = await fetchJson(api.joinQueue, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: state.user.id, side: state.selectedSide })
    });
    if (result.matched) {
      renderCurrentDebate(result.debate);
      setStatus("Match found! Welcome to your private room.", "success");
      startMessagePolling();
    } else {
      setStatus("Queued. Waiting for a user on the other side.");
      startMatchPolling();
    }
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    dom.queueBtn.disabled = false;
    dom.queueBtn.textContent = "Join Debate Queue";
  }
}

async function leaveDebate() {
  if (!state.debate) return;
  try {
    const result = await fetchJson(api.leave, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: state.user.id, debate_id: state.debate.id })
    });
    renderCurrentDebate(result.debate);
    if (result.debate.status === "completed") {
      setStatus("Your debate ended and the judges have scored the transcript.");
      await refreshUser();
      loadLeaderboard();
    } else {
      setStatus("You have left the debate. Waiting for the opponent or automatic ending.", "warning");
    }
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function refreshUser() {
  if (!state.user) return;
  const result = await fetchJson(api.user(state.user.id));
  state.user = result.user;
  updateUserPanel();
}

function bindEvents() {
  dom.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = dom.usernameInput.value.trim();
    if (!username) return;
    await registerUser(username);
    await loadLeaderboard();
    loadAnalytics();
    loadRecentDebates();
  });
  dom.queueBtn.addEventListener("click", joinQueue);
  dom.messageForm.addEventListener("submit", sendMessage);
  dom.leaveBtn.addEventListener("click", leaveDebate);
}

async function init() {
  bindEvents();
  await loadUser();
  await loadTopic();
  await loadLeaderboard();
  await loadAnalytics();
  await loadRecentDebates();
  if (state.user) {
    pollMatchStatus();
    startMatchPolling();
  }
}

init().catch((error) => {
  console.error(error);
  setStatus("Unable to load the app. Check the backend connection.", "error");
});
