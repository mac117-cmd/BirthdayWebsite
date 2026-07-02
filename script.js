const BIRTHDAY_TIME = new Date("2026-07-03T00:00:00+05:30");
const BIRTHDAY_KEY = "sanju-birthday-2026";

const page = document.querySelector(".page");
const countdown = document.getElementById("countdown");
const wish = document.getElementById("wish");
const headline = document.getElementById("headline");
const subline = document.getElementById("subline");
const notifyButton = document.getElementById("notifyButton");
const notifyStatus = document.getElementById("notifyStatus");
const petalField = document.getElementById("petalField");
const fireworksCanvas = document.getElementById("fireworksCanvas");
const fireworksContext = fireworksCanvas.getContext("2d");
const fields = {
  days: document.getElementById("days"),
  hours: document.getElementById("hours"),
  minutes: document.getElementById("minutes"),
  seconds: document.getElementById("seconds"),
};

let birthdayIsShowing = false;
let reminderTimer = 0;
let notificationSent = localStorage.getItem(`${BIRTHDAY_KEY}:notified`) === "yes";
let reminderEnabled = localStorage.getItem(`${BIRTHDAY_KEY}:reminder`) === "yes";
let serviceWorkerRegistration = null;
let soundContext = null;
const openedBeforeBirthday = Date.now() < BIRTHDAY_TIME.getTime();
const fireworks = {
  rockets: [],
  sparks: [],
  running: false,
  nextLaunch: 0,
};
const fireworkColors = ["#ffd166", "#ff6f91", "#ffffff", "#7fd87f", "#ff9a7a", "#9bd7ff"];
const previewMode = new URLSearchParams(window.location.search).get("celebrate") === "1";

function pad(value) {
  return String(value).padStart(2, "0");
}

function getRemainingParts() {
  const remaining = previewMode ? 0 : Math.max(0, BIRTHDAY_TIME.getTime() - Date.now());
  const totalSeconds = Math.floor(remaining / 1000);

  return {
    remaining,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function updateCountdown() {
  const parts = getRemainingParts();

  if (parts.remaining <= 0) {
    showBirthday({ notify: openedBeforeBirthday && !previewMode });
    return;
  }

  fields.days.textContent = pad(parts.days);
  fields.hours.textContent = pad(parts.hours);
  fields.minutes.textContent = pad(parts.minutes);
  fields.seconds.textContent = pad(parts.seconds);
}

function showBirthday({ notify = false } = {}) {
  if (birthdayIsShowing) {
    return;
  }

  birthdayIsShowing = true;
  page.classList.add("birthday-mode");
  countdown.hidden = true;
  wish.hidden = false;
  headline.textContent = "Sanju's party is here";
  subline.textContent = "The countdown is over. Let the birthday sparkle begin.";
  notifyButton.disabled = true;
  notifyButton.querySelector("span:last-child").textContent = "Birthday wish is open";
  notifyStatus.textContent = "Happy birthday time has arrived.";
  createPetals(90);
  startFireworks();

  if (notify) {
    sendBirthdayNotification();
  }
}

function createPetals(count) {
  if (petalField.children.length) {
    return;
  }

  const colors = ["#ff6f91", "#ff9a7a", "#ffd166", "#fff6f0", "#f8a6c5", "#7fd87f"];
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < count; i += 1) {
    const petal = document.createElement("span");
    const size = 10 + Math.random() * 18;
    petal.className = "petal";
    petal.style.setProperty("--size", `${size}px`);
    petal.style.setProperty("--start-x", `${Math.random() * 100}vw`);
    petal.style.setProperty("--drift", `${-14 + Math.random() * 28}vw`);
    petal.style.setProperty("--duration", `${9 + Math.random() * 9}s`);
    petal.style.setProperty("--delay", `${Math.random() * -14}s`);
    petal.style.setProperty("--petal-color", colors[Math.floor(Math.random() * colors.length)]);
    fragment.appendChild(petal);
  }

  petalField.appendChild(fragment);
}

function resizeFireworksCanvas() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  fireworksCanvas.width = Math.floor(window.innerWidth * pixelRatio);
  fireworksCanvas.height = Math.floor(window.innerHeight * pixelRatio);
  fireworksContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function launchFirework() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const targetX = width * (0.16 + Math.random() * 0.68);
  const targetY = height * (0.12 + Math.random() * 0.34);
  const startX = width * (0.2 + Math.random() * 0.6);
  const frames = 34 + Math.random() * 18;

  fireworks.rockets.push({
    x: startX,
    y: height + 20,
    previousX: startX,
    previousY: height + 20,
    velocityX: (targetX - startX) / frames,
    velocityY: (targetY - height) / frames,
    life: frames,
    color: fireworkColors[Math.floor(Math.random() * fireworkColors.length)],
  });
}

