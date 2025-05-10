/**
 * Health Tracker App - Workout Tracker
 * This file contains the implementation of the workout tracker functionality
 */

/**
 * WorkoutTracker class for tracking workout exercises
 */
class WorkoutTracker {
    /**
     * Create a new workout tracker
     */
      constructor() {
        // Define storage keys
        this.stateKey = 'workout_state';
        this.historyKey = 'workout_history';
        this.countKey = 'workout_count';
        this.lastResetKey = `${STORAGE_KEYS.LAST_RESET_PREFIX}workout`;
        
        // Define workout types - Added "Shoulders" to the list
        this.workoutTypes = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Abs', 'Legs'];
        
        // Load data from localStorage
        this.workoutState = JSON.parse(localStorage.getItem(this.stateKey)) || 
          this.workoutTypes.reduce((acc, type) => {
            acc[type] = { completed: false, order: this.workoutTypes.indexOf(type) };
            return acc;
          }, {});
        
        this.workoutCounts = JSON.parse(localStorage.getItem(this.countKey)) || 
          this.workoutTypes.reduce((acc, type) => {
            acc[type] = 0;
            return acc;
          }, {});
      
      this.workoutHistory = JSON.parse(localStorage.getItem(this.historyKey)) || {};
      
      // Set DOM elements
      this.elements = {
        tabsContainer: document.getElementById('workout-tabs-container'),
        historyPanel: document.getElementById('workout-history-popup'),
        dailyHistoryTab: document.getElementById('workout-daily-history'),
        currentWorkoutsTab: document.getElementById('workout-current-exercises')
      };
      
      // Initialize tracker
      this.initializeTracker();
    }
    
    /**
     * Initialize tracker
     */
    initializeTracker() {
      // Check for daily reset
      this.checkAndResetDailyWorkouts();
      
      // Set up auto-reset at midnight
      this.setupMidnightReset();
      
      // Render workout tabs
      this.renderWorkoutTabs();
      
      // Update display
      this.updateDisplay();
    }
    
    /**
     * Render workout tabs in the container
     */
    renderWorkoutTabs() {
      if (!this.elements.tabsContainer) return;
      
      this.elements.tabsContainer.innerHTML = '';
      
      // Sort workout types by completed status and then by order
      const sortedWorkouts = Object.entries(this.workoutState)
        .sort(([, a], [, b]) => {
          // Completed workouts go to the bottom
          if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
          }
          // Otherwise, maintain original order
          return a.order - b.order;
        })
        .map(([type]) => type);
      
