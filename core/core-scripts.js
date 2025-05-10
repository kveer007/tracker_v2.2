/**
 * Health Tracker App - Core Functionality and Data Management
 * This file contains the core functionality, constants, utility functions, and data management
 */

// Storage Manager for quota handling
const storageManager = {
  // Test if localStorage is available
  isAvailable: function() {
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  },
  
  // Estimate current usage
  getUsage: function() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      total += key.length + value.length;
    }
    return total;
  },
  
  // Estimate remaining space (approximate)
  getRemainingSpace: function() {
    const maxSize = 5 * 1024 * 1024; // Assume 5MB limit
    return maxSize - this.getUsage();
  },
  
  // Check if we're near the quota
  isNearQuota: function() {
    const maxSize = 5 * 1024 * 1024; // Assume 5MB limit
    const currentUsage = this.getUsage();
    return currentUsage > maxSize * 0.9; // 90% full
  },
  
  // Clean up old history data to free space
  cleanupOldData: function() {
    try {
      // Start with old history entries
      const historyKeys = [
        STORAGE_KEYS.HISTORY_PREFIX + 'water',
        STORAGE_KEYS.HISTORY_PREFIX + 'protein',
        'workout_history',
        'habits_data'
      ];
      
      let cleanedUp = false;
      
      // Process each history object
      historyKeys.forEach(key => {
        try {
          const historyData = localStorage.getItem(key);
          if (!historyData) return;
          
          const history = JSON.parse(historyData);
          
          // Ensure we have the right data structure
          if (typeof history !== 'object') return;
          
          // For habits data, handle the special format
          if (key === 'habits_data') {
            const habits = history;
            if (Array.isArray(habits)) {
              habits.forEach(habit => {
                if (habit.history) {
                  // Keep only last 90 days of history for each habit
                  const dates = Object.keys(habit.history).sort();
                  if (dates.length > 90) {
                    const datesToRemove = dates.slice(0, dates.length - 90);
                    datesToRemove.forEach(date => {
                      delete habit.history[date];
                    });
                    cleanedUp = true;
                  }
                }
              });
              
              // Save back
              localStorage.setItem(key, JSON.stringify(habits));
            }
          } else {
            // Standard history object with dates as keys
            const dates = Object.keys(history).sort();
            
            // If we have more than 90 days of history, remove oldest
            if (dates.length > 90) {
              const datesToRemove = dates.slice(0, dates.length - 90);
              datesToRemove.forEach(date => {
                delete history[date];
              });
              
              // Save back
              localStorage.setItem(key, JSON.stringify(history));
              cleanedUp = true;
            }
          }
        } catch (e) {
          console.error(`Error cleaning up ${key}:`, e);
        }
      });
      
      return cleanedUp;
    } catch (e) {
      console.error('Error in cleanup:', e);
      return false;
    }
  },
  
  // Safe set item with quota checking
  safeSetItem: function(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      // If storage error, try to clean up
      if (e.name === 'QuotaExceededError' || 
          e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
          e.code === 22) {
        
        // Try cleanup
        const cleaned = this.cleanupOldData();
        
        if (cleaned) {
          // Try again after cleanup
          try {
            localStorage.setItem(key, value);
            utils.showToast('Older history has been archived to free up storage space.', 'info');
            return true;
          } catch (e2) {
            utils.showToast('Storage limit reached. Please export and clear some data.', 'error');
            return false;
          }
        } else {
          utils.showToast('Storage limit reached. Please export and clear some data.', 'error');
          return false;
        }
      }
      
      // Other error
      utils.showToast('Error saving data: ' + e.message, 'error');
      return false;
    }
  }
};

// Constants
const STORAGE_KEYS = {
  THEME: 'app_theme',
  LAST_RESET_PREFIX: 'lastResetDate_',
  GOAL_PREFIX: 'goal_',
  INTAKE_PREFIX: 'intake_',
  HISTORY_PREFIX: 'history_',
  REMINDER: 'global_reminder'
};

// Theme colors for different sections
const THEME_COLORS = {
  water: '#2196F3',
  protein: '#F44336',
  workout: '#673AB7',
  habits: '#4CAF50'  
};

// Global reminder interval defined in notification.js

