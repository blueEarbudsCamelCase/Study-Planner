const dashboardSection = document.getElementById("dashboardSection");
const scheduleSetupSection = document.getElementById("scheduleSetupSection");

// Define fetchIcalFeed globally
function fetchIcalFeed() {
  const icalUrl = localStorage.getItem('icalFeedUrl');
  if (!icalUrl) {
    console.error("No iCal URL found in localStorage.");
    return Promise.reject("No iCal URL found in localStorage.");
  }

  return fetch(`/proxy?url=${encodeURIComponent(icalUrl)}`)
    .then(response => response.text())
    .then(data => {
      if (!data) {
        console.error("No data received from the iCal feed.");
        throw new Error("No data received from the iCal feed.");
      }
      parseIcalFeed(data);
      return data; // Return the raw iCal data
    })
    .catch(error => {
      console.error('Error fetching iCal feed:', error);
      throw error;
    });
}

function checkIcalFeed() {
  const icalUrl = localStorage.getItem("icalFeedUrl");
  const userGrade = localStorage.getItem("userGrade");
  const dashboardSection = document.getElementById("dashboardSection");
  const scheduleSetupSection = document.getElementById("scheduleSetupSection");

  if (!icalUrl || !userGrade) {
    // Show the schedule setup section if no iCal feed or grade is saved
    dashboardSection.classList.add("hidden");
    scheduleSetupSection.classList.remove("hidden");
  } else {
    // Show the dashboard if both are saved
    dashboardSection.classList.remove("hidden");
    scheduleSetupSection.classList.add("hidden");
  }
}

document.getElementById('scheduleForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const icalUrl = document.getElementById('icalUrl').value;
  localStorage.setItem('icalFeedUrl', icalUrl);
  console.log("iCal URL saved:", icalUrl);
});


// Fetch the iCal feed when the page loads
const dashboardContainer = document.getElementById("dashboardContainer"); // Ensure this element exists
if (dashboardContainer) {
  checkIcalFeed();

  fetchIcalFeed()
    .then(() => {
      renderDashboardTasks({ scrollToToday: true });
      loadStudyTasks();
    })
    .catch(error => {
      console.error("Error fetching or parsing iCal feed:", error);
      // Optionally show an error message elsewhere if needed
    });
} else {
  console.error("dashboardContainer not found.");
}
//everything from here on is functional

// Helper function to parse iCal dates
function parseIcalDate(rawDate) {
  if (rawDate.includes('T')) {
    // Handle full date-time format (e.g., 20250423T193000Z)
    const year = parseInt(rawDate.substring(0, 4), 10);
    const month = parseInt(rawDate.substring(4, 6), 10) - 1; // Month is zero-based
    const day = parseInt(rawDate.substring(6, 8), 10);
    const hours = parseInt(rawDate.substring(9, 11), 10);
    const minutes = parseInt(rawDate.substring(11, 13), 10);
    const seconds = parseInt(rawDate.substring(13, 15), 10);
    return new Date(Date.UTC(year, month, day, hours, minutes, seconds)).toISOString();
  } else {
    // Handle date-only format (e.g., 20250422)
    const year = parseInt(rawDate.substring(0, 4), 10);
    const month = parseInt(rawDate.substring(4, 6), 10) - 1; // Month is zero-based
    const day = parseInt(rawDate.substring(6, 8), 10);
    return new Date(year, month, day).toISOString();
  }
}

window.parseIcalFeed = function parseIcalFeed(data) {
  if (!data) {
    console.error("No data provided to parseIcalFeed.");
    return;
  }

  const completedTasks = JSON.parse(localStorage.getItem("completedTasks") || "[]");
  const completedTaskKeys = completedTasks.map(task => `${task.summary}-${task.startDate}`);

  // Load previous edits
  const editedIcalTasks = JSON.parse(localStorage.getItem("editedIcalTasks") || "{}");

  const events = [];
  const lines = data.split('\n');
  let event = {};

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  lines.forEach(line => {
    if (line.startsWith('SUMMARY:')) {
      let summary = line.replace('SUMMARY:', '').trim();
      if (summary.includes('[')) {
        summary = summary.split('[')[0].trim();
      }
      event.summary = summary;
    }
    if (line.startsWith('DTSTART')) {
      const start = line.includes(':') ? line.split(':')[1].trim() : null;
      if (start) {
        event.startDate = parseIcalDate(start);
      }
    }
    if (line.startsWith('DTEND')) {
      const end = line.includes(':') ? line.split(':')[1].trim() : null;
      if (end) {
        event.endDate = parseIcalDate(end);
      }
    }
    if (line.trim() === 'END:VEVENT') {
      const taskKey = `${event.startDate}`;
      const eventStartDate = new Date(event.startDate);

      // Apply edits if present
      if (editedIcalTasks[taskKey]) {
        event.summary = editedIcalTasks[taskKey];
      }

      if (!completedTaskKeys.includes(`${event.summary}-${event.startDate}`) && eventStartDate >= sevenDaysAgo) {
        events.push(event);
      }
      event = {};
    }
  });

  localStorage.setItem("icalTasks", JSON.stringify(events));
  localStorage.setItem("completedTasks", JSON.stringify(completedTasks));
};

// Toggle study planning screen
// Get references to the settings button, popup, and dark mode toggle
const settingsBtn = document.getElementById("settingsBtn");
const settingsPopup = document.getElementById("settingsPopup");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const darkModeToggle = document.getElementById("darkModeToggle");
const darkModeLabel = darkModeToggle ? darkModeToggle.nextElementSibling : null; // Get the <span> label if present

// Toggle dark mode (guarded)
if (darkModeToggle) {
  darkModeToggle.addEventListener("change", () => {
    if (darkModeToggle.checked) {
      document.body.classList.add("dark-mode");
      localStorage.setItem("darkMode", "enabled");
      if (darkModeLabel) darkModeLabel.textContent = "Disable Dark Mode";
    } else {
      document.body.classList.remove("dark-mode");
      localStorage.setItem("darkMode", "disabled");
      if (darkModeLabel) darkModeLabel.textContent = "Enable Dark Mode";
    }
  });
}

