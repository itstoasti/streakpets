# 💕 Couples Pet - Take Care of Your Pet Together

A beautiful React Native mobile app built with Expo SDK 54 that helps couples stay connected by taking care of a virtual pet together. Play games, share notes, add memories, and watch your pet grow happier!

## ✨ Features

### 🔐 Couple Pairing
- Create a couple account and get an invite code
- Share the code with your partner
- Both partners can interact with the same pet and shared content

### 🐾 Pet Care System
- Choose from 3 adorable pets: 🦜 Parrot, 🐕 Dog, or 🐧 Penguin
- Happiness meter (0-100) that reflects your pet's mood
- Feed your pet directly to boost happiness (+10 points)
- Happiness gradually decreases over time (2 points per hour)
- Real-time happiness updates visible to both partners

### 🎮 Games
- **Tic Tac Toe**: Classic 2-player game (+5 happiness per game)
- **Couple Trivia**: Answer fun questions about your partner (+5 happiness per game)
- Games help you bond while keeping your pet happy

### 📝 Shared Notes
- Write and share sweet notes with your partner
- Real-time synchronization
- Each note adds +3 happiness to your pet
- Delete your own notes

### 📸 Photo Album
- Create a shared memory album
- Add photos with descriptions
- Each memory adds +5 happiness to your pet
- Grid view for browsing memories
- Delete your own memories

### 🎨 Beautiful Design
- Soft pink gradient theme perfect for couples
- Smooth animations throughout the app
- Intuitive tab-based navigation
- Clean, modern interface

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo Go app on your mobile device (iOS/Android)
- Supabase account (free tier works great!)

### Installation

1. **Clone the repository**
   ```bash
   cd couples-pet-fresh
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**

   a. Create a new project at [supabase.com](https://supabase.com)

   b. Go to SQL Editor and run the contents of `supabase-schema.sql`

   c. Go to Settings > API to get your credentials:
      - Project URL
      - Anon/Public Key

   d. (Optional) Create a storage bucket for images:
      - Go to Storage
      - Create a new bucket named `memories`
      - Set it as private
      - Add the storage policies from `supabase-schema.sql`

4. **Configure environment variables**

   Create a `.env` file in the root directory:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Start the development server**
   ```bash
   npm start
   ```

6. **Run on your device**
   - Scan the QR code with Expo Go app (Android)
   - Scan the QR code with Camera app (iOS)

## 📱 How to Use

### First Time Setup

1. **Sign Up**: Create an account with email and password
2. **Create or Join**:
   - Choose "Create Couple" to get an invite code
   - Share the code with your partner
   - OR enter your partner's invite code to join
3. **Choose Pet**: Pick your favorite pet together
4. **Start Playing**: Keep your pet happy by doing activities!

### Daily Activities

- **Feed Pet**: Tap the feed button on the home screen (+10 happiness)
- **Play Games**: Go to Games tab and play together (+5 happiness each)
- **Share Notes**: Write sweet messages in the Notes tab (+3 happiness each)
- **Add Memories**: Upload photos in the Album tab (+5 happiness each)

### Tips

- Check your pet regularly - happiness decreases by 2 points every hour
- Do activities together to keep happiness above 50
- The happiness meter shows your relationship health
- All data is synced in real-time between both partners

## 🏗️ Project Structure

```
couples-pet-fresh/
├── app/
│   ├── (tabs)/
│   │   ├── index.js       # Pet care main screen
│   │   ├── games.js       # Games screen
│   │   ├── notes.js       # Shared notes screen
│   │   ├── album.js       # Photo album screen
│   │   └── _layout.js     # Tabs layout
│   ├── auth.js            # Authentication screen
│   └── _layout.js         # Root layout
├── lib/
│   └── supabase.js        # Supabase client configuration
├── assets/                 # App icons and images
├── supabase-schema.sql    # Database schema
├── package.json
├── app.json
└── README.md
```

## 🛠️ Technologies Used

- **Framework**: Expo SDK 54
- **Language**: JavaScript/React Native
- **Navigation**: Expo Router (file-based routing)
- **Backend**: Supabase (PostgreSQL + Authentication + Storage)
- **UI Components**: React Native core components
- **Animations**: react-native-animatable
- **Gradients**: expo-linear-gradient
- **Image Picker**: expo-image-picker
- **Clipboard**: expo-clipboard
- **Storage**: AsyncStorage

## 🗃️ Database Schema

The app uses 4 main tables:

- **couples**: Stores couple relationships and invite codes
- **pets**: Stores pet data (type, happiness level)
- **notes**: Stores shared notes between partners
- **memories**: Stores photo album entries

All tables have Row Level Security (RLS) enabled to ensure data privacy.

## 🔒 Security Features

- User authentication via Supabase Auth
- Row Level Security (RLS) policies
- Couples can only access their own data
- Users can only delete content they created
- Secure API key management with environment variables

## 🎨 Customization

### Change Theme Colors

Edit the color values in each screen's StyleSheet:
- Primary: `#FF1493` (Deep Pink)
- Secondary: `#FF69B4` (Hot Pink)
- Accent: `#FFB6D9` (Light Pink)
- Background: `#FFE5EC` (Pale Pink)

### Add More Games

Create a new component in `app/(tabs)/games.js` following the pattern of existing games.

### Modify Pet Types

Edit the `PETS` object in `app/(tabs)/index.js` to add or change pets.

## 🐛 Troubleshooting

### "Invalid invite code" error
- Make sure the code is exactly as shown (case-sensitive)
- Check that the couple creator hasn't already been joined by someone else

### Images not uploading
- Check permissions on your device
- Ensure Supabase storage bucket is properly configured
- For production, implement proper image upload to Supabase Storage

### Real-time not working
- Verify Supabase Realtime is enabled in your project
- Check that RLS policies allow the current user to read data

### App not connecting to Supabase
- Verify .env file has correct credentials
- Make sure to use `EXPO_PUBLIC_` prefix for environment variables
- Restart the Expo dev server after changing .env

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 💖 Acknowledgments

Built with love for couples who want to stay connected!

---

**Made with 💕 using Expo and Supabase**