// Utility Functions
const utils = {
  /**
   * Format date as YYYY-MM-DD (ISO format for better consistency)
   * @param {Date} date - Date to format
   * @returns {string} Formatted date
   */
  formatDate(date) {
    // Ensure we're working with a Date object
    const d = new Date(date);
    
    // Check for invalid date
    if (isNaN(d.getTime())) {
      console.error('Invalid date provided to formatDate:', date);
      // Return current date as fallback
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
    
    // Use explicit UTC methods for consistency
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  },
  
  // Add date comparison function to handle different formats
  isSameDay(date1, date2) {
    // Convert to Date objects if they aren't already
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    // Check for invalid dates
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
      return false;
    }
    
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  },

  // Add date parsing function for handling different formats
  parseDate(dateString) {
    // Try different formats
    let date;
    
    // Try ISO format
    date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // Try YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // Try MM/DD/YYYY format
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
      const [month, day, year] = dateString.split('/').map(Number);
      date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // Return current date as fallback
    console.error('Unable to parse date:', dateString);
    return new Date();
  },

  // Add date formatter with localization
  formatDateForDisplay(date, options = {}) {
    const defaults = { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    
    const opts = {...defaults, ...options};
    
    try {
      return new Date(date).toLocaleDateString(undefined, opts);
    } catch (e) {
      // Fallback for browsers with limited toLocaleDateString support
      const d = new Date(date);
      return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    }
  },
  
  /**
   * Create and show a toast notification with improved stability
   * @param {string} message - Message to display
   * @param {string} type - Type of toast (success, warning, error)
   * @param {number} duration - Duration in milliseconds (default 3000ms)
   */
  showToast(message, type = 'success', duration = 3000) {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = document.createElement('i');
    icon.className = 'material-icons-round';
    
    switch (type) {
      case 'success':
        icon.textContent = 'check_circle';
        break;
      case 'warning':
        icon.textContent = 'warning';
        break;
      case 'error':
        icon.textContent = 'error';
        break;
    }
    
    toast.appendChild(icon);
    toast.appendChild(document.createTextNode(message));
    toastContainer.appendChild(toast);
    
    // Remove toast after specified duration
    setTimeout(() => {
      toast.classList.add('toast-closing');
      setTimeout(() => {
        if (toast.parentNode) {
          toastContainer.removeChild(toast);
        }
      }, 300); // Wait for fadeOut animation to complete
    }, duration);
    
    // Limit max number of toasts to 3 to prevent stacking
    const toasts = toastContainer.querySelectorAll('.toast');
    if (toasts.length > 3) {
      toastContainer.removeChild(toasts[0]);
    }
  },
  
  /**
   * Change the theme color in the meta tag
   * @param {string} color - Color in hex format
   */
  changeThemeColor(color) {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    
    // Create meta tag if it doesn't exist
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    
    // Set the color
    metaThemeColor.setAttribute('content', color);
  }
};

/**
 * Initialize the application when DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', () => {
  // Check if localStorage is available
  if (!storageManager.isAvailable()) {
    alert('Your browser does not support local storage or it is disabled. The app may not work properly.');
    return;
  }
  
  // Check if we're near quota
  if (storageManager.isNearQuota()) {
    utils.showToast('Storage space is running low. Consider exporting and clearing old data.', 'warning');
    
    // Try to clean up automatically
    storageManager.cleanupOldData();
  }

  // Initialize trackers
  window.waterTracker = new Tracker({ type: 'water', unit: 'ml' });
  window.proteinTracker = new Tracker({ type: 'protein', unit: 'g' });
  window.workoutTracker = new WorkoutTracker();
  window.habitsTracker = new HabitsTracker(); // Initialize habits tracker
  
  // Set up theme
  initializeTheme();
  
  // Set up tab navigation
  initializeTabNavigation();
  
  // Set up panels (settings, history, more options)
  initializePanels();
  
  // Set up action buttons for water tracker
  initializeTrackerActions(waterTracker);
  
  // Set up action buttons for protein tracker
  initializeTrackerActions(proteinTracker);
  
  // Set up action buttons for workout tracker
  initializeWorkoutTrackerActions(workoutTracker);
  
  // Set up global notifications
  initializeGlobalNotifications();
  
  // Set up data import/export
  initializeDataManagement();
  
  // Initialize OneSignal if available
  initializeNotifications();
  
  // Apply initial theme color based on current theme
  const isDarkTheme = document.body.classList.contains('dark-theme') || 
                      (!document.body.classList.contains('light-theme') && 
                       window.matchMedia('(prefers-color-scheme: dark)').matches);
  utils.changeThemeColor(isDarkTheme ? '#121212' : THEME_COLORS.water);
});

/**
 * Initialize data import/export functionality
 */
function initializeDataManagement() {
  // Export data button
  const exportBtn = document.getElementById('export-data');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportData);
  }
  
  // Import data file input
  const importFileInput = document.getElementById('import-file');
  if (importFileInput) {
    importFileInput.addEventListener('change', importData);
  }
}