// Load dark mode preference on page load
if (localStorage.getItem("darkMode") === "enabled") {
  document.body.classList.add("dark-mode");
  if (darkModeToggle) darkModeToggle.checked = true;
  if (darkModeLabel) darkModeLabel.textContent = "Disable Dark Mode";
} else {
  if (darkModeLabel) darkModeLabel.textContent = "Enable Dark Mode";
}

// --- Added: settings popup open/close handlers ---
function openSettingsPopup() {
  if (!settingsPopup) return;
  console.debug('[settings] openSettingsPopup called');
  settingsPopup.classList.remove("hidden");
  // Add outside click listener
  setTimeout(() => {
    document.addEventListener("mousedown", outsideSettingsClickListener);
  }, 0);
  // Add Escape key listener
  document.addEventListener("keydown", settingsEscapeListener);
}

function closeSettingsPopup() {
  if (!settingsPopup) return;
  console.debug('[settings] closeSettingsPopup called');
  settingsPopup.classList.add("hidden");
  document.removeEventListener("mousedown", outsideSettingsClickListener);
  document.removeEventListener("keydown", settingsEscapeListener);
}

function outsideSettingsClickListener(e) {
  const inner = settingsPopup.querySelector(".bg-white");
  if (!inner) return;
  if (!inner.contains(e.target)) {
    closeSettingsPopup();
  }
}

function settingsEscapeListener(e) {
  if (e.key === "Escape") {
    closeSettingsPopup();
  }
}

// Wire up the buttons (guard for missing elements)
if (settingsBtn) {
  settingsBtn.addEventListener("click", () => {
    console.debug('[settings] settingsBtn clicked');
    // Toggle visibility
    if (settingsPopup && settingsPopup.classList.contains("hidden")) {
      openSettingsPopup();
    } else {
      closeSettingsPopup();
    }
  });
}

if (closeSettingsBtn) {
  closeSettingsBtn.addEventListener("click", () => {
    closeSettingsPopup();
  });
}

const runButton = document.getElementById("runButton");
const studyScreen = document.getElementById('studyPlannerSection');
const runScreen = document.getElementById('runScreen');
const icalTasks = JSON.parse(localStorage.getItem("icalTasks") || "[]");
const startStudyBtn = document.getElementById("startStudyBtn");
const backToDashboardBtn = document.getElementById("backToDashboardBtn");
const backToPlanScreenBtn = document.getElementById('backToPlanScreenBtn');
const studyPlanDisplay = document.getElementById("studyPlanDisplay"); // Move this to the top
const mapButton = document.getElementById('mapButton');
const mapPopup = document.getElementById("mapPopup"); // Reference the task popup
let baseTimer = document.querySelector('.base-timer')

startStudyBtn.addEventListener("click", () => {
  dashboardSection.classList.add("hidden"); // Hide the dashboard section
  studyScreen.classList.remove("hidden"); // Show the study setup screen
  loadStudyTasks();
});

mapButton.addEventListener("click", () => {
  mapPopup.classList.remove("hidden");
});


  // MAP Practice Popup logic (match Task popup behavior)
  const mapTime = document.getElementById("mapTime");
  const mapZoneButtonGroup = document.getElementById("mapZoneButtonGroup");
  let mapSelectedZone = null;
  let mapTimeSelected = false;
  let mapZoneSelected = false;

  if (mapPopup && mapTime && mapZoneButtonGroup) {
    // Assign event listeners to time buttons
    mapPopup.querySelectorAll('.time-btn').forEach(btn => {
      btn.onclick = () => {
        mapTime.value = btn.textContent;
        mapTimeSelected = !!mapTime.value && parseInt(mapTime.value, 10) > 0;
        tryMapAutoSave();
      };
    });

    // Assign event listeners to zone buttons
    mapZoneButtonGroup.querySelectorAll('.zone-btn').forEach(btn => {
      btn.classList.remove('ring', 'ring-offset-2', 'ring-blue-300', 'ring-green-300', 'ring-red-300');
      btn.onclick = () => {
        mapSelectedZone = btn.dataset.zone;
        mapZoneSelected = true;
        mapZoneButtonGroup.querySelectorAll('.zone-btn').forEach(b => b.classList.remove('ring', 'ring-offset-2', 'ring-blue-300', 'ring-green-300', 'ring-red-300'));
        if (mapSelectedZone === "Independent") btn.classList.add('ring', 'ring-offset-2', 'ring-blue-300');
        if (mapSelectedZone === "Semi-Collaborative") btn.classList.add('ring', 'ring-offset-2', 'ring-green-300');
        if (mapSelectedZone === "Collaborative") btn.classList.add('ring', 'ring-offset-2', 'ring-red-300');
        tryMapAutoSave();
      };
    });

    // Listen for time input changes
    mapTime.oninput = () => {
      mapTimeSelected = !!mapTime.value && parseInt(mapTime.value, 10) > 0;
      tryMapAutoSave();
    };

    // Reset Save button on popup open
    document.getElementById("mapButton").addEventListener("click", () => {
      mapTime.value = "";
      mapSelectedZone = null;
      mapTimeSelected = false;
      mapZoneSelected = false;
      mapZoneButtonGroup.querySelectorAll('.zone-btn').forEach(b => b.classList.remove('ring', 'ring-offset-2', 'ring-blue-300', 'ring-green-300', 'ring-red-300'));
    });
  }

backToDashboardBtn.addEventListener("click", () => {
  studyScreen.classList.add("hidden"); // Hide the study planner section
  dashboardSection.classList.remove("hidden"); // Show the dashboard section
  studyPlanDisplay.innerHTML = '<p class="text-gray-500 italic">No tasks scheduled yet.</p>';
  runScreenTasks.innerHTML = '';

  updateMinutesLeftDisplay();
});

backToPlanScreenBtn.addEventListener("click", () => {
  runScreen.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  studyPlanDisplay.innerHTML = '<p class="text-gray-500 italic">No tasks scheduled yet.</p>';
  runScreenTasks.innerHTML = '';
  runButtonColorCheck();
  updateMinutesLeftDisplay();

  // Exit PiP mode if active
  if (document.pictureInPictureElement) {
    document.exitPictureInPicture().catch(error => {
      console.error("Error exiting Picture-in-Picture:", error);
    });
  }

  console.log("Study plan and run screen cleared.");

  // Fetch, parse, and reload tasks
  fetchIcalFeed()
    .then(() => {
      parseIcalFeed();
      loadStudyTasks();
    })
    .catch(error => {
      console.error("Error fetching or parsing tasks:", error);
    });
});


