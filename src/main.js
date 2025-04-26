import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Car } from './entities/Car.js';
import { City } from './entities/City.js';
import { InputHandler } from './core/InputHandler.js';
import { Physics } from './core/Physics.js';
import { GameState } from './core/GameState.js';
import { LeaderboardService } from './services/LeaderboardService.js';
import { LeaderboardUI } from './ui/LeaderboardUI.js';
import config from './config.js';

class Game {
    constructor() {
        this.scene = new THREE.Scene();
        // Set background color to dark gray instead of pure black
        this.scene.background = new THREE.Color(0x111111);
        
        // Detect if we're on mobile for camera adjustments
        this.isMobileDevice = this.detectMobileDevice();
        console.log("Mobile device detected:", this.isMobileDevice);
        
        this.camera = this.setupCamera();
        this.renderer = this.setupRenderer();
        this.controls = this.setupControls();
        
        this.gameState = new GameState();
        this.inputHandler = new InputHandler();
        this.physics = new Physics();
        
        // Create leaderboard service and UI immediately
        this.leaderboardService = new LeaderboardService();
        this.leaderboardUI = new LeaderboardUI(this.leaderboardService);
        
        // Connect leaderboard service to game state
        this.gameState.setLeaderboardService(this.leaderboardService);
        
        // Initialize the leaderboard service asynchronously
        // This will handle fetching data with retries.
        // The UI will update via the callback when data arrives.
        this.leaderboardService.initialize()
            .then(success => {
                if (success) {
                    console.log("Leaderboard initialized successfully");
                    // Force a refresh to make sure UI gets updated
                    this.leaderboardUI.refreshLeaderboard();
                } else {
                    console.warn("Leaderboard initialization completed with issues");
                }
            })
            .catch(error => {
                console.error("Leaderboard initialization failed:", error);
                // UI will show loading/error state based on the callback
            });
        
        this.setupLighting();
        this.setupModernUI();
        
        // Create physics first
        this.city = new City(this.scene);
        // Then create car
        this.car = new Car(this.scene, this.physics);
        
        // Set the camera reference for the car
        this.car.camera = this.camera;
        // Set GameState reference for score updates
        this.car.gameState = this.gameState;
        
        this.lastTime = 0;
        this.isRunning = false;
        
        // Player name
        this.playerName = "";
        
        // Camera movement smoothing
        this.targetCameraPosition = new THREE.Vector3();
        this.targetLookAt = new THREE.Vector3();
        this.cameraLerpFactor = 0.05; // Slow camera follow
        this.lookAtLerpFactor = 0.1; // Smoother look-at update
        this.cameraOffset = new THREE.Vector3(0, 8, 12); // Default offset
        
        // Camera during spinouts
        this.spinCameraHeight = 12; // Higher camera during spins
        this.regularCameraHeight = 8; // Normal camera height
        this.spinCameraDistance = 18; // Further back during spins
        this.regularCameraDistance = 12; // Normal camera distance
        this.spinTransitionSpeed = 0.1; // How quickly to transition to spin camera
        
        // For mobile frame rate control
        this.lastFrameTime = 0;
        this.targetFPS = this.isMobileDevice ? 30 : 60; // Lower target FPS on mobile
        this.frameInterval = 1000 / this.targetFPS;
        
        this.setupEventListeners();
        
        // Debug axes helper
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);
        
        this.animate();
        
        // Start with orbit controls disabled by default
        this.controls.enabled = false;
        
        // Start with camera positioned behind the car
        this.updateCameraPosition(true);
        
