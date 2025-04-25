import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Car } from './entities/Car.js';
import { City } from './entities/City.js';
import { InputHandler } from './core/InputHandler.js';
import { Physics } from './core/Physics.js';
import { GameState } from './core/GameState.js';

class Game {
    constructor() {
        this.scene = new THREE.Scene();
        // Set background color to dark gray instead of pure black
        this.scene.background = new THREE.Color(0x111111);
        
        this.camera = this.setupCamera();
        this.renderer = this.setupRenderer();
        this.controls = this.setupControls();
        
        this.gameState = new GameState();
        this.inputHandler = new InputHandler();
        this.physics = new Physics();
        
        this.setupLighting();
        this.setupModernUI();
        
        // Create physics first
        this.city = new City(this.scene);
        // Then create car
        this.car = new Car(this.scene, this.physics);
        
        // Set the camera reference for the car
        this.car.camera = this.camera;
        
        this.lastTime = 0;
        this.isRunning = false;
        
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
        
        this.setupEventListeners();
        
        // Debug axes helper
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);
        
        this.animate();
        
        // Start with orbit controls disabled by default
        this.controls.enabled = false;
        
        // Start with camera positioned behind the car
        this.updateCameraPosition(true);
        
        // Start the game automatically
        setTimeout(() => this.startGame(), 1000);
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
            antialias: true,
            alpha: true 
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000);
        
        // Enable shadows
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
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
        
        scoreContainer.appendChild(scoreElement);
        topHUD.appendChild(scoreContainer);
        
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
        });
    }
    
    startGame() {
        this.isRunning = true;
        this.gameState.resetScore();
        document.getElementById('instructions').style.display = 'none';
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
        
        // Smooth blending direction when turning
        // This means camera will lag slightly behind car when turning - a cinematic effect
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
        
        // Use the smoothed direction for camera positioning
        const direction = this.lastDirection.clone();
        
        // Adjust camera height and distance based on spin state
        const targetHeight = isSpinning 
            ? this.spinCameraHeight + (spinRate * 0.5) // Higher camera during intense spins
            : this.regularCameraHeight;
        
        const targetDistance = isSpinning
            ? this.spinCameraDistance + (spinRate * 0.8) // Further back during intense spins
            : this.regularCameraDistance;
        
        // Smoothly transition camera parameters
        this.cameraOffset.y = THREE.MathUtils.lerp(
            this.cameraOffset.y, 
            targetHeight, 
            isSpinning ? this.spinTransitionSpeed : 0.05
        );
        
        this.cameraOffset.z = THREE.MathUtils.lerp(
            this.cameraOffset.z, 
            targetDistance, 
            isSpinning ? this.spinTransitionSpeed : 0.05
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
        // Reduce tilt during spins to avoid disorientation
        const tiltFactor = isSpinning ? 0.05 : 0.15;
        const driftTilt = this.car.isDrifting ? (this.car.steeringAngle * tiltFactor) : 0;
        
        if (resetPosition) {
            // Immediately set camera position
            this.camera.position.copy(this.targetCameraPosition);
            this.camera.rotation.z = driftTilt;
        } else {
            // Adjust camera lerp factor based on spin state
            const positionLerpFactor = isSpinning 
                ? Math.max(0.02, this.cameraLerpFactor * 0.5) // Slower follow during spins
                : this.cameraLerpFactor;
                
            // Smoothly lerp camera position
            this.camera.position.lerp(this.targetCameraPosition, positionLerpFactor);
            this.camera.rotation.z = THREE.MathUtils.lerp(this.camera.rotation.z, driftTilt, 0.1);
        }
        
        // Look at position (slightly ahead of car)
        // During spins, look more directly at car to maintain focus
        const lookAheadDistance = isSpinning ? 2 : 10;
        const lookAtOffset = direction.clone().multiplyScalar(lookAheadDistance);
        this.targetLookAt.copy(this.car.mesh.position).add(lookAtOffset);
        this.targetLookAt.y = this.car.mesh.position.y + 1; // Look slightly above car
        
        // Smoothly update look-at position
        if (resetPosition) {
            this.camera.lookAt(this.targetLookAt);
        } else {
            // Adjust look-at lerp factor based on spin state
            const lookAtLerpFactor = isSpinning
                ? Math.max(0.05, this.lookAtLerpFactor * 0.7) // Slower look-at during spins
                : this.lookAtLerpFactor;
                
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
        
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        if (this.isRunning && deltaTime < 0.2) { // Skip big jumps in time
            // Update game state
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
        
        // Update score - now handled by drift score event
    }
}

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    console.log('Game initializing...');
    new Game();
}); 