function openTaskPopup(task) {
  const taskPopup = document.getElementById("taskPopup");
  const taskTime = document.getElementById("taskTime");
  let selectedZone = null;
  let timeSelected = false;
  let zoneSelected = false;

  // Reset the popup fields
  taskTime.value = "";
  selectedZone = null;
  timeSelected = false;
  zoneSelected = false;

  // Assign event listeners to time buttons scoped to this popup
  taskPopup.querySelectorAll('.time-btn').forEach(btn => {
    // overwrite any previous handler to avoid leaking behavior
    btn.onclick = () => {
      taskTime.value = btn.textContent;
      timeSelected = !!taskTime.value && parseInt(taskTime.value, 10) > 0;
      tryAutoSave();
    };
  });

  // Highlight default button (none selected) - scope to this popup
  taskPopup.querySelectorAll('.zone-btn').forEach(btn => {
    btn.classList.remove('ring', 'ring-offset-2', 'ring-blue-300', 'ring-green-300', 'ring-red-300');
    btn.onclick = () => {
      selectedZone = btn.dataset.zone;
      zoneSelected = true;
      taskPopup.querySelectorAll('.zone-btn').forEach(b => b.classList.remove('ring', 'ring-offset-2', 'ring-blue-300', 'ring-green-300', 'ring-red-300'));
      if (selectedZone === "Independent") btn.classList.add('ring', 'ring-offset-2', 'ring-blue-300');
      if (selectedZone === "Semi-Collaborative") btn.classList.add('ring', 'ring-offset-2', 'ring-green-300');
      if (selectedZone === "Collaborative") btn.classList.add('ring', 'ring-offset-2', 'ring-red-300');
      tryAutoSave();
    };
  });

  // Show the popup
  taskPopup.classList.remove("hidden");

  // Close popup when clicking outside the inner box
  setTimeout(() => {
    document.addEventListener("mousedown", outsideClickListener);
  }, 0);

  function outsideClickListener(e) {
    if (!taskPopup.querySelector('.bg-white').contains(e.target)) {
      closePopup();
    }
  }

  function closePopup() {
    taskPopup.classList.add("hidden");
    document.removeEventListener("mousedown", outsideClickListener);
  }

  // Try to auto-save when both are selected
  function tryAutoSave() {
    console.log('[tryAutoSave] timeSelected:', timeSelected, 'zoneSelected:', zoneSelected);
    if (timeSelected && zoneSelected) {
      const estimatedTime = parseInt(taskTime.value, 10);
      console.log('[tryAutoSave] estimatedTime:', estimatedTime, 'selectedZone:', selectedZone);
      if (!estimatedTime || isNaN(estimatedTime) || estimatedTime <= 0) {
        alert("Please enter a valid estimated time.");
        return;
      }
      // Calculate the total time if this task is added
      const currentTotalMinutes = Array.from(studyPlanDisplay.children).reduce((sum, child) => {
        const taskTimeVal = parseInt(child.dataset.estimatedTime, 10) || 0;
        return sum + taskTimeVal;
      }, 0);

      if (currentTotalMinutes + estimatedTime > 60) {
        alert("This task would go past the end of the Study.");
        return;
      }
      console.log('[tryAutoSave] Saving task:', task, estimatedTime, selectedZone);
      addToAgenda(task, estimatedTime, selectedZone);
      task.estimatedTime = estimatedTime;
      task.zone = selectedZone;
      closePopup();
    }
  }
}

function runButtonColorCheck() {

  // Calculate the total time of tasks
  const totalMinutes = Array.from(studyPlanDisplay.children).reduce((sum, child) => {
    const estimatedTime = parseInt(child.dataset.estimatedTime, 10) || 0; // Use the dataset value
    return sum + estimatedTime;
  }, 0);

  console.log("Total Minutes:", totalMinutes);

  // Update the button's color based on the total time
  if (totalMinutes === 60) {
    runButton.classList.add("enabled");
    runButton.disabled = false;
  } else {
    runButton.classList.remove("enabled");
    runButton.disabled = true;
  }
}

function addToAgenda(task, estimatedTime, zone) {
  console.log("Adding task to agenda:", { task, estimatedTime, zone }); // Debugging log
  const totalMinutes = 63; // This isn't 60 min. intentionally because the part that calculates the proportional height doesn't count the padding and inevitably ends up putting tasks below the bottom of the container. 

  // Remove the placeholder text if it exists
  const placeholder = studyPlanDisplay.querySelector("p");
  if (placeholder) {
    placeholder.remove();
  }

  // Calculate the start time for the study session
  let studyStartTime;
  const studyPlanDisplayTasks = Array.from(studyPlanDisplay.children);

  if (studyPlanDisplayTasks.length === 0) {
    // If this is the first task, start 1 minute from now
    studyStartTime = new Date();
    studyStartTime.setMinutes(studyStartTime.getMinutes() + 1);
  } else {
    // If there are previous tasks, start after the last task's end time
    const lastTask = studyPlanDisplayTasks[studyPlanDisplayTasks.length - 1];
    const lastTaskEndTime = new Date(lastTask.dataset.endTime); // Retrieve the end time from the dataset
    studyStartTime = new Date(lastTaskEndTime);
  }
  //calculating end time
  const taskEndTime = new Date(studyStartTime);
  taskEndTime.setMinutes(taskEndTime.getMinutes() + estimatedTime);

  // Create a new agenda item
  const agendaItem = document.createElement("div");
  agendaItem.className = "p-2 mb-2 rounded text-white";
  agendaItem.dataset.startDate = task.startDate; // Store the startDate in the dataset
  agendaItem.dataset.estimatedTime = estimatedTime; // Store the estimated time directly in the dataset
  agendaItem.dataset.endTime = taskEndTime.toISOString(); // Store the end time in the dataset
  agendaItem.dataset.zone = zone; // Ensure the zone is stored in the dataset

  // Calculate the proportional height based on the estimated time
  const percentage = (estimatedTime / totalMinutes) * 100;
  agendaItem.style.flex = `0 0 ${percentage}%`; // Set height as a percentage of the total time

  switch (zone) {
    case "Independent":
      agendaItem.style.backgroundColor = "#3182ce"; // Blue
      break;
    case "Semi-Collaborative":
      agendaItem.style.backgroundColor = "#38a169"; // Green
      break;
    case "Collaborative":
      agendaItem.style.backgroundColor = "#e53e3e"; // Red
      break;
    default:
      agendaItem.style.backgroundColor = "#718096"; // Gray (fallback)
  }

  // Set the content of the agenda item
  agendaItem.innerHTML = `
      <span>${task.summary || "Unnamed Task"} - ${estimatedTime} min.     </span>
  
      <span class="text-sm text-gray-200">${studyStartTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${taskEndTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
    `;

  // Append the agenda item to the agenda box
  studyPlanDisplay.appendChild(agendaItem);

  runButtonColorCheck();
  updateMinutesLeftDisplay(); // <-- Add this line
}