      // Create tabs for each workout type
      sortedWorkouts.forEach(type => {
        const tab = document.createElement('button');
        tab.className = `workout-tab ${this.workoutState[type].completed ? 'completed' : ''}`;
        tab.dataset.type = type;
        
        const icon = document.createElement('i');
        icon.className = 'material-icons-round';
        icon.textContent = this.workoutState[type].completed ? 'check_circle' : 'radio_button_unchecked';
        
        const text = document.createElement('span');
        text.textContent = type;
        
        // Add count badge if clicked more than once
        if (this.workoutCounts[type] > 1) {
          const badge = document.createElement('span');
          badge.className = 'count-badge';
          badge.textContent = this.workoutCounts[type];
          tab.appendChild(badge);
        }
        
        tab.appendChild(icon);
        tab.appendChild(text);
        
        // Add click event
        tab.addEventListener('click', () => this.toggleWorkout(type));
        
        this.elements.tabsContainer.appendChild(tab);
      });
    }
    
    /**
     * Toggle workout completion status
     * @param {string} type - Workout type
     */
    toggleWorkout(type) {
      // Increase count
      this.workoutCounts[type] += 1;
      
      // Update completion status
      this.workoutState[type].completed = true;
      
      // Record in history
      this.saveWorkoutHistory(type);
      
      // Check if all workouts are completed
      const allCompleted = Object.values(this.workoutState).every(state => state.completed);
      if (allCompleted) {
        this.resetWorkoutTabs();
        utils.showToast('All workouts completed! Tabs have been reset.', 'success');
      } else {
        // Save state and update display
        this.saveState();
        this.renderWorkoutTabs();
        this.refreshHistory();
        
        utils.showToast(`${type} workout marked as complete!`, 'success');
      }
    }
    
    /**
     * Save the current state to localStorage
     */
    saveState() {
      localStorage.setItem(this.stateKey, JSON.stringify(this.workoutState));
      localStorage.setItem(this.countKey, JSON.stringify(this.workoutCounts));
    }
    
    /**
     * Reset workout tabs (but keep history)
     */
    resetWorkoutTabs() {
      // Reset workout state
      this.workoutTypes.forEach(type => {
        this.workoutState[type].completed = false;
        this.workoutState[type].order = this.workoutTypes.indexOf(type);
      });
      
      // Reset workout counts
      this.workoutTypes.forEach(type => {
        this.workoutCounts[type] = 0;
      });
      
      // Save and update display
      this.saveState();
      this.renderWorkoutTabs();
      this.refreshHistory();
    }
    
    /**
     * Save workout to daily history
     * @param {string} type - Workout type
     */
    saveWorkoutHistory(type) {
      const currentDate = utils.formatDate(new Date());
      
      if (!this.workoutHistory[currentDate]) {
        this.workoutHistory[currentDate] = [];
      }
      
      this.workoutHistory[currentDate].push({
        type,
        count: this.workoutCounts[type],
        timestamp: new Date().toISOString()
      });
      
      localStorage.setItem(this.historyKey, JSON.stringify(this.workoutHistory));
    }
    
    /**
     * Refresh history displays
     */
    refreshHistory() {
      this.showDailyHistory();
      this.showCurrentWorkouts();
    }
    
    /**
     * Show daily history (weekly summary)
     */
    showDailyHistory() {
      if (!this.elements.dailyHistoryTab) return;
      
      this.elements.dailyHistoryTab.innerHTML = '';
      const fragment = document.createDocumentFragment();
      
      // Sort dates (most recent first) and limit to 7 days
      const dates = Object.keys(this.workoutHistory).sort((a, b) => {
        return b.localeCompare(a);
      }).slice(0, 7);
      
      if (dates.length === 0) {
        const noData = document.createElement('p');
        noData.textContent = 'No workout history available.';
        fragment.appendChild(noData);
      } else {
        dates.forEach(date => {
          const entries = this.workoutHistory[date];
          
          const dayEntry = document.createElement('div');
          dayEntry.className = 'day-entry';
          
          const dateText = document.createElement('p');
          dateText.innerHTML = `<b>${date}</b>`;
          dayEntry.appendChild(dateText);
          
          // Group workouts by type
          const workoutsByType = {};
          entries.forEach(entry => {
            if (!workoutsByType[entry.type]) {
              workoutsByType[entry.type] = 0;
            }
            workoutsByType[entry.type] += 1;
          });
          
          // Show workout summary
          const workoutSummary = document.createElement('p');
          workoutSummary.textContent = `Completed workouts: ${Object.keys(workoutsByType).length} types`;
          dayEntry.appendChild(workoutSummary);
          
          // List each workout type
          const workoutList = document.createElement('ul');
          workoutList.style.paddingLeft = '20px';
          workoutList.style.marginTop = '5px';
          
          Object.entries(workoutsByType).forEach(([type, count]) => {
            const workoutItem = document.createElement('li');
            workoutItem.textContent = `${type}: ${count} ${count === 1 ? 'time' : 'times'}`;
            workoutList.appendChild(workoutItem);
          });
          
          dayEntry.appendChild(workoutList);
          fragment.appendChild(dayEntry);
        });
      }
      
      this.elements.dailyHistoryTab.appendChild(fragment);
      this.elements.dailyHistoryTab.classList.add('active');
      
      if (this.elements.currentWorkoutsTab) {
        this.elements.currentWorkoutsTab.classList.remove('active');
      }
    }
    
    /**
     * Show current day's workouts
     */
    showCurrentWorkouts() {
      if (!this.elements.currentWorkoutsTab) return;
      
      this.elements.currentWorkoutsTab.innerHTML = '';
      const currentDate = utils.formatDate(new Date());
      const entries = this.workoutHistory[currentDate] || [];
      
      const container = document.createElement('div');
      
      const header = document.createElement('h3');
      header.textContent = `Today's Workouts`;
      container.appendChild(header);
      
      if (entries.length === 0) {
        const noEntries = document.createElement('p');
        noEntries.textContent = 'No workouts recorded today.';
        container.appendChild(noEntries);
      } else {
        // Group entries by workout type and count
        const groupedEntries = {};
        entries.forEach(entry => {
          if (!groupedEntries[entry.type]) {
            groupedEntries[entry.type] = [];
          }
          groupedEntries[entry.type].push(entry);
        });
        
        const entriesList = document.createElement('ul');
        
        Object.entries(groupedEntries).forEach(([type, typeEntries]) => {
          const entryItem = document.createElement('li');
          const lastEntry = typeEntries[typeEntries.length - 1];
          const time = new Date(lastEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          entryItem.innerHTML = `<b>${type}</b>: ${typeEntries.length} ${typeEntries.length === 1 ? 'time' : 'times'} (last at ${time})`;
          entriesList.appendChild(entryItem);
        });
        
        container.appendChild(entriesList);
      }
      
      this.elements.currentWorkoutsTab.appendChild(container);
    }
    
    /**
     * Check if daily workouts need to be reset
     */
    checkAndResetDailyWorkouts() {
      const currentDate = utils.formatDate(new Date());
      const lastResetDate = localStorage.getItem(this.lastResetKey);
      
      if (lastResetDate !== currentDate) {
        this.resetDailyWorkouts();
        localStorage.setItem(this.lastResetKey, currentDate);
      }
    }
    
    /**
     * Setup automatic reset at midnight
     */
    setupMidnightReset() {
      // Calculate time until next midnight
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const midnight = new Date(tomorrow.setHours(0, 0, 0, 0));
      const msUntilMidnight = midnight - now;
      
      // Set timeout for midnight reset
      setTimeout(() => {
        this.checkAndResetDailyWorkouts();
        this.setupMidnightReset(); // Set up next day's reset
      }, msUntilMidnight);
    }
    
    /**
 * Reset daily workouts and remove today's history
 */
resetDailyWorkouts() {
    // Reset workout tabs
    this.resetWorkoutTabs();
    
    // Remove today's history
    const currentDate = utils.formatDate(new Date());
    if (this.workoutHistory[currentDate]) {
      delete this.workoutHistory[currentDate];
      localStorage.setItem(this.historyKey, JSON.stringify(this.workoutHistory));
    }
  }
    /**
     * Reset all data for this tracker
     */
    resetAllData() {
      localStorage.removeItem(this.stateKey);
      localStorage.removeItem(this.countKey);
      localStorage.removeItem(this.historyKey);
      localStorage.removeItem(this.lastResetKey);
      
      utils.showToast('All workout tracking data has been reset.', 'warning');
      
      // Reload the page to reset all instances
      setTimeout(() => location.reload(), 1500);
    }
    
    /**
     * Update display
     */
    updateDisplay() {
      this.renderWorkoutTabs();
      this.refreshHistory();
    }
  }