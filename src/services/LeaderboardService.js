import { createClient } from '@supabase/supabase-js';
import config from '../config.js';

// Debug flag from config
const DEBUG = config.game.debugMode;

// Initialize the Supabase client
const supabase = createClient(config.supabase.url, config.supabase.anonKey);

// Log connection info in debug mode
if (DEBUG) {
  console.log('Supabase Configuration:');
  console.log('- URL:', config.supabase.url);
  console.log('- Using anon key:', config.supabase.anonKey ? '✓ (Key exists)' : '✗ (Key missing)');
}

export class LeaderboardService {
  constructor() {
    this.isInitialized = false;
    this.topScores = [];
    
    // Event to notify when leaderboard is updated
    this.onLeaderboardUpdate = null;
  }
  
  async initialize(maxRetries = 3) {
    try {
      // Fetch initial leaderboard data using the retry mechanism
      await this.fetchLeaderboardWithRetries(maxRetries);
      this.isInitialized = true;
      console.log('Leaderboard service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize leaderboard service:', error);
      return false;
    }
  }
  
  async fetchLeaderboardWithRetries(maxRetries = 3, delay = 1000) {
    let retries = 0;
    let success = false;
    
    while (retries < maxRetries && !success) {
      try {
        console.log(`Fetching leaderboard data (attempt ${retries + 1}/${maxRetries})...`);
        const data = await this.fetchLeaderboard();
        if (data.length >= 0) { // Success even if empty array (no scores yet)
          success = true;
          console.log('Leaderboard data fetched successfully');
          return data;
        }
      } catch (error) {
        console.error(`Fetch attempt ${retries + 1} failed:`, error);
        retries++;
        if (retries < maxRetries) {
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          // Increase delay for next retry (exponential backoff)
          delay *= 1.5;
        }
      }
    }
    
    if (!success) {
      throw new Error('Failed to fetch leaderboard data after multiple attempts');
    }
  }
  
  async fetchLeaderboard(limit = config.leaderboard.entriesLimit) {
    try {
      if (DEBUG) console.log('Fetching leaderboard data...');
      
      // Test connection to Supabase first
      try {
        const { error: pingError } = await supabase.from('leaderboard').select('count', { count: 'exact', head: true });
        
        if (pingError) {
          console.error('Error connecting to Supabase:', pingError);
          if (pingError.message.includes('does not exist')) {
            console.error('The "leaderboard" table does not exist. Please create it first - see SUPABASE_SETUP.md');
            throw new Error('Leaderboard table not found');
          }
          throw pingError;
        }
        
        if (DEBUG) console.log('Successfully connected to Supabase');
      } catch (connectionError) {
        console.error('Failed connection test:', connectionError);
        throw connectionError;
      }
      
      // If connection test passes, fetch the actual data
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('score', { ascending: false })
        .limit(limit);
        
      if (error) throw error;
      
      if (DEBUG) console.log(`Fetched ${data.length} leaderboard entries`);
      this.topScores = data;
      
      if (this.onLeaderboardUpdate) {
        this.onLeaderboardUpdate(this.topScores);
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }
  
  async submitScore(playerName, score) {
    try {
      // Validate input
      if (!playerName || score === undefined || score === null) {
        throw new Error('Player name and score are required');
      }
      
      // First check if player name already exists
      const { data: existingPlayer, error: searchError } = await supabase
        .from('leaderboard')
        .select('id, score')
        .eq('player_name', playerName)
        .limit(1);
      
      if (searchError) throw searchError;
      
      let result;
      
      if (existingPlayer && existingPlayer.length > 0) {
        // Player exists, compare scores and only update if new score is higher
        const existingScore = existingPlayer[0].score || 0;
        
        if (score > existingScore) {
          // Update with higher score
          const { data, error } = await supabase
            .from('leaderboard')
            .update({ score: score, created_at: new Date() })
            .eq('id', existingPlayer[0].id)
            .select();
            
          result = { data, error };
          console.log(`Updated score for ${playerName}: ${existingScore} → ${score}`);
        } else {
          // Keep existing higher score
          console.log(`Kept existing higher score for ${playerName}: ${existingScore} vs ${score}`);
          result = { data: existingPlayer, error: null };
        }
      } else {
        // New player, insert new record
        const { data, error } = await supabase
          .from('leaderboard')
          .insert([
            { player_name: playerName, score: score, created_at: new Date() }
          ])
          .select();
          
        result = { data, error };
        console.log(`Added new score for ${playerName}: ${score}`);
      }
        
      if (result.error) throw result.error;
      
      // Refresh leaderboard after submitting
      await this.fetchLeaderboard();
      
      return true;
    } catch (error) {
      console.error('Error submitting score:', error);
      return false;
    }
  }
  
  async checkIfTopScore(score, limit = config.leaderboard.entriesLimit) {
    try {
      // Get current leaderboard
      const { data, error } = await supabase
        .from('leaderboard')
        .select('score')
        .order('score', { ascending: false })
        .limit(limit);
        
      if (error) throw error;
      
      // If there are fewer than the limit entries, it's a top score
      if (data.length < limit) return true;
      
      // Check if score is higher than the lowest score on the leaderboard
      const lowestTopScore = data[data.length - 1]?.score || 0;
      return score > lowestTopScore;
    } catch (error) {
      console.error('Error checking if top score:', error);
      // Default to true if there's an error, to give player benefit of the doubt
      return true;
    }
  }
  
  getTopScores() {
    return this.topScores;
  }

  // Add a simple ping method that just checks if the table exists
  async pingLeaderboardTable() {
    try {
      console.log('Pinging leaderboard table...');
      
      // Simple SELECT that just gets count instead of data
      const { count, error } = await supabase
        .from('leaderboard')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error('Ping failed:', error);
        return false;
      }
      
      console.log(`Ping successful. Table has ${count} records.`);
      return true;
    } catch (error) {
      console.error('Error pinging leaderboard table:', error);
      return false;
    }
  }
  
  // Add a simple method to access just 1 record for testing
  async fetchSingleRecord() {
    try {
      console.log('Fetching a single record for table access test...');
      
      // Just get one record to verify access
      const { data, error } = await supabase
        .from('leaderboard')
        .select('id, player_name, score')
        .limit(1);
      
      if (error) {
        console.error('Single record fetch failed:', error);
        return null;
      }
      
      console.log('Single record fetch successful:', data);
      
      // If we got data and update callback exists, trigger it with full data
      if (data && data.length > 0) {
        // Since we've now confirmed table access, do a full fetch
        this.fetchLeaderboard();
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching single record:', error);
      return null;
    }
  }

  // Add a method to ensure table is accessible by creating a test record if needed
  async ensureTableAccess() {
    try {
      console.log('Ensuring leaderboard table is accessible...');
      
      // First check if table has any records
      const { count, error: countError } = await supabase
        .from('leaderboard')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error('Count check failed:', countError);
        return false;
      }
      
      // If table is empty, create a test record
      if (count === 0) {
        console.log('Leaderboard table is empty, creating test record...');
        
        // Insert a placeholder record
        const { data, error: insertError } = await supabase
          .from('leaderboard')
          .insert([{
            player_name: 'Game Creator',
            score: 1000,
            created_at: new Date()
          }])
          .select();
        
        if (insertError) {
          console.error('Test record creation failed:', insertError);
          return false;
        }
        
        console.log('Test record created successfully:', data);
        
        // Update our local scores
        this.fetchLeaderboard();
        return true;
      }
      
      console.log(`Table access verified, found ${count} records.`);
      return true;
    } catch (error) {
      console.error('Error ensuring table access:', error);
      return false;
    }
  }
} 