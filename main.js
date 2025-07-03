const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const keys = {};
let socket = new WebSocket("wss://game.glar.io");
socket.binaryType = "arraybuffer";

let playerId = null;
let player = { x: 0, y: 0 };
let objects = [];

let mouse = { x: 0, y: 0 };
let freeCam = false;
let camera = { x: 0, y: 0 };
let currentHat = 0;

const notify = (msg) => {
  const el = document.getElementById("notify");
  el.textContent = msg;
  el.style.display = "block";
  setTimeout(() => el.style.display = "none", 1000);
};

document.getElementById("freeCam").onchange = (e) => {
  freeCam = e.target.checked;
  notify("FreeCam: " + (freeCam ? "ON" : "OFF"));
};

document.getElementById("fastPlace").onchange = (e) => {
  notify("FastPlace: " + (e.target.checked ? "ON" : "OFF"));
};

document.getElementById("radius").onchange = (e) => {
  notify("Weapon Radius: " + (e.target.checked ? "ON" : "OFF"));
};

window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (e.code === "KeyR") {
    socket.send(new Uint8Array([3]));
    notify("Respawned");
  } else if (e.code === "KeyF") {
    freeCam = !freeCam;
    document.getElementById("freeCam").checked = freeCam;
    notify("FreeCam: " + (freeCam ? "ON" : "OFF"));
  } else if (e.code === "KeyX") {
    currentHat = (currentHat + 1) % 30;
    socket.send(new Uint8Array([7, currentHat]));
    notify("Hat: " + currentHat);
  }
});

window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

window.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

window.addEventListener("mousedown", () => {
  socket.send(new Uint8Array([4])); // Attack stub
});

socket.onopen = () => { console.log("[WS] Connected"); document.body.style.background = '#222'; };
socket.onmessage = (event) => { console.log('[WS] Message received', event.data);
  const data = new DataView(event.data);
  const type = data.getUint8(0);

  if (type === 1) {
    playerId = data.getUint32(1, true);
  } else if (type === 2) {
    objects = [];
    let offset = 1;
    while (offset + 12 <= data.byteLength) {
      const id = data.getUint32(offset, true); offset += 4;
      const x = data.getFloat32(offset, true); offset += 4;
      const y = data.getFloat32(offset, true); offset += 4;
      if (id === playerId) {
        player.x = x;
        player.y = y;
      }
      objects.push({ id, x, y });
    }
  }
};

function updateCamera() {
  if (!freeCam) {
    camera.x = player.x;
    camera.y = player.y;
  } else {
    if (keys["KeyW"]) camera.y -= 5;
    if (keys["KeyS"]) camera.y += 5;
    if (keys["KeyA"]) camera.x -= 5;
    if (keys["KeyD"]) camera.x += 5;
  }
}

function draw() { console.log('[DRAW] Frame');
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let obj of objects) {
    const screenX = canvas.width / 2 + (obj.x - camera.x);
    const screenY = canvas.height / 2 + (obj.y - camera.y);
    ctx.beginPath();
    ctx.fillStyle = obj.id === playerId ? "#0f0" : "#fff";
    ctx.arc(screenX, screenY, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  if (document.getElementById("radius").checked) {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255, 0, 0, 0.4)";
    ctx.lineWidth = 2;
    ctx.arc(canvas.width / 2, canvas.height / 2, 80, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function loop() {
  updateCamera();
  draw();
  requestAnimationFrame(loop);
}
loop();
