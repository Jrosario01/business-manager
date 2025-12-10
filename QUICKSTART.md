# Quick Start Guide

Follow these steps to get your Business Manager app running in ~10 minutes.

## Step 1: Supabase Setup (3 minutes)

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" (sign up if needed)
3. Click "New Project"
4. Fill in:
   - **Name**: business-manager
   - **Database Password**: (create a strong password - save it!)
   - **Region**: Choose closest to you
5. Click "Create new project"
6. Wait ~2 minutes for setup to complete

## Step 2: Get Your API Credentials (1 minute)

1. In your Supabase project, click "Settings" (⚙️ icon in left sidebar)
2. Click "API" under Project Settings
3. You'll see:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string)
4. Keep this tab open - you'll need these values next

## Step 3: Configure Your App (1 minute)

1. In your terminal (VS Code):
```bash
cd /home/claude/business-manager
cp .env.example .env
```

2. Open `.env` file and replace:
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here
```

3. Save the file

## Step 4: Create Database Tables (2 minutes)

1. In Supabase, click "SQL Editor" in left sidebar
2. Click "New Query"
3. Copy ALL content from `supabase-schema.sql` file
4. Paste it into the SQL editor
5. Click "Run" (or press Cmd/Ctrl + Enter)
6. You should see "Success. No rows returned"

## Step 5: Run the App! (2 minutes)

### Option A: On Your Phone (Recommended)

1. Install Expo Go app:
   - Android: [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)

2. In terminal:
```bash
npm start
```

3. Scan the QR code:
   - Android: Open Expo Go app, tap "Scan QR code"
   - iOS: Open Camera app, point at QR code, tap notification

### Option B: On Web Browser

```bash
npm run web
```

Your browser will open automatically at `http://localhost:8081`

## Step 6: Create Your Account

1. The app will open to the login screen
2. Click "Don't have an account? Sign Up"
3. Enter your email and a password
4. Click "Sign Up"
5. Check your email and click the verification link
6. Go back to the app and sign in

## You're Done! 🎉

You should now see the app with these tabs:
- 📦 Shipments
- 📋 Inventory  
- 💰 Sales
- 👥 Customers
- 📊 Reports

## What's Working Right Now

✅ Authentication (sign up, sign in, sign out)
✅ Basic navigation between tabs
✅ Shipments list view (currently empty)
✅ Database connection
✅ Real-time sync between devices

## Next: Start Building Features

The MVP structure is ready. Now we'll build out each module:

1. **Shipments** - Create shipment form, add products, track status
2. **Inventory** - View stock by shipment
3. **Sales** - Record sales, handle layaway
4. **Customers** - Manage customer database
5. **Reports** - Dashboard with metrics

## Troubleshooting

### "Network request failed"
- Check your .env file has correct Supabase URL and key
- Make sure you're connected to internet
- Verify Supabase project is running (green dot in Supabase dashboard)

### Can't see the QR code
```bash
# Try tunnel mode
npm start -- --tunnel
```

### "Unable to resolve module"
```bash
npm install
npm start -- --clear
```

### Still stuck?
- Restart Expo: Press `r` in terminal
- Restart Expo Go app on your phone
- Clear cache: `npm start -- --clear`

---

Ready to build? Let's start with the Shipments module! 🚀