// Utility to get all tasks (ical + custom)
function getAllTasks() {
  const completedTasks = JSON.parse(localStorage.getItem("completedTasks") || "[]");
  const completedTaskKeys = completedTasks.map(task => `${task.summary}-${task.startDate}`);

  const icalTasks = JSON.parse(localStorage.getItem("icalTasks") || "[]");
  const customTasks = JSON.parse(localStorage.getItem("customTasks") || "[]");

  // Filter out completed tasks from both sources
  const filteredIcalTasks = icalTasks.filter(
    t => !completedTaskKeys.includes(`${t.summary}-${t.startDate}`)
  );
  const filteredCustomTasks = customTasks.filter(
    t => !completedTaskKeys.includes(`${t.summary}-${t.startDate}`)
  );

  return [...filteredIcalTasks, ...filteredCustomTasks];
}

// Render dashboard tasks
function renderDashboardTasks({ scrollToToday = false } = {}) {
  const dashboardTasks = document.getElementById("dashboardTasks");
  dashboardTasks.innerHTML = "";
  const tasks = getAllTasks();
  if (tasks.length === 0) {
    dashboardTasks.innerHTML = "<li>No tasks scheduled yet.</li>";
    return;
  }
  const today = new Date();
  const tasksByDate = tasks.reduce((acc, task) => {
    const taskDate = new Date(task.startDate).toDateString();
    if (!acc[taskDate]) acc[taskDate] = [];
    acc[taskDate].push(task);
    return acc;
  }, {});
  const todayKey = today.toDateString();
  if (!tasksByDate[todayKey]) tasksByDate[todayKey] = [];
  let todayHeading = null;
  Object.keys(tasksByDate)
    .sort((a, b) => new Date(a) - new Date(b))
    .forEach(date => {
      const parsedDate = new Date(date);
      const dateHeading = document.createElement("h3");
      dateHeading.textContent = parsedDate.toDateString() === today.toDateString() ? "Today" : date;
      dateHeading.className = "font-bold text-lg mt-4 mb-2";
      dashboardTasks.appendChild(dateHeading);
      if (parsedDate.toDateString() === today.toDateString()) {
        todayHeading = dateHeading;
      }
      if (tasksByDate[date].length === 0 && parsedDate.toDateString() === today.toDateString()) {
        const placeholder = document.createElement("li");
        placeholder.textContent = "You've completed all of today's tasks. Great job!";
        placeholder.className = "text-gray-500 italic";
        dashboardTasks.appendChild(placeholder);
      }
      tasksByDate[date].forEach(task => {
        const li = document.createElement("li");
        li.className = "mb-1 flex items-center";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "mr-2";
        checkbox.addEventListener("change", () => {
          moveToCompleted(task, li, true);
          li.classList.add('fade-out');
          setTimeout(() => {
            renderDashboardTasks({ scrollToToday: true }); // Always refresh and scroll to today
          }, 500);
        });
        const button = document.createElement("button");
        button.className = "w-full text-left bg-gray-100 dark:bg-gray-800 dark:text-gray-200 p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700";
        button.textContent = task.summary || "Unnamed Event";
        button.onclick = () => openEditTaskPopup(task);
        li.appendChild(checkbox);
        li.appendChild(button);
        dashboardTasks.appendChild(li);
      });
    });
  // Scroll to today's heading
  if (todayHeading && scrollToToday) {
    setTimeout(() => {
      todayHeading.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 10);
  }
}

// Render study planner tasks (override to include custom tasks)
function loadStudyTasks() {
  const tasksList = document.getElementById("studyTasks");
  tasksList.innerHTML = "";
  const tasks = getAllTasks();
  if (tasks.length === 0) {
    tasksList.innerHTML = "<li>No events loaded yet.</li>";
    tasksList.style.display = "block";
    return;
  }
  tasksList.style.display = "block";
  const today = new Date();

  // Group tasks by date
  const tasksByDate = tasks.reduce((acc, task) => {
    const taskDate = new Date(task.startDate).toDateString(); // Group by date string
    if (!acc[taskDate]) {
      acc[taskDate] = [];
    }
    acc[taskDate].push(task);
    return acc;
  }, {});

  // Ensure "Today" header is always present
  const todayKey = today.toDateString();
  if (!tasksByDate[todayKey]) {
    tasksByDate[todayKey] = []; // Add an empty array for today if no tasks exist
  }

  let todayHeading = null;

  // Render tasks with headings
  Object.keys(tasksByDate)
    .sort((a, b) => new Date(a) - new Date(b)) // Sort dates chronologically
    .forEach(date => {
      const parsedDate = new Date(date);
      const dateHeading = document.createElement("h3");

      // Replace today's date with "Today"
      dateHeading.textContent = parsedDate.toDateString() === today.toDateString() ? "Today" : date;
      dateHeading.className = "font-bold text-lg mt-4 mb-2";
      tasksList.appendChild(dateHeading);

      if (parsedDate.toDateString() === today.toDateString()) {
        todayHeading = dateHeading;
      }

      if (tasksByDate[date].length === 0 && parsedDate.toDateString() === today.toDateString()) {
        // Add a placeholder if there are no tasks for today
        const placeholder = document.createElement("li");
        placeholder.textContent = "You've completed all of today's tasks. Great job!";
        placeholder.className = "text-gray-500 italic";
        tasksList.appendChild(placeholder);
      }

      tasksByDate[date].forEach(task => {
        const li = document.createElement("li");
        li.className = "mb-1 flex items-center";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "mr-2";
        checkbox.addEventListener("change", () => moveToCompleted(task, li));

        const button = document.createElement("button");
        button.className = "w-full text-left bg-gray-100 p-2 rounded hover:bg-gray-200";
        button.textContent = task.summary || "Unnamed Event";

        button.addEventListener("click", () => {
          openTaskPopup(task);
        });

        li.appendChild(checkbox);
        li.appendChild(button);

        // Scroll to today's tasks
        if (todayHeading) {
          setTimeout(() => {
            todayHeading.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 10); // Slight delay to ensure the DOM is fully updated before scrolling
        }

        tasksList.appendChild(li);
      });
    });
}

function playBeep() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = ctx.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.value = 880; // Hz
  oscillator.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.2); // 0.2 seconds beep
  oscillator.onended = () => ctx.close();
}

