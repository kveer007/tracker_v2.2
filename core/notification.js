/**
 * Health Tracker App - Notification Functionality
 * This file contains notification-related functionality
 */

// Global reminder interval - properly declared
let globalReminderInterval = null;

/**
 * Initialize global notifications
 */
function initializeGlobalNotifications() {
  // Don't check permission on load - wait for user interaction
  // Only highlight the button if we know notifications are supported
  if ('Notification' in window) {
    document.getElementById('global-enable-notifications')?.classList.add('highlight');
  }
}

/**
 * Request permission for browser notifications
 */
function requestNotificationPermission() {
  if (!('Notification' in window)) {
    utils.showToast('Your browser does not support notifications.', 'error');
    return;
  }
  
  try {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        utils.showToast('Notifications enabled!', 'success');
        
        // Send test notification after a short delay
        setTimeout(() => {
          new Notification('Health Tracker', {
            body: 'Notifications are now enabled. You will be reminded to track your intake.',
            icon: 'icons/icon-192.png' // Use actual icon path
          });
        }, 500);
      } else if (permission === 'denied') {
        utils.showToast('Notification permission denied.', 'warning');
      } else {
        utils.showToast('Notification permission was not granted.', 'warning');
      }
    }).catch(error => {
      console.error('Error requesting notification permission:', error);
      utils.showToast('Error enabling notifications.', 'error');
    });
  } catch (error) {
    // Handle browsers that don't support Promise-based API
    console.error('Error requesting notification permission:', error);
    utils.showToast('Error enabling notifications.', 'error');
  }
}

/**
 * Start global reminder interval
 * @param {number} minutes - Minutes between reminders
 */
function startGlobalReminder(minutes) {
  // Clear any existing intervals
  if (globalReminderInterval) {
    clearInterval(globalReminderInterval);
  }
  
  // Set new interval
  const milliseconds = minutes * 60 * 1000;
  globalReminderInterval = setInterval(() => {
    // Check which tracker is active
    const waterApp = document.getElementById('water-app');
    const activeType = waterApp.classList.contains('active') ? 'water' : 'protein';
    const unit = activeType === 'water' ? 'ml' : 'g';
    
    // Send browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Health Tracker', {
        body: `Time to log your ${activeType} intake!`,
        icon: 'icon.png'
      });
    }
    
    // Also show toast notification
    utils.showToast(`Reminder: Don't forget to track your ${activeType} intake!`, 'warning');
  }, milliseconds);
}

/**
 * Initialize OneSignal or any other third-party notification service
 */
function initializeNotifications() {
  // Check if OneSignal is available
  if (window.OneSignal) {
    window.OneSignal.init({
      appId: "5a060ee1-3e7c-4669-9b7b-987b10c0e38e", // You would replace this with your actual OneSignal App ID
      notifyButton: {
        enable: true,
      },
      allowLocalhostAsSecureOrigin: true,
    });
    
    // Prompt user when they first arrive
    window.OneSignal.showNativePrompt();
    
    console.log("OneSignal initialized");
  } else {
    console.log("OneSignal not available, using default notifications");
  }
}