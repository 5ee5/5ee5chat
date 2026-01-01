const socket = io();

// =================== USERNAME ===================
// Get username from URL query parameter or localStorage
const urlParams = new URLSearchParams(window.location.search);
let username = urlParams.get('user') || localStorage.getItem('chatUsername');
if (!username) {
  username = prompt("Enter your username:").trim() || "Anonymous";
}
localStorage.setItem('chatUsername', username);
// Clean URL by removing query parameter
window.history.replaceState({}, document.title, window.location.pathname);

// =================== ELEMENTS ===================
const messages = document.getElementById('messages');
const chatForm = document.getElementById('chat-form');
const input = document.getElementById('message');
const clearBtn = document.getElementById('clear-btn');
const logoutBtn = document.getElementById('logout-btn');

// =================== HANDLE ENTER / SHIFT+ENTER ===================
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    if (e.shiftKey) {
      // Add newline
      const start = input.selectionStart;
      const end = input.selectionEnd;
      input.value = input.value.slice(0, start) + '\n' + input.value.slice(end);
      input.selectionStart = input.selectionEnd = start + 1;
      e.preventDefault();
    } else {
      // Send the message
      e.preventDefault();
      sendMessage();
    }
  }
});

// =================== SEND MESSAGE FUNCTION ===================
function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  socket.emit('chat message', { username, text });
  input.value = '';
  input.focus();
}

// Handle Send button
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  sendMessage();
});

// =================== FORMAT TIMESTAMP ===================
function formatTime(isoString) {
  const d = new Date(isoString);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

// =================== RECEIVE MESSAGE ===================
socket.on('chat message', (msg) => {
  const li = document.createElement('li');
  li.dataset.messageId = msg.id;

  const uname = document.createElement('span');
  uname.classList.add('username');
  uname.textContent = msg.username + ': ';
  li.appendChild(uname);

  const textSpan = document.createElement('span');
  textSpan.classList.add('message-text');
  textSpan.textContent = msg.text;
  li.appendChild(textSpan);

  // Add edited indicator
  if (msg.edited) {
    const edited = document.createElement('span');
    edited.classList.add('edited');
    edited.textContent = ' (edited)';
    li.appendChild(edited);
  }

  // Add timestamp
  if (msg.timestamp) {
    const time = document.createElement('span');
    time.classList.add('timestamp');
    time.textContent = ` [${formatTime(msg.timestamp)}]`;
    li.appendChild(time);
  }

  // Add edit and delete buttons (only for own messages)
  if (msg.username === username) {
    const btnContainer = document.createElement('div');
    btnContainer.classList.add('message-actions');

    const editBtn = document.createElement('button');
    editBtn.classList.add('edit-btn');
    editBtn.textContent = '✎';
    editBtn.addEventListener('click', () => editMessage(msg.id, msg.text));
    btnContainer.appendChild(editBtn);

    const delBtn = document.createElement('button');
    delBtn.classList.add('delete-btn');
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', () => deleteMessage(msg.id));
    btnContainer.appendChild(delBtn);

    li.appendChild(btnContainer);
  }

  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
});

// =================== DELETE MESSAGE ===================
function deleteMessage(id) {
  if (confirm('Delete this message?')) {
    socket.emit('delete message', id);
  }
}

socket.on('message deleted', (id) => {
  const li = document.querySelector(`li[data-message-id="${id}"]`);
  if (li) li.remove();
});

// =================== EDIT MESSAGE ===================
function editMessage(id, currentText) {
  const newText = prompt('Edit message:', currentText);
  if (newText !== null && newText.trim()) {
    socket.emit('edit message', { id, text: newText });
  }
}

socket.on('message edited', (data) => {
  const li = document.querySelector(`li[data-message-id="${data.id}"]`);
  if (li) {
    const textSpan = li.querySelector('.message-text');
    if (textSpan) textSpan.textContent = data.text;
    
    // Add edited indicator if not already there
    if (!li.querySelector('.edited')) {
      const edited = document.createElement('span');
      edited.classList.add('edited');
      edited.textContent = ' (edited)';
      li.insertBefore(edited, li.querySelector('.timestamp'));
    }
  }
});

// =================== CLEAR CHAT ===================
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    messages.innerHTML = '';
    socket.emit('clear chat');
  });
}

socket.on('chat cleared', () => {
  messages.innerHTML = '';
});

// =================== LOGOUT FUNCTION ===================
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('chatUsername');
    socket.disconnect();
    window.location.reload();
  });
}
