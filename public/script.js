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

  // Reset fields
  if (taskTime) taskTime.value = "";

  // Use taskPopup-scoped selectors so we only wire buttons inside the popup
  if (taskPopup) {
    taskPopup.querySelectorAll('.time-btn').forEach(btn => {
      btn.onclick = () => {
        const val = (btn.textContent || "").trim();
        if (taskTime) taskTime.value = val;
        timeSelected = parseInt(val, 10) > 0;
        tryAutoSave();
      };
    });

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

    // Ensure typed input triggers the same logic
    if (taskTime) {
      taskTime.oninput = () => {
        const val = (taskTime.value || "").trim();
        timeSelected = !isNaN(parseInt(val, 10)) && parseInt(val, 10) > 0;
        tryAutoSave();
      };
    }

    function tryAutoSave() {
      const estimatedTime = parseInt((taskTime && taskTime.value || "").trim(), 10);
      const hasTime = !isNaN(estimatedTime) && estimatedTime > 0;
      const hasZone = !!selectedZone;
      if (hasTime && hasZone) {
        const currentTotalMinutes = Array.from(studyPlanDisplay.children).reduce((sum, child) => {
          const taskTime = parseInt(child.dataset.estimatedTime, 10) || 0;
          return sum + taskTime;
        }, 0);
        if (currentTotalMinutes + estimatedTime > 60) {
          alert("This task would go past the end of the Study.");
          return;
        }
        addToAgenda(task, estimatedTime, selectedZone);
        task.estimatedTime = estimatedTime;
        task.zone = selectedZone;
        closePopup();
      }
    }

    // Show popup and attach outside click to close
    taskPopup.classList.remove("hidden");
    setTimeout(() => {
      document.addEventListener("mousedown", outsideClickListener);
    }, 0);

    function outsideClickListener(e) {
      const inner = taskPopup.querySelector('.bg-white');
      if (!inner) return;
      if (!inner.contains(e.target)) {
        closePopup();
      }
    }

    function closePopup() {
      taskPopup.classList.add("hidden");
      document.removeEventListener("mousedown", outsideClickListener);
    }
  }
}
window.openTaskPopup = openTaskPopup;

// ------------------ Clear only userGrade and iCal URL ------------------
function clearUserData() {
  // Only remove the items that represent user identity / feed
  localStorage.removeItem('userGrade');
  localStorage.removeItem('icalFeedUrl');
  // keep completedTasks, customTasks, icalTasks intact
  location.reload();
}
window.clearUserData = clearUserData;

// ------------------ MAP popup: open/close handlers + fixed save ------------------
function openMapPopup() {
  if (!mapPopup) return;
  mapPopup.classList.remove('hidden');
  // add outside click and Escape handlers
  setTimeout(() => {
    document.addEventListener('mousedown', mapOutsideClick);
  }, 0);
  document.addEventListener('keydown', mapEscapeHandler);
}
function closeMapPopup() {
  if (!mapPopup) return;
  mapPopup.classList.add('hidden');
  document.removeEventListener('mousedown', mapOutsideClick);
  document.removeEventListener('keydown', mapEscapeHandler);
}
function mapOutsideClick(e) {
  const inner = mapPopup.querySelector('.bg-white');
  if (!inner) return;
  if (!inner.contains(e.target)) {
    closeMapPopup();
  }
}
function mapEscapeHandler(e) {
  if (e.key === 'Escape') closeMapPopup();
}

// wire map button to the new open/close functions (guarded)
if (mapButton) {
  mapButton.addEventListener("click", () => {
    openMapPopup();
  });
}
if (cancelMapButton) {
  cancelMapButton.addEventListener("click", () => {
    closeMapPopup();
    const mapTimeEl = document.getElementById("mapTime");
    const mapZoneEl = document.getElementById("mapZone");
    if (mapTimeEl) mapTimeEl.value = "";
    if (mapZoneEl) mapZoneEl.selectedIndex = 0;
  });
}

if (saveMapButton) {
  saveMapButton.addEventListener('click', () => {
    const mapTimeEl = document.getElementById("mapTime");
    const mapZoneEl = document.getElementById("mapZone");
    const estimatedTime = parseInt((mapTimeEl && mapTimeEl.value || "").trim(), 10);
    const selectedZone = mapZoneEl ? mapZoneEl.value : null;

    if (!estimatedTime || isNaN(estimatedTime) || estimatedTime <= 0) {
      alert("Please enter a valid estimated time.");
      return;
    }

    const currentTotalMinutes = Array.from(studyPlanDisplay.children).reduce((sum, child) => {
      const taskTime = parseInt(child.dataset.estimatedTime, 10) || 0;
      return sum + taskTime;
    }, 0);

    if (currentTotalMinutes + estimatedTime > 60) {
      alert("This task would go past the end of the Study.");
      return;
    }

    const mapTask = {
      summary: "MAP Practice",
      startDate: new Date().toISOString(),
    };

    addToAgenda(mapTask, estimatedTime, selectedZone);

    closeMapPopup();
    if (mapTimeEl) mapTimeEl.value = "";
    if (mapZoneEl) mapZoneEl.selectedIndex = 0;
  });
}

// ------------------ Ensure render/load set dataset.startDate so edit UI updates DOM instantly ------------------
// In renderDashboardTasks, when creating li and button add dataset.startDate entries
// Replace the block that creates li/button in renderDashboardTasks with the following (keeps rest intact):

  // const li = document.createElement("li");
  // li.className = "mb-1 flex items-center";
  // li.dataset.startDate = task.startDate;
  // const checkbox = document.createElement("input");
  // ...
  // const button = document.createElement("button");
  // button.className = "...";
  // button.dataset.startDate = task.startDate;
  // button.textContent = task.summary || "Unnamed Event";
  // button.onclick = () => openEditTaskPopup(task);
  // li.appendChild(checkbox);
  // li.appendChild(button);
  // dashboardTasks.appendChild(li);

// Do the same in loadStudyTasks for each li/button created (add li.dataset.startDate and button.dataset.startDate)

// If you prefer, I can apply these exact small in-place diffs to the two render sections — they are the blocks that create each <li> and <button> inside `renderDashboardTasks` and `loadStudyTasks`.

// ...existing code...