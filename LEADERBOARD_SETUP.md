# Monodrift Leaderboard Setup Guide

This guide will help you set up Supabase to power the leaderboard feature in Monodrift.

## 1. Create a Supabase Account

1. Go to [supabase.com](https://supabase.com/) and sign up for a free account
2. Create a new project
3. Choose a name and password for your project
4. Wait for your database to be provisioned (this may take a few minutes)

## 2. Create the Leaderboard Table

Once your project is ready, you'll need to create a table for storing leaderboard entries:

1. In the Supabase dashboard, navigate to the **Table Editor** in the left sidebar
2. Click **Create a new table**
3. Set the following settings:

   - **Name**: `leaderboard`
   - **Enable Row Level Security (RLS)**: Checked
   - **Columns**:
     - `id` (type: `uuid`, Primary Key: Yes, Default Value: `uuid_generate_v4()`)
     - `player_name` (type: `text`, Default Value: NULL, Is Nullable: No)
     - `score` (type: `int8`, Default Value: NULL, Is Nullable: No)
     - `created_at` (type: `timestamptz`, Default Value: `now()`, Is Nullable: No)

4. Click **Save** to create the table

## 3. Set Up Row Level Security Policies

To allow anonymous users to view scores and add their own, set up the following RLS policies:

1. Navigate to the **Authentication** > **Policies** section in the sidebar
2. Find your `leaderboard` table and click **New Policy**
3. Select **Create a policy from scratch**

### Policy for Reading Scores:

- **Policy Name**: `Allow anonymous read`
- **Using expression**: `true`
- **Policy Definition**: For SELECT using expression
- **WITH CHECK expression**: `true`
- **Save policy**

### Policy for Submitting Scores:

- **Policy Name**: `Allow anonymous inserts`
- **Using expression**: `true`
- **Policy Definition**: For INSERT using expression
- **WITH CHECK expression**: `true`
- **Save policy**

## 4. Get Your API Credentials

Now you need to get the API credentials to connect your game to Supabase:

1. Go to **Project Settings** (gear icon in the sidebar)
2. Navigate to **API** in the settings menu
3. You'll find your:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxxxxxxxxx.supabase.co`)
   - **anon (public) API key** (starts with "eyJh...")

## 5. Update Your Game Configuration

Open `src/config.js` in your Monodrift project and update the Supabase settings:

```javascript
supabase: {
  url: 'YOUR_PROJECT_URL', // Replace with your Supabase URL
  anonKey: 'YOUR_ANON_KEY' // Replace with your anon key
}
```

## 6. Testing the Leaderboard

1. Start your game with `npm run dev`
2. Play the game and achieve a high score
3. You should be prompted to enter your name when you finish a good drift
4. Your score should appear in the leaderboard
5. You can also check the data directly in the Supabase **Table Editor**

## Troubleshooting

- **Scores aren't submitting**: Check your browser console for errors. Make sure your Supabase credentials are correct.
- **Can't see the leaderboard**: Press "L" key or click the leaderboard button in the top right.
- **Database errors**: Make sure your column names match exactly: `player_name`, `score`, and `created_at`.

## Additional Customization

You can modify leaderboard settings in `src/config.js`:

```javascript
leaderboard: {
  entriesLimit: 10, // Maximum number of entries to display
  minScoreThreshold: 50 // Minimum score to qualify for leaderboard prompt
}
```