function explodeFirework(x, y, color) {
  const sparkCount = 86 + Math.floor(Math.random() * 34);

  for (let i = 0; i < sparkCount; i += 1) {
    const angle = (Math.PI * 2 * i) / sparkCount + Math.random() * 0.18;
    const speed = 1.8 + Math.random() * 6.8;
    const life = 62 + Math.random() * 52;

    fireworks.sparks.push({
      x,
      y,
      previousX: x,
      previousY: y,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
      life,
      maxLife: life,
      size: 1.6 + Math.random() * 3.2,
      color: Math.random() > 0.78 ? "#ffffff" : color,
      crackle: Math.random() > 0.72,
    });
  }

  playFirecrackerSound();
}

function drawFireworks() {
  fireworksContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
  fireworksContext.globalCompositeOperation = "lighter";
  fireworksContext.lineCap = "round";

  for (let i = fireworks.rockets.length - 1; i >= 0; i -= 1) {
    const rocket = fireworks.rockets[i];
    rocket.previousX = rocket.x;
    rocket.previousY = rocket.y;
    rocket.x += rocket.velocityX;
    rocket.y += rocket.velocityY;
    rocket.velocityY += 0.025;
    rocket.life -= 1;

    fireworksContext.strokeStyle = rocket.color;
    fireworksContext.lineWidth = 2.5;
    fireworksContext.beginPath();
    fireworksContext.moveTo(rocket.previousX, rocket.previousY);
    fireworksContext.lineTo(rocket.x, rocket.y);
    fireworksContext.stroke();

    if (rocket.life <= 0 || rocket.velocityY >= 0) {
      fireworks.rockets.splice(i, 1);
      explodeFirework(rocket.x, rocket.y, rocket.color);
    }
  }

  for (let i = fireworks.sparks.length - 1; i >= 0; i -= 1) {
    const spark = fireworks.sparks[i];
    const progress = spark.life / spark.maxLife;
    spark.previousX = spark.x;
    spark.previousY = spark.y;
    spark.x += spark.velocityX;
    spark.y += spark.velocityY;
    spark.velocityX *= 0.986;
    spark.velocityY = spark.velocityY * 0.986 + 0.055;
    spark.life -= 1;

    if (spark.life <= 0) {
      fireworks.sparks.splice(i, 1);
      continue;
    }

    fireworksContext.globalAlpha = Math.max(0, progress);
    fireworksContext.fillStyle = spark.crackle && Math.random() > 0.72 ? "#ffffff" : spark.color;
    fireworksContext.strokeStyle = fireworksContext.fillStyle;
    fireworksContext.lineWidth = Math.max(0.8, spark.size * progress);
    fireworksContext.shadowBlur = spark.crackle ? 18 : 12;
    fireworksContext.shadowColor = spark.color;
    fireworksContext.beginPath();
    fireworksContext.moveTo(spark.previousX, spark.previousY);
    fireworksContext.lineTo(spark.x, spark.y);
    fireworksContext.stroke();
    fireworksContext.beginPath();
    fireworksContext.arc(spark.x, spark.y, spark.size * progress, 0, Math.PI * 2);
    fireworksContext.fill();
  }

  fireworksContext.shadowBlur = 0;
  fireworksContext.globalAlpha = 1;
  fireworksContext.globalCompositeOperation = "source-over";
}

function animateFireworks(timestamp) {
  if (!fireworks.running) {
    return;
  }

  if (timestamp >= fireworks.nextLaunch) {
    launchFirework();
    fireworks.nextLaunch = timestamp + 380 + Math.random() * 520;
  }

  drawFireworks();
  window.requestAnimationFrame(animateFireworks);
}

function startFireworks() {
  if (fireworks.running || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  resizeFireworksCanvas();
  fireworks.running = true;
  fireworks.nextLaunch = 0;

  [
    [0.2, 0.24],
    [0.82, 0.22],
    [0.34, 0.34],
    [0.66, 0.32],
  ].forEach(([x, y], index) => {
    window.setTimeout(() => {
      explodeFirework(
        window.innerWidth * x,
        window.innerHeight * y,
        fireworkColors[index % fireworkColors.length],
      );
    }, index * 170);
  });

  for (let i = 0; i < 5; i += 1) {
    window.setTimeout(launchFirework, i * 180);
  }

  window.requestAnimationFrame(animateFireworks);
}

function armCelebrationSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    return;
  }

  if (!soundContext) {
    soundContext = new AudioContext();
  }

  if (soundContext.state === "suspended") {
    soundContext.resume();
  }
}

