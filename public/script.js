const dashboardSection = document.getElementById("dashboardSection");
const scheduleSetupSection = document.getElementById("scheduleSetupSection");

// Define fetchIcalFeed globally
function fetchIcalFeed() {
  const icalUrl = localStorage.getItem("icalFeedUrl");
  if (!icalUrl) {
    console.error("No iCal URL found in localStorage.");
    return Promise.reject("No iCal URL found in localStorage.");
  }

  return fetch(`/proxy?url=${encodeURIComponent(icalUrl)}`)
    .then((response) => response.text())
    .then((data) => {
      if (!data) {
        console.error("No data received from the iCal feed.");
        throw new Error("No data received from the iCal feed.");
      }
      parseIcalFeed(data);
      return data; // Return the raw iCal data
    })
    .catch((error) => {
      console.error("Error fetching iCal feed:", error);
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

document.getElementById("scheduleForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const icalUrl = document.getElementById("icalUrl").value;
  localStorage.setItem("icalFeedUrl", icalUrl);
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
    .catch((error) => {
      console.error("Error fetching or parsing iCal feed:", error);
      // Optionally show an error message elsewhere if needed
    });
} else {
  console.error("dashboardContainer not found.");
}
//everything from here on is functional

// Helper function to parse iCal dates
function parseIcalDate(rawDate) {
  if (rawDate.includes("T")) {
    // Handle full date-time format (e.g., 20250423T193000Z)
    const year = parseInt(rawDate.substring(0, 4), 10);
    const month = parseInt(rawDate.substring(4, 6), 10) - 1; // Month is zero-based
    const day = parseInt(rawDate.substring(6, 8), 10);
    const hours = parseInt(rawDate.substring(9, 11), 10);
    const minutes = parseInt(rawDate.substring(11, 13), 10);
    const seconds = parseInt(rawDate.substring(13, 15), 10);
    return new Date(
      Date.UTC(year, month, day, hours, minutes, seconds),
    ).toISOString();
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

  const completedTasks = JSON.parse(
    localStorage.getItem("completedTasks") || "[]",
  );
  const completedTaskKeys = completedTasks.map(
    (task) => `${task.summary}-${task.startDate}`,
  );

  // Load previous edits
  const editedIcalTasks = JSON.parse(
    localStorage.getItem("editedIcalTasks") || "{}",
  );

  const events = [];
  const lines = data.split("\n");
  let event = {};

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  lines.forEach((line) => {
    if (line.startsWith("SUMMARY:")) {
      let summary = line.replace("SUMMARY:", "").trim();
      if (summary.includes("[")) {
        summary = summary.split("[")[0].trim();
      }
      event.summary = summary;
    }
    if (line.startsWith("DTSTART")) {
      const start = line.includes(":") ? line.split(":")[1].trim() : null;
      if (start) {
        event.startDate = parseIcalDate(start);
      }
    }
    if (line.startsWith("DTEND")) {
      const end = line.includes(":") ? line.split(":")[1].trim() : null;
      if (end) {
        event.endDate = parseIcalDate(end);
      }
    }
    if (line.trim() === "END:VEVENT") {
      const taskKey = `${event.startDate}`;
      const eventStartDate = new Date(event.startDate);

      // Apply edits if present
      if (editedIcalTasks[taskKey]) {
        event.summary = editedIcalTasks[taskKey];
      }

      if (
        !completedTaskKeys.includes(`${event.summary}-${event.startDate}`) &&
        eventStartDate >= sevenDaysAgo
      ) {
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
  console.debug("[settings] openSettingsPopup called");
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
  console.debug("[settings] closeSettingsPopup called");
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
    console.debug("[settings] settingsBtn clicked");
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
const studyScreen = document.getElementById("studyPlannerSection");
const runScreen = document.getElementById("runScreen");
const icalTasks = JSON.parse(localStorage.getItem("icalTasks") || "[]");
const startStudyBtn = document.getElementById("startStudyBtn");
const backToDashboardBtn = document.getElementById("backToDashboardBtn");
const backToPlanScreenBtn = document.getElementById("backToPlanScreenBtn");
const studyPlanDisplay = document.getElementById("studyPlanDisplay"); // Move this to the top
let baseTimer = document.querySelector(".base-timer");

startStudyBtn.addEventListener("click", () => {
  dashboardSection.classList.add("hidden"); // Hide the dashboard section
  studyScreen.classList.remove("hidden"); // Show the study setup screen
  loadStudyTasks();
  updateMinutesLeftDisplay(); // Always update the minutes display
});

backToDashboardBtn.addEventListener("click", () => {
  studyScreen.classList.add("hidden"); // Hide the study planner section
  dashboardSection.classList.remove("hidden"); // Show the dashboard section
  studyPlanDisplay.innerHTML =
    '<p class="text-gray-500 italic">No tasks scheduled yet.</p>';
  runScreenTasks.innerHTML = "";

  updateMinutesLeftDisplay();
});

backToPlanScreenBtn.addEventListener("click", () => {
  runScreen.classList.add("hidden");
  dashboardSection.classList.remove("hidden");
  studyPlanDisplay.innerHTML =
    '<p class="text-gray-500 italic">No tasks scheduled yet.</p>';
  runScreenTasks.innerHTML = "";
  runButtonColorCheck();
  updateMinutesLeftDisplay();

  // Exit PiP mode if active
  if (document.pictureInPictureElement) {
    document.exitPictureInPicture().catch((error) => {
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
    .catch((error) => {
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

  // Assign event listeners to time buttons (use .time-btn class in HTML)
  document.querySelectorAll(".time-btn").forEach((btn) => {
    btn.onclick = () => {
      console.log("[Time Button Clicked]", btn.textContent);
      taskTime.value = btn.textContent;
      timeSelected = !!taskTime.value && parseInt(taskTime.value, 10) > 0;
      console.log(
        "[Time Selected]",
        timeSelected,
        "Zone Selected",
        zoneSelected,
      );
      tryAutoSave();
    };
  });

  // Highlight default button (none selected)
  document.querySelectorAll(".zone-btn").forEach((btn) => {
    btn.classList.remove(
      "ring",
      "ring-offset-2",
      "ring-blue-300",
      "ring-green-300",
      "ring-red-300",
    );
    btn.onclick = () => {
      console.log("[Zone Button Clicked]", btn.dataset.zone);
      selectedZone = btn.dataset.zone;
      zoneSelected = true;
      document
        .querySelectorAll(".zone-btn")
        .forEach((b) =>
          b.classList.remove(
            "ring",
            "ring-offset-2",
            "ring-blue-300",
            "ring-green-300",
            "ring-red-300",
          ),
        );
      if (selectedZone === "Independent")
        btn.classList.add("ring", "ring-offset-2", "ring-blue-300");
      if (selectedZone === "Semi-Collaborative")
        btn.classList.add("ring", "ring-offset-2", "ring-green-300");
      if (selectedZone === "Collaborative")
        btn.classList.add("ring", "ring-offset-2", "ring-red-300");
      console.log(
        "[Zone Selected]",
        zoneSelected,
        "Time Selected",
        timeSelected,
      );
      tryAutoSave();
    };
  });

  // Listen for time input changes
  taskTime.oninput = () => {
    timeSelected = !!taskTime.value && parseInt(taskTime.value, 10) > 0;
    tryAutoSave();
  };

  // Try to auto-save when both are selected
  function tryAutoSave() {
    console.log(
      "[tryAutoSave] timeSelected:",
      timeSelected,
      "zoneSelected:",
      zoneSelected,
    );
    if (timeSelected && zoneSelected) {
      const estimatedTime = parseInt(taskTime.value, 10);
      console.log(
        "[tryAutoSave] estimatedTime:",
        estimatedTime,
        "selectedZone:",
        selectedZone,
      );
      if (!estimatedTime || isNaN(estimatedTime) || estimatedTime <= 0) {
        alert("Please enter a valid estimated time.");
        return;
      }
      // Calculate the total time if this task is added
      const currentTotalMinutes = Array.from(studyPlanDisplay.children).reduce(
        (sum, child) => {
          const taskTime = parseInt(child.dataset.estimatedTime, 10) || 0;
          return sum + taskTime;
        },
        0,
      );

      if (currentTotalMinutes + estimatedTime > 60) {
        alert("This task would go past the end of the Study.");
        return;
      }
      console.log(
        "[tryAutoSave] Saving task:",
        task,
        estimatedTime,
        selectedZone,
      );
      addToAgenda(task, estimatedTime, selectedZone);
      task.estimatedTime = estimatedTime;
      task.zone = selectedZone;
      closePopup();
    }
  }

  // Show the popup
  taskPopup.classList.remove("hidden");

  // Close popup when clicking outside the inner box
  setTimeout(() => {
    document.addEventListener("mousedown", outsideClickListener);
  }, 0);

  function outsideClickListener(e) {
    if (!taskPopup.querySelector(".bg-white").contains(e.target)) {
      closePopup();
    }
  }

  function closePopup() {
    taskPopup.classList.add("hidden");
    document.removeEventListener("mousedown", outsideClickListener);
  }
}

function runButtonColorCheck() {
  // Calculate the total time of tasks
  const totalMinutes = Array.from(studyPlanDisplay.children).reduce(
    (sum, child) => {
      const estimatedTime = parseInt(child.dataset.estimatedTime, 10) || 0; // Use the dataset value
      return sum + estimatedTime;
    },
    0,
  );

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
  console.log("Adding task to agenda:", { task, estimatedTime, zone });
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
    // If there are previous tasks, continue stacking; we don't track absolute times anymore
    studyStartTime = new Date();
  }
  // Not storing explicit start/end times any more.

  // Create a new agenda item
  const agendaItem = document.createElement("div");
  agendaItem.className = "p-2 mb-2 rounded text-white";
  agendaItem.dataset.startDate = task.startDate; // Store the startDate in the dataset
  agendaItem.dataset.estimatedTime = estimatedTime; // Store the estimated time directly in the dataset
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
      <span>${task.summary || "Unnamed Task"} - ${estimatedTime} min.</span>
    `;

  // Append the agenda item to the agenda box
  studyPlanDisplay.appendChild(agendaItem);

  runButtonColorCheck();
  updateMinutesLeftDisplay();

  // Persist the current planner if opened for a particular schedule slot
  try {
    saveCurrentSlotPlans();
  } catch (err) {
    console.error("[studyPlans] saveCurrentSlotPlans error:", err);
  }
}

// Utility to get all tasks (ical + custom)
function getAllTasks() {
  const completedTasks = JSON.parse(
    localStorage.getItem("completedTasks") || "[]",
  );
  const completedTaskKeys = completedTasks.map(
    (task) => `${task.summary}-${task.startDate}`,
  );

  const icalTasks = JSON.parse(localStorage.getItem("icalTasks") || "[]");
  const customTasks = JSON.parse(localStorage.getItem("customTasks") || "[]");

  // Filter out completed tasks from both sources
  const filteredIcalTasks = icalTasks.filter(
    (t) => !completedTaskKeys.includes(`${t.summary}-${t.startDate}`),
  );
  const filteredCustomTasks = customTasks.filter(
    (t) => !completedTaskKeys.includes(`${t.summary}-${t.startDate}`),
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
    .forEach((date) => {
      const parsedDate = new Date(date);
      const dateHeading = document.createElement("h3");
      dateHeading.textContent =
        parsedDate.toDateString() === today.toDateString() ? "Today" : date;
      dateHeading.className = "font-bold text-lg mt-4 mb-2";
      dashboardTasks.appendChild(dateHeading);
      if (parsedDate.toDateString() === today.toDateString()) {
        todayHeading = dateHeading;
      }
      if (
        tasksByDate[date].length === 0 &&
        parsedDate.toDateString() === today.toDateString()
      ) {
        const placeholder = document.createElement("li");
        placeholder.textContent =
          "You've completed all of today's tasks. Great job!";
        placeholder.className = "text-gray-500 italic";
        dashboardTasks.appendChild(placeholder);
      }
      tasksByDate[date].forEach((task) => {
        const li = document.createElement("li");
        li.className = "mb-1 flex items-center";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "mr-2";
        checkbox.addEventListener("change", () => {
          moveToCompleted(task, li, true);
          li.classList.add("fade-out");
          setTimeout(() => {
            renderDashboardTasks({ scrollToToday: true }); // Always refresh and scroll to today
          }, 500);
        });
        const button = document.createElement("button");
        button.className =
          "w-full text-left bg-gray-100 dark:bg-gray-800 dark:text-gray-200 p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700";
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
    .forEach((date) => {
      const parsedDate = new Date(date);
      const dateHeading = document.createElement("h3");

      // Replace today's date with "Today"
      dateHeading.textContent =
        parsedDate.toDateString() === today.toDateString() ? "Today" : date;
      dateHeading.className = "font-bold text-lg mt-4 mb-2";
      tasksList.appendChild(dateHeading);

      if (parsedDate.toDateString() === today.toDateString()) {
        todayHeading = dateHeading;
      }

      if (
        tasksByDate[date].length === 0 &&
        parsedDate.toDateString() === today.toDateString()
      ) {
        // Add a placeholder if there are no tasks for today
        const placeholder = document.createElement("li");
        placeholder.textContent =
          "You've completed all of today's tasks. Great job!";
        placeholder.className = "text-gray-500 italic";
        tasksList.appendChild(placeholder);
      }

      tasksByDate[date].forEach((task) => {
        const li = document.createElement("li");
        li.className = "mb-1 flex items-center";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "mr-2";
        checkbox.addEventListener("change", () => moveToCompleted(task, li));

        const button = document.createElement("button");
        button.className =
          "w-full text-left bg-gray-100 p-2 rounded hover:bg-gray-200";
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
  oscillator.type = "sine";
  oscillator.frequency.value = 880; // Hz
  oscillator.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.2); // 0.2 seconds beep
  oscillator.onended = () => ctx.close();
}

function moveToCompleted(task, taskElement, isDashboard = false) {
  console.log(
    "[moveToCompleted] Called for:",
    task.summary,
    task.startDate,
    "isDashboard:",
    isDashboard,
  );
  const completedTasks = JSON.parse(
    localStorage.getItem("completedTasks") || "[]",
  );
  completedTasks.push(task);
  localStorage.setItem("completedTasks", JSON.stringify(completedTasks));

  // Remove from customTasks if present
  let customTasks = JSON.parse(localStorage.getItem("customTasks") || "[]");
  customTasks = customTasks.filter(
    (t) => !(t.startDate === task.startDate && t.summary === task.summary),
  );
  localStorage.setItem("customTasks", JSON.stringify(customTasks));

  // Remove from iCal tasks if present
  let icalTasks = JSON.parse(localStorage.getItem("icalTasks") || "[]");
  icalTasks = icalTasks.filter(
    (t) => !(t.startDate === task.startDate && t.summary === task.summary),
  );
  localStorage.setItem("icalTasks", JSON.stringify(icalTasks));

  if (taskElement) {
    // animation for ryland :) this animation adds a checkmark to the commpleted task.
    const checkmark = document.createElement("div");
    checkmark.className = "checkmark";
    taskElement.appendChild(checkmark);
    taskElement.classList.add("fade-out");
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
  const circleDasharray = `${(
    calculateTimeFraction() * FULL_DASH_ARRAY
  ).toFixed(0)} 283`;
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
  baseTimer.querySelector("#base-timer-label").textContent =
    formatTimeLeft(timeLeft);
  setCircleDasharray();

  // Clear any existing timer
  clearInterval(timerInterval);

  // Start the timer
  timerInterval = setInterval(() => {
    timePassed += 1;
    timeLeft = TIME_LIMIT - timePassed;

    // Update the timer label
    baseTimer.querySelector("#base-timer-label").textContent =
      formatTimeLeft(timeLeft);

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
  runSessionTasks = Array.from(studyPlanDisplay.children).map((child) => ({
    summary: child.textContent.split(" - ")[0],
    startDate: child.dataset.startDate,
    estimatedTime: parseInt(child.dataset.estimatedTime, 10),
    zone: child.dataset.zone,
    completed: false,
  }));
  updateRunScreenDisplay(0);
  startTaskTimer(0);
};

const runScreenTasks = document.getElementById("runScreenTasks");

function updateRunScreenDisplay(taskIndex) {
  // Only show tasks that are not completed
  const incompleteTasks = runSessionTasks.filter((task) => !task.completed);
  const currentTask = incompleteTasks[taskIndex];
  const upcomingTasks = incompleteTasks.slice(taskIndex + 1);

  runScreenTasks.innerHTML = `
    <div class="current-task">
      <h2 class="font-bold text-lg mb-2">Current Task</h2>
      ${currentTask
      ? `<div class="p-4 rounded shadow-md mb-4" style="background-color: ${getTaskZoneColor(
        currentTask.zone,
      )};">
                <input type="checkbox" id="currentTaskCheckbox" class="mr-2">
                <label for="currentTaskCheckbox">${currentTask.summary} - ${currentTask.estimatedTime
      } min.</label>
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
                <div class="p-4 rounded shadow-md mb-2" style="background-color: ${getTaskZoneColor(
            task.zone,
          )};">
                  <label>${task.summary} - ${task.estimatedTime} min.</label>
                </div>
              `,
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
          const stillIncomplete = runSessionTasks.filter(
            (task) => !task.completed,
          );
          if (stillIncomplete.length === 0) {
            clearInterval(timerInterval);
            baseTimer.querySelector("#base-timer-label").textContent = "00:00";
          } else {
            const nextTaskIndex = runSessionTasks.findIndex(
              (task) => !task.completed,
            );
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
const pipButton = document.getElementById("enablePiPButton");
const runScreenBox = document.getElementById("runScreenBox");
if (pipButton) {
  // If the browser supports the documentPictureInPicture API, wire it up; otherwise provide a no-op/fallback
  if (typeof window.documentPictureInPicture !== "undefined") {
    pipButton.addEventListener("click", () => {
      try {
        if (window.documentPictureInPicture.window) {
          window.documentPictureInPicture.window.close();
          pipButton.textContent = "Show Popup";
          return;
        }
        window.documentPictureInPicture
          .requestWindow()
          .then((pipWindow) => {
            pipButton.textContent = "Hide Popup"; // Update button text
            for (let styleSheet of document.querySelectorAll(
              "link[rel=stylesheet]",
            )) {
              let newStyleSheet = document.createElement("link");
              newStyleSheet.rel = "stylesheet";
              newStyleSheet.href = styleSheet.href;
              pipWindow.document.body.append(newStyleSheet);
            }
            pipWindow.document.body.append(baseTimer);
            baseTimer = pipWindow.document.querySelector(".base-timer");
            pipWindow.addEventListener("pagehide", () => {
              if (runScreenBox && runScreenBox.children[0]) {
                runScreenBox.children[0].insertBefore(
                  baseTimer,
                  runScreenBox.children[0].children[0],
                );
              }
              pipButton.textContent = "Show Popup";
            });
          })
          .catch((error) => {
            console.error("Error enabling Picture-in-Picture:", error);
            alert("Picture-in-Picture could not be enabled.");
          });
      } catch (err) {
        console.error("PiP error:", err);
      }
    });
  } else {
    // Fallback: avoid throwing and provide a user-friendly message
    pipButton.addEventListener("click", () => {
      alert("Picture-in-Picture is not supported by this browser.");
    });
  }
}
// --- Added: per-slot study plan persistence & schedule cell handlers ---

// Helper: build slot key from period label and day name
function getSlotKey(periodLabel, dayName) {
  return `${periodLabel} - ${dayName}`;
}

// Load whole studyPlans object from localStorage
function loadAllStudyPlans() {
  return JSON.parse(localStorage.getItem("studyPlans") || "{}");
}

// Save whole studyPlans object to localStorage
function saveAllStudyPlans(plansObj) {
  localStorage.setItem("studyPlans", JSON.stringify(plansObj));
}

// Apply overlays for schedule cells based on saved studyPlans (global helper)
function applyScheduleOverlays(displayPanel) {
  if (!displayPanel) return;
  const plans = loadAllStudyPlans();
  const cells = displayPanel.querySelectorAll("td[data-period][data-day]");
  cells.forEach((td) => {
    const period = td.dataset.period;
    const day = td.dataset.day;
    const slotKey = getSlotKey(period, day);
    const tasks = (plans && plans[slotKey]) || [];
    const totalMinutes = Array.isArray(tasks)
      ? tasks.reduce((sum, t) => sum + (parseInt(t.estimatedTime, 10) || 0), 0)
      : 0;
    td.classList.remove("plan-partial", "plan-full");
    if (totalMinutes >= 60) {
      td.classList.add("plan-full");
    } else if (totalMinutes > 0) {
      td.classList.add("plan-partial");
    }
  });
}

// Clear all saved study plans if today is Sunday
function clearPlansIfSunday() {
  try {
    const today = new Date();
    if (today.getDay() === 0) {
      // It's Sunday (0), clear saved plans
      localStorage.removeItem("studyPlans");
      console.debug("[studyPlans] Cleared studyPlans on Sunday.");
    }
  } catch (err) {
    console.error("[studyPlans] clearPlansIfSunday error:", err);
  }
}

// Weekly clearing: keep a week-key in localStorage and clear plans every Monday at 1:00am local time.
// Also remove any plans (or tasks) that don't contain a timestamp (`startDate`).
function clearPlansIfWeeklyNeeded() {
  try {
    const now = new Date();

    function getISOWeekNumber(d) {
      // Copy date so don't modify original
      const date = new Date(
        Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()),
      );
      // Set to nearest Thursday: current date + 4 - current day number
      const dayNum = date.getUTCDay() || 7;
      date.setUTCDate(date.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
      return { year: date.getUTCFullYear(), week: weekNo };
    }

    function getWeekKey(d) {
      const w = getISOWeekNumber(d);
      return `${w.year}-W${String(w.week).padStart(2, "0")}`;
    }

    function getMondayAt1amOfDate(d) {
      // local time Monday 01:00 for the week containing date d
      const copy = new Date(d);
      const day = copy.getDay(); // 0 (Sun) - 6 (Sat)
      // compute days to subtract to get Monday
      const daysToMonday = (day + 6) % 7; // 0->6,1->0,2->1,...
      copy.setHours(1, 0, 0, 0); // set time to 01:00
      copy.setDate(copy.getDate() - daysToMonday);
      return copy;
    }

    const currentWeekKey = getWeekKey(now);
    const storedWeekKey = localStorage.getItem("studyPlansWeekKey");

    // If stored key is missing, or we have advanced to a new week and it's past Monday 01:00, clear plans
    const monday1am = getMondayAt1amOfDate(now);
    if (storedWeekKey !== currentWeekKey && now >= monday1am) {
      localStorage.removeItem("studyPlans");
      localStorage.setItem("studyPlansWeekKey", currentWeekKey);
      console.info(
        "[studyPlans] Weekly clear executed. Updated week key to",
        currentWeekKey,
      );
      return; // done, nothing else to sanitize
    }

    // Additionally, sanitize existing studyPlans: remove tasks without timestamps
    const plans = loadAllStudyPlans();
    let changed = false;
    Object.keys(plans).forEach((slotKey) => {
      const tasks = plans[slotKey];
      if (!Array.isArray(tasks)) {
        // corrupt/non-array entry: remove whole slot
        delete plans[slotKey];
        changed = true;
        return;
      }
      // Keep only tasks that have a startDate (timestamp-like)
      const filtered = tasks.filter(
        (t) => t && (t.startDate || t.savedAt || t.timestamp),
      );
      if (filtered.length === 0) {
        delete plans[slotKey];
        changed = true;
      } else if (filtered.length !== tasks.length) {
        plans[slotKey] = filtered;
        changed = true;
      }
    });
    if (changed) {
      saveAllStudyPlans(plans);
      console.info(
        "[studyPlans] Sanitized studyPlans: removed entries without timestamps",
      );
    }
  } catch (err) {
    console.error("[studyPlans] clearPlansIfWeeklyNeeded error:", err);
  }
}

// Schedule the next weekly clear to run at the next Monday 01:00 local time (if page stays open)
function scheduleNextWeeklyClear() {
  try {
    const now = new Date();
    const day = now.getDay();
    const daysToMonday = (8 - day) % 7; // number of days until next Monday
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysToMonday);
    nextMonday.setHours(1, 0, 0, 0); // Monday 01:00
    const msUntil = nextMonday.getTime() - now.getTime();
    if (msUntil <= 0) return; // already past
    setTimeout(() => {
      try {
        clearPlansIfWeeklyNeeded();
      } catch (e) {
        console.error("[studyPlans] scheduled weekly clear error:", e);
      }
      // re-schedule the next one in 7 days
      setInterval(clearPlansIfWeeklyNeeded, 7 * 24 * 60 * 60 * 1000);
    }, msUntil + 50); // slight offset
    console.debug("[studyPlans] scheduled next weekly clear in ms:", msUntil);
  } catch (err) {
    console.error("[studyPlans] scheduleNextWeeklyClear error:", err);
  }
}

// Render an array of saved tasks into the studyPlanDisplay
function renderStudyPlanFromArray(tasksArray) {
  const studyPlanDisplay = document.getElementById("studyPlanDisplay");
  if (!studyPlanDisplay) return;

  // Reset placeholder/contents
  studyPlanDisplay.innerHTML = "";

  if (!Array.isArray(tasksArray) || tasksArray.length === 0) {
    studyPlanDisplay.innerHTML =
      '<p class="text-gray-500 italic">No tasks scheduled yet.</p>';
    updateMinutesLeftDisplay();
    runButtonColorCheck();
    return;
  }

  // For each saved task, recreate the DOM node similarly to addToAgenda
  tasksArray.forEach((task) => {
    const agendaItem = document.createElement("div");
    agendaItem.className = "p-2 mb-2 rounded text-white";
    agendaItem.dataset.startDate = task.startDate || new Date().toISOString();
    agendaItem.dataset.estimatedTime = task.estimatedTime || 0;
    agendaItem.dataset.zone = task.zone || "";

    const estimatedTime = parseInt(agendaItem.dataset.estimatedTime, 10) || 0;
    // Use same proportional sizing as addToAgenda
    const totalMinutes = 63;
    const percentage = (estimatedTime / totalMinutes) * 100;
    agendaItem.style.flex = `0 0 ${percentage}%`;

    switch (agendaItem.dataset.zone) {
      case "Independent":
        agendaItem.style.backgroundColor = "#3182ce";
        break;
      case "Semi-Collaborative":
        agendaItem.style.backgroundColor = "#38a169";
        break;
      case "Collaborative":
        agendaItem.style.backgroundColor = "#e53e3e";
        break;
      default:
        agendaItem.style.backgroundColor = "#718096";
    }

    agendaItem.innerHTML = `
      <span>${task.summary || "Unnamed Task"} - ${estimatedTime} min.</span>
    `;

    studyPlanDisplay.appendChild(agendaItem);
  });

  runButtonColorCheck();
  updateMinutesLeftDisplay();
}

// Load and render study plan for a slot (periodLabel, dayName)
function loadStudyPlanForSlot(periodLabel, dayName) {
  const plans = loadAllStudyPlans();
  const slotKey = getSlotKey(periodLabel, dayName);
  const tasks = plans[slotKey] || [];
  renderStudyPlanFromArray(tasks);
}

// Save current DOM study plan into the active slot
function saveCurrentSlotPlans() {
  const studyPlanDisplay = document.getElementById("studyPlanDisplay");
  const studyPlannerSection = document.getElementById("studyPlannerSection");
  if (!studyPlanDisplay || !studyPlannerSection) return;
  const slotKey = studyPlannerSection.dataset.slotKey;
  if (!slotKey) return; // nothing to save if no active slot

  const tasks = Array.from(studyPlanDisplay.children).map((child) => ({
    summary: (child.textContent || "").split(" - ")[0].trim(),
    estimatedTime: parseInt(child.dataset.estimatedTime, 10) || 0,
    zone: child.dataset.zone || "",
    startDate: child.dataset.startDate || new Date().toISOString(),
  }));

  const plans = loadAllStudyPlans();
  plans[slotKey] = tasks;
  saveAllStudyPlans(plans);
  console.debug(
    `[studyPlans] Saved ${tasks.length} tasks for slot: ${slotKey}`,
  );
  // Update schedule overlays so dashboard reflects this change promptly
  try {
    const displayPanel = document.getElementById("scheduleDisplayPanel");
    if (displayPanel) applyScheduleOverlays(displayPanel);
  } catch (err) {
    console.error(
      "[studyPlans] error updating schedule overlays after save:",
      err,
    );
  }
}

// Attach click handlers to the schedule display/form table cells so they open planner
function attachScheduleCellHandlers() {
  // Map column index to weekday names (Monday..Friday)
  const weekdayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  // Use event delegation on the panels so handlers survive re-renders
  const displayPanel = document.getElementById("scheduleDisplayPanel");
  const formPanel = document.getElementById("scheduleFormPanel");
  const panels = [displayPanel, formPanel];

  panels.forEach((panel) => {
    if (!panel) return;

    // Click listener (delegated)
    panel.addEventListener("click", (e) => {
      // Prevent planner opening if the schedule form is visible
      const formPanel = document.getElementById("scheduleFormPanel");
      if (formPanel && !formPanel.classList.contains("hidden")) {
        // Schedule form is visible, allow user to enter schedule, do not open planner
        return;
      }
      const td = e.target.closest("td");
      if (!td || !panel.contains(td)) return;
      const tr = td.closest("tr");
      if (!tr) return;
      const allTds = Array.from(tr.querySelectorAll("td"));
      const idx = allTds.indexOf(td);
      // Ignore first column (period label)
      if (idx === 0) {
        console.debug(
          "[schedule] clicked period label cell, ignoring",
          td.textContent.trim(),
        );
        return;
      }
      const periodLabelCell = tr.querySelector("td:first-child");
      const periodLabel = periodLabelCell
        ? periodLabelCell.textContent.trim()
        : null;
      const dayName = weekdayNames[idx - 1] || `Col${idx}`;
      console.debug("[schedule] cell clicked", {
        periodLabel,
        dayName,
        idx,
        text: td.textContent.trim(),
      });
      if (periodLabel) openStudyPlannerForSlot(periodLabel, dayName);
    });

    // Keyboard accessibility (delegated)
    panel.addEventListener("keydown", (e) => {
      // Prevent planner opening if the schedule form is visible
      const formPanel = document.getElementById("scheduleFormPanel");
      if (formPanel && !formPanel.classList.contains("hidden")) {
        return;
      }
      if (e.key !== "Enter" && e.key !== " ") return;
      const td = e.target.closest("td");
      if (!td || !panel.contains(td)) return;
      e.preventDefault();
      const tr = td.closest("tr");
      if (!tr) return;
      const allTds = Array.from(tr.querySelectorAll("td"));
      const idx = allTds.indexOf(td);
      if (idx === 0) return;
      const periodLabelCell = tr.querySelector("td:first-child");
      const periodLabel = periodLabelCell
        ? periodLabelCell.textContent.trim()
        : null;
      const dayName = weekdayNames[idx - 1] || `Col${idx}`;
      console.debug("[schedule] key-activate cell", {
        periodLabel,
        dayName,
        idx,
      });
      if (periodLabel) openStudyPlannerForSlot(periodLabel, dayName);
    });

    // Set pointer cursor and tabindex for existing table cells to improve UX
    const table = panel.querySelector("table");
    if (table) {
      table.querySelectorAll("td").forEach((td) => {
        td.style.cursor = td.cellIndex === 0 ? "default" : "pointer";
        td.tabIndex = 0;
      });
    }
  });

  console.debug("[schedule] attachScheduleCellHandlers completed");
}

// Open the study planner for a specific slot, load its saved plan, and set active slot
function openStudyPlannerForSlot(periodLabel, dayName) {
  console.debug("[openStudyPlannerForSlot] called", { periodLabel, dayName });
  const dashboardSection = document.getElementById("dashboardSection");
  const studyScreen = document.getElementById("studyPlannerSection");
  if (!studyScreen || !dashboardSection) {
    console.warn("[openStudyPlannerForSlot] missing DOM elements", {
      studyScreen: !!studyScreen,
      dashboardSection: !!dashboardSection,
    });
    return;
  }

  // Hide dashboard, show planner
  dashboardSection.classList.add("hidden");
  studyScreen.classList.remove("hidden");

  // Annotate the planner with the active slot key
  const slotKey = getSlotKey(periodLabel, dayName);
  studyScreen.dataset.slotKey = slotKey;

  console.debug("[openStudyPlannerForSlot] opening slot", { slotKey });

  // Update the planner header to show which slot is being planned
  const titleSpan = studyScreen.querySelector(".session-title");
  if (titleSpan) {
    // Look up the user-entered class name for this period and day
    let className = "";
    try {
      const scheduleData = JSON.parse(
        localStorage.getItem("userSchedule") || "{}",
      );
      // The input name is like period4Monday, period5Tuesday, etc.
      // Extract the period number from periodLabel (e.g., P4 -> 4)
      const periodNum = periodLabel.replace(/[^0-9]/g, "");
      const key = `period${periodNum}${dayName}`;
      className = scheduleData[key] || "";
    } catch (e) {
      className = "";
    }
    const displayName = className
      ? `${className} (${periodLabel}, ${dayName})`
      : `${periodLabel} (${dayName})`;
    titleSpan.textContent = `${displayName}`;
  }

  // Load saved plan for the slot
  loadStudyPlanForSlot(periodLabel, dayName);
  updateMinutesLeftDisplay();
}

function updateMinutesLeftDisplay() {
  const studyPlanDisplay = document.getElementById("studyPlanDisplay");
  const minutesLeftDisplay = document.getElementById("minutesLeftDisplay");
  const totalMinutes = Array.from(studyPlanDisplay.children).reduce(
    (sum, child) => {
      const estimatedTime = parseInt(child.dataset.estimatedTime, 10) || 0;
      return sum + estimatedTime;
    },
    0,
  );
  const minutesLeft = Math.max(60 - totalMinutes, 0);
  minutesLeftDisplay.textContent = `${minutesLeft} minute${minutesLeft === 1 ? "" : "s"
    } left to plan.`;
}

const gradeSelect = document.getElementById("gradeSelect");
const bookingsIframe = document.getElementById("bookingsIframe");

// Save grade selection on form submit
document.getElementById("scheduleForm").addEventListener("submit", (e) => {
  const selectedGrade = gradeSelect.value;
  localStorage.setItem("userGrade", selectedGrade);
  // ...existing code...
});

// Set grade selection from localStorage on load
document.addEventListener("DOMContentLoaded", () => {
  // DOM elements
  const dashboardSection = document.getElementById("dashboardSection");
  const scheduleSetupSection = document.getElementById("scheduleSetupSection");
  const dashboardContainer = document.getElementById("dashboardContainer");
  const startStudyBtn = document.getElementById("startStudyBtn");
  const backToDashboardBtn = document.getElementById("backToDashboardBtn");
  const studyScreen = document.getElementById("studyPlannerSection");
  const studyPlanDisplay = document.getElementById("studyPlanDisplay");
  const runScreenTasks = document.getElementById("runScreenTasks");
  const runButton = document.getElementById("runButton");
  const gradeSelect = document.getElementById("gradeSelect");
  const bookingsIframe = document.getElementById("bookingsIframe");

  // Only run if dashboardContainer exists
  if (dashboardContainer) {
    checkIcalFeed();

    fetchIcalFeed()
      .then(() => {
        renderDashboardTasks({ scrollToToday: true });
        loadStudyTasks();
      })
      .catch((error) => {
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
      updateMinutesLeftDisplay(); // Always update the minutes display
    });
  }

  if (backToDashboardBtn) {
    backToDashboardBtn.addEventListener("click", () => {
      studyScreen.classList.add("hidden");
      dashboardSection.classList.remove("hidden");
      studyPlanDisplay.innerHTML =
        '<p class="text-gray-500 italic">No tasks scheduled yet.</p>';
      runScreenTasks.innerHTML = "";
      updateMinutesLeftDisplay();
    });
  }

  // Set grade selection from localStorage
  const savedGrade = localStorage.getItem("userGrade");
  if (savedGrade && gradeSelect) {
    gradeSelect.value = savedGrade;
    updateIframeSrc(savedGrade || gradeSelect.value);
  }

  // Add grade change listener
  if (gradeSelect) {
    gradeSelect.addEventListener("change", (e) => {
      const grade = e.target.value;
      localStorage.setItem("userGrade", grade);
      updateIframeSrc(grade);
    });
  }

  // Add Tutorial Popup logic
  const addTutorialBtn = document.getElementById("addTutorialBtn");
  const cancelTutorialBtn = document.getElementById("cancelTutorialBtn");
  const saveTutorialBtn = document.getElementById("saveTutorialBtn");
  if (addTutorialBtn)
    addTutorialBtn.onclick = () =>
      document.getElementById("addTutorialPopup").classList.remove("hidden");
  if (cancelTutorialBtn)
    cancelTutorialBtn.onclick = () =>
      document.getElementById("addTutorialPopup").classList.add("hidden");
  if (saveTutorialBtn)
    saveTutorialBtn.onclick = () => {
      const date = document.getElementById("tutorialDate").value;
      const teacher = document.getElementById("tutorialTeacher").value.trim();
      if (!date) return alert("Please select a date.");
      if (!teacher) return alert("Please enter the teacher's name.");
      const customTasks = JSON.parse(
        localStorage.getItem("customTasks") || "[]",
      );
      // Always save as UTC 23:59
      const startDate = `${date}T23:59:00.000Z`;
      customTasks.push({
        summary: `Tutorial (${teacher})`,
        startDate,
        teacher,
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
  if (addTaskBtn)
    addTaskBtn.onclick = () =>
      document.getElementById("addTaskPopup").classList.remove("hidden");
  if (cancelTaskBtn)
    cancelTaskBtn.onclick = () => {
      document.getElementById("addTaskPopup").classList.add("hidden");
      document.getElementById("customTaskTitle").value = "";
      document.getElementById("customTaskDate").value = "";
    };
  if (saveTaskBtn)
    saveTaskBtn.onclick = () => {
      const title = document.getElementById("customTaskTitle").value.trim();
      const date = document.getElementById("customTaskDate").value;
      if (!title || !date) {
        alert("Please enter a title and date.");
        return;
      }
      const customTasks = JSON.parse(
        localStorage.getItem("customTasks") || "[]",
      );
      if (customTasks.some((t) => t.summary === title)) {
        alert("Custom task titles must be unique.");
        return;
      }
      // Always save as UTC 23:59
      const startDate = `${date}T23:59:00.000Z`;
      customTasks.push({
        summary: title,
        startDate,
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
          setTimeout(
            () => refreshStudyTasksBtn.classList.remove("fa-spin"),
            500,
          );
        })
        .catch(() => {
          setTimeout(
            () => refreshStudyTasksBtn.classList.remove("fa-spin"),
            500,
          );
        });
      const studyPlanDisplay = document.getElementById("studyPlanDisplay");
      if (studyPlanDisplay) {
        studyPlanDisplay.innerHTML =
          '<p class="text-gray-500 italic">No tasks scheduled yet.</p>';
        updateMinutesLeftDisplay();
      }
    };
  }

  // Hide the old Start button — scheduling replaces it
  if (startStudyBtn) {
    startStudyBtn.classList.add("hidden");
  }

  // Hide the old Start button — scheduling replaces it
  if (startStudyBtn) {
    startStudyBtn.classList.add("hidden");
  }

  // Clear saved plans on Sunday
  !(
    // Weekly clearing and sanitization
    clearPlansIfWeeklyNeeded()
  );
  scheduleNextWeeklyClear();

  // Initial dashboard render
  renderDashboardTasks();
  loadStudyTasks();
  updateMinutesLeftDisplay(); // Initialize the minutes display

  // Ensure schedule form labels updated and then attach cell handlers (so they open planner)
  updateScheduleFormLabels();
  attachScheduleCellHandlers();

  // Ensure schedule form labels updated and then attach cell handlers (so they open planner)
  updateScheduleFormLabels();
  attachScheduleCellHandlers();

  // Schedule form functionality
  function getPeriodLabels() {
    // Get the user's timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Map timezones to period numbers
    const timezonePeriods = {
      // Pacific Time (PST/PDT)
      "America/Los_Angeles": [4, 5, 6, 7, 8],
      "America/Vancouver": [4, 5, 6, 7, 8],

      // Mountain Time (MST/MDT)
      "America/Denver": [4, 5, 6, 7, 8],
      "America/Phoenix": [4, 5, 6, 7, 8],
      "America/Edmonton": [4, 5, 6, 7, 8],

      // Central Time (CST/CDT)
      "America/Chicago": [3, 4, 5, 6, 7],
      "America/Mexico_City": [3, 4, 5, 6, 7],
      "America/Winnipeg": [3, 4, 5, 6, 7],

      // Eastern Time (EST/EDT)
      "America/New_York": [2, 3, 4, 5, 6],
      "America/Toronto": [2, 3, 4, 5, 6],
      "America/Montreal": [2, 3, 4, 5, 6],

      // Atlantic Time
      "America/Halifax": [2, 3, 4, 5, 6],

      // Default fallback (Pacific Time)
      default: [4, 5, 6, 7, 8],
    };

    // Get periods for the timezone, fallback to default if not found
    const periods = timezonePeriods[timezone] || timezonePeriods["default"];

    // Convert to period labels
    return periods.map((period) => `P${period}`);
  }

  function saveScheduleData() {
    const scheduleInputs = document.querySelectorAll(".schedule-input");
    const scheduleData = {};

    scheduleInputs.forEach((input) => {
      if (input.value.trim()) {
        scheduleData[input.name] = input.value.trim();
      }
    });

    localStorage.setItem("userSchedule", JSON.stringify(scheduleData));
    console.log("Schedule saved:", scheduleData);

    // Switch to display panel
    const formPanel = document.getElementById("scheduleFormPanel");
    const displayPanel = document.getElementById("scheduleDisplayPanel");

    if (formPanel) formPanel.classList.add("hidden");
    if (displayPanel) {
      displayPanel.classList.remove("hidden");
      displaySavedSchedule();
    }
  }

  function displaySavedSchedule() {
    const savedSchedule = localStorage.getItem("userSchedule");
    const displayPanel = document.getElementById("scheduleDisplayPanel");

    if (!savedSchedule || !displayPanel) return;

    const scheduleData = JSON.parse(savedSchedule);

    // Create schedule table HTML with full height and beautiful styling
    let scheduleHTML = `
      <div class="h-full flex flex-col">        
        <div class="flex-1 overflow-hidden">
          <div class="h-full bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
            <table class="w-full h-full table-fixed">
              <thead class="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <tr class="h-16">
                  <th class="w-20 text-center font-bold text-lg border-r border-blue-400"> </th>
                  <th class="text-center font-bold text-lg border-r border-blue-400">Monday</th>
                  <th class="text-center font-bold text-lg border-r border-blue-400">Tuesday</th>
                  <th class="text-center font-bold text-lg border-r border-blue-400">Wednesday</th>
                  <th class="text-center font-bold text-lg border-r border-blue-400">Thursday</th>
                  <th class="text-center font-bold text-lg">Friday</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-600">
    `;

    // Get dynamic period labels based on timezone
    const periodLabels = getPeriodLabels();
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

    // Define periods and their corresponding input names
    const periods = [
      {
        period: periodLabels[0],
        inputs: [
          "period4Monday",
          "period4Tuesday",
          "period4Wednesday",
          "period4Thursday",
          "period4Friday",
        ],
      },
      {
        period: periodLabels[1],
        inputs: [
          "period5Monday",
          "period5Tuesday",
          "period5Wednesday",
          "period5Thursday",
          "period5Friday",
        ],
      },
      {
        period: periodLabels[2],
        inputs: [
          "period6Monday",
          "period6Tuesday",
          "period6Wednesday",
          "period6Thursday",
          "period6Friday",
        ],
      },
      {
        period: periodLabels[3],
        inputs: [
          "period7Monday",
          "period7Tuesday",
          "period7Wednesday",
          "period7Thursday",
          "period7Friday",
        ],
      },
      {
        period: periodLabels[4],
        inputs: [
          "period8Monday",
          "period8Tuesday",
          "period8Wednesday",
          "period8Thursday",
          "period8Friday",
        ],
      },
    ];

    periods.forEach((periodData, index) => {
      const rowHeight = "h-20"; // Fixed height for each row
      const isEvenRow = index % 2 === 0;

      scheduleHTML += `
        <tr class="${rowHeight} schedule-row ${isEvenRow ? "schedule-row-even" : "schedule-row-odd"}">
          <td class="w-20 text-center font-bold text-lg schedule-period border-r schedule-border align-middle">
            ${periodData.period}
          </td>
      `;

      periodData.inputs.forEach((inputName, dayIndex) => {
        const className = scheduleData[inputName] || "";
        const isEmpty = !className.trim();
        const textClass = isEmpty ? "schedule-empty" : "schedule-filled";
        const borderClass = dayIndex < 4 ? "border-r schedule-border" : "";

        scheduleHTML += `
          <td class="text-center ${textClass} ${borderClass} align-middle px-4 py-4" data-period="${periodData.period}" data-day="${dayNames[dayIndex]}">
            <span class="truncate block">${isEmpty ? "Free Period" : className}</span>
          </td>
        `;
      });

      scheduleHTML += "</tr>";
    });

    scheduleHTML += `
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    displayPanel.innerHTML = scheduleHTML;

    // Apply visual overlays for saved study plans
    try {
      applyScheduleOverlays(displayPanel);
    } catch (err) {
      console.error("[schedule] apply overlays error:", err);
    }

    // After rendering the schedule, emphasize the current period if any
    try {
      emphasizeCurrentPeriod();
    } catch (err) {
      console.error("[schedule] emphasizeCurrentPeriod error:", err);
    }
  }

  // Period times per timezone group (start and end in 24h "HH:MM" local time)
  // NEST and Homeroom are excluded here
  const timezonePeriodTimes = {
    // Atlantic / Eastern style
    Atlantic: {
      P1: ["08:25", "09:25"],
      P2: ["09:28", "10:28"],
      P3: ["10:31", "11:31"],
      P4: ["12:21", "01:21"],
      P5: ["02:01", "03:01"],
    },
    Eastern: {
      P2: ["08:28", "09:28"],
      P3: ["09:31", "10:31"],
      P4: ["11:21", "12:21"],
      P5: ["01:01", "02:01"],
      P6: ["02:04", "03:04"],
    },
    Central: {
      P3: ["08:31", "09:31"],
      P4: ["10:21", "11:21"],
      P5: ["12:01", "01:01"],
      P6: ["01:04", "02:04"],
      P7: ["02:07", "03:07"],
    },
    Mountain: {
      P3: ["07:31", "08:31"],
      P4: ["09:21", "10:21"],
      P5: ["11:01", "12:01"],
      P6: ["12:04", "01:04"],
      P7: ["01:07", "02:07"],
    },
    Pacific: {
      P4: ["08:21", "09:21"],
      P5: ["10:01", "11:01"],
      P6: ["11:04", "12:04"],
      P7: ["12:07", "01:07"],
      P8: ["01:37", "02:37"],
    },
  };

  // Inject highlight CSS once
  (function ensureHighlightStyle() {
    if (document.getElementById("schedule-current-style")) return;
    const style = document.createElement("style");
    style.id = "schedule-current-style";
    style.textContent = `
        .schedule-current-cell { box-shadow: 0 0 0 3px rgba(59,130,246,0.35) inset; transform: scale(1.02); transition: transform .15s ease; }
        .schedule-filled:hover, .schedule-empty:hover { background: rgba(59,130,246,0.10); box-shadow: 0 0 0 2px rgba(59,130,246,0.25) inset; cursor: pointer; }
      `;
    document.head.appendChild(style);
  })();

  // Helper to pick the best timezone key for the current user timezone
  function detectTimezoneKey() {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (/America\/(Los_Angeles|Vancouver)/i.test(tz)) return "Pacific";
    if (/America\/(Denver|Phoenix|Edmonton|Boise)/i.test(tz)) return "Mountain";
    if (/America\/(Chicago|Winnipeg|Mexico_City)/i.test(tz)) return "Central";
    if (/America\/(New_York|Toronto|Montreal|Halifax)/i.test(tz))
      return "Eastern";
    // default fallback
    return "Pacific";
  }

  // Parse HH:MM to minutes since midnight
  function hhmmToMinutes(hhmm) {
    const [hh, mm] = hhmm.split(":").map(Number);
    return hh * 60 + mm;
  }

  // Emphasize the current period by adding a class to the corresponding TD
  function emphasizeCurrentPeriod() {
    // Remove previous highlights
    document
      .querySelectorAll(".schedule-current-cell")
      .forEach((el) => el.classList.remove("schedule-current-cell"));

    const displayPanel = document.getElementById("scheduleDisplayPanel");
    if (!displayPanel) return;
    const table = displayPanel.querySelector("table");
    if (!table) return;

    const tzKey = detectTimezoneKey();
    const periodMap = timezonePeriodTimes[tzKey] || {};
    const now = new Date();
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    console.debug("[schedule] emphasizeCurrentPeriod running", {
      tzKey,
      minutesNow,
    });

    // Find matching period label (e.g., P4) where now is between start/end
    let currentPeriodLabel = null;
    Object.keys(periodMap).forEach((p) => {
      const [start, end] = periodMap[p];
      if (!start || !end) return;
      const startMin = hhmmToMinutes(start);
      const endMin = hhmmToMinutes(end);
      if (minutesNow >= startMin && minutesNow < endMin) {
        currentPeriodLabel = p;
      }
    });

    if (!currentPeriodLabel) {
      console.debug("[schedule] No current period for timezone", tzKey);
      return;
    }

    // Prefer data-attribute lookup: find the TD with data-period == currentPeriodLabel and data-day == today
    const weekday = new Date().getDay(); // 0-6
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const dayIndex = weekday >= 1 && weekday <= 5 ? weekday - 1 : null;
    if (dayIndex === null) {
      console.debug("[schedule] Today is weekend, no highlight");
      return;
    }

    if (currentPeriodLabel) {
      const selector = `td[data-period="${currentPeriodLabel}"][data-day="${dayNames[dayIndex]}"]`;
      const targetTd = table.querySelector(selector);
      if (targetTd) {
        targetTd.classList.add("schedule-current-cell");
        console.debug("[schedule] Highlighted current period via data-attrs", {
          tzKey,
          currentPeriodLabel,
          day: dayNames[dayIndex],
        });
        return;
      }
      // Fallback: old row-scan method
      const rows = Array.from(table.querySelectorAll("tbody tr"));
      for (const row of rows) {
        const firstCell = row.querySelector("td:first-child");
        if (!firstCell) continue;
        const label = firstCell.textContent.trim();
        if (label === currentPeriodLabel) {
          const tds = row.querySelectorAll("td");
          const fallbackTd = tds[dayIndex + 1]; // +1 because first td is period label
          if (fallbackTd) {
            fallbackTd.classList.add("schedule-current-cell");
            console.debug(
              "[schedule] Highlighted current period via fallback",
              { tzKey, currentPeriodLabel, dayIndex },
            );
          }
          return;
        }
      }
      console.debug(
        "[schedule] Could not find matching row for period label",
        currentPeriodLabel,
      );
      return;
    }
    console.debug(
      "[schedule] No current period label found for timezone",
      tzKey,
    );
  }

  // Update highlight every minute
  setInterval(() => {
    try {
      emphasizeCurrentPeriod();
    } catch (err) {
      /* ignore */
    }
  }, 60 * 1000);

  // Add Enter key listeners to schedule inputs
  function addScheduleInputListeners() {
    // Remove Enter key save functionality; users must use the Save button
    // No-op: do not add any keydown listeners to schedule inputs
  }

  // Update HTML form with dynamic period labels
  function updateScheduleFormLabels() {
    const periodLabels = getPeriodLabels();
    const periodCells = document.querySelectorAll(
      "#scheduleFormPanel tbody tr td:first-child",
    );

    periodCells.forEach((cell, index) => {
      if (index < periodLabels.length) {
        cell.textContent = periodLabels[index];
      }
    });
  }

  // Initialize schedule functionality
  addScheduleInputListeners();
  updateScheduleFormLabels();

  // Zoom helpers: set/reset page zoom using multiple strategies (non-standard behavior)
  function setPageZoom(percentage) {
    try {
      // Try non-standard style.zoom first (works in many browsers)
      document.body.style.zoom = percentage;
      // Store applied zoom in localStorage for persistence if desired
      localStorage.setItem("userZoom", percentage);
      return true;
    } catch (e) {
      // ignore fallthrough
    }

    try {
      // Fallback: apply CSS transform scale with transform-origin top-left
      const scale = parseFloat(String(percentage).replace("%", "")) / 100;
      if (Number.isFinite(scale) && scale > 0) {
        document.body.style.transform = `scale(${scale})`;
        document.body.style.transformOrigin = "0 0";
        // Compensate for the transform by increasing the width of the html element
        document.documentElement.style.width = `${(100 / scale).toFixed(4)}%`;
        localStorage.setItem("userZoom", percentage);
        return true;
      }
    } catch (e) {
      // ignore
    }
    return false;
  }

  function resetPageZoom() {
    try {
      document.body.style.zoom = "";
    } catch (e) { }
    try {
      document.body.style.transform = "";
    } catch (e) { }
    try {
      document.body.style.transformOrigin = "";
    } catch (e) { }
    try {
      document.documentElement.style.width = "";
    } catch (e) { }
    localStorage.removeItem("userZoom");
  }

  // Return true if element is fully in the viewport
  function isElementFullyInViewport(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  // Apply an 80% zoom automatically only if the Save Schedule button isn't visible
  function applyAutoZoomIfNeeded() {
    // Do not auto-zoom on mobile devices; check via userAgent or viewport size
    const isMobile =
      /Mobi|Android/i.test(navigator.userAgent) ||
      Math.max(window.innerWidth, window.innerHeight) < 600;
    if (isMobile) return;

    const saveBtn = document.getElementById("saveScheduleBtn");
    if (!saveBtn) return;

    // Respect user's choice to opt out
    if (localStorage.getItem("autoZoomDisabled") === "true") return;

    // If save button is not fully visible, attempt to apply 80% zoom
    if (!isElementFullyInViewport(saveBtn)) {
      // Apply the zoom but keep a record so the user can revert
      const applied = setPageZoom("80%");
      if (!applied) {
        // If we couldn't programmatically zoom, show banner prompting the user to zoom out
        showScheduleZoomBanner();
      } else {
        // applied zoom: hide banner if present
        hideScheduleZoomBanner();
      }
    }
  }

  // Create show/hide for the zoom banner and wire up its buttons
  function showScheduleZoomBanner() {
    const banner = document.getElementById("scheduleZoomBanner");
    if (!banner) return;
    banner.classList.remove("hidden");
    const autoBtn = document.getElementById("scheduleAutoZoomBtn");
    const dismissBtn = document.getElementById("scheduleDismissZoomBtn");
    if (autoBtn) {
      autoBtn.onclick = () => {
        const applied = setPageZoom("80%");
        if (applied) {
          banner.classList.add("hidden");
        } else {
          banner.classList.add("hidden");
        }
      };
    }
    if (dismissBtn) {
      dismissBtn.onclick = () => {
        banner.classList.add("hidden");
        localStorage.setItem("autoZoomDisabled", "true");
      };
    }
  }

  function hideScheduleZoomBanner() {
    const banner = document.getElementById("scheduleZoomBanner");
    if (!banner) return;
    banner.classList.add("hidden");
  }

  // Reset Zoom button in the settings popup for convenience
  const resetZoomBtn = document.createElement("button");
  resetZoomBtn.id = "resetZoomBtn";
  resetZoomBtn.className =
    "bg-gray-100 text-gray-800 px-3 py-2 rounded hover:bg-gray-200";
  resetZoomBtn.textContent = "Reset Zoom";
  // Append to settings popup footer if it exists
  (function addResetZoomToSettings() {
    const settingsPopupInner = document.querySelector(
      "#settingsPopup .bg-white",
    );
    if (!settingsPopupInner) return;
    const footer = settingsPopupInner.querySelector(".flex.justify-end");
    if (footer) {
      footer.insertBefore(resetZoomBtn, footer.firstChild);
    } else {
      settingsPopupInner.appendChild(resetZoomBtn);
    }
  })();
  resetZoomBtn.addEventListener("click", (e) => {
    e.preventDefault();
    resetPageZoom();
    localStorage.setItem("autoZoomDisabled", "true");
    alert("Page zoom reset to 100% and auto-zoom disabled.");
  });

  // When schedule form is toggled to visible, check if auto-zoom is needed
  function scheduleFormVisibilityObserver() {
    const formPanel = document.getElementById("scheduleFormPanel");
    if (!formPanel) return;
    const observer = new MutationObserver(() => {
      if (!formPanel.classList.contains("hidden")) {
        // It became visible
        setTimeout(() => applyAutoZoomIfNeeded(), 50);
      }
    });
    observer.observe(formPanel, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  // Run the zoom check at initial load: if schedule panel exists and is visible
  (function initScheduleZoomHandling() {
    try {
      scheduleFormVisibilityObserver();
      const formPanel = document.getElementById("scheduleFormPanel");
      if (formPanel && !formPanel.classList.contains("hidden")) {
        applyAutoZoomIfNeeded();
      }
    } catch (err) {
      console.error("[schedule] initScheduleZoomHandling error:", err);
    }
  })();

  // Wire Save button in schedule form
  const saveScheduleBtn = document.getElementById("saveScheduleBtn");
  if (saveScheduleBtn) {
    saveScheduleBtn.addEventListener("click", (e) => {
      e.preventDefault();
      try {
        saveScheduleData();
        // After saving, focus the display panel for accessibility
        const displayPanel = document.getElementById("scheduleDisplayPanel");
        if (displayPanel) displayPanel.focus();
      } catch (err) {
        console.error("[schedule] saveScheduleBtn click error", err);
      }
    });
  }

  // Prevent Enter key on the schedule form from submitting
  const scheduleTableForm = document.getElementById("scheduleTableForm");
  if (scheduleTableForm) {
    scheduleTableForm.addEventListener("submit", (e) => {
      e.preventDefault();
    });
  }

  // Make the left headings act like tabs (clickable)
  (function () {
    const KEY = "activeLeftTab";
    const headings = document.querySelectorAll(
      "[data-target='#bookingsContent'], [data-target='#scheduleContent']",
    );
    const panels = {
      bookings: document.getElementById("bookingsContent"),
      schedule: document.getElementById("scheduleContent"),
    };
    const addTutorialBtn = document.getElementById("addTutorialBtn");

    function showScheduleContent() {
      // Check if schedule exists in localStorage
      const savedSchedule = localStorage.getItem("userSchedule");
      const formPanel = document.getElementById("scheduleFormPanel");
      const displayPanel = document.getElementById("scheduleDisplayPanel");

      if (savedSchedule) {
        // Show display panel if schedule exists
        if (formPanel) formPanel.classList.add("hidden");
        if (displayPanel) {
          displayPanel.classList.remove("hidden");
          displaySavedSchedule();
        }
      } else {
        // Show form panel if no schedule exists
        if (formPanel) formPanel.classList.remove("hidden");
        if (displayPanel) displayPanel.classList.add("hidden");
      }
    }

    function showScheduleForm() {
      // Always show form panel and pre-fill with saved data
      const formPanel = document.getElementById("scheduleFormPanel");
      const displayPanel = document.getElementById("scheduleDisplayPanel");
      const savedSchedule = localStorage.getItem("userSchedule");

      if (formPanel) formPanel.classList.remove("hidden");
      if (displayPanel) displayPanel.classList.add("hidden");

      // Pre-fill form with saved data if it exists
      if (savedSchedule) {
        const scheduleData = JSON.parse(savedSchedule);
        Object.keys(scheduleData).forEach((inputName) => {
          const input = document.querySelector(`[name="${inputName}"]`);
          if (input) {
            input.value = scheduleData[inputName];
          }
        });
      }
    }

    function setActive(targetSelector, persist = true) {
      // show/hide main panels
      Object.values(panels).forEach((el) => el && el.classList.add("hidden"));
      const target = document.querySelector(targetSelector);
      if (target) target.classList.remove("hidden");

      // If schedule panel selected, decide whether to show form or display
      if (targetSelector === "#scheduleContent") {
        // Show display if schedule exists, form if not
        showScheduleContent();
        // hide add tutorial when schedule is active
        if (addTutorialBtn) addTutorialBtn.classList.add("hidden");
      } else {
        if (addTutorialBtn) addTutorialBtn.classList.remove("hidden");
      }

      // visual active state on headings: selected = black & bold; unselected = gray & normal weight
      headings.forEach((h) => {
        // ensure consistent font size
        h.classList.add("text-xl");
        // remove previous color/weight classes we control
        h.classList.remove("text-gray-500", "text-black", "font-bold");
        if (h.dataset.target === targetSelector) {
          // active
          h.classList.add("text-black", "font-bold");
        } else {
          // inactive
          h.classList.add("text-gray-500");
        }
      });

      // persist
      if (persist) localStorage.setItem(KEY, targetSelector);
    }

    headings.forEach((h) => {
      h.addEventListener("click", () => setActive(h.dataset.target, true));
      h.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ")
          setActive(h.dataset.target, true);
      });
    });

    const persisted = localStorage.getItem(KEY) || "#scheduleContent";
    setActive(persisted, false);
  })();

  // Custom teacher dropdown logic
  const teacherInput = document.getElementById("tutorialTeacher");
  const teacherDropdown = document.getElementById("teacherDropdown");

  if (teacherInput && teacherDropdown) {
    teacherInput.addEventListener("input", function () {
      const value = this.value.trim().toLowerCase();
      teacherDropdown.innerHTML = "";
      if (value.length === 0) {
        teacherDropdown.classList.add("hidden");
        return;
      }
      const matches = teacherList.filter((name) =>
        name.toLowerCase().includes(value),
      );
      if (matches.length === 0) {
        teacherDropdown.classList.add("hidden");
        return;
      }
      matches.forEach((name) => {
        const option = document.createElement("div");
        option.textContent = name;
        option.className = "px-3 py-2 cursor-pointer hover:bg-blue-100";
        option.onclick = () => {
          teacherInput.value = name;
          teacherDropdown.classList.add("hidden");
        };
        teacherDropdown.appendChild(option);
      });
      // Position dropdown below input
      const rect = teacherInput.getBoundingClientRect();
      teacherDropdown.style.top =
        teacherInput.offsetTop + teacherInput.offsetHeight + "px";
      teacherDropdown.style.left = teacherInput.offsetLeft + "px";
      teacherDropdown.style.width = teacherInput.offsetWidth + "px";
      teacherDropdown.classList.remove("hidden");
    });

    teacherInput.addEventListener("blur", function () {
      setTimeout(() => teacherDropdown.classList.add("hidden"), 150);
    });
  }
});

function updateIframeSrc(grade) {
  const bookingsIframe = document.getElementById("bookingsIframe");
  if (!bookingsIframe) return;
  let src = "";
  switch (grade) {
    case "7-8":
      src =
        "https://outlook.office.com/book/Grade9TutorialsCopy@na.oneschoolglobal.com/?ismsaljsauthenabled";
      break;
    case "9-10":
      src =
        "https://outlook.office.com/book/Grade910TutorialsCopy@na.oneschoolglobal.com/?ismsaljsauthenabled";
      break;
    case "11-12":
      src =
        "https://outlook.office.com/book/Grade1112Tutorials@na.oneschoolglobal.com/?ismsaljsauthenabled";
      break;
    default:
      src =
        "https://outlook.office.com/book/Grade910TutorialsCopy@na.oneschoolglobal.com/?ismsaljsauthenabled";
  }
  bookingsIframe.src = src;
}

function openEditTaskPopup(task) {
  const editPopup = document.getElementById("editTaskPopup");
  const editTitleInput = document.getElementById("editTaskTitle");
  const cancelBtn = document.getElementById("cancelEditTaskBtn");
  const saveBtn = document.getElementById("saveEditTaskBtn");

  // Show popup and set current title
  editPopup.classList.remove("hidden");
  editTitleInput.value = task.summary || "";

  // Cancel button closes popup
  cancelBtn.onclick = () => {
    editPopup.classList.add("hidden");
    editTitleInput.value = "";
  };

  // Save button updates the task title
  saveBtn.onclick = () => {
    const newTitle = editTitleInput.value.trim();
    if (!newTitle) {
      alert("Please enter a task title.");
      return;
    }

    // Update in customTasks if present
    let customTasks = JSON.parse(localStorage.getItem("customTasks") || "[]");
    let updated = false;
    customTasks = customTasks.map((t) => {
      if (t.startDate === task.startDate) {
        updated = true;
        return { ...t, summary: newTitle };
      }
      return t;
    });
    if (updated) {
      localStorage.setItem("customTasks", JSON.stringify(customTasks));
      // Update the UI immediately for custom tasks
      const taskElements = document.querySelectorAll(
        `[data-start-date='${task.startDate}']`,
      );
      taskElements.forEach((el) => {
        const summarySpan = el.querySelector("span");
        if (summarySpan)
          summarySpan.textContent = `${newTitle} - ${el.dataset.estimatedTime || ""
            } min.`;
      });
    } else {
      // If not a custom task, update editedIcalTasks
      let editedIcalTasks = JSON.parse(
        localStorage.getItem("editedIcalTasks") || "{}",
      );
      editedIcalTasks[task.startDate] = newTitle;
      localStorage.setItem("editedIcalTasks", JSON.stringify(editedIcalTasks));
      // Update the UI immediately for iCal tasks
      const taskElements = document.querySelectorAll(
        `[data-start-date='${task.startDate}']`,
      );
      taskElements.forEach((el) => {
        const summarySpan = el.querySelector("span");
        if (summarySpan)
          summarySpan.textContent = `${newTitle} - ${el.dataset.estimatedTime || ""
            } min.`;
      });
    }

    editPopup.classList.add("hidden");
    editTitleInput.value = "";

    // Optionally, still refresh tasks for consistency
    renderDashboardTasks();
    loadStudyTasks();
  };
}

// Custom teacher dropdown logic
const teacherList = [
  "Adam Miskic",
  "Aimee Lissel",
  "Alex Avila",
  "Alex Hutchinson",
  "Alison Quinn",
  "Allison Rhoades",
  "Amanda Edwin",
  "Amanda Lishamer",
  "Andrea Tucker",
  "Andrew Kralik",
  "Angela Conry",
  "Anne Lenihan",
  "Anthony Newman",
  "April Enochs",
  "Ashlie Kaul",
  "Bailey Kobs",
  "Benjamin Yule",
  "Boram Kim",
  "Brian Boutette",
  "Brian Kim",
  "Brian Merryweather",
  "Brian Naismith",
  "Brodie Ogg",
  "Cara Johnson",
  "Cassandra Montello",
  "Chris Gamble",
  "Courtney Garrah",
  "Craig Smale",
  "Craig Wall",
  "Dalton Fitting",
  "Damien Jordan",
  "Dan Larson-Knight",
  "Dani Idler",
  "David Macfarlane",
  "Desiree Lemieux",
  "Devin Tide",
  "Dilenny De La Cruz",
  "Ebony Bennett",
  "Elie MacLean",
  "Emily Atchue",
  "Erin Martin",
  "Evan Rogers",
  "Isaac Hager",
  "Jaimmie-Lee Jordan",
  "James Fraser",
  "Jane Ballou",
  "Jane Zegers",
  "Janet Valdez",
  "Jascenth McKenzie",
  "Jenelle Jeffrey",
  "Jess Meissner",
  "Jessica McCullough",
  "Joanie Wolfram",
  "John Van Ess",
  "Josanne Timothy",
  "Joseph Raygada",
  "Juanika Joseph",
  "Karen Lake",
  "Kat Bailey",
  "Kate Nelson",
  "Kathleen Vivian",
  "Kayla Jansky",
  "Kelle Patrick",
  "Keri Deskins",
  "Kessandra Blackman",
  "Khadija Darlington",
  "Kristen Jakala",
  "Kristin Iula",
  "Kyle Craig",
  "Kyle Gay",
  "Kyler Johnson",
  "Latasha Whiting",
  "Leanna Laidlow",
  "Lindsay Ebata",
  "MacKenzie Screpnek",
  "Maria Caoagdan",
  "Maria Luepke",
  "Martha Blue",
  "Matthew Robinson",
  "Matthew Windsor",
  "Michael Froberg",
  "Michele Weiss",
  "Michelle Meadows",
  "Michelle Panting",
  "Nicholas Delouis",
  "Nicole Chevrier",
  "Nicole Danks",
  "Olivia Garside",
  "Pam Small/Freger",
  "Patricia Stuhl",
  "Peter Henninger",
  "Rachelle Liski",
  "Rhea Goodridge",
  "Rheanne Foth",
  "Rob Pothaar",
  "Roxanne Catellier",
  "Ryan Coombs",
  "Ryanne Marchan",
  "Sam Farelli",
  "Samuel Poole",
  "Sara Alfaro",
  "Scott Fransky",
  "Shakeira Waithe",
  "Sharlene Kistow",
  "Sharie Snagg",
  "Stephanie Bakonyi",
  "Steven Reeder",
  "Suzan Brown",
  "Taryn Fenwick",
  "Thomas Coroneos",
  "Tina Liu",
  "Tishauna Petrie-Barrant",
  "Tonia Manges",
  "Tres Barker",
  "Wendy Omland",
  "William Nagel",
  "William Swidorski",
  "Woody Arrowood",
  "Zakk Taylor",
  "Zaleena Esahack",
];

function openMapPopup() {
  const mapPopup = document.getElementById("mapPopup");
  const mapTime = document.getElementById("mapTime");
  const mapZoneButtonGroup = document.getElementById("mapZoneButtonGroup");
  let mapSelectedZone = null;
  let mapTimeSelected = false;
  let mapZoneSelected = false;

  // Reset the popup fields
  if (mapTime) mapTime.value = "";
  mapSelectedZone = null;
  mapTimeSelected = false;
  mapZoneSelected = false;

  // Assign event listeners to time buttons scoped to the map popup
  const timeButtons = mapPopup ? mapPopup.querySelectorAll(".time-btn") : [];
  timeButtons.forEach((btn) => {
    btn.onclick = () => {
      console.log("[Time Button Clicked]", btn.textContent);
      if (mapTime) mapTime.value = btn.textContent;
      mapTimeSelected =
        !!(mapTime && mapTime.value) && parseInt(mapTime.value, 10) > 0;
      console.log(
        "[Time Selected]",
        mapTimeSelected,
        "Zone Selected",
        mapZoneSelected,
      );
      tryMapAutoSave();
    };
  });

  function closeMapPopup() {
    if (mapPopup) mapPopup.classList.add("hidden");
    document.removeEventListener("mousedown", outsideClickListener);
  }

  // Highlight default button (none selected) — scope to map popup or the group
  const zoneRoot = mapZoneButtonGroup || mapPopup;
  const zoneBtns = zoneRoot ? zoneRoot.querySelectorAll(".zone-btn") : [];
  zoneBtns.forEach((btn) => {
    btn.classList.remove(
      "ring",
      "ring-offset-2",
      "ring-blue-300",
      "ring-green-300",
      "ring-red-300",
    );
    btn.onclick = () => {
      console.log("[Zone Button Clicked]", btn.dataset.zone);
      // Use map-scoped variables here
      mapSelectedZone = btn.dataset.zone;
      mapZoneSelected = true;
      const zoneButtons = mapZoneButtonGroup
        ? mapZoneButtonGroup.querySelectorAll(".zone-btn")
        : zoneRoot.querySelectorAll(".zone-btn");
      zoneButtons.forEach((b) =>
        b.classList.remove(
          "ring",
          "ring-offset-2",
          "ring-blue-300",
          "ring-green-300",
          "ring-red-300",
        ),
      );
      if (mapSelectedZone === "Independent")
        btn.classList.add("ring", "ring-offset-2", "ring-blue-300");
      if (mapSelectedZone === "Semi-Collaborative")
        btn.classList.add("ring", "ring-offset-2", "ring-green-300");
      if (mapSelectedZone === "Collaborative")
        btn.classList.add("ring", "ring-offset-2", "ring-red-300");
      console.log(
        "[Zone Selected]",
        mapZoneSelected,
        "Time Selected",
        mapTimeSelected,
      );
      tryMapAutoSave();
    };
  });

  // Listen for time input changes
  if (mapTime) {
    mapTime.oninput = () => {
      mapTimeSelected = !!mapTime.value && parseInt(mapTime.value, 10) > 0;
      tryMapAutoSave();
    };
  }

  // Show the popup
  if (mapPopup) mapPopup.classList.remove("hidden");

  // Close popup when clicking outside the inner box
  setTimeout(() => {
    document.addEventListener("mousedown", outsideClickListener);
  }, 0);

  function outsideClickListener(e) {
    if (!mapPopup) return;
    if (!mapPopup.querySelector(".bg-white").contains(e.target)) {
      closeMapPopup();
    }
  }

  // Add this helper to support the MAP popup auto-save flow (nested so it can access map state)
  function tryMapAutoSave() {
    console.log(
      "[tryMapAutoSave] timeSelected:",
      mapTimeSelected,
      "zoneSelected:",
      mapZoneSelected,
    );
    if (mapTimeSelected && mapZoneSelected) {
      const estimatedTime = parseInt(mapTime ? mapTime.value : "", 10);
      console.log(
        "[tryMapAutoSave] estimatedTime:",
        estimatedTime,
        "mapSelectedZone:",
        mapSelectedZone,
      );
      if (!estimatedTime || isNaN(estimatedTime) || estimatedTime <= 0) {
        alert("Please enter a valid estimated time.");
        return;
      }

      // Calculate the total minutes already scheduled
      const currentTotalMinutes = Array.from(studyPlanDisplay.children).reduce(
        (sum, child) => {
          const taskTime = parseInt(child.dataset.estimatedTime, 10) || 0;
          return sum + taskTime;
        },
        0,
      );

      if (currentTotalMinutes + estimatedTime > 60) {
        alert("This task would go past the end of the Study.");
        return;
      }

      // Create a MAP Practice task object and add to agenda
      const mapTask = {
        summary: "MAP Practice",
        startDate: new Date().toISOString(),
      };

      addToAgenda(mapTask, estimatedTime, mapSelectedZone, false);
      mapTask.estimatedTime = estimatedTime;
      mapTask.zone = mapSelectedZone;

      // Close and reset the MAP popup UI
      if (mapPopup) {
        mapPopup.classList.add("hidden");
      }
      if (mapZoneButtonGroup) {
        mapZoneButtonGroup
          .querySelectorAll(".zone-btn")
          .forEach((b) =>
            b.classList.remove(
              "ring",
              "ring-offset-2",
              "ring-blue-300",
              "ring-green-300",
              "ring-red-300",
            ),
          );
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
}

const mapButton = document.getElementById("mapButton");
if (mapButton) {
  mapButton.addEventListener("click", openMapPopup);
}