function moveToCompleted(task, taskElement, isDashboard = false) {
  console.log("[moveToCompleted] Called for:", task.summary, task.startDate, "isDashboard:", isDashboard);
  const completedTasks = JSON.parse(localStorage.getItem("completedTasks") || "[]");
  completedTasks.push(task);
  localStorage.setItem("completedTasks", JSON.stringify(completedTasks));

  // Remove from customTasks if present
  let customTasks = JSON.parse(localStorage.getItem("customTasks") || "[]");
  customTasks = customTasks.filter(t => !(t.startDate === task.startDate && t.summary === task.summary));
  localStorage.setItem("customTasks", JSON.stringify(customTasks));

  // Remove from iCal tasks if present
  let icalTasks = JSON.parse(localStorage.getItem("icalTasks") || "[]");
  icalTasks = icalTasks.filter(t => !(t.startDate === task.startDate && t.summary === task.summary));
  localStorage.setItem("icalTasks", JSON.stringify(icalTasks));

  if (taskElement) {
    // animation for ryland :) this animation adds a checkmark to the commpleted task. 
    const checkmark = document.createElement('div');
    checkmark.className = 'checkmark';
    taskElement.appendChild(checkmark);
    taskElement.classList.add('fade-out');
    setTimeout(() => {
      if (taskElement.parentElement) {
        taskElement.parentElement.removeChild(taskElement);
        console.log("[moveToCompleted] Task element removed from DOM");
      }
      if (isDashboard) {
        console.log("[moveToCompleted] Refreshing dashboard tasks");
        renderDashboardTasks({ scrollToToday: true });
      } else {
        console.log("[moveToCompleted] Refreshing study tasks");
        loadStudyTasks();
      }
    }, 500);
  } else {
    console.log("[moveToCompleted] No taskElement, refreshing both lists");
    renderDashboardTasks({ scrollToToday: true });
    loadStudyTasks();
  }
}

// Timer Constants
let TIME_LIMIT = 3600; // Set the timer duration in seconds
let timePassed = 0;
let timeLeft = TIME_LIMIT;
let timerInterval = null;

const FULL_DASH_ARRAY = 283; // Full circumference of the timer circle

