import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    Alert,
    Share,
} from 'react-native';
import { useTheme } from '../lib/themeContext';
import { useAuth } from '../lib/authContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getCoupleData, clearAllData, getCurrency, getStreakData } from '../lib/storage';
import { supabase } from '../lib/supabase';
import * as Clipboard from 'expo-clipboard';

export default function ProfileScreen() {
    const { theme, themeName, setTheme, themes } = useTheme();
    const { user, signOut } = useAuth();
    const router = useRouter();
    const [couple, setCouple] = useState(null);
    const [partnerEmail, setPartnerEmail] = useState('');
    const [currency, setCurrency] = useState(0);
    const [streak, setStreak] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProfileData();
    }, []);

    async function loadProfileData() {
        try {
            const coupleData = await getCoupleData();
            setCouple(coupleData);

            if (coupleData) {
                // Fetch partner email
                const partnerId = coupleData.auth_user1_id === user.id
                    ? coupleData.auth_user2_id
                    : coupleData.auth_user1_id;

                if (partnerId) {
                    // Since we can't fetch email safely on client side without a public profiles table,
                    // we'll just show "Connected" to indicate the link exists.
                    setPartnerEmail('Connected');
                }
            }

            // Load currency and streak
            const coins = await getCurrency();
            setCurrency(coins || 0);

            const streakData = await getStreakData();
            setStreak(streakData?.currentStreak || 0);
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleCopyInviteCode() {
        if (couple?.invite_code) {
            await Clipboard.setStringAsync(couple.invite_code);
            Alert.alert('Copied!', 'Invite code copied to clipboard');
        }
    }

    async function handleShareInviteCode() {
        if (couple?.invite_code) {
            try {
                await Share.share({
                    message: `Join me on Spark! My invite code is: ${couple.invite_code}`,
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        }
    }

    async function handleSignOut() {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        await signOut();
                        router.replace('/(auth)/welcome');
                    },
                },
            ]
        );
    }

    async function handleLeaveCouple() {
        if (!couple) return;

        Alert.alert(
            'Leave Couple',
            'Are you sure you want to leave this couple? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const isUser1 = couple.auth_user1_id === user.id;
                            const isUser2 = couple.auth_user2_id === user.id;

                            if (isUser2) {
                                await supabase
                                    .from('couples')
                                    .update({ auth_user2_id: null })
                                    .eq('id', couple.id);
                            } else if (isUser1) {
                                // Delete all associated data
                                await supabase.from('pets').delete().eq('couple_id', couple.id);
                                await supabase.from('games').delete().eq('couple_id', couple.id);
                                await supabase.from('notes').delete().eq('couple_id', couple.id);
                                await supabase.from('memories').delete().eq('couple_id', couple.id);
                                await supabase.from('whiteboard_drawings').delete().eq('couple_id', couple.id);
                                await supabase.from('couples').delete().eq('id', couple.id);
                            }

                            await clearAllData();
                            router.replace('/(tabs)');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to leave couple. Please try again.');
                        }
                    },
                },
            ]
        );
    }

    async function handleDeleteAccount() {
        Alert.alert(
            'Delete Account',
            'This will permanently delete your account and all data including:\n\n• Your pet and progress\n• All photos and memories\n• Game history and scores\n• Your couple connection\n\nThis cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Account',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Delete all couple-related data
                            if (couple) {
                                await supabase.from('pets').delete().eq('couple_id', couple.id);
                                await supabase.from('games').delete().eq('couple_id', couple.id);
                                await supabase.from('notes').delete().eq('couple_id', couple.id);
                                await supabase.from('memories').delete().eq('couple_id', couple.id);
                                await supabase.from('conversation_games').delete().eq('couple_id', couple.id);
                                await supabase.from('whiteboard_drawings').delete().eq('couple_id', couple.id);
                                await supabase.from('game_invites').delete().eq('couple_id', couple.id);
                                await supabase.from('couples').delete().eq('id', couple.id);
                            }

                            // Clear local data
                            await clearAllData();

                            // Sign out (this also removes auth session)
                            await signOut();

                            Alert.alert('Account Deleted', 'Your account and all data have been deleted.');
                            router.replace('/(auth)/welcome');
                        } catch (error) {
                            console.error('Error deleting account:', error);
                            Alert.alert('Error', 'Failed to delete account. Please try again or contact support.');
                        }
                    },
                },
            ]
        );
    }

    const themeOptions = [
        { key: 'pink', name: 'Romance', icon: 'heart', description: 'Perfect for couples' },
        { key: 'light', name: 'Light', icon: 'sunny', description: 'Clean and bright' },
        { key: 'dark', name: 'Dark', icon: 'moon', description: 'Easy on the eyes' },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView style={styles.scrollView}>
                {/* User Info Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Account</Text>
                    <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
                        <View style={styles.infoRow}>
                            <Ionicons name="mail" size={20} color={theme.primary} />
                            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Email</Text>
                        </View>
                        <Text style={[styles.infoValue, { color: theme.text }]}>{user?.email || 'Not available'}</Text>
                    </View>
                </View>

                {/* Stats Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Stats</Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={[styles.statCard, { backgroundColor: theme.surface, flex: 1 }]}>
                            <Ionicons name="flame" size={32} color={theme.primary} />
                            <Text style={[styles.statValue, { color: theme.text }]}>{streak}</Text>
                            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Day Streak</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: theme.surface, flex: 1 }]}>
                            <Ionicons name="cash" size={32} color={theme.primary} />
                            <Text style={[styles.statValue, { color: theme.text }]}>{currency}</Text>
                            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Coins</Text>
                        </View>
                    </View>
                </View>

                {/* Couple Info Section */}
                {couple && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Couple</Text>
                        <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
                            <View style={styles.infoRow}>
                                <Ionicons name="people" size={20} color={theme.primary} />
                                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Partner</Text>
                            </View>
                            <Text style={[styles.infoValue, { color: theme.text }]}>
                                {partnerEmail || 'No partner yet'}
                            </Text>
                        </View>

                        <View style={[styles.infoCard, { backgroundColor: theme.surface, marginTop: 12 }]}>
                            <View style={styles.infoRow}>
                                <Ionicons name="key" size={20} color={theme.primary} />
                                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Invite Code</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text style={[styles.infoValue, { color: theme.text, flex: 1 }]}>{couple.invite_code}</Text>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <TouchableOpacity
                                        onPress={handleShareInviteCode}
                                        style={[styles.copyButton, { backgroundColor: theme.secondary }]}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="share-social" size={18} color="#FFFFFF" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleCopyInviteCode}
                                        style={[styles.copyButton, { backgroundColor: theme.primary }]}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="copy" size={18} color="#FFFFFF" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                {/* Theme Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Theme</Text>
                    <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
                        Choose a theme that matches your style
                    </Text>

                    {themeOptions.map((option) => (
                        <TouchableOpacity
                            key={option.key}
                            style={[
                                styles.themeOption,
                                {
                                    backgroundColor: theme.surface,
                                    borderColor: themeName === option.key ? theme.primary : theme.border,
                                    borderWidth: themeName === option.key ? 2 : 1,
                                },
                            ]}
                            onPress={() => setTheme(option.key)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.themeOptionLeft}>
                                <View
                                    style={[
                                        styles.iconContainer,
                                        {
                                            backgroundColor:
                                                themeName === option.key
                                                    ? theme.primary
                                                    : theme.backgroundSecondary,
                                        },
                                    ]}
                                >
                                    <Ionicons
                                        name={option.icon}
                                        size={24}
                                        color={themeName === option.key ? '#FFFFFF' : theme.primary}
                                    />
                                </View>
                                <View style={styles.themeInfo}>
                                    <Text style={[styles.themeName, { color: theme.text }]}>
                                        {option.name}
                                    </Text>
                                    <Text style={[styles.themeDescription, { color: theme.textSecondary }]}>
                                        {option.description}
                                    </Text>
                                </View>
                            </View>
                            {themeName === option.key && (
                                <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Actions Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Actions</Text>

                    {couple && (
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                            onPress={handleLeaveCouple}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="exit-outline" size={24} color={theme.error} />
                            <Text style={[styles.actionButtonText, { color: theme.error }]}>Leave Couple</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 12 }]}
                        onPress={handleSignOut}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="log-out-outline" size={24} color={theme.text} />
                        <Text style={[styles.actionButtonText, { color: theme.text }]}>Sign Out</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.deleteAccountButton, { marginTop: 12 }]}
                        onPress={handleDeleteAccount}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
                        <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Delete Account</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    section: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    sectionDescription: {
        fontSize: 14,
        marginBottom: 16,
    },
    infoCard: {
        padding: 16,
        borderRadius: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    infoLabel: {
        fontSize: 14,
        marginLeft: 8,
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 16,
        marginLeft: 28,
    },
    statCard: {
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 28,
        fontWeight: 'bold',
        marginTop: 8,
    },
    statLabel: {
        fontSize: 14,
        marginTop: 4,
    },
    copyButton: {
        padding: 8,
        borderRadius: 8,
        marginLeft: 12,
    },
    themeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    themeOptionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    themeInfo: {
        flex: 1,
    },
    themeName: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    themeDescription: {
        fontSize: 14,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 12,
    },
    deleteAccountButton: {
        backgroundColor: '#FF3B30',
        borderColor: '#FF3B30',
    },
});