function playFirecrackerSound() {
  if (!soundContext || soundContext.state !== "running") {
    return;
  }

  const duration = 0.16 + Math.random() * 0.08;
  const sampleCount = Math.floor(soundContext.sampleRate * duration);
  const noise = soundContext.createBuffer(1, sampleCount, soundContext.sampleRate);
  const data = noise.getChannelData(0);

  for (let i = 0; i < sampleCount; i += 1) {
    const fade = 1 - i / sampleCount;
    data[i] = (Math.random() * 2 - 1) * fade * fade;
  }

  const source = soundContext.createBufferSource();
  const filter = soundContext.createBiquadFilter();
  const gain = soundContext.createGain();
  const pop = soundContext.createOscillator();
  const popGain = soundContext.createGain();
  const now = soundContext.currentTime;

  source.buffer = noise;
  filter.type = "highpass";
  filter.frequency.setValueAtTime(720, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  pop.type = "triangle";
  pop.frequency.setValueAtTime(120, now);
  pop.frequency.exponentialRampToValueAtTime(48, now + 0.12);
  popGain.gain.setValueAtTime(0.0001, now);
  popGain.gain.exponentialRampToValueAtTime(0.11, now + 0.01);
  popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(soundContext.destination);
  pop.connect(popGain);
  popGain.connect(soundContext.destination);

  source.start(now);
  source.stop(now + duration);
  pop.start(now);
  pop.stop(now + 0.15);
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    return null;
  }

  if (serviceWorkerRegistration) {
    return serviceWorkerRegistration;
  }

  serviceWorkerRegistration = await navigator.serviceWorker.register("sw.js");
  return serviceWorkerRegistration;
}

function scheduleReminder() {
  window.clearTimeout(reminderTimer);

  const delay = BIRTHDAY_TIME.getTime() - Date.now();
  if (!reminderEnabled || delay <= 0 || Notification.permission !== "granted") {
    return;
  }

  reminderTimer = window.setTimeout(() => {
    showBirthday({ notify: true });
  }, delay + 250);
}

async function sendBirthdayNotification() {
  if (!("Notification" in window) || Notification.permission !== "granted" || notificationSent) {
    return;
  }

  notificationSent = true;
  localStorage.setItem(`${BIRTHDAY_KEY}:notified`, "yes");

  const options = {
    body: "Open the website now. Sanju's birthday party has started.",
    icon: "assets/sanju-icon-512.png",
    badge: "assets/sanju-icon-512.png",
    tag: BIRTHDAY_KEY,
    renotify: true,
    requireInteraction: true,
  };

  try {
    const registration = await registerServiceWorker();
    if (registration) {
      await registration.showNotification("Sanju's birthday is here", options);
      return;
    }
  } catch (error) {
    console.warn("Service worker notification failed.", error);
  }

  new Notification("Sanju's birthday is here", options);
}

async function enableReminder() {
  armCelebrationSound();

  if (!("Notification" in window)) {
    notifyStatus.textContent = "This browser does not support notifications.";
    notifyButton.disabled = true;
    return;
  }

  if (!window.isSecureContext) {
    notifyStatus.textContent = "Open this from HTTPS or localhost to enable the reminder.";
    return;
  }

  try {
    await registerServiceWorker();
  } catch (error) {
    notifyStatus.textContent = "The reminder could not be prepared in this browser.";
    console.warn("Service worker registration failed.", error);
    return;
  }

  const permission = Notification.permission === "default"
    ? await Notification.requestPermission()
    : Notification.permission;

  if (permission === "granted") {
    reminderEnabled = true;
    localStorage.setItem(`${BIRTHDAY_KEY}:reminder`, "yes");
    notifyStatus.textContent = "Reminder is ready for midnight.";
    notifyButton.querySelector("span:last-child").textContent = "Midnight reminder enabled";
    notifyButton.disabled = true;
    scheduleReminder();
    return;
  }

  notifyStatus.textContent = "Notifications are blocked for this site.";
}

function updateReminderUi() {
  if (!("Notification" in window)) {
    notifyStatus.textContent = "Notifications are unavailable in this browser.";
    notifyButton.disabled = true;
    return;
  }

  if (Date.now() >= BIRTHDAY_TIME.getTime()) {
    notifyButton.disabled = true;
    notifyButton.querySelector("span:last-child").textContent = "Birthday wish is open";
    return;
  }

  if (!window.isSecureContext) {
    notifyStatus.textContent = "Use HTTPS or localhost for the midnight reminder.";
    return;
  }

  if (Notification.permission === "granted" && reminderEnabled) {
    notifyStatus.textContent = "Reminder is ready for midnight.";
    notifyButton.querySelector("span:last-child").textContent = "Midnight reminder enabled";
    notifyButton.disabled = true;
    scheduleReminder();
    return;
  }

  if (Notification.permission === "denied") {
    notifyStatus.textContent = "Notifications are blocked for this site.";
  }
}

notifyButton.addEventListener("click", enableReminder);
document.addEventListener("pointerdown", armCelebrationSound, { once: true });
document.addEventListener("keydown", armCelebrationSound, { once: true });
window.addEventListener("resize", resizeFireworksCanvas);

updateCountdown();
updateReminderUi();
window.setInterval(updateCountdown, 1000);
document.addEventListener("visibilitychange", updateCountdown);
