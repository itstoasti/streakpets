import { Platform } from 'react-native';
import { supabase } from './supabase';

let Notifications = null;

// Try to import notifications - will fail if native module not built yet
try {
  Notifications = require('expo-notifications');

  // Configure notification behavior
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (error) {
  console.log('Expo Notifications not available - run: npx expo run:android or npx expo run:ios to rebuild with notifications support');
}

/**
 * Request notification permissions and get push token
 */
export async function registerForPushNotifications() {
  if (!Notifications) {
    console.log('Notifications not available - rebuild app with: npx expo run:android');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permission not granted for push notifications');
      return null;
    }

    // Get the push token
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: '5c173b5c-976c-4090-8db1-c80a708c1189'
    });

    console.log('✅ Push token registered:', token.data);
    return token.data;
  } catch (error) {
    // Firebase not configured - this is okay, badges and visual indicators will still work
    if (error.message && error.message.includes('FirebaseApp')) {
      console.log('ℹ️  Push notifications disabled (Firebase not configured). Badges and visual indicators will still work!');
      console.log('ℹ️  To enable push notifications, see: https://docs.expo.dev/push-notifications/fcm-credentials/');
    } else {
      console.error('Error getting push token:', error);
    }
    return null;
  }
}

/**
 * Save push token to the couples table
 */
export async function savePushToken(userId, pushToken) {
  if (!pushToken) return;

  try {
    // Find the couple record for this user - use most recent if multiple exist
    const { data, error: fetchError } = await supabase
      .from('couples')
      .select('*')
      .or(`auth_user1_id.eq.${userId},auth_user2_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError || !data || data.length === 0) {
      console.log('No couple found for user');
      return;
    }

    const couple = data[0];

    // Determine which token field to update
    const tokenField = couple.auth_user1_id === userId
      ? 'user1_push_token'
      : 'user2_push_token';

    // Update the push token
    const { error: updateError } = await supabase
      .from('couples')
      .update({ [tokenField]: pushToken })
      .eq('id', couple.id);

    if (updateError) {
      console.error('Error saving push token:', updateError);
    } else {
      console.log('Push token saved successfully');
    }
  } catch (error) {
    console.error('Error in savePushToken:', error);
  }
}

/**
 * Send a push notification to a partner
 */
export async function sendPushNotification(partnerPushToken, title, body, data = {}) {
  if (!partnerPushToken) {
    console.log('No push token available for partner');
    return;
  }

  try {
    const message = {
      to: partnerPushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      priority: 'high',
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('Notification sent:', result);
    return result;
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

/**
 * Get partner's push token from the couple record
 */
export async function getPartnerPushToken(userId) {
  try {
    // Get the most recent couple if multiple exist
    const { data, error } = await supabase
      .from('couples')
      .select('*')
      .or(`auth_user1_id.eq.${userId},auth_user2_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      console.log('No couple found for user');
      return null;
    }

    const couple = data[0];

    // Get the partner's push token
    const partnerToken = couple.auth_user1_id === userId
      ? couple.user2_push_token
      : couple.user1_push_token;

    return partnerToken;
  } catch (error) {
    console.error('Error getting partner push token:', error);
    return null;
  }
}

/**
 * Send notification when a game starts
 */
export async function notifyGameStarted(userId, gameType) {
  const partnerToken = await getPartnerPushToken(userId);
  if (!partnerToken) return;

  const gameNames = {
    tictactoe: 'Tic Tac Toe',
    connectfour: 'Connect Four',
    reversi: 'Reversi',
    dotsandboxes: 'Dots and Boxes',
  };

  const gameName = gameNames[gameType] || 'a game';

  await sendPushNotification(
    partnerToken,
    '🎮 New Game Started!',
    `Your partner started a game of ${gameName}. It's your turn!`,
    { type: 'game_started', gameType }
  );
}

/**
 * Send notification when it's partner's turn
 */
export async function notifyYourTurn(userId, gameType) {
  const partnerToken = await getPartnerPushToken(userId);
  if (!partnerToken) return;

  const gameNames = {
    tictactoe: 'Tic Tac Toe',
    connectfour: 'Connect Four',
    reversi: 'Reversi',
    dotsandboxes: 'Dots and Boxes',
  };

  const gameName = gameNames[gameType] || 'a game';

  await sendPushNotification(
    partnerToken,
    '🎯 Your Turn!',
    `It's your turn in ${gameName}`,
    { type: 'your_turn', gameType }
  );
}

/**
 * Send notification when partner makes a move
 */
export async function notifyPartnerMoved(userId, gameType) {
  const partnerToken = await getPartnerPushToken(userId);
  if (!partnerToken) return;

  const gameNames = {
    tictactoe: 'Tic Tac Toe',
    connectfour: 'Connect Four',
    reversi: 'Reversi',
    dotsandboxes: 'Dots and Boxes',
  };

  const gameName = gameNames[gameType] || 'a game';

  await sendPushNotification(
    partnerToken,
    '🎲 Partner Moved!',
    `Your partner made a move in ${gameName}. It's your turn now!`,
    { type: 'partner_moved', gameType }
  );
}