/**
 * Export tracking data to JSON file with improved error handling
 */
function exportData() {
  try {
    // Collect all data
    const exportData = {
      version: "2.0", // Add version for future compatibility
      exportDate: new Date().toISOString(),
      water: {
        goal: localStorage.getItem(STORAGE_KEYS.GOAL_PREFIX + 'water'),
        intake: localStorage.getItem(STORAGE_KEYS.INTAKE_PREFIX + 'water'),
        history: localStorage.getItem(STORAGE_KEYS.HISTORY_PREFIX + 'water')
      },
      protein: {
        goal: localStorage.getItem(STORAGE_KEYS.GOAL_PREFIX + 'protein'),
        intake: localStorage.getItem(STORAGE_KEYS.INTAKE_PREFIX + 'protein'),
        history: localStorage.getItem(STORAGE_KEYS.HISTORY_PREFIX + 'protein')
      },
      workout: {
        state: localStorage.getItem('workout_state'),
        count: localStorage.getItem('workout_count'),
        history: localStorage.getItem('workout_history')
      },
      habits: {
        data: localStorage.getItem('habits_data')
      },
      settings: {
        theme: localStorage.getItem(STORAGE_KEYS.THEME),
        reminder: localStorage.getItem(STORAGE_KEYS.REMINDER)
      }
    };
    
    // Validate data before export
    let dataIsValid = true;
    let invalidReason = '';
    
    // Check that essential data exists
    if (!exportData.water.goal && !exportData.protein.goal && !exportData.habits.data) {
      dataIsValid = false;
      invalidReason = 'No tracking data found to export.';
    }
    
    if (!dataIsValid) {
      utils.showToast(invalidReason, 'error');
      return;
    }
    
    // Convert to JSON
    const jsonString = JSON.stringify(exportData, null, 2); // Pretty print with indentation
    const jsonBlob = new Blob([jsonString], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    
    // Create download link
    const link = document.createElement('a');
    link.setAttribute('href', jsonUrl);
    link.setAttribute('download', `health-tracker-export-${new Date().toISOString().slice(0,10)}.json`);
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(jsonUrl); // Free memory
    }, 100);
    
    utils.showToast('Data exported successfully!', 'success');
    
    // Close the panel
    document.getElementById('more-options-panel').classList.remove('active');
  } catch (error) {
    console.error('Export error:', error);
    utils.showToast(`Error exporting data: ${error.message}`, 'error');
  }
}

/**
 * Import tracking data from JSON file with enhanced validation
 * @param {Event} event - Change event from file input
 */
