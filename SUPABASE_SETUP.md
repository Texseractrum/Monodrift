# Supabase Leaderboard Setup Guide

## 1. Create the Leaderboard Table

1. Log in to your Supabase dashboard at [app.supabase.com](https://app.supabase.com)
2. Select your project (if you don't have one, create a new project)
3. In the left sidebar, click on **Table Editor**
4. Click **Create a new table**
5. Set the following:
   - Table Name: `leaderboard`
   - Enable Row Level Security (RLS): Check this box
   - Columns:
     - `id` (type: `uuid`, Primary Key: Yes, Default Value: `uuid_generate_v4()`)
     - `player_name` (type: `text`, Default Value: NULL, Is Nullable: No)
     - `score` (type: `int8`, Default Value: NULL, Is Nullable: No)
     - `created_at` (type: `timestamptz`, Default Value: `now()`, Is Nullable: No)
6. Click **Save** to create the table

## 2. Set Up Security Policies

1. Go to **Authentication** > **Policies** in the sidebar
2. Find your `leaderboard` table and click **New Policy**
3. Select **Create a policy from scratch**

### For Reading Scores:

1. **Policy Name**: `Allow anyone to read leaderboard`
2. **Using expression**: `true` (allows anyone to read)
3. **Policy definition**: For SELECT using expression
4. **WITH CHECK expression**: `true`
5. Save policy

### For Submitting Scores:

1. **Policy Name**: `Allow anyone to insert scores`
2. **Using expression**: `true` (allows anyone to insert)
3. **Policy definition**: For INSERT using expression
4. **WITH CHECK expression**: `true`
5. Save policy

### For Updating Scores (only by the same player):

1. **Policy Name**: `Allow updates to existing player scores`
2. **Using expression**: `true` (allows anyone to update)
3. **Policy definition**: For UPDATE using expression
4. **WITH CHECK expression**: `true`
5. Save policy

## 3. Test the Connection

1. Return to your game and refresh the page
2. The leaderboard should now connect to Supabase and display any saved scores
3. Play a game and check if your score is submitted to the leaderboard

## Troubleshooting

If you're still having issues:

1. Check the browser console for errors (F12 > Console)
2. Verify that your Supabase URL and anon key in `src/config.js` are correct
3. Make sure your Supabase project is on the free plan or higher (not paused)
4. Check that your column names exactly match what the code expects: `id`, `player_name`, `score`, and `created_at`
