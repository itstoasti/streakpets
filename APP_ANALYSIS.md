# Couples Pet Fresh - App Analysis & Overview

## 📱 Project Overview
**Couples Pet Fresh** is a shared digital pet application designed for couples to interact and bond remotely. Built with **Expo React Native** and **Supabase**, it features real-time synchronization allowing partners to care for a common pet, play games, and share memories.

## ✨ Core Features

### 1. 🔐 Couple Pairing & Auth
- **Invite System**: Users create a couple via a unique 6-character code.
- **Authentication**: Email/Password login via Supabase Auth.
- **State Management**: Real-time sync of couple status and data.

### 2. 🐾 Pet Care & Marketplace (Economy)
- **Shared Pet**: Partners care for one pet (happiness boosts).
- **Happiness System**: Decays over time; boosted by feeding and activities.
- **Marketplace**: A feature-rich shop (not fully documented in README) allows purchasing:
  - **New Pets**: Dog, Cat, Bunny, Panda, Fox, Turtle, Polar Bear.
  - **Streak Repairs**: Restore broken streaks for 100 coins.
- **Currency**: "Coins" earned by caring for the pet.

### 3. 🎮 Activities & Games
Located in `app/(tabs)/activity.js`, the app offers extensive multiplayer options:
- **Turn-Based Games**:
  - Tic Tac Toe
  - Connect Four
  - Dots and Boxes
  - Reversi (Othello)
  - Checkers (Found in code, not in docs)
  - Memory Match (Found in code, not in docs)
- **Conversation Starters**:
  - Couple Trivia
  - Would You Rather
  - Who's More Likely To?
- **Creative**:
  - **Whiteboard**: Shared drawing canvas (synced).

### 4. 📝 Shared Content
- **Notes**: Shared text notes with timestamps.
- **Album**: Photo memories with descriptions.
- **Widgets**: Android Home Screen widget (`GalleryWidget`) displaying the couple's whiteboard drawings.

## 🛠 Technical Architecture

### Tech Stack
- **Framework**: Expo SDK 54 (React Native)
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Navigation**: Expo Router (File-based)
- **State/Storage**: AsyncStorage (local caching) + Supabase (cloud source of truth)

### Project Structure Highlights
- `app/(tabs)/`: Main tab screens.
  - `activity.js`: Hub for all games and activities (referred to as `games.js` in some docs).
  - `marketplace.js`: The in-app shop.
  - `index.js`: Dashboard/Pet view.
- `widgets/`: Android Native Widget code (JS-based implementation).
- `lib/`: Helpers for Supabase, Auth, and Storage.

## 🔍 Discrepancies & Findings
During the code review, the following differences from the documentation were observed:
1.  **File Naming**: `README.md` references `app/(tabs)/games.js`, but the file is actually `app/(tabs)/activity.js`.
2.  **Marketplace**: The `marketplace.js` exists and implements a full economy system (Coins, Pet Purchasing, Streak Repairs) which is not mentioned in the main `README.md`.
3.  **Undocumented Games**: **Checkers** and **Memory Match** appear in the code but are not listed in `MULTIPLAYER_GAMES_SUMMARY.md`.
4.  **Widget Implementation**: `WIDGET_SETUP.md` refers to `.tsx` files, but the actual files in `widgets/` are `.js`.

## 💡 Suggestions for Improvement

### 1. 📅 Couple Calendar & Events
**Feature**: A shared calendar for dates, anniversaries, and milestones.
**Why**: Enhances the "utility" aspect of the app beyond just gaming.
**Implementation**: New Tab or section in Activity.

### 2. 💬 In-App Chat
**Feature**: simple real-time text chat (distinct from "Notes").
**Why**: "Notes" are for pinned messages; Chat is for ephemeral conversation while playing.
**Implementation**: Supabase Realtime subscription table `messages`.

### 3. 🥚 Pet Evolution
**Feature**: Pets grow or change appearance based on "Level" or total happiness earned.
**Why**: Long-term retention hook.
**Implementation**: Add `level` column to `pets` table; unlock visual variants.

### 4. 🌙 Mood Check-Ins
**Feature**: Daily prompt "How are you feeling?" with emoji selection. Partner gets notified.
**Why**: Emotional connection/empathy building.
**Implementation**: Simple UI on Home Screen; reset daily.

### 5. 🔔 Push Notifications
**Status**: Listed as "High Priority" in docs.
**Action**: Essential for "Pet is hungry" or "Your turn" alerts.
**Implementation**: Use `expo-notifications` with Supabase Edge Functions.

### 6. 🏆 Leaderboards
**Feature**: "Couple Streak" global leaderboards (optional opt-in).
**Why**: Gamification and social proof.