function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Validate file size
  if (file.size > 5 * 1024 * 1024) { // 5MB limit
    utils.showToast('File is too large. Maximum size is 5MB.', 'error');
    event.target.value = '';
    return;
  }
  
  // Validate file type
  if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
    utils.showToast('Invalid file type. Please upload a JSON file.', 'error');
    event.target.value = '';
    return;
  }
  
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      // Parse JSON with detailed error handling
      let importedData;
      try {
        importedData = JSON.parse(e.target.result);
      } catch (parseError) {
        throw new Error('File is not valid JSON. Please ensure the file is correctly formatted.');
      }
      
      // Validate the data structure with specific checks
      if (!importedData) {
        throw new Error('Import file is empty or corrupt.');
      }
      
      // Check for required sections
      const requiredSections = ['water', 'protein'];
      const missingSections = requiredSections.filter(section => !importedData[section]);
      
      if (missingSections.length > 0) {
        throw new Error(`Import file is missing required sections: ${missingSections.join(', ')}.`);
      }
      
      // Validate data format of each section
      for (const section of requiredSections) {
        if (importedData[section]) {
          if (typeof importedData[section] !== 'object') {
            throw new Error(`Section "${section}" has invalid format.`);
          }
        }
      }
      
      // Version compatibility check
      if (importedData.version && importedData.version > "2.0") {
        utils.showToast('This file was created with a newer version of the app. Some features may not import correctly.', 'warning');
      }
      
      // Calculate estimated storage requirements
      const importSize = JSON.stringify(importedData).length;
      const availableSpace = 5 * 1024 * 1024; // Approximate localStorage limit (5MB)
      
      if (importSize > availableSpace * 0.9) { // If import would use more than 90% of storage
        throw new Error('Import file is too large for browser storage. Please try a smaller export file.');
      }
      
      // Confirm before importing
      if (confirm('This will replace your current tracking data. Are you sure you want to proceed?')) {
        // Start with a backup
        const backup = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          backup[key] = localStorage.getItem(key);
        }
        
        try {
          // Import water data
          if (importedData.water.goal) {
            localStorage.setItem(STORAGE_KEYS.GOAL_PREFIX + 'water', importedData.water.goal);
          }
          if (importedData.water.intake) {
            localStorage.setItem(STORAGE_KEYS.INTAKE_PREFIX + 'water', importedData.water.intake);
          }
          if (importedData.water.history) {
            localStorage.setItem(STORAGE_KEYS.HISTORY_PREFIX + 'water', importedData.water.history);
          }
          
          // Import protein data
          if (importedData.protein.goal) {
            localStorage.setItem(STORAGE_KEYS.GOAL_PREFIX + 'protein', importedData.protein.goal);
          }
          if (importedData.protein.intake) {
            localStorage.setItem(STORAGE_KEYS.INTAKE_PREFIX + 'protein', importedData.protein.intake);
          }
          if (importedData.protein.history) {
            localStorage.setItem(STORAGE_KEYS.HISTORY_PREFIX + 'protein', importedData.protein.history);
          }
          
          // Import workout data if available
          if (importedData.workout) {
            if (importedData.workout.state) {
              localStorage.setItem('workout_state', importedData.workout.state);
            }
            if (importedData.workout.count) {
              localStorage.setItem('workout_count', importedData.workout.count);
            }
            if (importedData.workout.history) {
              localStorage.setItem('workout_history', importedData.workout.history);
            }
          }
          
          // Import habits data if available
          if (importedData.habits && importedData.habits.data) {
            localStorage.setItem('habits_data', importedData.habits.data);
          }
          
          // Import settings
          if (importedData.settings && importedData.settings.theme) {
            localStorage.setItem(STORAGE_KEYS.THEME, importedData.settings.theme);
          }
          if (importedData.settings && importedData.settings.reminder) {
            localStorage.setItem(STORAGE_KEYS.REMINDER, importedData.settings.reminder);
          }
          
          utils.showToast('Data imported successfully! Reloading app...', 'success');
          
          // Reload the page to apply imported data
          setTimeout(() => location.reload(), 1500);
        } catch (storageError) {
          // Restore backup if import fails
          console.error('Storage error during import:', storageError);
          
          // Clear localStorage first
          localStorage.clear();
          
          // Restore backup
          Object.keys(backup).forEach(key => {
            localStorage.setItem(key, backup[key]);
          });
          
          throw new Error('Error saving imported data. Your previous data has been restored.');
        }
      }
    } catch (error) {
      utils.showToast(`Error importing data: ${error.message}`, 'error');
      console.error('Import error:', error);
    }
    
    // Reset the file input
    event.target.value = '';
  };
  
  reader.onerror = function() {
    utils.showToast('Error reading file. Please try again.', 'error');
    event.target.value = '';
  };
  
  reader.readAsText(file);
}

/**
 * Register service worker for PWA support with improved error handling
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Add a timeout to prevent registration taking too long
    const swRegistrationTimeout = setTimeout(() => {
      console.warn('Service Worker registration is taking too long. App will continue without offline support.');
      utils.showToast('Offline mode may not be available. Please check your connection.', 'warning');
    }, 10000); // 10 second timeout
    
    navigator.serviceWorker.register('service-worker.js')
      .then(registration => {
        clearTimeout(swRegistrationTimeout);
        console.log('Service Worker registered with scope:', registration.scope);
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              utils.showToast('App update available. Please refresh the page.', 'info');
            }
          });
        });
      })
      .catch(error => {
        clearTimeout(swRegistrationTimeout);
        console.error('Service Worker registration failed:', error);
        
        // Provide specific error messages based on error type
        if (error.name === 'SecurityError') {
          utils.showToast('Service Worker blocked due to security settings.', 'error');
        } else if (error.name === 'TypeError') {
          utils.showToast('Service Worker URL is invalid. Please contact support.', 'error');
        } else {
          utils.showToast('App may not work offline. Please refresh the page.', 'warning');
        }
        
        // Attempt to recover by unregistering any failed service workers
        navigator.serviceWorker.getRegistrations().then(registrations => {
          for (let registration of registrations) {
            registration.unregister();
          }
        });
      });
  });
}