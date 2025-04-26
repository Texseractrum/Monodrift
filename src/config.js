/**
 * Global configuration settings for the Monodrift game
 */

const config = {
  // Supabase configuration - replace with your own values from Supabase dashboard
  supabase: {
    url: 'https://yriclxpnclvimxsvvvaf.supabase.co', 
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyaWNseHBuY2x2aW14c3Z2dmFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTY2NDE4NCwiZXhwIjoyMDYxMjQwMTg0fQ.qUUFqXoX00O--kiVAzhjev7a3eqoncY3xfPEGYP4va0'
  },
  
  // Leaderboard settings
  leaderboard: {
    entriesLimit: 10,
    minScoreThreshold: 50
  },
  
  // Game settings
  game: {
    debugMode: true  // Set to true to see detailed connection logs
  }
};

export default config; 