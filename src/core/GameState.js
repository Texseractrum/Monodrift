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
    }
    
    resetScore() {
        this.score = 0;
        this.driftMultiplier = 1;
        this.driftChainTimer = 0;
        this.gameOver = false;
        this.isFirstGame = false;
    }
    
    addScore(points) {
        // Apply drift multiplier to points
        this.score += points * this.driftMultiplier;
        
        // Update high score if needed
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
        }
    }
    
    updateDriftMultiplier(isDrifting, deltaTime) {
        if (isDrifting) {
            // Reset chain timer while drifting
            this.driftChainTimer = 0;
            
            // Gradually increase multiplier while drifting
            this.driftMultiplier = Math.min(
                this.driftMultiplier + deltaTime * 0.5,
                this.maxDriftMultiplier
            );
        } else {
            // Count down chain timer when not drifting
            this.driftChainTimer += deltaTime;
            
            // Reset multiplier if chain times out
            if (this.driftChainTimer >= this.driftChainTimeout) {
                this.driftMultiplier = 1;
            }
        }
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
} 