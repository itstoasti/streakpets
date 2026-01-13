import { useEffect, useState, useRef } from 'react';
import { Platform } from 'react-native';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

// Use test ads during development
// Set to false for production builds!
const USE_TEST_ADS = false;

const adUnitId = USE_TEST_ADS
    ? TestIds.INTERSTITIAL
    : Platform.select({
        ios: 'ca-app-pub-3940256099942544/4411468910', // Test ID for iOS (replace when you add iOS)
        android: 'ca-app-pub-5918407268001346/2753783040', // Real Android interstitial ad unit ID
    });

// Frequency cap: 5 minutes between ads (in milliseconds)
const AD_FREQUENCY_CAP_MS = 5 * 60 * 1000; // 5 minutes

// Global state for the interstitial ad
let interstitialAd = null;
let adListenersAttached = false;
let isGloballyLoaded = false;
let isGloballyLoading = false;
let lastAdShownTime = 0; // Timestamp of when the last ad was shown

const createNewAd = () => {
    console.log('📺 Creating new interstitial ad instance...');
    adListenersAttached = false;
    isGloballyLoaded = false;
    isGloballyLoading = false;
    return InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: false,
    });
};

export function useInterstitialAd() {
    const [loaded, setLoaded] = useState(false);
    const [loading, setLoading] = useState(false);
    const loadAttemptsRef = useRef(0);
    const isLoadingRef = useRef(false);
    const isLoadedRef = useRef(false);

    // Sync local state with global state continuously
    useEffect(() => {
        const syncInterval = setInterval(() => {
            if (isGloballyLoaded !== isLoadedRef.current || isGloballyLoading !== isLoadingRef.current) {
                isLoadedRef.current = isGloballyLoaded;
                isLoadingRef.current = isGloballyLoading;
                setLoaded(isGloballyLoaded);
                setLoading(isGloballyLoading);
            }
        }, 100);

        return () => clearInterval(syncInterval);
    }, []);

    useEffect(() => {
        console.log('📺 Interstitial ad hook initializing...');
        let loadTimeout = null;

        // Create ad if needed
        if (!interstitialAd) {
            interstitialAd = createNewAd();
        }

        const currentAd = interstitialAd;

        // Sync local state with global state
        if (isGloballyLoaded) {
            console.log('📺 Interstitial ad already loaded globally, syncing state...');
            isLoadedRef.current = true;
            isLoadingRef.current = false;
            setLoaded(true);
            setLoading(false);
        } else if (isGloballyLoading) {
            console.log('📺 Interstitial ad already loading globally, syncing state...');
            isLoadedRef.current = false;
            isLoadingRef.current = true;
            setLoaded(false);
            setLoading(true);
        }

        // Load the ad with timeout protection
        const loadAd = () => {
            if (isGloballyLoaded || isGloballyLoading) {
                console.log('⏭️ Skipping interstitial load - ad already', isGloballyLoaded ? 'loaded' : 'loading');
                return;
            }

            loadAttemptsRef.current++;
            console.log('📺 Loading interstitial ad (attempt', loadAttemptsRef.current, ')...');

            isLoadingRef.current = true;
            isLoadedRef.current = false;
            isGloballyLoading = true;
            isGloballyLoaded = false;
            setLoading(true);
            setLoaded(false);

            if (loadTimeout) {
                clearTimeout(loadTimeout);
            }

            // Set a timeout to prevent infinite loading
            loadTimeout = setTimeout(() => {
                console.warn('⏱️ Interstitial ad loading timed out - retrying in 5s...');
                isLoadingRef.current = false;
                isLoadedRef.current = false;
                isGloballyLoading = false;
                isGloballyLoaded = false;
                setLoading(false);
                setLoaded(false);

                if (loadAttemptsRef.current >= 5) {
                    console.error('❌ Interstitial ad failed to load after 5 attempts. Giving up.');
                    return;
                }

                setTimeout(() => {
                    try {
                        loadAd();
                    } catch (error) {
                        console.error('❌ Error retrying interstitial ad load:', error);
                    }
                }, 5000);
            }, 10000);

            try {
                currentAd.load();
            } catch (error) {
                console.error('❌ Error loading interstitial ad:', error);
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
            console.log('📺 Attaching interstitial event listeners...');
            adListenersAttached = true;

            const unsubscribeLoaded = currentAd.addAdEventListener(AdEventType.LOADED, () => {
                console.log('✅ Interstitial ad ready!');
                loadAttemptsRef.current = 0;
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

            const unsubscribeClosed = currentAd.addAdEventListener(AdEventType.CLOSED, () => {
                console.log('📺 Interstitial ad closed');
                isLoadingRef.current = false;
                isLoadedRef.current = false;
                isGloballyLoading = false;
                isGloballyLoaded = false;
                setLoaded(false);
                loadAttemptsRef.current = 0;
                // Preload the next ad
                try {
                    loadAd();
                } catch (error) {
                    console.error('❌ Error loading interstitial ad after close:', error);
                }
            });

            const unsubscribeError = currentAd.addAdEventListener(AdEventType.ERROR, (error) => {
                console.error('❌ Interstitial ad error:', error?.code, error?.message);
                if (loadTimeout) {
                    clearTimeout(loadTimeout);
                }
                isLoadingRef.current = false;
                isLoadedRef.current = false;
                isGloballyLoading = false;
                isGloballyLoaded = false;
                setLoaded(false);
                setLoading(false);

                if (loadAttemptsRef.current >= 5) {
                    console.error('❌ Interstitial ad failed after 5 attempts. Giving up.');
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

        // Wait for AdMob to initialize before loading first ad
        let initTimeout = null;
        if (!isGloballyLoaded && !isGloballyLoading) {
            console.log('📺 Scheduling initial interstitial load in 3 seconds...');
            initTimeout = setTimeout(() => {
                try {
                    loadAd();
                } catch (error) {
                    console.error('❌ Error in init timeout:', error);
                }
            }, 3000);
        }

        // Cleanup
        return () => {
            if (loadTimeout) {
                clearTimeout(loadTimeout);
            }
            if (initTimeout) {
                clearTimeout(initTimeout);
            }
        };
    }, []);

    /**
     * Show the interstitial ad if:
     * 1. The ad is loaded
     * 2. At least 5 minutes have passed since the last ad was shown
     * 
     * @returns {Promise<boolean>} true if ad was shown, false otherwise
     */
    const showAdIfAllowed = async () => {
        const now = Date.now();
        const timeSinceLastAd = now - lastAdShownTime;

        // Check frequency cap
        if (timeSinceLastAd < AD_FREQUENCY_CAP_MS) {
            const remainingSeconds = Math.ceil((AD_FREQUENCY_CAP_MS - timeSinceLastAd) / 1000);
            console.log(`⏱️ Interstitial ad skipped - frequency cap (${remainingSeconds}s remaining)`);
            return false;
        }

        // Check if ad is loaded
        if (!isGloballyLoaded || !interstitialAd) {
            console.log('📺 Interstitial ad not ready, skipping');
            return false;
        }

        try {
            console.log('📺 Showing interstitial ad...');
            await interstitialAd.show();
            lastAdShownTime = Date.now(); // Update the last shown time
            return true;
        } catch (error) {
            console.error('Error showing interstitial ad:', error);
            // Reset state on show error
            isLoadingRef.current = false;
            isLoadedRef.current = false;
            isGloballyLoading = false;
            isGloballyLoaded = false;
            setLoaded(false);
            setLoading(false);
            return false;
        }
    };

    return {
        loaded,
        loading,
        showAdIfAllowed,
    };
}
