import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@spark_theme';
const THEME_RESET_FLAG = '@spark_theme_reset';

// Define color palettes for each theme
const themes = {
    pink: {
        name: 'Romance',
        primary: '#FF1493',
        primaryLight: '#FFB6D9',
        background: '#FFF0F5',
        backgroundSecondary: '#FFE5EC',
        surface: '#FFFFFF',
        text: '#333333',
        textSecondary: '#999999',
        border: '#FFE5EC',
        success: '#4CAF50',
        warning: '#FF9800',
        error: '#F44336',
        card: '#FFFFFF',
        secondary: '#FF69B4',
        gradient: ['#FFE5EC', '#FFF0F5', '#FFFFFF'],
    },
    light: {
        name: 'Light',
        primary: '#2196F3',
        primaryLight: '#90CAF9',
        background: '#F5F5F5',
        backgroundSecondary: '#EEEEEE',
        surface: '#FFFFFF',
        text: '#212121',
        textSecondary: '#757575',
        border: '#E0E0E0',
        success: '#4CAF50',
        warning: '#FF9800',
        error: '#F44336',
        card: '#FFFFFF',
        secondary: '#757575',
        gradient: ['#F5F5F5', '#FAFAFA', '#FFFFFF'],
    },
    dark: {
        name: 'Dark',
        primary: '#BB86FC',
        primaryLight: '#E1BEE7',
        background: '#121212',
        backgroundSecondary: '#1E1E1E',
        surface: '#2C2C2C',
        text: '#FFFFFF',
        textSecondary: '#B0B0B0',
        border: '#3C3C3C',
        success: '#66BB6A',
        warning: '#FFA726',
        error: '#EF5350',
        card: '#2C2C2C',
        secondary: '#B0B0B0',
        gradient: ['#121212', '#1E1E1E', '#2C2C2C'],
    },
};

const ThemeContext = createContext({
    theme: themes.light,
    themeName: 'light',
    setTheme: () => { },
    themes,
});

export function ThemeProvider({ children }) {
    const [themeName, setThemeName] = useState('light');

    useEffect(() => {
        // One-time migration: Reset to light theme if not already reset
        async function init() {
            const alreadyReset = await AsyncStorage.getItem(THEME_RESET_FLAG);
            if (!alreadyReset) {
                await AsyncStorage.removeItem(THEME_STORAGE_KEY);
                await AsyncStorage.setItem(THEME_RESET_FLAG, 'true');
            }
            loadTheme();
        }
        init();
    }, []);

    async function loadTheme() {
        try {
            // Force light theme - ignore saved preferences for now
            setThemeName('light');
            await AsyncStorage.removeItem(THEME_STORAGE_KEY);
            // const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
            // if (savedTheme && themes[savedTheme]) {
            //     setThemeName(savedTheme);
            // }
        } catch (error) {
            console.error('Error loading theme:', error);
        }
    }

    async function changeTheme(newThemeName) {
        if (themes[newThemeName]) {
            setThemeName(newThemeName);
            try {
                await AsyncStorage.setItem(THEME_STORAGE_KEY, newThemeName);
            } catch (error) {
                console.error('Error saving theme:', error);
            }
        }
    }

    const value = {
        theme: themes[themeName],
        themeName,
        setTheme: changeTheme,
        themes,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
