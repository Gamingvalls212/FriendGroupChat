let socket;
let username = "";

const joinScreen = document.getElementById("joinScreen");
const chatApp = document.getElementById("chatApp");
const usernameInput = document.getElementById("usernameInput");
const joinButton = document.getElementById("joinButton");
const messages = document.getElementById("messages");
const userList = document.getElementById("userList");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const imageInput = document.getElementById("imageInput");
const status = document.getElementById("status");

function addMessage(msg) {
  const div = document.createElement("div");
  div.className = "message";

  const name = document.createElement("div");
  name.className = "name";
  name.textContent = msg.username;

  const time = document.createElement("span");
  time.className = "time";
  time.textContent = new Date(msg.time).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });

  name.appendChild(time);
  div.appendChild(name);

  if (msg.text) {
    const text = document.createElement("div");
    text.className = "text";
    text.textContent = msg.text;
    div.appendChild(text);
  }

  if (msg.image) {
    const img = document.createElement("img");
    img.src = msg.image;
    img.alt = "Attached image";
    div.appendChild(img);
  }

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function addSystem(text) {
  const div = document.createElement("div");
  div.className = "system";
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function connect() {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";

  socket = new WebSocket(`${protocol}//${location.host}`);

  socket.addEventListener("open", () => {
    status.textContent = "Connected";

    socket.send(
      JSON.stringify({
        type: "join",
        username
      })
    );
  });

  socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "history") {
      messages.innerHTML = "";
      data.messages.forEach(addMessage);
    }

    if (data.type === "message") {
      addMessage(data);
    }

    if (data.type === "system") {
      addSystem(data.text);
    }

    if (data.type === "users") {
      userList.innerHTML = "";

      data.users.forEach((user) => {
        const li = document.createElement("li");
        li.textContent = "● " + user;
        userList.appendChild(li);
      });
    }
  });

  socket.addEventListener("close", () => {
    status.textContent = "Disconnected — reconnecting...";
    setTimeout(connect, 2000);
  });

  socket.addEventListener("error", () => {
    status.textContent = "Connection error";
  });
}

function sendMessage(image = null) {
  const text = messageInput.value.trim();

  if (!text && !image) return;

  if (!socket || socket.readyState !== WebSocket.OPEN) return;

  socket.send(
    JSON.stringify({
      type: "message",
      text,
      image
    })
  );

  messageInput.value = "";
}

joinButton.addEventListener("click", () => {
  username = usernameInput.value.trim();

  if (!username) {
    usernameInput.focus();
    return;
  }

  joinScreen.classList.add("hidden");
  chatApp.classList.remove("hidden");

  connect();
  messageInput.focus();
});

usernameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    joinButton.click();
  }
});

sendButton.addEventListener("click", () => {
  sendMessage();
});

messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];

  if (!file) return;

  if (file.size > 4 * 1024 * 1024) {
    alert("Image must be 4 MB or smaller.");
    imageInput.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    sendMessage(reader.result);
    imageInput.value = "";
  };

  reader.readAsDataURL(file);
});

document.addEventListener("paste", (e) => {
  const items = [...(e.clipboardData?.items || [])];

  const item = items.find((i) => i.type.startsWith("image/"));

  if (!item) return;

  const file = item.getAsFile();

  if (!file || file.size > 4 * 1024 * 1024) return;

  const reader = new FileReader();

  reader.onload = () => {
    sendMessage(reader.result);
  };

  reader.readAsDataURL(file);
});
