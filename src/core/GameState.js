export class GameState {
    constructor() {
        this.score = 0;
        this.highScore = this.loadHighScore();
        this.driftMultiplier = 1;
        this.maxDriftMultiplier = 8;
        this.driftChainTimer = 0;
        this.driftChainTimeout = 1.5; // seconds before drift chain resets
        this.gameOver = false;
        this.isFirstGame = true;
        
        // Timer properties
        this.gameTimeLimit = 30; // 30 second game (was 60)
        this.timeRemaining = this.gameTimeLimit;
        this.isTimerRunning = false;
        
        // Leaderboard service will be set by the game
        this.leaderboardService = null;
        
        // Create custom event for score updates
        this.scoreUpdateEvent = new CustomEvent('scoreUpdate', {
            detail: { score: this.score, multiplier: this.driftMultiplier }
        });
    }
    
    resetScore() {
        this.score = 0;
        this.driftMultiplier = 1;
        this.driftChainTimer = 0;
        this.gameOver = false;
        this.isFirstGame = false;
        
        // Reset timer but don't start it yet
        this.timeRemaining = this.gameTimeLimit;
        this.isTimerRunning = false;
        
        // Notify score update
        this.notifyScoreUpdate();
    }
    
    addScore(points) {
        // Only add score if the timer is still running
        if (this.isTimerRunning) {
            // Apply drift multiplier to points
            this.score += points * this.driftMultiplier;
            
            // Update local high score if needed
            if (this.score > this.highScore) {
                this.highScore = this.score;
                this.saveHighScore();
            }
            
            // Notify score update
            this.notifyScoreUpdate();
        }
    }
    
    // Method to notify score updates via custom event
    notifyScoreUpdate() {
        // Update event data
        this.scoreUpdateEvent.detail.score = this.score;
        this.scoreUpdateEvent.detail.multiplier = this.driftMultiplier;
        
        // Dispatch the event
        document.dispatchEvent(new CustomEvent('scoreUpdate', {
            detail: { 
                score: this.score, 
                multiplier: this.driftMultiplier 
            }
        }));
    }
    
    updateTimer(deltaTime) {
        if (this.isTimerRunning) {
            this.timeRemaining -= deltaTime;
            
            // Check if time is up
            if (this.timeRemaining <= 0) {
                this.timeRemaining = 0;
                this.isTimerRunning = false;
                this.setGameOver();
                
                // If we have a leaderboard service, refresh it first
                if (this.leaderboardService) {
                    // Fetch latest scores before showing game over
                    this.leaderboardService.fetchLeaderboard()
                        .then(() => {
                            this.dispatchGameOverEvent();
                        })
                        .catch(error => {
                            console.error("Failed to fetch leaderboard:", error);
                            this.dispatchGameOverEvent();
                        });
                } else {
                    this.dispatchGameOverEvent();
                }
            }
        }
    }
    
    // Separate method to dispatch the game over event
    dispatchGameOverEvent() {
        // Get the top score from the leaderboard if available
        const leaderboardHighScore = this.leaderboardService ? 
            this.leaderboardService.getTopScore() : 0;
        
        // Use the higher of local high score or leaderboard high score
        const displayHighScore = Math.max(this.highScore, leaderboardHighScore);
        
        // Dispatch event for game over
        const gameOverEvent = new CustomEvent('gameOver', {
            detail: { 
                finalScore: this.score,
                highScore: displayHighScore
            }
        });
        document.dispatchEvent(gameOverEvent);
    }
    
    getFormattedTime() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = Math.floor(this.timeRemaining % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updateDriftMultiplier(isDrifting, deltaTime) {
        let multiplierChanged = false;
        const oldMultiplier = this.driftMultiplier;
        
        if (isDrifting) {
            // Reset chain timer while drifting
            this.driftChainTimer = 0;
            
            // Gradually increase multiplier while drifting
            this.driftMultiplier = Math.min(
                this.driftMultiplier + deltaTime * 0.5,
                this.maxDriftMultiplier
            );
            
            if (this.driftMultiplier !== oldMultiplier) {
                multiplierChanged = true;
            }
        } else {
            // Count down chain timer when not drifting
            this.driftChainTimer += deltaTime;
            
            // Reset multiplier if chain times out
            if (this.driftChainTimer >= this.driftChainTimeout) {
                if (this.driftMultiplier > 1) {
                    this.driftMultiplier = 1;
                    multiplierChanged = true;
                }
            }
        }
        
        // Notify multiplier change
        if (multiplierChanged) {
            this.notifyScoreUpdate();
        }
    }
    
    // Set the leaderboard service reference
    setLeaderboardService(service) {
        this.leaderboardService = service;
    }
    
    loadHighScore() {
        const savedScore = localStorage.getItem('monodrift_highscore');
        return savedScore ? parseInt(savedScore, 10) : 0;
    }
    
    saveHighScore() {
        localStorage.setItem('monodrift_highscore', this.highScore.toString());
    }
    
    setGameOver() {
        this.gameOver = true;
    }
    
    // Add a method to start the timer
    startTimer() {
        this.isTimerRunning = true;
        console.log("Timer started, game begins!");
    }
} 