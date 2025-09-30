// --- IndexedDB Setup ---
let dbPromise = indexedDB.open("ToDoDB", 3); 



dbPromise.onupgradeneeded = function (event) {
  let db = event.target.result;
  if (!db.objectStoreNames.contains("Tasks")) {
    let store = db.createObjectStore("Tasks", { keyPath: "id", autoIncrement: true });
    store.createIndex("title", "title", { unique: false });
  }
};

dbPromise.onerror = () => console.log("DB Error");

// --- Elements ---
const taskForm = document.getElementById("taskForm");
const taskList = document.getElementById("taskList");

// --- Load Dropdowns ---
(function initDateSelectors() {
  let daySel = document.getElementById("day");
  let monthSel = document.getElementById("month");
  let yearSel = document.getElementById("year");

  for (let d = 1; d <= 31; d++) {
    daySel.innerHTML += `<option>${String(d).padStart(2, "0")}</option>`;
  }

  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];
  months.forEach((m, i) => {
    monthSel.innerHTML += `<option value="${i}">${m}</option>`;
  });

  let currentYear = new Date().getFullYear();
  for (let y = currentYear; y <= currentYear + 5; y++) {
    yearSel.innerHTML += `<option>${y}</option>`;
  }
})();

// --- Add Task ---
taskForm.onsubmit = function (e) {
  e.preventDefault();

  let task = {
    title: document.getElementById("title").value,
    hours: parseInt(document.getElementById("hours").value),
    minutes: parseInt(document.getElementById("minutes").value),
    day: parseInt(document.getElementById("day").value),
    month: parseInt(document.getElementById("month").value),
    year: parseInt(document.getElementById("year").value),
    notified: false
  };

  let req = indexedDB.open("ToDoDB", 3);
  req.onsuccess = function (event) {
    let db = event.target.result;
    let tx = db.transaction("Tasks", "readwrite");
    tx.objectStore("Tasks").add(task);
    tx.oncomplete = () => loadTasks();
  };
};

// --- Load Tasks ---
function loadTasks() {
  let req = indexedDB.open("ToDoDB", 3);
  req.onsuccess = function (event) {
    let db = event.target.result;
    let tx = db.transaction("Tasks", "readonly");
    let store = tx.objectStore("Tasks");
    store.getAll().onsuccess = function (e) {
      renderTasks(e.target.result);
    };
  };
}

function renderTasks(tasks) {
  taskList.innerHTML = "";
  tasks.forEach(task => {
    let li = document.createElement("li");
    li.innerHTML = `
      <span class="${task.notified ? "task-done" : ""}">
        ${task.title} (${task.day}/${task.month+1}/${task.year} 
        ${task.hours}:${String(task.minutes).padStart(2,"0")})
      </span>
      <button onclick="removeTask(${task.id})">❌</button>
    `;
    taskList.appendChild(li);
  });
}

// --- Remove Task ---
function removeTask(id) {
  let req = indexedDB.open("ToDoDB", 3);
  req.onsuccess = function (event) {
    let db = event.target.result;
    let tx = db.transaction("Tasks", "readwrite");
    tx.objectStore("Tasks").delete(id);
    tx.oncomplete = () => loadTasks();
  };
}

// --- Notifications ---
if ("Notification" in window) {
  Notification.requestPermission();
}

function notifyTask(task) {
  if (Notification.permission === "granted") {
    new Notification("Task Reminder", {
      body: `${task.title} at ${task.hours}:${task.minutes}`,
    });
  }
}

// --- Check Tasks ---
function checkTasks() {
  let req = indexedDB.open("ToDoDB",3);
  req.onsuccess = function (event) {
    let db = event.target.result;
    let tx = db.transaction("Tasks", "readwrite");
    let store = tx.objectStore("Tasks");
    store.getAll().onsuccess = function (e) {
      let tasks = e.target.result;
      let now = new Date();
      tasks.forEach(task => {
        let taskTime = new Date(task.year, task.month, task.day, task.hours, task.minutes);
        if (!task.notified && now >= taskTime) {
          notifyTask(task);
          task.notified = true;
          store.put(task); // update
        }
      });
      loadTasks();
    };
  };
}

setInterval(checkTasks, 10000); // check every 10s
loadTasks();