// Format time as MM:SS
function formatTimeLeft(time) {
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

// Calculate the fraction of time left
function calculateTimeFraction() {
  const rawTimeFraction = timeLeft / TIME_LIMIT;
  return rawTimeFraction - (1 / TIME_LIMIT) * (1 - rawTimeFraction);
}

// Update the circle's dash array
function setCircleDasharray() {
  const circleDasharray = `${(calculateTimeFraction() * FULL_DASH_ARRAY).toFixed(0)} 283`;
  baseTimer
    .querySelector("#base-timer-path-remaining")
    .setAttribute("stroke-dasharray", circleDasharray);
}

function getFirstTaskDuration() {
  const firstTask = studyPlanDisplay.children[0];
  if (firstTask) {
    return parseInt(firstTask.dataset.estimatedTime, 10) || 0;
  }
  return 0;
}

function getSecondTaskDuration() {
  const firstTask = studyPlanDisplay.children[1];
  if (firstTask) {
    return parseInt(firstTask.dataset.estimatedTime, 10) || 0;
  }
  return 0;
}

function getThirdTaskDuration() {
  const firstTask = studyPlanDisplay.children[2];
  if (firstTask) {
    return parseInt(firstTask.dataset.estimatedTime, 10) || 0;
  }
  return 0;
}

function getFourthTaskDuration() {
  const firstTask = studyPlanDisplay.children[3];
  if (firstTask) {
    return parseInt(firstTask.dataset.estimatedTime, 10) || 0;
  }
  return 0;
}

function getFifthTaskDuration() {
  const firstTask = studyPlanDisplay.children[4];
  if (firstTask) {
    return parseInt(firstTask.dataset.estimatedTime, 10) || 0;
  }
  return 0;
}

function getSixthTaskDuration() {
  const firstTask = studyPlanDisplay.children[5];
  if (firstTask) {
    return parseInt(firstTask.dataset.estimatedTime, 10) || 0;
  }
  return 0;
}


function startTaskTimer(taskIndex) {
  const taskDurations = [
    getFirstTaskDuration(),
    getSecondTaskDuration(),
    getThirdTaskDuration(),
    getFourthTaskDuration(),
    getFifthTaskDuration(),
    getSixthTaskDuration(),
  ];

  // Check if the task exists
  if (taskIndex >= taskDurations.length || taskDurations[taskIndex] === 0) {
    console.log("No more tasks to start.");
    return; // Stop if there are no more tasks
  }

  TIME_LIMIT = taskDurations[taskIndex] * 60; // Convert minutes to seconds
  timePassed = 0;
  timeLeft = TIME_LIMIT;

  // Update the timer label
  baseTimer.querySelector("#base-timer-label").textContent = formatTimeLeft(timeLeft);
  setCircleDasharray();

  // Clear any existing timer
  clearInterval(timerInterval);

  // Start the timer
  timerInterval = setInterval(() => {
    timePassed += 1;
    timeLeft = TIME_LIMIT - timePassed;

    // Update the timer label
    baseTimer.querySelector("#base-timer-label").textContent = formatTimeLeft(timeLeft);

    // Update the circle dash array
    if (timeLeft > 0) {
      setCircleDasharray();
    } else {
      clearInterval(timerInterval); // Stop the timer
      playBeep(); // Play a beep sound
      console.log("Timer ended. Keeping the circle empty.");
      baseTimer
        .querySelector("#base-timer-path-remaining")
        .setAttribute("stroke-dasharray", "0 283"); // Keep the circle empty
    }
  }, 1000);
}

let runSessionTasks = [];


// Initialize the timer when the runScreen is shown
runButton.onclick = () => {
  studyScreen.classList.add("hidden");
  runScreen.classList.remove("hidden");
  // Build the runSessionTasks array from the DOM
  runSessionTasks = Array.from(studyPlanDisplay.children).map(child => ({
    summary: child.textContent.split(" - ")[0],
    startDate: child.dataset.startDate,
    estimatedTime: parseInt(child.dataset.estimatedTime, 10),
    zone: child.dataset.zone,
    completed: false
  }));
  updateRunScreenDisplay(0);
  startTaskTimer(0);
};

const runScreenTasks = document.getElementById("runScreenTasks")

function updateRunScreenDisplay(taskIndex) {
  // Only show tasks that are not completed
  const incompleteTasks = runSessionTasks.filter(task => !task.completed);
  const currentTask = incompleteTasks[taskIndex];
  const upcomingTasks = incompleteTasks.slice(taskIndex + 1);

  runScreenTasks.innerHTML = `
    <div class="current-task">
      <h2 class="font-bold text-lg mb-2">Current Task</h2>
      ${currentTask
      ? `<div class="p-4 rounded shadow-md mb-4" style="background-color: ${getTaskZoneColor(currentTask.zone)};">
                <input type="checkbox" id="currentTaskCheckbox" class="mr-2">
                <label for="currentTaskCheckbox">${currentTask.summary} - ${currentTask.estimatedTime} min.</label>
              </div>`
      : `<p class="text-gray-500 italic">No current task.</p>`
    }
    </div>
    <div class="upcoming-tasks">
      <h2 class="font-bold text-lg mb-2">Upcoming Tasks</h2>
      ${upcomingTasks.length > 0
      ? upcomingTasks
        .map(
          (task) => `
                <div class="p-4 rounded shadow-md mb-2" style="background-color: ${getTaskZoneColor(task.zone)};">
                  <label>${task.summary} - ${task.estimatedTime} min.</label>
                </div>
              `
        )
        .join("")
      : `<p class="text-gray-500 italic">No upcoming tasks.</p>`
    }
    </div>
  `;

  // Handle marking the current task as completed
  const currentTaskCheckbox = document.getElementById("currentTaskCheckbox");
  if (currentTaskCheckbox) {
    currentTaskCheckbox.addEventListener("change", () => {
      if (currentTaskCheckbox.checked) {
        playBeep();
        currentTask.completed = true;
        moveToCompleted(currentTask, null);

        // Wait for fade-out animation (500ms), then update display and timer
        setTimeout(() => {
          const stillIncomplete = runSessionTasks.filter(task => !task.completed);
          if (stillIncomplete.length === 0) {
            clearInterval(timerInterval);
            baseTimer.querySelector("#base-timer-label").textContent = "00:00";
            alert('You finished your study! Click exit to go back to the planning screen.');
          } else {
            const nextTaskIndex = runSessionTasks.findIndex(task => !task.completed);
            updateRunScreenDisplay(taskIndex); // Always use the same index
            startTaskTimer(nextTaskIndex);
          }
        }, 500);
      }
    });
  }
}

// Helper function to get the color based on the zone
function getTaskZoneColor(zone) {
  switch (zone) {
    case "Independent":
      return "#3182ce"; // Blue
    case "Semi-Collaborative":
      return "#38a169"; // Green
    case "Collaborative":
      return "#e53e3e"; // Red
    default:
      return "#718096"; // Gray (fallback)
  }
}
// Add an event listener to the PiP button
const pipButton = document.getElementById('enablePiPButton');
const runScreenBox = document.getElementById('runScreenBox');
if (pipButton) {
  // If the browser supports the documentPictureInPicture API, wire it up; otherwise provide a no-op/fallback
  if (typeof window.documentPictureInPicture !== 'undefined') {
    pipButton.addEventListener('click', () => {
      try {
        if (window.documentPictureInPicture.window) {
          window.documentPictureInPicture.window.close();
          pipButton.textContent = "Show Popup";
          return;
        }
        window.documentPictureInPicture.requestWindow().then(pipWindow => {
          pipButton.textContent = "Hide Popup"; // Update button text
          for (let styleSheet of document.querySelectorAll("link[rel=stylesheet]")) {
            let newStyleSheet = document.createElement("link");
            newStyleSheet.rel = "stylesheet";
            newStyleSheet.href = styleSheet.href;
            pipWindow.document.body.append(newStyleSheet);
          }
          pipWindow.document.body.append(baseTimer);
          baseTimer = pipWindow.document.querySelector(".base-timer");
          pipWindow.addEventListener("pagehide", () => {
            if (runScreenBox && runScreenBox.children[0]) {
              runScreenBox.children[0].insertBefore(baseTimer, runScreenBox.children[0].children[0]);
            }
            pipButton.textContent = "Show Popup";
          });
        }).catch(error => {
          console.error("Error enabling Picture-in-Picture:", error);
          alert('Picture-in-Picture could not be enabled.');
        });
      } catch (err) {
        console.error('PiP error:', err);
      }
    });
  } else {
    // Fallback: avoid throwing and provide a user-friendly message
    pipButton.addEventListener('click', () => {
      alert('Picture-in-Picture is not supported by this browser.');
    });
  }
}
function updateMinutesLeftDisplay() {
  const studyPlanDisplay = document.getElementById("studyPlanDisplay");
  const minutesLeftDisplay = document.getElementById("minutesLeftDisplay");
  const totalMinutes = Array.from(studyPlanDisplay.children).reduce((sum, child) => {
    const estimatedTime = parseInt(child.dataset.estimatedTime, 10) || 0;
    return sum + estimatedTime;
  }, 0);
  const minutesLeft = Math.max(60 - totalMinutes, 0);
  minutesLeftDisplay.textContent = `${minutesLeft} minute${minutesLeft === 1 ? '' : 's'} left to plan.`;
}

const gradeSelect = document.getElementById('gradeSelect');
const bookingsIframe = document.getElementById('bookingsIframe');

// Save grade selection on form submit
document.getElementById('scheduleForm').addEventListener('submit', (e) => {
  const selectedGrade = gradeSelect.value;
  localStorage.setItem('userGrade', selectedGrade);
  // ...existing code...
});

// Set grade selection from localStorage on load
document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const dashboardSection = document.getElementById("dashboardSection");
  const scheduleSetupSection = document.getElementById("scheduleSetupSection");
  const dashboardContainer = document.getElementById("dashboardContainer");
  const startStudyBtn = document.getElementById("startStudyBtn");
  const backToDashboardBtn = document.getElementById("backToDashboardBtn");
  const studyScreen = document.getElementById('studyPlannerSection');
  const studyPlanDisplay = document.getElementById("studyPlanDisplay");
  const runScreenTasks = document.getElementById("runScreenTasks");
  const runButton = document.getElementById("runButton");
  const gradeSelect = document.getElementById('gradeSelect');
  const bookingsIframe = document.getElementById('bookingsIframe');

  // Only run if dashboardContainer exists
  if (dashboardContainer) {
    checkIcalFeed();

    fetchIcalFeed()
      .then(() => {
        renderDashboardTasks({ scrollToToday: true });
        loadStudyTasks();
      })
      .catch(error => {
        console.error("Error fetching or parsing iCal feed:", error);
        // Optionally show an error message elsewhere if needed
      });
  }

  // Add event listeners only if elements exist
  if (startStudyBtn) {
    startStudyBtn.addEventListener("click", () => {
      dashboardSection.classList.add("hidden");
      studyScreen.classList.remove("hidden");
      loadStudyTasks();
    });
  }

  if (backToDashboardBtn) {
    backToDashboardBtn.addEventListener("click", () => {
      studyScreen.classList.add("hidden");
      dashboardSection.classList.remove("hidden");
      studyPlanDisplay.innerHTML = '<p class="text-gray-500 italic">No tasks scheduled yet.</p>';
      runScreenTasks.innerHTML = '';
      updateMinutesLeftDisplay();
    });
  }

  // Set grade selection from localStorage
  const savedGrade = localStorage.getItem('userGrade');
  if (savedGrade && gradeSelect) {
    gradeSelect.value = savedGrade;
    updateIframeSrc(savedGrade || gradeSelect.value);
  }

  // Add grade change listener
  if (gradeSelect) {
    gradeSelect.addEventListener('change', (e) => {
      const grade = e.target.value;
      localStorage.setItem('userGrade', grade);
      updateIframeSrc(grade);
    });
  }

  // Add Tutorial Popup logic
  const addTutorialBtn = document.getElementById("addTutorialBtn");
  const cancelTutorialBtn = document.getElementById("cancelTutorialBtn");
  const saveTutorialBtn = document.getElementById("saveTutorialBtn");
  if (addTutorialBtn) addTutorialBtn.onclick = () => document.getElementById("addTutorialPopup").classList.remove("hidden");
  if (cancelTutorialBtn) cancelTutorialBtn.onclick = () => document.getElementById("addTutorialPopup").classList.add("hidden");
  if (saveTutorialBtn) saveTutorialBtn.onclick = () => {
    const date = document.getElementById("tutorialDate").value;
    const teacher = document.getElementById("tutorialTeacher").value.trim();
    if (!date) return alert("Please select a date.");
    if (!teacher) return alert("Please enter the teacher's name.");
    const customTasks = JSON.parse(localStorage.getItem("customTasks") || "[]");
    // Always save as UTC 23:59
    const startDate = `${date}T23:59:00.000Z`;
    customTasks.push({
      summary: `Tutorial (${teacher})`,
      startDate,
      teacher
    });
    localStorage.setItem("customTasks", JSON.stringify(customTasks));
    document.getElementById("addTutorialPopup").classList.add("hidden");
    document.getElementById("tutorialDate").value = "";
    document.getElementById("tutorialTeacher").value = "";
    renderDashboardTasks();
    loadStudyTasks();
  };

  // Add Task Popup logic
  const addTaskBtn = document.getElementById("addTaskBtn");
  const cancelTaskBtn = document.getElementById("cancelTaskBtn");
  const saveTaskBtn = document.getElementById("saveTaskBtn");
  if (addTaskBtn) addTaskBtn.onclick = () => document.getElementById("addTaskPopup").classList.remove("hidden");
  if (cancelTaskBtn) cancelTaskBtn.onclick = () => {
    document.getElementById("addTaskPopup").classList.add("hidden");
    document.getElementById("customTaskTitle").value = "";
    document.getElementById("customTaskDate").value = "";
  };
  if (saveTaskBtn) saveTaskBtn.onclick = () => {
    const title = document.getElementById("customTaskTitle").value.trim();
    const date = document.getElementById("customTaskDate").value;
    if (!title || !date) {
      alert("Please enter a title and date.");
      return;
    }
    const customTasks = JSON.parse(localStorage.getItem("customTasks") || "[]");
    if (customTasks.some(t => t.summary === title)) {
      alert("Custom task titles must be unique.");
      return;
    }
    // Always save as UTC 23:59
    const startDate = `${date}T23:59:00.000Z`;
    customTasks.push({
      summary: title,
      startDate
    });
    localStorage.setItem("customTasks", JSON.stringify(customTasks));
    document.getElementById("addTaskPopup").classList.add("hidden");
    document.getElementById("customTaskTitle").value = "";
    document.getElementById("customTaskDate").value = "";
    renderDashboardTasks();
    loadStudyTasks();
  };

  // Add refresh button logic for dashboard
  const refreshTasksBtn = document.getElementById("refreshTasksBtn");
  if (refreshTasksBtn) {
    refreshTasksBtn.onclick = () => {
      refreshTasksBtn.classList.add("fa-spin");
      fetchIcalFeed()
        .then(() => {
          renderDashboardTasks({ scrollToToday: true });
          loadStudyTasks();
          setTimeout(() => refreshTasksBtn.classList.remove("fa-spin"), 500);
        })
        .catch(() => {
          setTimeout(() => refreshTasksBtn.classList.remove("fa-spin"), 500);
        });
    };
  }

  // Add refresh button logic for study planner
  const refreshStudyTasksBtn = document.getElementById("refreshStudyTasksBtn");
  if (refreshStudyTasksBtn) {
    refreshStudyTasksBtn.onclick = () => {
      refreshStudyTasksBtn.classList.add("fa-spin");
      fetchIcalFeed()
        .then(() => {
          loadStudyTasks();
          setTimeout(() => refreshStudyTasksBtn.classList.remove("fa-spin"), 500);
        })
        .catch(() => {
          setTimeout(() => refreshStudyTasksBtn.classList.remove("fa-spin"), 500);
        });
    };
  }

  // Initial dashboard render
  renderDashboardTasks();
  loadStudyTasks();

  // Custom teacher dropdown logic
  const teacherInput = document.getElementById('tutorialTeacher');
  const teacherDropdown = document.getElementById('teacherDropdown');

  if (teacherInput && teacherDropdown) {
    teacherInput.addEventListener('input', function () {
      const value = this.value.trim().toLowerCase();
      teacherDropdown.innerHTML = '';
      if (value.length === 0) {
        teacherDropdown.classList.add('hidden');
        return;
      }
      const matches = teacherList.filter(name => name.toLowerCase().includes(value));
      if (matches.length === 0) {
        teacherDropdown.classList.add('hidden');
        return;
      }
      matches.forEach(name => {
        const option = document.createElement('div');
        option.textContent = name;
        option.className = 'px-3 py-2 cursor-pointer hover:bg-blue-100';
        option.onclick = () => {
          teacherInput.value = name;
          teacherDropdown.classList.add('hidden');
        };
        teacherDropdown.appendChild(option);
      });
      // Position dropdown below input
      const rect = teacherInput.getBoundingClientRect();
      teacherDropdown.style.top = (teacherInput.offsetTop + teacherInput.offsetHeight) + 'px';
      teacherDropdown.style.left = teacherInput.offsetLeft + 'px';
      teacherDropdown.style.width = teacherInput.offsetWidth + 'px';
      teacherDropdown.classList.remove('hidden');
    });

    teacherInput.addEventListener('blur', function () {
      setTimeout(() => teacherDropdown.classList.add('hidden'), 150);
    });
  }
});


