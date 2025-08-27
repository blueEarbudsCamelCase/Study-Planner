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
      console.log("Raw iCal Data: ", data); // Log the raw iCal data
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
  const dashboardSection = document.getElementById("dashboardSection");
  const scheduleSetupSection = document.getElementById("scheduleSetupSection");

  if (!icalUrl) {
    // Show the schedule setup section if no iCal feed is saved
    dashboardSection.classList.add("hidden");
    scheduleSetupSection.classList.remove("hidden");
  } else {
    // Show the dashboard if an iCal feed is saved
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
  const loadingIndicator = document.createElement('p');
  loadingIndicator.textContent = "Loading your tasks...";
  loadingIndicator.className = "text-center text-gray-500 mt-4"; // Add some styling
  dashboardContainer.appendChild(loadingIndicator); // Append to the container

  checkIcalFeed();

  fetchIcalFeed()
    .then(() => {
      loadingIndicator.remove(); // Remove the loading indicator
    })
    .catch(error => {
      console.error("Error fetching or parsing iCal feed:", error);
      loadingIndicator.textContent = "Failed to load tasks.";
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
    console.log("parseIcalFeed called with data:", data);
    if (!data) {
      console.error("No data provided to parseIcalFeed.");
      return;
    }
  
    const completedTasks = JSON.parse(localStorage.getItem("completedTasks") || "[]");
    const completedTaskKeys = completedTasks.map(task => `${task.summary}-${task.startDate}`);
    console.log("Completed Task Keys:", completedTaskKeys);
  
    const events = [];
    const lines = data.split('\n');
    let event = {};
  
    const now = new Date(); // Current date and time
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  
    lines.forEach(line => {
      if (line.startsWith('SUMMARY:')) {
         let summary = line.replace('SUMMARY:', '').trim();
        if (summary.includes('[')) {
          summary = summary.split('[')[0].trim();
        }
        event.summary = summary;
      }
      if (line.startsWith('DTSTART')) {
        // Handle both standard and VALUE=DATE formats
        const start = line.includes(':') ? line.split(':')[1].trim() : null;
        if (start) {
          event.startDate = parseIcalDate(start);
        }
      }
      if (line.startsWith('DTEND')) {
        // Handle both standard and VALUE=DATE formats
        const end = line.includes(':') ? line.split(':')[1].trim() : null;
        if (end) {
          event.endDate = parseIcalDate(end);
        }
      }
      if (line.trim() === 'END:VEVENT') {
        const taskKey = `${event.summary}-${event.startDate}`;
        const eventStartDate = new Date(event.startDate);
  
        if (!completedTaskKeys.includes(taskKey) && eventStartDate >= sevenDaysAgo) {
          events.push(event);
          console.log("Event added:", event);
        } else {
          console.log("Event skipped (either completed or too old):", event);
        }
        event = {}; // Reset the event object for the next event
      }
    });
  
    console.log("Filtered Events:", events);
    localStorage.setItem("icalTasks", JSON.stringify(events));
  
    // Ensure completedTasks is preserved
    localStorage.setItem("completedTasks", JSON.stringify(completedTasks));
  };
      
      // Toggle study planning screen
  // Get references to the settings button, popup, and dark mode toggle
  const settingsBtn = document.getElementById("settingsBtn");
  const settingsPopup = document.getElementById("settingsPopup");
  const closeSettingsBtn = document.getElementById("closeSettingsBtn");
  const darkModeToggle = document.getElementById("darkModeToggle");
  
  // Open the settings popup
  settingsBtn.addEventListener("click", () => {
    settingsPopup.classList.remove("hidden"); // Show the popup
    settingsPopup.style.visibility = "visible"; // Ensure visibility
  });
  
  // Close the settings popup
  closeSettingsBtn.addEventListener("click", () => {
    settingsPopup.classList.add("hidden"); // Hide the popup
    settingsPopup.style.visibility = "hidden"; // Ensure it's hidden
  });
  
  const studyScreen = document.getElementById('studyPlannerSection');
  const runScreen = document.getElementById('runScreen');
  const startStudyBtn = document.getElementById("startStudyBtn");
  const backToDashboardBtn = document.getElementById("backToDashboardBtn");
  const backToPlanScreenBtn = document.getElementById('backToPlanScreenBtn');
  const studyPlanDisplay = document.getElementById("studyPlanDisplay"); // Move this to the top
  const tutorialBtn = document.getElementById('tutorialBtn');
  const mapButton = document.getElementById('mapButton');
  const tutorialPopup = document.getElementById('tutorialPopup');
  const cancelTutorial = document.getElementById('cancelTutorial');
  const saveTutorial = document.getElementById('saveTutorial');
  const mapPopup = document.getElementById("mapPopup"); // Reference the task popup
  const cancelMapButton = document.getElementById('cancelMapButton');
  const saveMapButton = document.getElementById('saveMapButton');
  let baseTimer = document.querySelector('.base-timer')
  
  startStudyBtn.addEventListener("click", () => {
    dashboardSection.classList.add("hidden"); // Hide the dashboard section
    studyScreen.classList.remove("hidden"); // Show the study setup screen
    loadStudyTasks();
  });
  
  tutorialBtn.addEventListener('click', () => {
    tutorialPopup.classList.remove('hidden');
  });
  
  cancelTutorial.addEventListener('click', () => {
    tutorialPopup.classList.add('hidden');
  });
  
  saveTutorial.addEventListener('click', () => {
    const startTimeInput = document.getElementById('tutorialStart').value; // Get the start time
    const durationInput = parseInt(document.getElementById('tutorialDuration').value, 10); // Get the duration in minutes
  
    if (!startTimeInput || isNaN(durationInput) || durationInput <= 0) {
      alert("Please enter a valid start time and duration.");
      return;
    }
  
    // Parse the start time into a Date object
    const [hours, minutes] = startTimeInput.split(':').map(Number);
    const startTime = new Date();
    startTime.setHours(hours, minutes, 0, 0); // Set the start time
  
    // Calculate the end time
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + durationInput);
  
    // Check if there are existing tasks
    const studyPlanDisplayTasks = Array.from(studyPlanDisplay.children);
    let studyStartTime;
  
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
  
    // Ensure the tutorial task's start time is within the study session
    const studyEndTime = new Date(studyStartTime);
    studyEndTime.setMinutes(studyStartTime.getMinutes() + 60);
  
    if (startTime < studyStartTime || startTime >= studyEndTime) {
      alert("The start time of this task is outside the current study session.");
      return;
    }
  
    if (endTime > studyEndTime) {
      alert("This task would overlap the study session and cannot be added.");
      return;
    }
  
    // Calculate the total time if this task is added
    const currentTotalMinutes = Array.from(studyPlanDisplay.children).reduce((sum, child) => {
      const taskTime = parseInt(child.dataset.estimatedTime, 10) || 0;
      return sum + taskTime;
    }, 0);
  
    if (currentTotalMinutes + durationInput > 60) {
      alert("This task would exceed the 60-minute limit for the study plan.");
      return;
    }
  
    // Create a new tutorial task object
    const tutorialTask = {
      summary: "Tutorial",
      startDate: startTime.toISOString(),
      estimatedTime: durationInput,
    };
  
    // Add the tutorial task to the studyPlanDisplay
    addToAgenda(tutorialTask, durationInput, "Independent");
  
    // Close the tutorial popup
    tutorialPopup.classList.add('hidden');
  
    console.log(`Tutorial added: Start Time - ${startTime.toLocaleTimeString()}, End Time - ${endTime.toLocaleTimeString()}`);
  });

  mapButton.addEventListener("click", () => {
    mapPopup.classList.remove("hidden");
  });

  cancelMapButton.addEventListener("click", () => {
    mapPopup.classList.add("hidden");
    document.getElementById("mapTime").value = "";
    document.getElementById("mapZone").value = ""; // Reset to default value
  });

  saveMapButton.onclick = () => {
    const estimatedTime = parseInt(mapTime.value, 10); // Ensure it's a number
    const selectedZone = mapZone.value;

    if (!estimatedTime || isNaN(estimatedTime) || estimatedTime <= 0) {
      alert("Please enter a valid estimated time.");
      return;
    }

  // Calculate the total time if this task is added
  const currentTotalMinutes = Array.from(studyPlanDisplay.children).reduce((sum, child) => {
    const taskTime = parseInt(child.dataset.estimatedTime, 10) || 0;
    return sum + taskTime;
  }, 0);

  if (currentTotalMinutes + estimatedTime > 60) {
    // Display an error message if the total time exceeds 60 minutes
    alert("This task would go past the end of the Study.");
    return;
  }
    console.log(`MAP Practice, Time: ${estimatedTime}, Zone: ${selectedZone}`);
 
    // Create a task object with the name "MAP Practice"
  const mapTask = {
    summary: "MAP Practice",
    startDate: new Date().toISOString(), // Use the current time as the start date
  };

    addToAgenda(mapTask, estimatedTime, selectedZone);

    mapPopup.classList.add("hidden");
    document.getElementById("mapTime").value = "";
    document.getElementById("mapZone").value = "";
  };
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
  
    // Show a loading indicator
    const loadingIndicator = document.createElement('p');
    loadingIndicator.textContent = "Refreshing tasks...";
    loadingIndicator.className = "text-center text-gray-500 mt-4"; // Add some styling
    dashboardSection.appendChild(loadingIndicator);
  
    // Fetch, parse, and reload tasks
    setTimeout(() => {
      fetchIcalFeed()
        .then(() => {
          parseIcalFeed();
          loadStudyTasks();
          loadingIndicator.remove(); // Remove the loading indicator after tasks are loaded
        })
        .catch(error => {
          console.error("Error fetching or parsing tasks:", error);
          loadingIndicator.textContent = "Failed to refresh tasks.";
        });
    }, 2000); // 2000ms = 2 seconds delay
  });
  
  
  function openTaskPopup(task) {
    const taskPopup = document.getElementById("taskPopup");
    const taskTime = document.getElementById("taskTime");
    const taskZone = document.getElementById("taskZone");
    const cancelTaskButton = document.getElementById("cancelTask");

  
    // Reset the popup fields
    taskTime.value = "";
    taskZone.value = "";
  
    // Show the popup
    taskPopup.classList.remove("hidden");

      // Handle cancel button
  cancelTaskButton.addEventListener("click", () => {
    taskPopup.classList.add("hidden");
  });
      
    // Handle save button
    const saveTaskButton = document.getElementById("saveTask");
    saveTaskButton.onclick = () => {
      const estimatedTime = parseInt(taskTime.value, 10); // Ensure it's a number
      const selectedZone = taskZone.value;
  
      if (!estimatedTime || isNaN(estimatedTime) || estimatedTime <= 0) {
        alert("Please enter a valid estimated time.");
        return;
      }
  
    // Calculate the total time if this task is added
    const currentTotalMinutes = Array.from(studyPlanDisplay.children).reduce((sum, child) => {
      const taskTime = parseInt(child.dataset.estimatedTime, 10) || 0;
      return sum + taskTime;
    }, 0);
  
    if (currentTotalMinutes + estimatedTime > 60) {
      // Display an error message if the total time exceeds 60 minutes
      alert("This task would go past the end of the Study.");
      return;
    }
      console.log(`Task: ${task.summary}, Time: ${estimatedTime}, Zone: ${selectedZone}`);
  
      addToAgenda(task, estimatedTime, selectedZone);
  
      task.estimatedTime = estimatedTime;
      task.zone = selectedZone;
  
      taskPopup.classList.add("hidden");
    }
  }
 
  const runButton = document.getElementById("runButton");
  
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
  
  function loadStudyTasks() {
    const icalTasks = JSON.parse(localStorage.getItem("icalTasks") || "[]");
    console.log("Tasks from localStorage:", icalTasks); // Log tasks from localStorage
    const tasksList = document.getElementById("studyTasks");
    tasksList.innerHTML = ""; // Clear the list
  
    if (!icalTasks || icalTasks.length === 0) {
      tasksList.innerHTML = "<li>No events loaded yet.</li>";
      tasksList.style.display = "block"; // Show the list even if empty
  
      return;
    }
  
    tasksList.style.display = "block"; // Show the tasks list after loading
  
    const today = new Date();
  
    // Group tasks by date
    const tasksByDate = icalTasks.reduce((acc, task) => {
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

  function moveToCompleted(task, taskElement) {
  // Retrieve the current completedTasks array from localStorage
  const completedTasks = JSON.parse(localStorage.getItem("completedTasks") || "[]");

  // Add the completed task to the array
  completedTasks.push(task);

  // Save the updated array back to localStorage
  localStorage.setItem("completedTasks", JSON.stringify(completedTasks));

  console.log("Task moved to completed:", task);

  // If taskElement is provided, animate as before
  if (taskElement) {
    // animation for ryland :) this animation adds a checkmark to the commpleted task. 
    const checkmark = document.createElement('div');
    checkmark.className = 'checkmark';
    taskElement.appendChild(checkmark);

    // this part of the animation is a fade on exit for the completed task. 
    taskElement.classList.add('fade-out');
    setTimeout(() => {
      taskElement.parentElement.removeChild(taskElement);
    }, 500); // Wait for the animation to complete
    console.log("Task Element:", taskElement);
  } else {
    // For runScreen: animate the current task card
    const currentTaskDiv = document.querySelector('#runScreenTasks .current-task > div');
    if (currentTaskDiv) {
      // Add checkmark
      const checkmark = document.createElement('div');
      checkmark.className = 'checkmark';
      currentTaskDiv.appendChild(checkmark);

      // Fade out
      currentTaskDiv.classList.add('fade-out');
      setTimeout(() => {
        if (currentTaskDiv.parentElement) {
          currentTaskDiv.parentElement.removeChild(currentTaskDiv);
        }
      }, 500);
    }
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
  
  // Helper function to get task duration by index
function getTaskDuration(index) {
  const task = studyPlanDisplay.children[index];
  return task ? parseInt(task.dataset.estimatedTime, 10) || 0 : 0;
}

  function startTaskTimer(taskIndex) {
    const taskDurations = [
      getTaskDuration(0),
      getTaskDuration(1),
      getTaskDuration(2),
      getTaskDuration(3),
      getTaskDuration(4),
      getTaskDuration(5),
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
      ${
        currentTask
          ? `<div class="p-4 rounded shadow-md mb-4" style="background-color: ${getTaskZoneColor(currentTask.zone)};">
                <input type="checkbox" id="currentTaskCheckbox" class="mr-2">
                <label for="currentTaskCheckbox">${currentTask.summary} - ${currentTask.estimatedTime} min.</label>
              </div>`
          : `<p class="text-gray-500 italic">No current task.</p>`
      }
    </div>
    <div class="upcoming-tasks">
      <h2 class="font-bold text-lg mb-2">Upcoming Tasks</h2>
      ${
        upcomingTasks.length > 0
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
  
  pipButton.addEventListener('click', () => {
  if (documentPictureInPicture.window) {
    documentPictureInPicture.window.close();
  } else {
      // Request PiP mode
      documentPictureInPicture.requestWindow().then(pipWindow => {
        pipButton.textContent = "Hide Popup"; // Update button text
        for(let styleSheet of document.querySelectorAll("link[rel=stylesheet]")) {
          let newStyleSheet = document.createElement("link");
          newStyleSheet.rel = "stylesheet";
          newStyleSheet.href = styleSheet.href;
          pipWindow.document.body.append(newStyleSheet);
        }
        pipWindow.document.body.append(baseTimer);
        baseTimer = pipWindow.document.querySelector(".base-timer");
        pipWindow.addEventListener("pagehide", () => {
          runScreenBox.children[0].insertBefore(baseTimer, runScreenBox.children[0].children[0]);
          pipButton.textContent = "Show Popup"
        });
      }).catch(error => {
        console.error("Error enabling Picture-in-Picture:", error);
      });
    }
  });
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

// Theme popup logic
const themesBtn = document.getElementById("themesBtn");
const themesPopup = document.getElementById("themesPopup");
const closeThemesBtn = document.getElementById("closeThemesBtn");
const themeSwitcher = document.getElementById("themeSwitcher");

// Open themes popup
themesBtn.addEventListener("click", () => {
  themesPopup.classList.remove("hidden");
  themesPopup.style.visibility = "visible";
});

// Close themes popup
closeThemesBtn.addEventListener("click", () => {
  themesPopup.classList.add("hidden");
  themesPopup.style.visibility = "hidden";
});

const themeVars = {
  "focus-mode": {
    "--bg-color": "#F9FAFB",
    "--card-bg": "#fff",
    "--card-text": "#1F2937",
    "--accent-color": "#3B82F6"
  },
  "sunset-gradient": {
    "--bg-color": "linear-gradient(to bottom, #F9EBC8, #F9D1B0)",
    "--card-bg": "#FFF8E1",
    "--card-text": "#5D4037",
    "--accent-color": "#FF7043"
  },
  "deep-ocean": {
    "--bg-color": "#001A23",
    "--card-bg": "#0B2D3B",
    "--card-text": "#E0FBFC",
    "--accent-color": "#48A9A6"
  },
  "forest-retreat": {
    "--bg-color": "#E9F5E3",
    "--card-bg": "#F3F8F1",
    "--card-text": "#2F4858",
    "--accent-color": "#6D9773"
  },
  "highlighter-pop": {
    "--bg-color": "#F4F6F9",
    "--card-bg": "#fff",
    "--card-text": "#333333",
    "--accent-color": "#D8FF5F"
  },
  "classic-professional": {
    "--bg-color": "#FDFDF5",
    "--card-bg": "#fff",
    "--card-text": "#3D3635",
    "--accent-color": "#00509D"
  },
  "lavender-haze": {
    "--bg-color": "#F8F4FF",
    "--card-bg": "#DCD7E8",
    "--card-text": "#4A435E",
    "--accent-color": "#8C7DDA"
  },
  "coffee-shop": {
    "--bg-color": "#E6DBCF",
    "--card-bg": "#F2EFE8",
    "--card-text": "#4A3628",
    "--accent-color": "#8C593C"
  },
  "vibrant-bold": {
    "--bg-color": "#222831",
    "--card-bg": "#94B0DA",
    "--card-text": "#EEEEEE",
    "--accent-color": "#FF847C"
  },
  "greyscale": {
    "--bg-color": "#FFFFFF",
    "--card-bg": "#DDDDDD",
    "--card-text": "#111111",
    "--accent-color": "#555555"
  },
  "default": {
    "--bg-color": "#f9fafb",
    "--card-bg": "#fff",
    "--card-text": "#1f2937",
    "--accent-color": "#3b82f6"
  }
};

function applyTheme(theme) {
  const vars = themeVars[theme] || themeVars["default"];
  Object.entries(vars).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
  localStorage.setItem("selectedTheme", theme);
}

// Theme switcher change event
themeSwitcher.addEventListener("change", (e) => {
  applyTheme(e.target.value);
});

// Load theme on page load
const savedTheme = localStorage.getItem("selectedTheme") || "default";
themeSwitcher.value = savedTheme;
applyTheme(savedTheme);

// Edit iCal Feed button logic
const editInputsBtn = document.getElementById("editInputsBtn");
editInputsBtn.addEventListener("click", () => {
  settingsPopup.classList.add("hidden");
  scheduleSetupSection.classList.remove("hidden");
  dashboardSection.classList.add("hidden");
});

