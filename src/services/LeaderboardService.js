import { supabase } from '../config/supabaseClient.js';
import config from '../config.js';

const DEBUG = config.game.debugMode || false;

/**
 * Service for managing the leaderboard
 */
export class LeaderboardService {
  constructor() {
    this.topScores = [];
    this.onLeaderboardUpdate = null;
    this.isLoading = false;
    
    if (DEBUG) console.log('Leaderboard service created');
  }
  
  /**
   * Initialize the leaderboard service
   * @returns {Promise<boolean>} - Whether initialization was successful
   */
  async initialize() {
    if (DEBUG) console.log('Initializing leaderboard service...');
    
    try {
      // Check if the leaderboard table exists and is accessible
      const { error: pingError } = await supabase
        .from('leaderboard')
        .select('count', { count: 'exact', head: true });
      
      if (pingError) {
        console.error('Error connecting to Supabase:', pingError);
        if (pingError.message && pingError.message.includes('does not exist')) {
          console.error('The "leaderboard" table does not exist. Please check your Supabase setup.');
          this._notifyUpdateListeners(null);
          return false;
        }
        throw pingError;
      }
      
      if (DEBUG) console.log('Successfully connected to Supabase');
      
      // Immediately fetch data
      await this.fetchLeaderboard();
      return true;
    } catch (error) {
      console.error('Leaderboard initialization failed:', error);
      this._notifyUpdateListeners(null);
      return false;
    }
  }
  
  /**
   * Fetch leaderboard data from Supabase
   * @param {number} limit - Maximum number of scores to retrieve
   * @returns {Promise<Array>} - Fetched leaderboard entries
   */
  async fetchLeaderboard(limit = config.leaderboard.entriesLimit) {
    if (this.isLoading) {
      if (DEBUG) console.log('Already fetching leaderboard data, skipping duplicate request');
      return this.topScores;
    }
    
    this.isLoading = true;
    
    try {
      if (DEBUG) console.log('Fetching leaderboard data...');
      
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('score', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Error fetching leaderboard:', error);
        this._notifyUpdateListeners([]);
        return [];
      }
      
      console.log(`Fetched ${data.length} leaderboard entries`);
      this.topScores = data;
      
      // Ensure UI gets updated with the new data
      this._notifyUpdateListeners(this.topScores);
      
      return this.topScores;
    } catch (error) {
      console.error('Unexpected error fetching leaderboard:', error);
      this._notifyUpdateListeners([]);
      return [];
    } finally {
      this.isLoading = false;
    }
  }
  
  /**
   * Notify update listeners with new data
   * @private
   * @param {Array|null} data - Leaderboard data or null if error
   */
  _notifyUpdateListeners(data) {
    if (this.onLeaderboardUpdate) {
      console.log(`Notifying listeners with ${data ? data.length : 'null'} scores`);
      try {
        this.onLeaderboardUpdate(data);
      } catch (error) {
        console.error('Error in leaderboard update callback:', error);
      }
    } else {
      console.warn('No leaderboard update listeners registered');
    }
  }
  
  /**
   * Check if a score qualifies for the leaderboard
   * @param {number} score - Score to check
   * @returns {boolean} - Whether the score qualifies
   */
  isScoreQualified(score) {
    // If we don't have enough scores yet, any score qualifies
    if (this.topScores.length < config.leaderboard.entriesLimit) {
      return true;
    }
    
    // Check if score is higher than the lowest score on the leaderboard
    const lowestScore = this.topScores[this.topScores.length - 1].score;
    return score > lowestScore;
  }
  
  /**
   * Submit a new score to the leaderboard
   * @param {string} playerName - Player name
   * @param {number} score - Player score
   * @returns {Promise<boolean>} - Whether submission was successful
   */
  async submitScore(playerName, score) {
    try {
      if (!playerName || score === undefined) {
        console.error('Player name and score are required');
        return false;
      }
      
      console.log(`Checking score for ${playerName}: ${score}`);
      
      // First check if player name already exists
      const { data: existingPlayer, error: searchError } = await supabase
        .from('leaderboard')
        .select('id, score')
        .eq('player_name', playerName)
        .limit(1);
      
      if (searchError) {
        console.error('Error searching for existing player:', searchError);
        return false;
      }
      
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
      
      if (result.error) {
        console.error('Error submitting score:', result.error);
        return false;
      }
      
      // Refresh leaderboard after submitting
      await this.fetchLeaderboard();
      return true;
    } catch (error) {
      console.error('Unexpected error submitting score:', error);
      return false;
    }
  }
  
  /**
   * Get the highest score from the leaderboard
   * @returns {number} The highest score, or 0 if no scores exist
   */
  getTopScore() {
    // If we have scores, return the highest one (which should be the first in the array)
    if (this.topScores && this.topScores.length > 0) {
      return this.topScores[0].score;
    }
    // Return 0 if no scores exist
    return 0;
  }
} 