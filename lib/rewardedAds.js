import { useEffect, useState, useRef } from 'react';
import { Platform } from 'react-native';
import { RewardedAd, RewardedAdEventType, AdEventType, TestIds } from 'react-native-google-mobile-ads';

// Use your real ad unit ID in both development and production
// Set to false for production builds!
const USE_TEST_ADS = false;

const adUnitId = USE_TEST_ADS
  ? TestIds.REWARDED
  : Platform.select({
    ios: 'ca-app-pub-3940256099942544/1712485313', // Test ID for iOS (replace when you add iOS)
    android: 'ca-app-pub-5918407268001346/4936081492', // Your real Android rewarded ad unit ID
  });

// Create the rewarded ad instance - global singleton
let rewardedAd = null;
let adListenersAttached = false;
let isGloballyLoaded = false;
let isGloballyLoading = false;
let rewardCallbacks = []; // Store all reward callbacks from all tabs

const createNewAd = () => {
  console.log('📱 Creating new ad instance...');
  adListenersAttached = false;
  isGloballyLoaded = false;
  isGloballyLoading = false;
  return RewardedAd.createForAdRequest(adUnitId, {
    requestNonPersonalizedAdsOnly: false,
  });
};

export function useRewardedAd(onReward) {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const onRewardRef = useRef(onReward);
  const loadAttemptsRef = useRef(0);
  const isLoadingRef = useRef(false);
  const isLoadedRef = useRef(false);

  // Update the ref whenever onReward changes, without re-initializing ads
  useEffect(() => {
    onRewardRef.current = onReward;

    // Register this callback globally
    if (onReward && !rewardCallbacks.includes(onReward)) {
      rewardCallbacks.push(onReward);
    }

    // Cleanup: remove this callback when component unmounts
    return () => {
      const index = rewardCallbacks.indexOf(onReward);
      if (index > -1) {
        rewardCallbacks.splice(index, 1);
      }
    };
  }, [onReward]);

  // Sync local state with global state continuously
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (isGloballyLoaded !== isLoadedRef.current || isGloballyLoading !== isLoadingRef.current) {
        isLoadedRef.current = isGloballyLoaded;
        isLoadingRef.current = isGloballyLoading;
        setLoaded(isGloballyLoaded);
        setLoading(isGloballyLoading);
      }
    }, 100); // Check every 100ms

    return () => clearInterval(syncInterval);
  }, []);

  useEffect(() => {
    console.log('📱 Rewarded ad hook initializing...');
    let loadTimeout = null;

    // Create ad if needed
    if (!rewardedAd) {
      rewardedAd = createNewAd();
    }

    const currentAd = rewardedAd;

    // Sync local state with global state
    if (isGloballyLoaded) {
      console.log('📱 Ad already loaded globally, syncing state...');
      isLoadedRef.current = true;
      isLoadingRef.current = false;
      setLoaded(true);
      setLoading(false);
    } else if (isGloballyLoading) {
      console.log('📱 Ad already loading globally, syncing state...');
      isLoadedRef.current = false;
      isLoadingRef.current = true;
      setLoaded(false);
      setLoading(true);
    }

    // Load the ad with timeout protection
    const loadAd = () => {
      // Don't load if already loaded or loading globally
      if (isGloballyLoaded || isGloballyLoading) {
        console.log('⏭️ Skipping load - ad already', isGloballyLoaded ? 'loaded' : 'loading');
        return;
      }

      loadAttemptsRef.current++;
      console.log('📺 Loading rewarded ad (attempt', loadAttemptsRef.current, ')...');

      isLoadingRef.current = true;
      isLoadedRef.current = false;
      isGloballyLoading = true;
      isGloballyLoaded = false;
      setLoading(true);
      setLoaded(false);

      // Clear any existing timeout
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }

      // Set a timeout to prevent infinite loading (reduced to 10 seconds)
      loadTimeout = setTimeout(() => {
        console.warn('⏱️ Ad loading timed out - retrying in 5s...');
        isLoadingRef.current = false;
        isLoadedRef.current = false;
        isGloballyLoading = false;
        isGloballyLoaded = false;
        setLoading(false);
        setLoaded(false);

        // After 5 failed attempts, stop trying and show unavailable
        if (loadAttemptsRef.current >= 5) {
          console.error('❌ Ad failed to load after 5 attempts. Giving up.');
          return;
        }

        // Try again after timeout
        setTimeout(() => {
          try {
            loadAd();
          } catch (error) {
            console.error('❌ Error retrying ad load:', error);
          }
        }, 5000);
      }, 10000); // 10 second timeout

      try {
        currentAd.load();
      } catch (error) {
        console.error('❌ Error loading ad:', error);
        isLoadingRef.current = false;
        isLoadedRef.current = false;
        isGloballyLoading = false;
        isGloballyLoaded = false;
        setLoading(false);
        setLoaded(false);
        if (loadTimeout) {
          clearTimeout(loadTimeout);
        }
      }
    };

    // Only attach listeners once globally
    if (!adListenersAttached) {
      console.log('📱 Attaching event listeners...');
      adListenersAttached = true;

      const unsubscribeLoaded = currentAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
        console.log('✅ Ad ready!');
        loadAttemptsRef.current = 0; // Reset counter on success
        if (loadTimeout) {
          clearTimeout(loadTimeout);
        }
        isLoadingRef.current = false;
        isLoadedRef.current = true;
        isGloballyLoading = false;
        isGloballyLoaded = true;
        setLoaded(true);
        setLoading(false);
      });

      const unsubscribeEarned = currentAd.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        (reward) => {
          console.log('🎁 Reward earned! Notifying', rewardCallbacks.length, 'callbacks');
          // Call all registered reward callbacks (from all tabs)
          // But only show the alert from the most recent callback (active tab)
          rewardCallbacks.forEach((callback, index) => {
            if (callback) {
              try {
                // Only the last callback (most recently mounted component) shows the alert
                const isLastCallback = index === rewardCallbacks.length - 1;
                callback(reward.amount, !isLastCallback);
              } catch (error) {
                console.error('Error in reward callback:', error);
              }
            }
          });
        }
      );

      const unsubscribeClosed = currentAd.addAdEventListener(AdEventType.CLOSED, () => {
        isLoadingRef.current = false;
        isLoadedRef.current = false;
        isGloballyLoading = false;
        isGloballyLoaded = false;
        setLoaded(false);
        loadAttemptsRef.current = 0; // Reset on close
        // Preload the next ad
        try {
          loadAd();
        } catch (error) {
          console.error('❌ Error loading ad after close:', error);
        }
      });

      const unsubscribeError = currentAd.addAdEventListener(AdEventType.ERROR, (error) => {
        console.error('❌ Ad error:', error?.code, error?.message);
        if (loadTimeout) {
          clearTimeout(loadTimeout);
        }
        isLoadingRef.current = false;
        isLoadedRef.current = false;
        isGloballyLoading = false;
        isGloballyLoaded = false;
        setLoaded(false);
        setLoading(false);

        // Stop trying after 5 attempts
        if (loadAttemptsRef.current >= 5) {
          console.error('❌ Ad failed after 5 attempts. Giving up.');
          return;
        }

        // Try loading again after a delay
        setTimeout(() => {
          try {
            loadAd();
          } catch (err) {
            console.error('❌ Error retrying after error:', err);
          }
        }, 5000);
      });
    }

    // Wait for AdMob to initialize before loading first ad (only if not already loaded/loading)
    let initTimeout = null;
    if (!isGloballyLoaded && !isGloballyLoading) {
      console.log('📱 Scheduling initial load in 2 seconds...');
      initTimeout = setTimeout(() => {
        try {
          loadAd();
        } catch (error) {
          console.error('❌ Error in init timeout:', error);
        }
      }, 2000);
    }

    // Cleanup
    return () => {
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }
      if (initTimeout) {
        clearTimeout(initTimeout);
      }
      // Don't unsubscribe listeners - they're global
    };
  }, []); // Empty deps - only initialize once

  const showAd = async () => {
    if (isGloballyLoaded && rewardedAd) {
      try {
        await rewardedAd.show();
        return true;
      } catch (error) {
        console.error('Error showing ad:', error);
        // Reset state on show error
        isLoadingRef.current = false;
        isLoadedRef.current = false;
        isGloballyLoading = false;
        isGloballyLoaded = false;
        setLoaded(false);
        setLoading(false);
        return false;
      }
    } else {
      console.log('Ad not loaded yet');
      return false;
    }
  };

  return {
    loaded,
    loading,
    showAd,
  };
}