function openMapPopup() {
  const mapPopup = document.getElementById("mapPopup");
  const mapTime = document.getElementById("mapTime");
  const mapZoneButtonGroup = document.getElementById("mapZoneButtonGroup");
  let mapSelectedZone = null;
  let mapTimeSelected = false;
  let mapZoneSelected = false;

  // Reset the popup fields
  mapTime.value = "";
  mapSelectedZone = null;
  mapTimeSelected = false;
  mapZoneSelected = false;

  // Assign event listeners to time buttons scoped to this popup
  mapPopup.querySelectorAll('.time-btn').forEach(btn => {
    btn.onclick = () => {
      mapTime.value = btn.textContent;
      mapTimeSelected = !!mapTime.value && parseInt(mapTime.value, 10) > 0;
      tryMapAutoSave();
    };
  });

  // Assign event listeners to zone buttons scoped to this popup
  mapZoneButtonGroup.querySelectorAll('.zone-btn').forEach(btn => {
    btn.classList.remove('ring', 'ring-offset-2', 'ring-blue-300', 'ring-green-300', 'ring-red-300');
    btn.onclick = () => {
      mapSelectedZone = btn.dataset.zone;
      mapZoneSelected = true;
      mapZoneButtonGroup.querySelectorAll('.zone-btn').forEach(b => b.classList.remove('ring', 'ring-offset-2', 'ring-blue-300', 'ring-green-300', 'ring-red-300'));
      if (mapSelectedZone === "Independent") btn.classList.add('ring', 'ring-offset-2', 'ring-blue-300');
      if (mapSelectedZone === "Semi-Collaborative") btn.classList.add('ring', 'ring-offset-2', 'ring-green-300');
      if (mapSelectedZone === "Collaborative") btn.classList.add('ring', 'ring-offset-2', 'ring-red-300');
      tryMapAutoSave();
    };
  });

  // Listen for time input changes
  mapTime.oninput = () => {
    mapTimeSelected = !!mapTime.value && parseInt(mapTime.value, 10) > 0;
    tryMapAutoSave();
  };

  // Show the popup
  mapPopup.classList.remove("hidden");

  // Close popup when clicking outside the inner box
  setTimeout(() => {
    document.addEventListener("mousedown", outsideClickListener);
  }, 0);

  function outsideClickListener(e) {
    if (!mapPopup.querySelector('.bg-white').contains(e.target)) {
      closeMapPopup();
    }
  }

  function closeMapPopup() {
    mapPopup.classList.add("hidden");
    document.removeEventListener("mousedown", outsideClickListener);
  }
}