        // Show player name prompt instead of auto-starting
        setTimeout(() => this.showPlayerNamePrompt(), 1000);
    }
    
    setupCamera() {
        // Use perspective camera for better 3D view of the car
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspectRatio = width / height;
        
        const camera = new THREE.PerspectiveCamera(
            60, // Field of view
            aspectRatio,
            0.1,
            1000
        );
        
        // Position camera behind and above car
        camera.position.set(0, 10, 20);
        camera.lookAt(0, 0, 0);
        
        return camera;
    }
    
    setupRenderer() {
        const renderer = new THREE.WebGLRenderer({ 
            antialias: !this.isMobileDevice, // Disable antialiasing on mobile for better performance
            alpha: true 
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000);
        
        // Enable shadows with appropriate settings for device type
        renderer.shadowMap.enabled = true;
        
        // Use simpler shadow map type on mobile for better performance
        if (this.isMobileDevice) {
            renderer.shadowMap.type = THREE.BasicShadowMap;
            // Reduce shadow map size on mobile
            renderer.shadowMapSize = 1024;
        } else {
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }
        
        document.body.appendChild(renderer.domElement);
        return renderer;
    }
    
    setupControls() {
        const controls = new OrbitControls(this.camera, this.renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enableRotate = true;
        controls.enableZoom = true;
        controls.enabled = false; // Disable by default to allow car following
        return controls;
    }
    
    setupLighting() {
        // Main ambient light - brighter
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);
        
        // Directional light for shadows - position from above
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(5, 15, 5);
        dirLight.castShadow = true;
        
        // Improve shadow quality
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 50;
        dirLight.shadow.camera.left = -20;
        dirLight.shadow.camera.right = 20;
        dirLight.shadow.camera.top = 20;
        dirLight.shadow.camera.bottom = -20;
        
        this.scene.add(dirLight);
        
        // Add a spotlight to focus on the car
        const spotLight = new THREE.SpotLight(0xffffff, 1);
        spotLight.position.set(0, 10, 0);
        spotLight.angle = Math.PI / 4;
        spotLight.penumbra = 0.1;
        spotLight.decay = 2;
        spotLight.distance = 50;
        spotLight.castShadow = true;
        this.scene.add(spotLight);
        
        // Spotlight follows the car
        this.spotLight = spotLight;
    }
    
    setupModernUI() {
        // Create the modern UI container
        const uiContainer = document.createElement('div');
        uiContainer.id = 'ui-container';
        uiContainer.style.position = 'absolute';
        uiContainer.style.top = '0';
        uiContainer.style.left = '0';
        uiContainer.style.width = '100%';
        uiContainer.style.height = '100%';
        uiContainer.style.pointerEvents = 'none';
        uiContainer.style.zIndex = '100';
        uiContainer.style.fontFamily = 'Arial, sans-serif';
        
        // Create the top HUD
        const topHUD = document.createElement('div');
        topHUD.id = 'top-hud';
        topHUD.style.position = 'absolute';
        topHUD.style.top = '20px';
        topHUD.style.left = '0';
        topHUD.style.width = '100%';
        topHUD.style.display = 'flex';
        topHUD.style.justifyContent = 'center';
        topHUD.style.alignItems = 'center';
        
        // Create score display
        const scoreContainer = document.createElement('div');
        scoreContainer.id = 'score-container';
        scoreContainer.style.background = 'rgba(0, 0, 0, 0.6)';
        scoreContainer.style.borderRadius = '10px';
        scoreContainer.style.padding = '10px 20px';
        scoreContainer.style.backdropFilter = 'blur(5px)';
        scoreContainer.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.3)';
        
        // Create score element
        const scoreElement = document.createElement('div');
        scoreElement.id = 'score';
        scoreElement.style.color = '#fff';
        scoreElement.style.fontSize = '24px';
        scoreElement.style.fontWeight = 'bold';
        scoreElement.style.textShadow = '0 0 5px rgba(255, 255, 255, 0.5)';
        scoreElement.textContent = 'SCORE: 0';
        
        // Create timer element
        const timerElement = document.createElement('div');
        timerElement.id = 'timer';
        timerElement.style.color = '#fff';
        timerElement.style.fontSize = '24px';
        timerElement.style.fontWeight = 'bold';
        timerElement.style.textShadow = '0 0 5px rgba(255, 255, 255, 0.5)';
        timerElement.style.marginLeft = '20px';
        timerElement.textContent = 'TIME: 1:00';
        
        scoreContainer.appendChild(scoreElement);
        scoreContainer.appendChild(timerElement);
        topHUD.appendChild(scoreContainer);
        
        // Add leaderboard button
        const leaderboardButton = document.createElement('div');
        leaderboardButton.id = 'leaderboard-button';
        leaderboardButton.textContent = 'LEADERBOARD';
        leaderboardButton.style.position = 'absolute';
        leaderboardButton.style.top = '20px';
        leaderboardButton.style.right = '20px';
        leaderboardButton.style.background = 'rgba(0, 0, 0, 0.6)';
        leaderboardButton.style.color = '#fff';
        leaderboardButton.style.padding = '10px 15px';
        leaderboardButton.style.borderRadius = '5px';
        leaderboardButton.style.cursor = 'pointer';
        leaderboardButton.style.pointerEvents = 'all';
        leaderboardButton.style.fontWeight = 'bold';
        leaderboardButton.style.fontSize = '14px';
        leaderboardButton.style.letterSpacing = '1px';
        leaderboardButton.style.textTransform = 'uppercase';
        leaderboardButton.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.3)';
        leaderboardButton.addEventListener('click', () => {
            this.leaderboardUI.toggle();
        });
        
        // Create the bottom HUD for nitro
        const bottomHUD = document.createElement('div');
        bottomHUD.id = 'bottom-hud';
        bottomHUD.style.position = 'absolute';
        bottomHUD.style.bottom = '30px';
        bottomHUD.style.left = '0';
        bottomHUD.style.width = '100%';
        bottomHUD.style.display = 'flex';
        bottomHUD.style.justifyContent = 'center';
        bottomHUD.style.alignItems = 'center';
        
        // Create nitro container
        const nitroContainer = document.createElement('div');
        nitroContainer.id = 'nitro-container';
        nitroContainer.style.background = 'rgba(0, 0, 0, 0.6)';
        nitroContainer.style.borderRadius = '10px';
        nitroContainer.style.padding = '10px';
        nitroContainer.style.width = '300px';
        nitroContainer.style.backdropFilter = 'blur(5px)';
        nitroContainer.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.3)';
        
        // Create nitro label
        const nitroLabel = document.createElement('div');
        nitroLabel.style.color = '#fff';
        nitroLabel.style.fontSize = '14px';
        nitroLabel.style.marginBottom = '5px';
        nitroLabel.style.textAlign = 'center';
        nitroLabel.style.textTransform = 'uppercase';
        nitroLabel.style.letterSpacing = '2px';
        nitroLabel.textContent = 'NITRO [SHIFT]';
        
        // Create nitro bar background
        const nitroBarBg = document.createElement('div');
        nitroBarBg.style.background = 'rgba(255, 255, 255, 0.2)';
        nitroBarBg.style.borderRadius = '5px';
        nitroBarBg.style.height = '15px';
        nitroBarBg.style.overflow = 'hidden';
        nitroBarBg.style.position = 'relative';
        
        // Create nitro bar fill
        const nitroBarFill = document.createElement('div');
        nitroBarFill.id = 'nitro-fill';
        nitroBarFill.style.background = 'linear-gradient(90deg, #0af, #08f, #00f)';
        nitroBarFill.style.height = '100%';
        nitroBarFill.style.width = '100%';
        nitroBarFill.style.borderRadius = '5px';
        nitroBarFill.style.transition = 'width 0.1s';
        
        // Assemble nitro elements
        nitroBarBg.appendChild(nitroBarFill);
        nitroContainer.appendChild(nitroLabel);
        nitroContainer.appendChild(nitroBarBg);
        
        // Add instructions for controls
        const controlsContainer = document.createElement('div');
        controlsContainer.id = 'controls-container';
        controlsContainer.style.position = 'absolute';
        controlsContainer.style.bottom = '120px';
        controlsContainer.style.right = '30px';
        controlsContainer.style.background = 'rgba(0, 0, 0, 0.6)';
        controlsContainer.style.borderRadius = '10px';
        controlsContainer.style.padding = '15px';
        controlsContainer.style.backdropFilter = 'blur(5px)';
        controlsContainer.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.3)';
        controlsContainer.style.color = '#fff';
        controlsContainer.style.fontSize = '14px';
        controlsContainer.style.lineHeight = '1.5';
        controlsContainer.style.opacity = '0.7';
        controlsContainer.style.transition = 'opacity 0.3s';
        
        // Show controls on hover
        controlsContainer.onmouseover = () => { controlsContainer.style.opacity = '1'; };
        controlsContainer.onmouseout = () => { controlsContainer.style.opacity = '0.7'; };
        
        // Add control instructions
        controlsContainer.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">CONTROLS</div>
            <div>WASD / Arrows: Drive</div>
            <div>SPACE: Drift</div>
            <div>SHIFT: Nitro Boost</div>
            <div>R: Restart</div>
        `;
        
        // Add all UI elements to container
        bottomHUD.appendChild(nitroContainer);
        uiContainer.appendChild(topHUD);
        uiContainer.appendChild(bottomHUD);
        uiContainer.appendChild(controlsContainer);
        
        // Remove existing score element if present
        const oldScore = document.getElementById('score');
        if (oldScore) {
            oldScore.parentNode.removeChild(oldScore);
        }
        
        // Remove console element if it exists
        const consoleElement = document.querySelector('.console');
        if (consoleElement) {
            consoleElement.parentNode.removeChild(consoleElement);
        }
        
        // Add the UI container to the document
        document.body.appendChild(uiContainer);
        
        // Add event listeners for drift scoring
        document.addEventListener('driftScore', (event) => {
            const { points, total } = event.detail;
            
            // Update score
            const scoreElement = document.getElementById('score');
            if (scoreElement) {
                scoreElement.textContent = `SCORE: ${Math.floor(total)}`;
                
                // Add animation effect
                scoreElement.style.transform = 'scale(1.2)';
                scoreElement.style.color = '#ffcc00';
                
                setTimeout(() => {
                    scoreElement.style.transform = 'scale(1)';
                    scoreElement.style.color = '#fff';
                }, 300);
            }
            
            // Create floating score popup
            if (points > 10) {
                const popup = document.createElement('div');
                popup.className = 'score-popup';
                popup.style.position = 'absolute';
                popup.style.color = '#ffcc00';
                popup.style.fontSize = '28px';
                popup.style.fontWeight = 'bold';
                popup.style.textShadow = '0 0 10px rgba(255, 150, 0, 0.8)';
                popup.style.pointerEvents = 'none';
                popup.style.transition = 'transform 0.5s ease-out, opacity 0.5s ease-out';
                popup.style.opacity = '1';
                popup.style.zIndex = '200';
                popup.textContent = `+${points}`;
                
                // Position near the top of the screen
                popup.style.top = '100px';
                popup.style.left = '50%';
                popup.style.transform = 'translateX(-50%)';
                
                document.body.appendChild(popup);
                
                // Animate and remove
                setTimeout(() => {
                    popup.style.transform = 'translateX(-50%) translateY(-50px)';
                    popup.style.opacity = '0';
                }, 100);
                
                setTimeout(() => {
                    if (popup.parentNode) {
                        document.body.removeChild(popup);
                    }
                }, 1000);
            }
        });
    }
    
    setupEventListeners() {
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        window.addEventListener('click', () => {
            if (!this.isRunning) {
                this.startGame();
            }
        });
        
        // Set up input handlers for the car controls
        this.inputHandler.setupListeners();
        
        // Add key listener to toggle orbit controls for debugging
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyO') {
                this.controls.enabled = !this.controls.enabled;
                console.log(`OrbitControls ${this.controls.enabled ? 'enabled' : 'disabled'}`);
                
                // Reset camera position when switching back to follow mode
                if (!this.controls.enabled) {
                    this.updateCameraPosition(true);
                }
            }
            
            // Toggle leaderboard with 'L' key
            if (e.code === 'KeyL') {
                this.leaderboardUI.toggle();
            }
        });
        
        // Add drift score event listener
        document.addEventListener('driftScore', async (event) => {
            const { points, total } = event.detail;
            
            // No need to check for leaderboard qualification since we'll auto-submit at the end
        });
        
        // Listen for the custom toggleLeaderboard event from mobile controls
        document.addEventListener('toggleLeaderboard', () => {
            this.leaderboardUI.toggle();
        });
        
        // Add game over event listener
        document.addEventListener('gameOver', (event) => {
            const { finalScore, highScore } = event.detail;
            
            // Show game over message
            this.showGameOverMessage(finalScore, highScore);
            
            // Automatically submit score to leaderboard
            if (this.playerName && finalScore > 0) {
                console.log(`Auto-submitting score: ${finalScore} for player: ${this.playerName}`);
                this.leaderboardService.submitScore(this.playerName, finalScore)
                    .then(success => {
                        if (success) {
                            console.log("Score submitted successfully");
                            
                            // Show leaderboard after a short delay
                            setTimeout(() => {
                                this.leaderboardUI.show();
                            }, 2000);
                        } else {
                            console.error("Failed to submit score");
                        }
                    });
            }
        });
        
        // Listen for score updates
        document.addEventListener('scoreUpdate', (event) => {
            const { score, multiplier } = event.detail;
            
            // Update score display
            const scoreElement = document.getElementById('score');
            if (scoreElement) {
                // For smoother experience, don't show temporary scores below current displayed value
                const currentDisplayed = parseInt(scoreElement.textContent.replace('SCORE: ', '')) || 0;
                if (score > currentDisplayed) {
                    scoreElement.textContent = `SCORE: ${Math.floor(score)}`;
                    
                    // Add brief animation effect
                    scoreElement.style.transform = 'scale(1.1)';
                    scoreElement.style.color = '#ffcc00';
                    
                    setTimeout(() => {
                        scoreElement.style.transform = 'scale(1)';
                        scoreElement.style.color = '#fff';
                    }, 150);
                }
            }
            
            // Show multiplier if greater than 1
            if (multiplier > 1) {
                const multiplierText = document.getElementById('multiplier');
                
                if (!multiplierText) {
                    // Create multiplier element if it doesn't exist
                    const newMultiplier = document.createElement('div');
                    newMultiplier.id = 'multiplier';
                    newMultiplier.style.color = '#ffcc00';
                    newMultiplier.style.fontSize = '18px';
                    newMultiplier.style.fontWeight = 'bold';
                    newMultiplier.style.textAlign = 'center';
                    newMultiplier.style.marginTop = '5px';
                    
                    // Add to score container
                    const scoreContainer = document.getElementById('score-container');
                    if (scoreContainer) {
                        scoreContainer.appendChild(newMultiplier);
                    }
                }
                
                const multiplierDisplay = document.getElementById('multiplier');
                if (multiplierDisplay) {
                    multiplierDisplay.textContent = `MULTIPLIER: x${multiplier.toFixed(1)}`;
                    multiplierDisplay.style.display = 'block';
                }
            } else {
                // Hide multiplier when it's 1
                const multiplierDisplay = document.getElementById('multiplier');
                if (multiplierDisplay) {
                    multiplierDisplay.style.display = 'none';
                }
            }
        });
    }
    
    startGame() {
        this.isRunning = true;
        this.gameState.resetScore();
        document.getElementById('instructions').style.display = 'none';
        
        // Start the timer immediately
        this.gameState.startTimer();
        this.showGoMessage();
    }
    
    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        if (this.camera.isPerspectiveCamera) {
            this.camera.aspect = width / height;
        } else {
            // For orthographic camera
            const aspectRatio = width / height;
            const frustumSize = 20;
            
            this.camera.left = frustumSize * aspectRatio / -2;
            this.camera.right = frustumSize * aspectRatio / 2;
            this.camera.top = frustumSize / 2;
            this.camera.bottom = frustumSize / -2;
        }
        
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    updateCameraPosition(resetPosition = false) {
        if (!this.car || !this.car.mesh) return;
        
        // Check if car is in a spinout
        const isSpinning = this.car.isInSpinout ? this.car.isInSpinout() : false;
        const spinRate = this.car.getSpinRate ? this.car.getSpinRate() : 0;
        
        // Calculate the car's current velocity direction as a normalized vector
        const carVelocity = this.car.velocityVector.clone().normalize();
        
        // Get car's forward direction
        const carForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.car.mesh.quaternion);
        
        // Calculate dot product to determine if we're going forward or backward
        const dotProduct = carForward.dot(carVelocity);
        const isMovingForward = dotProduct > 0;
        
        // Use velocity for direction if speed is significant, otherwise use car direction
        const significantSpeed = Math.abs(this.car.velocity) > 2;
        const useDirection = significantSpeed ? carVelocity : carForward;
        
        // Use simpler camera logic for mobile
        if (this.isMobileDevice) {
            // Less smoothing on mobile for more responsive feel
            if (!this.lastDirection) {
                this.lastDirection = useDirection.clone();
            } else {
                // More direct camera following for mobile
                const mobileTurnSmoothness = isSpinning ? 0.8 : 0.7;
                this.lastDirection.lerp(useDirection, 1 - mobileTurnSmoothness);
                this.lastDirection.normalize();
            }
        } else {
            // Desktop smoothing
            if (!this.lastDirection) {
                this.lastDirection = useDirection.clone();
            } else {
                // Adjust smoothness based on spin state
                let turnSmoothness;
                
                if (isSpinning) {
                    // During spins, make camera follow more loosely
                    turnSmoothness = 0.97;
                } else {
                    // Normal smoothness calculation
                    turnSmoothness = 0.92 - (Math.abs(this.car.velocity) / this.car.maxSpeed) * 0.3;
                }
                
                this.lastDirection.lerp(useDirection, 1 - turnSmoothness);
                this.lastDirection.normalize();
            }
        }
        
        // Use the smoothed direction for camera positioning
        const direction = this.lastDirection.clone();
        
        // Use different camera settings for mobile
        let targetHeight, targetDistance;
        
        if (this.isMobileDevice) {
            // Higher camera position for better visibility on small screens
            targetHeight = isSpinning ? 10 : 9;
            targetDistance = isSpinning ? 15 : 13;
        } else {
            // Standard desktop settings
            targetHeight = isSpinning 
                ? this.spinCameraHeight + (spinRate * 0.5) // Higher camera during intense spins
                : this.regularCameraHeight;
            
            targetDistance = isSpinning
                ? this.spinCameraDistance + (spinRate * 0.8) // Further back during intense spins
                : this.regularCameraDistance;
        }
        
        // Smoothly transition camera parameters
        // Less smoothing on mobile for faster response
        const heightLerpFactor = this.isMobileDevice ? 0.2 : 0.05;
        const distanceLerpFactor = this.isMobileDevice ? 0.2 : (isSpinning ? this.spinTransitionSpeed : 0.05);
        
        this.cameraOffset.y = THREE.MathUtils.lerp(
            this.cameraOffset.y, 
            targetHeight, 
            heightLerpFactor
        );
        
        this.cameraOffset.z = THREE.MathUtils.lerp(
            this.cameraOffset.z, 
            targetDistance, 
            distanceLerpFactor
        );
        
        // Position camera behind car based on direction
        const cameraOffset = this.cameraOffset.clone();
        
        // Reverse offset if driving backward (but not during spins)
        if (!isMovingForward && significantSpeed && !isSpinning) {
            cameraOffset.z *= -1;
        }
        
        // Apply offset relative to car's forward direction
        const offsetX = -direction.x * cameraOffset.z;
        const offsetZ = -direction.z * cameraOffset.z;
        
        // Calculate final camera position
        this.targetCameraPosition.set(
            this.car.mesh.position.x + offsetX,
            this.car.mesh.position.y + cameraOffset.y,
            this.car.mesh.position.z + offsetZ
        );
        
        // Apply a tilt effect during drifting - slight camera roll
        // Reduced tilt on mobile to avoid disorientation
        const tiltFactor = this.isMobileDevice ? 0.05 : (isSpinning ? 0.05 : 0.15);
        const driftTilt = this.car.isDrifting ? (this.car.steeringAngle * tiltFactor) : 0;
        
        if (resetPosition) {
            // Immediately set camera position
            this.camera.position.copy(this.targetCameraPosition);
            this.camera.rotation.z = driftTilt;
        } else {
            // Use faster position lerp on mobile for more responsive feel
            const positionLerpFactor = this.isMobileDevice ? 0.2 : 
                (isSpinning ? Math.max(0.02, this.cameraLerpFactor * 0.5) : this.cameraLerpFactor);
                
            // Smoothly lerp camera position
            this.camera.position.lerp(this.targetCameraPosition, positionLerpFactor);
            this.camera.rotation.z = THREE.MathUtils.lerp(this.camera.rotation.z, driftTilt, 0.1);
        }
        
        // Look at position (slightly ahead of car)
        // Mobile needs less look-ahead for tighter control feel
        const lookAheadDistance = this.isMobileDevice ? 
            (isSpinning ? 1 : 5) : 
            (isSpinning ? 2 : 10);
        
        const lookAtOffset = direction.clone().multiplyScalar(lookAheadDistance);
        this.targetLookAt.copy(this.car.mesh.position).add(lookAtOffset);
        this.targetLookAt.y = this.car.mesh.position.y + 1; // Look slightly above car
        
        // Smoothly update look-at position
        if (resetPosition) {
            this.camera.lookAt(this.targetLookAt);
        } else {
            // More direct look-at on mobile
            const lookAtLerpFactor = this.isMobileDevice ? 0.3 :
                (isSpinning ? Math.max(0.05, this.lookAtLerpFactor * 0.7) : this.lookAtLerpFactor);
                
            // We need to manually lerp the lookAt since camera.lookAt doesn't support lerping
            const currentLookAt = new THREE.Vector3();
            this.camera.getWorldDirection(currentLookAt).multiplyScalar(20).add(this.camera.position);
            
            // Lerp between current direction and target
            currentLookAt.lerp(this.targetLookAt, lookAtLerpFactor);
            this.camera.lookAt(currentLookAt);
        }
    }
    
    updateCamera() {
        if (this.isRunning && !this.controls.enabled) {
            this.updateCameraPosition();
        }
        
        // Update spotlight position to follow car
        if (this.spotLight && this.car && this.car.mesh) {
            const carPos = this.car.mesh.position.clone();
            this.spotLight.position.set(carPos.x, 10, carPos.z);
            this.spotLight.target = this.car.mesh;
        }
    }
    
    animate(currentTime = 0) {
        requestAnimationFrame(this.animate.bind(this));
        
        // Skip frames on mobile to maintain target FPS
        if (this.isMobileDevice) {
            // Convert to milliseconds for comparison
            const timeMs = currentTime;
            const elapsed = timeMs - this.lastFrameTime;
            
            // If not enough time has passed for our target frame rate, skip this frame
            if (elapsed < this.frameInterval) {
                return;
            }
            
            // Otherwise, update last frame time (with rounding to avoid drift)
            this.lastFrameTime = timeMs - (elapsed % this.frameInterval);
        }
        
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Skip large time jumps (like when tab was inactive)
        if (deltaTime > 0.2) return;
        
        if (this.isRunning) {
            // Update game state and timer
            this.gameState.updateTimer(deltaTime);
            this.inputHandler.update();
            
            // Update car physics and movement
            this.car.update(deltaTime, this.inputHandler.keys);
            
            // Check collisions
            this.physics.checkCollisions(this.car, this.city);
            
            // Update UI elements
            this.updateUI();
            
            // Update camera position to follow car
            this.updateCamera();
        }
        
        // Update controls if enabled (for debugging)
        if (this.controls.enabled) {
            this.controls.update();
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    updateUI() {
        // Update nitro bar
        const nitroFill = document.getElementById('nitro-fill');
        if (nitroFill && this.car) {
            nitroFill.style.width = `${this.car.currentNitro}%`;
            
            // Add pulse effect when using nitro
            if (this.car.isNitroActive) {
                nitroFill.style.boxShadow = '0 0 10px rgba(0, 170, 255, 0.8)';
                nitroFill.style.background = 'linear-gradient(90deg, #00ffff, #0088ff, #0033ff)';
            } else {
                nitroFill.style.boxShadow = 'none';
                nitroFill.style.background = 'linear-gradient(90deg, #0af, #08f, #00f)';
            }
        }
        
        // Update score element directly from gameState
        const scoreElement = document.getElementById('score');
        if (scoreElement && this.gameState) {
            const currentScore = Math.floor(this.gameState.score);
            
            // Only update if score changed, and animate the change
            if (currentScore !== this._lastDisplayedScore) {
                scoreElement.textContent = `SCORE: ${currentScore}`;
                
                // Add brief animation effect for score changes
                scoreElement.style.transform = 'scale(1.1)';
                scoreElement.style.color = '#ffcc00';
                
                setTimeout(() => {
                    scoreElement.style.transform = 'scale(1)';
                    scoreElement.style.color = '#fff';
                }, 150);
                
                this._lastDisplayedScore = currentScore;
            }
        }
        
        // Update timer element
        const timerElement = document.getElementById('timer');
        if (timerElement && this.gameState) {
            if (!this.gameState.isTimerRunning) {
                // Show "READY..." text when waiting for player to start
                timerElement.textContent = `READY...`;
                timerElement.style.color = '#ffcc00';
            } else if (this.gameState.timeRemaining <= 10) {
                // Change color to red when time is running low (less than 10 seconds)
                timerElement.style.color = '#ff3333';
                
                // Add pulsing effect for urgency
                if (Math.floor(this.gameState.timeRemaining) % 2 === 0) {
                    timerElement.style.transform = 'scale(1.1)';
                } else {
                    timerElement.style.transform = 'scale(1.0)';
                }
                
                timerElement.textContent = `TIME: ${this.gameState.getFormattedTime()}`;
            } else {
                timerElement.style.color = '#fff';
                timerElement.style.transform = 'scale(1.0)';
                timerElement.textContent = `TIME: ${this.gameState.getFormattedTime()}`;
            }
        }
    }
    
    showPlayerNamePrompt() {
        // Create modal container
        const modalContainer = document.createElement('div');
        modalContainer.id = 'player-name-modal';
        modalContainer.style.position = 'absolute';
        modalContainer.style.top = '0';
        modalContainer.style.left = '0';
        modalContainer.style.width = '100%';
        modalContainer.style.height = '100%';
        modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        modalContainer.style.display = 'flex';
        modalContainer.style.justifyContent = 'center';
        modalContainer.style.alignItems = 'center';
        modalContainer.style.zIndex = '2000';
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        modalContent.style.borderRadius = '10px';
        modalContent.style.padding = '30px';
        modalContent.style.width = '80%';
        modalContent.style.maxWidth = '500px';
        modalContent.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
        modalContent.style.textAlign = 'center';
        
        // Create title
        const title = document.createElement('h2');
        title.textContent = 'MONODRIFT';
        title.style.color = '#ffcc00';
        title.style.fontSize = '36px';
        title.style.marginBottom = '30px';
        title.style.textTransform = 'uppercase';
        title.style.letterSpacing = '3px';
        
        // Create subtitle
        const subtitle = document.createElement('p');
        subtitle.textContent = 'Enter your name to start:';
        subtitle.style.color = '#fff';
        subtitle.style.fontSize = '18px';
        subtitle.style.marginBottom = '20px';
        
        // Create input field
        const inputContainer = document.createElement('div');
        inputContainer.style.marginBottom = '30px';
        inputContainer.style.display = 'flex';
        inputContainer.style.justifyContent = 'center';
        
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = 'Your Name';
        nameInput.style.padding = '10px 15px';
        nameInput.style.fontSize = '18px';
        nameInput.style.border = 'none';
        nameInput.style.borderRadius = '5px 0 0 5px';
        nameInput.style.width = '60%';
        nameInput.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        nameInput.style.color = '#fff';
        nameInput.maxLength = 15;
        
        // Default player name
        nameInput.value = `Player${Math.floor(Math.random() * 1000)}`;
        
        const startButton = document.createElement('button');
        startButton.textContent = 'START';
        startButton.style.padding = '10px 20px';
        startButton.style.fontSize = '18px';
        startButton.style.fontWeight = 'bold';
        startButton.style.backgroundColor = '#ffcc00';
        startButton.style.color = '#000';
        startButton.style.border = 'none';
        startButton.style.borderRadius = '0 5px 5px 0';
        startButton.style.cursor = 'pointer';
        
        inputContainer.appendChild(nameInput);
        inputContainer.appendChild(startButton);
        
        // Create instructions
        const instructions = document.createElement('div');
        instructions.innerHTML = `
            <p style="margin-bottom: 15px; color: #fff; font-size: 16px;">You have 30 seconds to rack up as many points as possible!</p>
            <div style="color: #aaa; font-size: 14px; text-align: left; margin: 0 auto; max-width: 300px;">
                <p style="margin-bottom: 5px;">• WASD / Arrow Keys to drive</p>
                <p style="margin-bottom: 5px;">• SPACE to drift (hold while turning)</p>
                <p style="margin-bottom: 5px;">• SHIFT for nitro boost</p>
            </div>
        `;
        
        // Add elements to modal
        modalContent.appendChild(title);
        modalContent.appendChild(subtitle);
        modalContent.appendChild(inputContainer);
        modalContent.appendChild(instructions);
        modalContainer.appendChild(modalContent);
        document.body.appendChild(modalContainer);
        
        // Auto focus the input field
        nameInput.focus();
        
        // Event listeners for the start button and enter key
        const startGame = () => {
            this.playerName = nameInput.value.trim() || `Player${Math.floor(Math.random() * 1000)}`;
            document.body.removeChild(modalContainer);
            
            // Show existing instructions briefly
            const instructionsElement = document.getElementById('instructions');
            if (instructionsElement) {
                instructionsElement.style.display = 'block';
                setTimeout(() => {
                    instructionsElement.style.display = 'none';
                    this.startGame();
                }, 1500);
            } else {
                this.startGame();
            }
        };
        
        startButton.addEventListener('click', startGame);
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                startGame();
            }
        });
    }
    
    showGameOverMessage(finalScore, highScore) {
        // Create game over message
        const gameOverContainer = document.createElement('div');
        gameOverContainer.id = 'game-over-container';
        gameOverContainer.style.position = 'absolute';
        gameOverContainer.style.top = '50%';
        gameOverContainer.style.left = '50%';
        gameOverContainer.style.transform = 'translate(-50%, -50%)';
        gameOverContainer.style.background = 'rgba(0, 0, 0, 0.8)';
        gameOverContainer.style.padding = '30px 50px';
        gameOverContainer.style.borderRadius = '10px';
        gameOverContainer.style.color = '#fff';
        gameOverContainer.style.textAlign = 'center';
        gameOverContainer.style.zIndex = '1000';
        gameOverContainer.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
        
        // Game over title
        const gameOverTitle = document.createElement('h2');
        gameOverTitle.textContent = 'TIME UP!';
        gameOverTitle.style.color = '#ffcc00';
        gameOverTitle.style.fontSize = '36px';
        gameOverTitle.style.margin = '0 0 20px 0';
        
        // Player name
        const playerNameElement = document.createElement('div');
        playerNameElement.textContent = `PLAYER: ${this.playerName}`;
        playerNameElement.style.fontSize = '20px';
        playerNameElement.style.marginBottom = '10px';
        
        // Final score
        const finalScoreElement = document.createElement('div');
        finalScoreElement.textContent = `FINAL SCORE: ${Math.floor(finalScore)}`;
        finalScoreElement.style.fontSize = '24px';
        finalScoreElement.style.marginBottom = '30px';
        
        // Restart button
        const restartButton = document.createElement('button');
        restartButton.textContent = 'RESTART';
        restartButton.style.background = '#ffcc00';
        restartButton.style.color = '#000';
        restartButton.style.border = 'none';
        restartButton.style.padding = '10px 30px';
        restartButton.style.fontSize = '18px';
        restartButton.style.fontWeight = 'bold';
        restartButton.style.borderRadius = '5px';
        restartButton.style.cursor = 'pointer';
        restartButton.style.transition = 'background 0.2s';
        restartButton.addEventListener('mouseover', () => restartButton.style.background = '#ffd633');
        restartButton.addEventListener('mouseout', () => restartButton.style.background = '#ffcc00');
        restartButton.addEventListener('click', () => {
            document.body.removeChild(gameOverContainer);
            this.showPlayerNamePrompt();
        });
        
        // Assemble elements
        gameOverContainer.appendChild(gameOverTitle);
        gameOverContainer.appendChild(playerNameElement);
        gameOverContainer.appendChild(finalScoreElement);
        gameOverContainer.appendChild(restartButton);
        
        // Add to the DOM
        document.body.appendChild(gameOverContainer);
    }
    
    // Add a "GO!" message when the game starts
    showGoMessage() {
        const goContainer = document.createElement('div');
        goContainer.style.position = 'absolute';
        goContainer.style.top = '50%';
        goContainer.style.left = '50%';
        goContainer.style.transform = 'translate(-50%, -50%)';
        goContainer.style.color = '#ffcc00';
        goContainer.style.fontSize = '80px';
        goContainer.style.fontWeight = 'bold';
        goContainer.style.textAlign = 'center';
        goContainer.style.zIndex = '1000';
        goContainer.style.textShadow = '0 0 20px rgba(255, 204, 0, 0.8)';
        goContainer.style.transition = 'transform 0.5s, opacity 0.5s';
        goContainer.textContent = 'GO!';
        
        document.body.appendChild(goContainer);
        
        // Animate and remove
        setTimeout(() => {
            goContainer.style.transform = 'translate(-50%, -50%) scale(2)';
            goContainer.style.opacity = '0';
        }, 100);
        
        setTimeout(() => {
            document.body.removeChild(goContainer);
        }, 1000);
    }
    
    // Detect mobile device
    detectMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               (window.innerWidth <= 800 && window.innerHeight <= 800);
    }
}

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    console.log('Game initializing...');
    new Game();
}); 