import { createClient } from '@supabase/supabase-js';
import config from '../config.js';

export class LeaderboardUI {
  constructor(leaderboardService) {
    this.leaderboardService = leaderboardService;
    this.isVisible = false;
    this.container = null;
    this.leaderboardElement = null;
    this.miniLeaderboardContainer = null;
    
    // Bind the update method to this instance
    this.updateLeaderboard = this.updateLeaderboard.bind(this);
    
    // Set the update callback
    this.leaderboardService.onLeaderboardUpdate = this.updateLeaderboard;
    
    // Initialize the mini-leaderboard immediately
    this.initMiniLeaderboard();
  }
  
  initialize() {
    // Create main container
    this.container = document.createElement('div');
    this.container.id = 'leaderboard-container';
    this.container.style.position = 'absolute';
    this.container.style.top = '50%';
    this.container.style.left = '50%';
    this.container.style.transform = 'translate(-50%, -50%)';
    this.container.style.width = '80%';
    this.container.style.maxWidth = '500px';
    this.container.style.maxHeight = '80vh';
    this.container.style.background = 'rgba(0, 0, 0, 0.85)';
    this.container.style.borderRadius = '10px';
    this.container.style.padding = '20px';
    this.container.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
    this.container.style.color = '#fff';
    this.container.style.fontFamily = "'Courier New', monospace";
    this.container.style.zIndex = '1001';
    this.container.style.display = 'none';
    this.container.style.flexDirection = 'column';
    this.container.style.overflow = 'hidden';
    
    // Create header
    const header = document.createElement('h2');
    header.textContent = 'LEADERBOARD';
    header.style.textAlign = 'center';
    header.style.margin = '0 0 20px 0';
    header.style.color = '#ffcc00';
    header.style.textTransform = 'uppercase';
    header.style.letterSpacing = '2px';
    
    // Create close button
    const closeButton = document.createElement('div');
    closeButton.textContent = '×';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '15px';
    closeButton.style.fontSize = '24px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.color = '#aaa';
    closeButton.style.transition = 'color 0.2s';
    closeButton.addEventListener('mouseover', () => closeButton.style.color = '#fff');
    closeButton.addEventListener('mouseout', () => closeButton.style.color = '#aaa');
    closeButton.addEventListener('click', () => this.hide());
    
    // Create leaderboard table container
    const tableContainer = document.createElement('div');
    tableContainer.style.overflowY = 'auto';
    tableContainer.style.maxHeight = 'calc(80vh - 180px)';
    tableContainer.style.marginBottom = '20px';
    
    // Create leaderboard table
    this.leaderboardElement = document.createElement('table');
    this.leaderboardElement.style.width = '100%';
    this.leaderboardElement.style.borderCollapse = 'collapse';
    this.leaderboardElement.style.color = '#fff';
    
    // Create table header
    const tableHeader = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const headers = ['RANK', 'PLAYER', 'SCORE', 'DATE'];
    headers.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      th.style.padding = '10px';
      th.style.textAlign = 'left';
      th.style.borderBottom = '2px solid #444';
      headerRow.appendChild(th);
    });
    
    tableHeader.appendChild(headerRow);
    this.leaderboardElement.appendChild(tableHeader);
    
    // Create table body
    const tableBody = document.createElement('tbody');
    this.leaderboardElement.appendChild(tableBody);
    
    tableContainer.appendChild(this.leaderboardElement);
    
    // Add a note about automatic score submission
    const autoSubmitNote = document.createElement('div');
    autoSubmitNote.style.textAlign = 'center';
    autoSubmitNote.style.color = '#aaa';
    autoSubmitNote.style.fontSize = '14px';
    autoSubmitNote.style.marginTop = '10px';
    autoSubmitNote.textContent = 'Scores are automatically submitted when the game ends';
    
    // Assemble the UI
    this.container.appendChild(header);
    this.container.appendChild(closeButton);
    this.container.appendChild(tableContainer);
    this.container.appendChild(autoSubmitNote);
    
    // Add to the DOM
    document.body.appendChild(this.container);
    
    return this;
  }
  
  initMiniLeaderboard() {
    // Create mini leaderboard container
    this.miniLeaderboardContainer = document.createElement('div');
    this.miniLeaderboardContainer.id = 'mini-leaderboard';
    this.miniLeaderboardContainer.style.position = 'absolute';
    this.miniLeaderboardContainer.style.top = '70px';
    this.miniLeaderboardContainer.style.left = '20px';
    this.miniLeaderboardContainer.style.width = '220px';
    this.miniLeaderboardContainer.style.background = 'rgba(0, 0, 0, 0.75)';
    this.miniLeaderboardContainer.style.borderRadius = '10px';
    this.miniLeaderboardContainer.style.padding = '12px';
    this.miniLeaderboardContainer.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.3)';
    this.miniLeaderboardContainer.style.color = '#fff';
    this.miniLeaderboardContainer.style.fontFamily = "'Courier New', monospace";
    this.miniLeaderboardContainer.style.fontSize = '14px';
    this.miniLeaderboardContainer.style.zIndex = '101';
    this.miniLeaderboardContainer.style.backdropFilter = 'blur(5px)';
    this.miniLeaderboardContainer.style.transition = 'all 0.3s ease';
    
    // Responsive positioning for mobile
    this.adjustMiniLeaderboardForMobile();
    window.addEventListener('resize', () => this.adjustMiniLeaderboardForMobile());
    
    // Create header with refresh indicator
    const header = document.createElement('div');
    header.textContent = 'TOP SCORES';
    header.style.textAlign = 'center';
    header.style.color = '#ffcc00';
    header.style.fontWeight = 'bold';
    header.style.marginBottom = '8px';
    header.style.fontSize = '16px';
    header.style.position = 'relative';
    
    // Add refresh button
    const refreshButton = document.createElement('div');
    refreshButton.innerHTML = '↻';
    refreshButton.style.position = 'absolute';
    refreshButton.style.right = '0';
    refreshButton.style.top = '0';
    refreshButton.style.fontSize = '14px';
    refreshButton.style.cursor = 'pointer';
    refreshButton.style.opacity = '0.7';
    refreshButton.style.transition = 'transform 0.3s, opacity 0.3s';
    refreshButton.title = 'Refresh leaderboard';
    
    refreshButton.addEventListener('mouseover', () => {
      refreshButton.style.opacity = '1';
      refreshButton.style.transform = 'rotate(30deg)';
    });
    
    refreshButton.addEventListener('mouseout', () => {
      refreshButton.style.opacity = '0.7';
      refreshButton.style.transform = 'rotate(0deg)';
    });
    
    refreshButton.addEventListener('click', () => {
      this.refreshLeaderboard();
      refreshButton.style.transform = 'rotate(360deg)';
      setTimeout(() => {
        refreshButton.style.transform = 'rotate(0deg)';
      }, 500);
    });
    
    header.appendChild(refreshButton);
    
    // Create scores container
    const scoresContainerElement = document.createElement('div');
    scoresContainerElement.id = 'mini-scores';
    
    // Assemble mini leaderboard
    this.miniLeaderboardContainer.appendChild(header);
    this.miniLeaderboardContainer.appendChild(scoresContainerElement);
    
    // Add to DOM
    document.body.appendChild(this.miniLeaderboardContainer);
    
    // Initial loading state - data will come via callback
    if (scoresContainerElement) {
      scoresContainerElement.innerHTML = '<div style="text-align: center; padding: 10px; color: #aaa;">Loading...</div>';
    }
    
    // Set up periodic refresh (every 30 seconds)
    this.startPeriodicRefresh();
  }
  
  adjustMiniLeaderboardForMobile() {
    if (!this.miniLeaderboardContainer) return;
    
    // Check if we're on a mobile/small screen
    if (window.innerWidth < 768) {
      // Mobile positioning - smaller and in top left 
      this.miniLeaderboardContainer.style.width = '180px';
      this.miniLeaderboardContainer.style.fontSize = '12px';
      this.miniLeaderboardContainer.style.top = '10px';
      this.miniLeaderboardContainer.style.left = '10px';
      this.miniLeaderboardContainer.style.padding = '8px';
      
      // Find and adjust the header
      const header = this.miniLeaderboardContainer.querySelector('div:first-child');
      if (header) header.style.fontSize = '14px';
    } else {
      // Desktop positioning
      this.miniLeaderboardContainer.style.width = '220px';
      this.miniLeaderboardContainer.style.fontSize = '14px';
      this.miniLeaderboardContainer.style.top = '70px';
      this.miniLeaderboardContainer.style.left = '20px';
      this.miniLeaderboardContainer.style.padding = '12px';
      
      // Find and adjust the header
      const header = this.miniLeaderboardContainer.querySelector('div:first-child');
      if (header) header.style.fontSize = '16px';
    }
  }
  
  updateMiniLeaderboard(scores) {
    const scoresContainerElement = document.getElementById('mini-scores');
    if (!scoresContainerElement) return;
    
    scoresContainerElement.innerHTML = ''; // Clear previous state (loading or error)

    if (!scores) {
        // Handle case where service might have failed initialization
        scoresContainerElement.innerHTML = `
            <div style="text-align: center; padding: 5px; color: #ff5555;">
                Load Error
                <div style="font-size: 11px; margin-top: 3px;">Check Console</div>
            </div>
            <button onclick="window.location.reload()" style="width: 100%; padding: 5px; margin-top: 5px; background: #333; color: #fff; border: 1px solid #555; border-radius: 3px; cursor: pointer;">
                Refresh Page
            </button>
        `;
        return;
    }
    
    // Show top 5 scores or "No scores yet" message
    const topScores = scores.slice(0, 5);
    
    if (topScores.length === 0) {
        const noScoresMsg = document.createElement('div');
        noScoresMsg.textContent = 'No scores yet';
        noScoresMsg.style.textAlign = 'center';
        noScoresMsg.style.color = '#aaa';
        noScoresMsg.style.padding = '5px';
        scoresContainerElement.appendChild(noScoresMsg);
    } else {
        topScores.forEach((score, index) => {
            const scoreRow = document.createElement('div');
            scoreRow.style.display = 'flex';
            scoreRow.style.justifyContent = 'space-between';
            scoreRow.style.padding = '4px 0';
            scoreRow.style.borderBottom = index < topScores.length - 1 ? '1px solid #333' : 'none';
            
            // Rank & player name
            const nameSpan = document.createElement('div');
            nameSpan.textContent = `${index + 1}. ${score.player_name}`;
            nameSpan.style.overflow = 'hidden';
            nameSpan.style.textOverflow = 'ellipsis';
            nameSpan.style.whiteSpace = 'nowrap';
            nameSpan.style.maxWidth = '140px';
            
            // Score
            const scoreSpan = document.createElement('div');
            scoreSpan.textContent = score.score.toLocaleString();
            scoreSpan.style.fontWeight = 'bold';
            
            // Highlight top 3
            if (index < 3) {
                nameSpan.style.color = ['#ffcc00', '#cccccc', '#cd7f32'][index];
                scoreSpan.style.color = ['#ffcc00', '#cccccc', '#cd7f32'][index];
            }
            
            scoreRow.appendChild(nameSpan);
            scoreRow.appendChild(scoreSpan);
            scoresContainerElement.appendChild(scoreRow);
        });
    }
  }
  
  updateLeaderboard(scores) {
    if (!this.leaderboardElement) return;
    
    // Update the mini leaderboard
    this.updateMiniLeaderboard(scores);
    
    // Clear existing rows in main leaderboard
    const tbody = this.leaderboardElement.querySelector('tbody');
    tbody.innerHTML = '';
    
    // Add new rows
    scores.forEach((score, index) => {
      const row = document.createElement('tr');
      
      // Rank cell
      const rankCell = document.createElement('td');
      rankCell.textContent = `${index + 1}`;
      rankCell.style.padding = '8px 10px';
      rankCell.style.borderBottom = '1px solid #333';
      
      // Player name cell
      const nameCell = document.createElement('td');
      nameCell.textContent = score.player_name;
      nameCell.style.padding = '8px 10px';
      nameCell.style.borderBottom = '1px solid #333';
      
      // Score cell
      const scoreCell = document.createElement('td');
      scoreCell.textContent = score.score.toLocaleString();
      scoreCell.style.padding = '8px 10px';
      scoreCell.style.borderBottom = '1px solid #333';
      
      // Date cell
      const dateCell = document.createElement('td');
      const date = new Date(score.created_at);
      dateCell.textContent = `${date.toLocaleDateString()}`;
      dateCell.style.padding = '8px 10px';
      dateCell.style.borderBottom = '1px solid #333';
      
      // Highlight top 3
      if (index < 3) {
        row.style.color = ['#ffcc00', '#cccccc', '#cd7f32'][index];
        row.style.fontWeight = 'bold';
      }
      
      row.appendChild(rankCell);
      row.appendChild(nameCell);
      row.appendChild(scoreCell);
      row.appendChild(dateCell);
      
      tbody.appendChild(row);
    });
    
    // If no scores yet, show message
    if (scores.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 4;
      cell.textContent = 'No scores yet. Be the first!';
      cell.style.padding = '20px';
      cell.style.textAlign = 'center';
      row.appendChild(cell);
      tbody.appendChild(row);
    }
  }
  
  startPeriodicRefresh(interval = 30000) {
    // Clear any existing refresh interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    // Set up new refresh interval
    this.refreshInterval = setInterval(() => {
      console.log("Periodic leaderboard refresh");
      this.refreshLeaderboard();
    }, interval);
  }
  
  refreshLeaderboard(isInitialLoad = false) {
    const scoresContainerElement = document.getElementById('mini-scores');
    if (scoresContainerElement && !isInitialLoad) {
      scoresContainerElement.innerHTML = '<div style="text-align: center; padding: 10px; color: #aaa;">Loading...</div>';
    }
    
    // Fetch new data
    return this.leaderboardService.fetchLeaderboard()
      .then(data => {
        console.log("Leaderboard refreshed, entries:", data.length);
        return data;
      })
      .catch(err => {
        console.error("Failed to refresh leaderboard:", err);
        if (scoresContainerElement) {
          scoresContainerElement.innerHTML = '<div style="text-align: center; padding: 10px; color: #f55;">Error loading data</div>';
        }
        throw err;
      });
  }
  
  show() {
    if (!this.container) this.initialize();
    this.container.style.display = 'flex';
    this.isVisible = true;
    
    // Refresh leaderboard data
    this.refreshLeaderboard();
    
    return this;
  }
  
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
      this.isVisible = false;
    }
    return this;
  }
  
  toggle() {
    return this.isVisible ? this.hide() : this.show();
  }
} 