// Add this helper to support the MAP popup auto-save flow
function tryMapAutoSave() {
  console.log('[tryMapAutoSave] timeSelected:', mapTimeSelected, 'zoneSelected:', mapZoneSelected);
  if (mapTimeSelected && mapZoneSelected) {
    const estimatedTime = parseInt(mapTime.value, 10);
    console.log('[tryMapAutoSave] estimatedTime:', estimatedTime, 'mapSelectedZone:', mapSelectedZone);
    if (!estimatedTime || isNaN(estimatedTime) || estimatedTime <= 0) {
      alert("Please enter a valid estimated time.");
      return;
    }

    // Calculate the total minutes already scheduled
    const currentTotalMinutes = Array.from(studyPlanDisplay.children).reduce((sum, child) => {
      const taskTime = parseInt(child.dataset.estimatedTime, 10) || 0;
      return sum + taskTime;
    }, 0);

    if (currentTotalMinutes + estimatedTime > 60) {
      alert("This task would go past the end of the Study.");
      return;
    }

    // Create a MAP Practice task object and add to agenda
    const mapTask = {
      summary: "MAP Practice",
      startDate: new Date().toISOString()
    };

    addToAgenda(mapTask, estimatedTime, mapSelectedZone);
    mapTask.estimatedTime = estimatedTime;
    mapTask.zone = mapSelectedZone;

    // Close and reset the MAP popup UI
    if (mapPopup) {
      mapPopup.classList.add('hidden');
    }
    if (mapZoneButtonGroup) {
      mapZoneButtonGroup.querySelectorAll('.zone-btn').forEach(b => b.classList.remove('ring', 'ring-offset-2', 'ring-blue-300', 'ring-green-300', 'ring-red-300'));
    }
    if (mapTime) mapTime.value = "";
    mapSelectedZone = null;
    mapTimeSelected = false;
    mapZoneSelected = false;

    // Refresh UI state
    renderDashboardTasks();
    loadStudyTasks();
  }
}