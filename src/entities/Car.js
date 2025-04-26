import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DriftEffect } from '../utils/DriftEffect.js';

export class Car {
    constructor(scene, physics) {
        this.scene = scene;
        this.physics = physics;
        
        // Store camera reference
        this.camera = null; // Will be set from Game.js
        
        // Car properties - improved physics
        this.maxSpeed = 25; // Increased max speed
        this.acceleration = 15; // More responsive acceleration
        this.deceleration = 20; // Stronger brakes
        this.turnSpeed = 4.0;  // Slightly quicker turning
        this.driftTurnMultiplier = 2.2; // Stronger drift effect
        this.collisionRadius = 0.8;
        
        // Enhanced physics parameters
        this.weight = 1500; // Car weight in kg
        this.enginePower = 800; // Engine power factor
        this.brakeForce = 100; // Increased brake force for better stopping
        this.rollingResistance = 0.015; // Rolling resistance coefficient
        this.dragCoefficient = 0.3; // Air resistance
        this.engineBrakingFactor = 0.55; // Engine braking strength (4x stronger)
        
        // Nitro boost parameters
        this.nitroAmount = 100; // Max nitro (percentage)
        this.currentNitro = 100; // Current nitro amount
        this.nitroBoostFactor = 6; // Boost multiplier when nitro is active
        this.nitroDepletionRate = 30; // How fast nitro depletes per second
        this.nitroRecoveryFromDrift = 4; // Nitro recovery per drift point
        this.isNitroActive = false;
        
        // Drift parameters
        this.driftInitiationSpeed = 5.0; // Lower minimum speed required to drift (was 8.0)
        this.driftRecoveryRate = 0.7; // How quickly the car recovers from a drift
        this.maxDriftDuration = 5.0; // Longer maximum drift time (was 2.0)
        
        // Drift scoring parameters
        this.driftScore = 0; // Current drift score
        this.totalScore = 0; // Total game score
        this.activeDriftPoints = 0; // Points accumulated in current drift
        this.driftPointsMultiplier = 1.0; // Multiplier based on drift duration
        this.driftPointsBase = 10; // Base points per second of drift
        this.driftPointsText = null; // 3D text for showing drift points
        
        // Restart and collision parameters
        this.initialPosition = new THREE.Vector3(20, 0, 20);
        this.initialRotation = 0;
        this.isCollided = false;
        this.collisionRecoveryTime = 2.0; // Time after collision before auto-revival
        this.collisionTimer = 0;
        
        // Car state
        this.velocity = 0;
        this.velocityVector = new THREE.Vector3(0, 0, 0);
        this.isDrifting = false;
        this.isBraking = false;
        this.isAccelerating = false;
        this.steeringAngle = 0;
        
        // Drift timing and control
        this.driftDuration = 0;
        this.driftIntensity = 0;
        this.wasDrifting = false;
        
        // Spinning/drift detection
        this.prevRotation = 0;
        this.spinRate = 0;
        this.spinThreshold = 4.0; // Radians per second
        this.isSpinning = false;
        this.spinScore = 0;
        this.spinTime = 0;
        
        // Effects state
        this.brakeLights = [];
        this.exhaustFlames = [];
        
        // Create a group to hold the car model and any attachments
        this.mesh = new THREE.Group();
        this.mesh.position.set(20, 0, 20); // Start away from obstacles
        this.scene.add(this.mesh);
        
        // Create a simple placeholder while the model loads
        this.createPlaceholder();
        
        // Load the custom car model
        this.loadCustomModel();
        
        // Create the drift effect handler
        this.driftEffect = new DriftEffect(this.scene, this);
    }
    
    createPlaceholder() {
        // Simple car shape as a placeholder while model loads
        const carGeometry = new THREE.BoxGeometry(1, 0.5, 2);
        const carMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            roughness: 0.3,
            metalness: 0.8
        });
        
        this.placeholder = new THREE.Mesh(carGeometry, carMaterial);
        this.placeholder.castShadow = true;
        this.placeholder.receiveShadow = true;
        this.placeholder.position.set(0, 0.25, 0);
        
        // Add brake lights to placeholder
        this.createBrakeLightsPlaceholder();
        
        // Add to car mesh group
        this.mesh.add(this.placeholder);
    }
    
    createBrakeLightsPlaceholder() {
        // Create simple brake lights for the placeholder
        const brakeGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.1);
        const brakeMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.0, // Off by default
            roughness: 0.3
        });
        
        // Left brake light
        const leftBrake = new THREE.Mesh(brakeGeometry, brakeMaterial.clone());
        leftBrake.position.set(0.4, 0.25, 0.95);
        this.mesh.add(leftBrake);
        this.brakeLights.push(leftBrake);
        
        // Right brake light
        const rightBrake = new THREE.Mesh(brakeGeometry, brakeMaterial.clone());
        rightBrake.position.set(-0.4, 0.25, 0.95);
        this.mesh.add(rightBrake);
        this.brakeLights.push(rightBrake);
    }
    
    createExhaustFlamesPlaceholder() {
        // Create exhaust flames for acceleration effect
        const flameGeometry = new THREE.ConeGeometry(0.1, 0.4, 8);
        const flameMaterial = new THREE.MeshStandardMaterial({
            color: 0xff7700,
            emissive: 0xff5500,
            emissiveIntensity: 0,
            transparent: true,
            opacity: 0.8
        });
        
        // Left exhaust flame
        const leftFlame = new THREE.Mesh(flameGeometry, flameMaterial.clone());
        leftFlame.rotation.x = Math.PI; // Point backward
        leftFlame.position.set(0.3, 0.2, 0.95);
        leftFlame.visible = false;
        this.mesh.add(leftFlame);
        this.exhaustFlames.push(leftFlame);
        
        // Right exhaust flame
        const rightFlame = new THREE.Mesh(flameGeometry, flameMaterial.clone());
        rightFlame.rotation.x = Math.PI; // Point backward
        rightFlame.position.set(-0.3, 0.2, 0.95);
        rightFlame.visible = false;
        this.mesh.add(rightFlame);
        this.exhaustFlames.push(rightFlame);
    }
    
    loadCustomModel() {
        console.log('Attempting to load car model from: /models/car.glb');
        const loader = new GLTFLoader();
        loader.load(
            '/models/car.glb',
            (gltf) => {
                console.log('Car model loaded successfully:', gltf);
                this.car = gltf.scene;
                
                // Scale and rotate the car model
                this.car.scale.set(0.4, 0.4, 0.4);
                this.car.rotation.y = Math.PI;
                
                // Add the car model to our mesh group for proper positioning
                this.mesh.add(this.car);
                
                // Create exhaust effects for the model
                this.createExhaustFlamesForModel(this.car);
                
                // Remove placeholder if it exists
                if (this.placeholder) {
                    this.mesh.remove(this.placeholder);
                    this.placeholder.geometry.dispose();
                    this.placeholder.material.dispose();
                    this.placeholder = null;
                }
            },
            (xhr) => {
                console.log(`${(xhr.loaded / xhr.total) * 100}% loaded`);
            },
            (error) => {
                console.error('Error loading car model:', error);
                console.error('Error details:', error.message);
                // Create placeholder if model fails to load
                this.createPlaceholder();
            }
        );
    }
    
    createExhaustFlamesForModel(model) {
        // Find exhaust positions on the model or create default ones
        const exhaustPositions = [];
        
        // Try to find exhaust pipes in the model
        model.traverse((node) => {
            if (node.name && (
                node.name.toLowerCase().includes('exhaust') || 
                node.name.toLowerCase().includes('pipe')
            )) {
                // Get world position of exhaust
                const worldPos = new THREE.Vector3();
                node.getWorldPosition(worldPos);
                exhaustPositions.push(worldPos);
            }
        });
        
        // If no exhausts found, create default positions
        if (exhaustPositions.length === 0) {
            // Default positions relative to car
            exhaustPositions.push(
                new THREE.Vector3(-0.4, 0.1, 1), // Left exhaust
                new THREE.Vector3(0.4, 0.1, 1)   // Right exhaust
            );
        }
        
        // Create flame for each exhaust
        exhaustPositions.forEach(pos => {
            const flameGeometry = new THREE.ConeGeometry(0.1, 0.4, 8);
            const flameMaterial = new THREE.MeshStandardMaterial({
                color: 0xff7700,
                emissive: 0xff5500,
                emissiveIntensity: 0,
                transparent: true,
                opacity: 0.8
            });
            
            const flame = new THREE.Mesh(flameGeometry, flameMaterial);
            flame.rotation.x = Math.PI; // Point backward
            flame.position.copy(pos);
            flame.visible = false;
            this.mesh.add(flame);
            this.exhaustFlames.push(flame);
        });
    }
    
    update(deltaTime, keys) {
        // Check for restart key press
        if (keys.r) {
            this.restart();
            return; // Skip the rest of the update after restart
        }
        
        // Handle auto-revival after collision
        if (this.isCollided) {
            this.collisionTimer += deltaTime;
            if (this.collisionTimer >= this.collisionRecoveryTime) {
                this.revive();
            }
            return; // Skip normal updates while collided
        }
        
        // Reset states
        this.isBraking = false;
        this.isAccelerating = false;
        
        // Handle nitro boost activation with Shift key
        if (keys.shift && this.currentNitro > 0 && this.velocity > 0) {
            this.isNitroActive = true;
            // Deplete nitro while active
            this.currentNitro = Math.max(0, this.currentNitro - this.nitroDepletionRate * deltaTime);
            
            // Create nitro visual effect if not already present
            this.updateNitroEffect(true);
        } else {
            this.isNitroActive = false;
            this.updateNitroEffect(false);
        }
        
        // Track previous rotation for spin detection
        this.prevRotation = this.mesh.rotation.y;
        
        // Store previous velocity for physics calculations
        const prevVelocity = this.velocity;
        
        // Handle inputs based on current direction of travel
        if (keys.arrowUp || keys.w) {
            // Accelerating forward
            this.isAccelerating = true;
            
            if (this.velocity >= 0) {
                // Already moving forward or stopped - accelerate forward
                const accelerationFactor = this.calculateAccelerationFactor();
                let engineForce = this.enginePower * accelerationFactor * deltaTime;
                
                // Apply nitro boost if active
                if (this.isNitroActive) {
                    engineForce *= this.nitroBoostFactor;
                }
                
                this.velocity = Math.min(this.velocity + engineForce, 
                    this.isNitroActive ? this.maxSpeed * 1.4 : this.maxSpeed);
            } else {
                // Moving backward - apply brakes to slow down first
                this.isBraking = true;
                const brakeForce = this.brakeForce * 0.5 * deltaTime; // Gentler braking when changing direction
                this.velocity = Math.min(0, this.velocity + brakeForce);
            }
        } else if (keys.arrowDown || keys.s) {
            // Braking or reverse
            this.isBraking = true;
            
            if (this.velocity > 0) {
                // Moving forward - apply brakes progressively based on speed and time
                const brakeForce = this.brakeForce * deltaTime;
                
                // Reduce braking effect during drifts to maintain speed
                const driftBrakeReduction = this.isDrifting ? 0.25 : 1.0;
                
                // More progressive braking curve - gentler initial braking
                const speedFactor = this.velocity / this.maxSpeed;
                const progressiveFactor = 0.05 + (Math.pow(speedFactor, 2.0) * 0.6);
                
                // Apply braking force with diminishing effect as speed decreases
                const effectiveBrakeForce = brakeForce * progressiveFactor * driftBrakeReduction;
                const actualDeceleration = Math.min(this.velocity * 0.05, effectiveBrakeForce);
                
                this.velocity = Math.max(0, this.velocity - actualDeceleration);
            } else if (this.velocity === 0) {
                // Stopped - start moving backward very gradually
                this.velocity = -0.2; // Even smaller initial reverse velocity
            } else {
                // Already moving backward - accelerate in reverse with progressive curve
                const reverseForce = this.enginePower * 0.2 * deltaTime; // Lower power in reverse
                const reverseSpeedRatio = Math.abs(this.velocity) / (this.maxSpeed / 3);
                const reverseAcceleration = reverseForce * (1 - Math.pow(reverseSpeedRatio, 1.2));
                
                this.velocity = Math.max(this.velocity - reverseAcceleration, -this.maxSpeed / 3);
            }
        } else {
            // No directional input - apply natural deceleration with stronger engine braking

            // Engine braking when moving forward
            if (this.velocity > 0) {
                // Calculate drag and rolling resistance
                const drag = this.calculateDragForce(deltaTime);
                const rollingResistance = this.calculateRollingResistance(deltaTime);
                
                // Engine braking - proportional to speed (reduced during drifting)
                const driftBrakeReduction = this.isDrifting ? 0.2 : 1.0;
                const engineBraking = this.velocity * this.engineBrakingFactor * deltaTime * driftBrakeReduction;
                
                // Progressive deceleration curve - stronger at higher speeds
                const speedRatio = this.velocity / this.maxSpeed;
                const progressiveFactor = 0.5 + (speedRatio * 0.5); // More progressive
                
                // Apply combined deceleration forces
                const totalDeceleration = Math.min(this.velocity, 
                    (drag + rollingResistance + engineBraking) * progressiveFactor);
                this.velocity -= totalDeceleration;
                
                // Consider subtle braking effect for brake lights when engine braking is strong
                if (engineBraking > 0.1) {
                    this.isBraking = true;
                }
            } 
            // Natural deceleration when moving backward
            else if (this.velocity < 0) {
                const drag = this.calculateDragForce(deltaTime);
                const rollingResistance = this.calculateRollingResistance(deltaTime);
                
                // No engine braking in reverse, just natural forces
                const totalDeceleration = Math.min(Math.abs(this.velocity), drag + rollingResistance);
                this.velocity += totalDeceleration;
            }
        }
        
        // Handle steering with weight transfer effects
        this.steeringAngle = 0;
        if (keys.arrowLeft || keys.a) {
            const steeringFactor = this.calculateSteeringFactor();
            this.steeringAngle = 1 * steeringFactor; // Left
        } else if (keys.arrowRight || keys.d) {
            const steeringFactor = this.calculateSteeringFactor();
            this.steeringAngle = -1 * steeringFactor; // Right
        }
        
        // Check for drift (space bar) - need sufficient speed for drifting
        const wasDrifting = this.isDrifting;
        this.isDrifting = keys.space && Math.abs(this.velocity) > this.driftInitiationSpeed;
        
        // Handle drift scoring and nitro recovery
        if (this.isDrifting) {
            // If just started drifting, reset drift score
            if (!wasDrifting) {
                this.activeDriftPoints = 0;
                this.driftPointsMultiplier = 1.0;
                this.createDriftPointsText();
            } else {
                // Accumulate drift points based on duration and speed
                const speedFactor = Math.min(1.0, this.velocity / this.maxSpeed);
                this.driftPointsMultiplier = Math.min(5.0, 1.0 + (this.driftDuration / 2.0));
                const pointsThisFrame = this.driftPointsBase * speedFactor * this.driftPointsMultiplier * deltaTime;
                this.activeDriftPoints += pointsThisFrame;
                
                // Update the drift points text
                this.updateDriftPointsText(Math.floor(this.activeDriftPoints));
            }
        } else if (wasDrifting) {
            // Just finished drifting, add points to total score
            const finalPoints = Math.floor(this.activeDriftPoints);
            this.totalScore += finalPoints;
            
            // Recover nitro based on drift score
            this.currentNitro = Math.min(100, this.currentNitro + (finalPoints * this.nitroRecoveryFromDrift));
            
            // Reset drift score and remove text
            this.activeDriftPoints = 0;
            this.removeDriftPointsText();
            
            // Dispatch a score event
            const driftScoreEvent = new CustomEvent('driftScore', { 
                detail: { 
                    points: finalPoints,
                    total: this.totalScore,
                    position: this.mesh.position.clone()
                } 
            });
            document.dispatchEvent(driftScoreEvent);
        }
        
        // When accelerating during a drift, always maintain forward velocity regardless of steering
        if ((keys.arrowUp || keys.w) && this.isDrifting && this.velocity > 0) {
            // Prevent velocity from decreasing too much during drift + acceleration
            // This essentially counters any braking effects from turning
            const minVelocity = Math.max(this.velocity * 0.95, this.driftInitiationSpeed);
            this.velocity = Math.max(this.velocity, minVelocity);
        }
        
        // Handle drift timing and intensity
        if (this.isDrifting) {
            // If just started drifting, reset duration
            if (!wasDrifting) {
                this.driftDuration = 0;
                this.driftIntensity = 0;
            } else {
                // Increment drift duration and calculate intensity - faster ramp up
                this.driftDuration = Math.min(this.driftDuration + deltaTime, this.maxDriftDuration);
                this.driftIntensity = Math.min(1.0, this.driftDuration / (this.maxDriftDuration * 0.5));
            }
        } else if (wasDrifting) {
            // Just stopped drifting, reset values
            this.driftDuration = 0;
            this.driftIntensity = 0;
        }
        
        // Apply steering (simplified for drifting)
        let effectiveTurnSpeed;
        if (this.isDrifting) {
            // Significantly increase drift turning rate for more dramatic drifts
            effectiveTurnSpeed = this.turnSpeed * 1.7; // Changed from 3.0 to 1.7
        } else {
            effectiveTurnSpeed = this.turnSpeed;
        }
        
        this.mesh.rotation.y += this.steeringAngle * effectiveTurnSpeed * deltaTime * 
            (Math.abs(this.velocity) / this.maxSpeed);
        
        // Calculate velocity vector based on car's rotation when NOT drifting
        // When drifting, the physics system will handle this differently
        if (!this.isDrifting) {
            const direction = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
            this.velocityVector = direction.multiplyScalar(this.velocity);
        }
        
        // Calculate drift physics
        if (this.isDrifting) {
            // Calculate drift effect - drift force is returned for visual effects
            const driftForce = this.physics.calculateDrift(this, this.steeringAngle, this.isDrifting, deltaTime);
            
            // Recalculate velocity scalar based on the new vector's length
            this.velocity = this.velocityVector.length() * Math.sign(this.velocity);
            
            // Update drift visual effects based on drift force
            this.driftEffect.update(deltaTime, driftForce, this.mesh.position, this.mesh.rotation);
        } else {
            // Fade out drift effects when not drifting
            this.driftEffect.fade(deltaTime);
        }
        
        // Apply friction
        this.physics.applyFriction(this, deltaTime, this.isDrifting);
        
        // Update position based on velocity
        this.mesh.position.add(this.velocityVector.clone().multiplyScalar(deltaTime));
        
        // Detect spins - calculate rotation rate
        const rotationDelta = (this.mesh.rotation.y - this.prevRotation);
        // Normalize the rotation delta to handle wrapping around
        const normalizedDelta = ((rotationDelta + Math.PI) % (Math.PI * 2)) - Math.PI;
        this.spinRate = Math.abs(normalizedDelta / deltaTime);
        
        // Detect if we're in a spinout
        const wasSpinning = this.isSpinning;
        this.isSpinning = this.spinRate > this.spinThreshold && Math.abs(this.velocity) > 5;
        
        // Handle spinout scoring
        if (this.isSpinning) {
            this.spinTime += deltaTime;
            // Accumulate spin score based on spin rate and speed
            this.spinScore += deltaTime * this.spinRate * Math.abs(this.velocity) * 0.1;
        } else if (wasSpinning && !this.isSpinning && this.spinTime > 0.5) {
            // Player just finished a spinout that lasted at least 0.5 seconds
            // Add bonus points for completing a spin
            const spinBonus = Math.floor(this.spinScore * 2.5);
            // Dispatch a custom event for scoring
            const spinEvent = new CustomEvent('spinout', { 
                detail: { 
                    score: spinBonus,
                    duration: this.spinTime,
                    position: this.mesh.position.clone()
                } 
            });
            document.dispatchEvent(spinEvent);
            
            // Reset spin tracking
            this.spinTime = 0;
            this.spinScore = 0;
        } else if (!this.isSpinning) {
            // Reset spin tracking when not spinning
            this.spinTime = 0;
            this.spinScore = 0;
        }
        
        // Update visual effects
        this.updateBrakeLights();
        this.updateExhaustFlames(deltaTime);
    }
    
    calculateAccelerationFactor() {
        // Return a factor between 0 and 1 based on current speed
        // This creates a non-linear acceleration curve
        const speedRatio = Math.abs(this.velocity) / this.maxSpeed;
        return (1 - Math.pow(speedRatio, 1.5)) * 0.05;
    }
    
    calculateDragForce(deltaTime) {
        // Air resistance increases with the square of velocity
        return this.dragCoefficient * Math.pow(Math.abs(this.velocity), 2) * 0.001 * deltaTime;
    }
    
    calculateRollingResistance(deltaTime) {
        // Rolling resistance is proportional to velocity
        return this.rollingResistance * Math.abs(this.velocity) * 0.01 * deltaTime;
    }
    
    calculateSteeringFactor() {
        // Steering is more responsive at medium speeds, less at very high speeds
        const speedRatio = Math.abs(this.velocity) / this.maxSpeed;
        if (speedRatio < 0.2) {
            // Low speed - reduced steering
            return 0.5 + (speedRatio * 2.5);
        } else if (speedRatio > 0.8) {
            // High speed - reduced steering for stability
            return 1.0 - ((speedRatio - 0.8) * 0.5);
        }
        // Medium speed - optimal steering
        return 1.0;
    }
    
    updateBrakeLights() {
        if (this.brakeLights.length === 0) return;
        
        this.brakeLights.forEach(light => {
            if (!light) return;
            
            if (light.material) {
                if (this.isBraking) {
                    // Turn brake lights on - bright red
                    light.material.emissive = new THREE.Color(0xff0000);
                    light.material.emissiveIntensity = 1.0;
                } else {
                    // Turn brake lights off
                    if (light.material._originalEmissive) {
                        light.material.emissive = light.material._originalEmissive.clone();
                    } else {
                        light.material.emissive = new THREE.Color(0x000000);
                    }
                    light.material.emissiveIntensity = 0.0;
                }
            }
        });
    }
    
    updateExhaustFlames(deltaTime) {
        if (this.exhaustFlames.length === 0) return;
        
        this.exhaustFlames.forEach(flame => {
            if (!flame) return;
            
            if (this.isAccelerating && this.velocity > 5) {
                // Show flames when accelerating hard
                flame.visible = true;
                
                // Randomize flame size for effect
                const pulseScale = 0.7 + Math.random() * 0.6;
                flame.scale.set(pulseScale, 0.8 + Math.random() * 0.4, pulseScale);
                
                // Animate flame color/intensity
                if (flame.material) {
                    flame.material.emissiveIntensity = 0.5 + Math.random() * 0.5;
                }
            } else {
                // Hide flames when not accelerating
                flame.visible = false;
            }
        });
    }
    
    triggerCrash() {
        // Already collided, don't process again
        if (this.isCollided) return;
        
        // Set collision state
        this.isCollided = true;
        this.collisionTimer = 0;
        
        // Store original colors
        this.originalColors = [];
        
        // Visual feedback for crash
        // Flash the car material if it's a basic mesh or the placeholder
        if (this.placeholder) {
            const originalColor = this.placeholder.material.color.clone();
            this.originalColors.push({ mesh: this.placeholder, color: originalColor });
            this.placeholder.material.color.set(0xff0000); // Flash red
        } else if (this.car) {
            // Flash the custom model materials
            this.car.traverse((node) => {
                if (node.isMesh && node.material) {
                    const originalColor = node.material.color.clone();
                    this.originalColors.push({ mesh: node, color: originalColor });
                    node.material.color.set(0xff0000);
                }
            });
        }
        
        // Reduce speed significantly on crash
        this.velocity *= 0.2;
        
        // Stop the drift effect
        this.isDrifting = false;
        this.driftEffect.stopDrift();
        
        // Show recovery message
        this.showRecoveryMessage();
    }
    
    // Restore car colors after recovery
    restoreCarColors() {
        if (!this.originalColors) return;
        
        // Restore all original colors
        this.originalColors.forEach(item => {
            if (item.mesh && item.mesh.material) {
                item.mesh.material.color.copy(item.color);
            }
        });
        
        // Clear stored colors
        this.originalColors = [];
    }
    
    // Auto-revive after collision
    revive() {
        // Move the car a slight distance away from the collision point
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
        this.mesh.position.sub(forward.multiplyScalar(3)); // Back up a bit from obstacle
        
        // Reset physics state
        this.velocity = 0;
        this.velocityVector.set(0, 0, 0);
        this.isDrifting = false;
        
        // Restore original car colors
        this.restoreCarColors();
        
        // Reset collision state
        this.isCollided = false;
        this.collisionTimer = 0;
        
        // Clean up any nitro effects
        this.isNitroActive = false;
        this.cleanupNitroParticles();
    }
    
    // Show recovery message
    showRecoveryMessage() {
        // Create and display a recovery message
        const messageElement = document.createElement('div');
        messageElement.textContent = 'Crashed! Auto-recovering in 2 seconds... (Press R to restart)';
        messageElement.style.position = 'absolute';
        messageElement.style.top = '20%';
        messageElement.style.left = '50%';
        messageElement.style.transform = 'translate(-50%, -50%)';
        messageElement.style.color = 'white';
        messageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        messageElement.style.padding = '10px 20px';
        messageElement.style.borderRadius = '5px';
        messageElement.style.fontFamily = 'Arial, sans-serif';
        messageElement.style.fontSize = '18px';
        messageElement.style.zIndex = '1000';
        
        document.body.appendChild(messageElement);
        
        // Remove message after recovery time
        setTimeout(() => {
            document.body.removeChild(messageElement);
        }, this.collisionRecoveryTime * 1000);
    }
    
    // Return true if car is in a spinout, for camera effects
    isInSpinout() {
        return this.isSpinning;
    }
    
    // Get spinout rate for camera effects
    getSpinRate() {
        return this.spinRate;
    }
    
    getBrakeForce() {
        return this.brakeForce;
    }
    
    calculateDriftTurnMultiplier() {
        // Adjust drift turn multiplier based on speed
        // At higher speeds, we want more controlled drifts
        const speedRatio = Math.abs(this.velocity) / this.maxSpeed;
        
        if (speedRatio > 0.7) {
            // At very high speeds, reduce the turn multiplier for more stable drifts
            return this.driftTurnMultiplier * (1.0 - ((speedRatio - 0.7) * 0.5));
        } else {
            // At lower speeds, use the full drift turn multiplier
            return this.driftTurnMultiplier;
        }
    }
    
    // Create nitro visual effect
    updateNitroEffect(isActive) {
        // Update exhaust flames for nitro effect
        this.exhaustFlames.forEach(flame => {
            if (!flame) return;
            
            if (isActive) {
                // Show larger, blue-tinted flames for nitro
                flame.visible = true;
                
                // Make nitro flames MUCH larger and more dramatic
                const pulseScale = 3.5 + Math.random() * 1.5;
                flame.scale.set(pulseScale, 4.0 + Math.sin(Date.now() * 0.01) * 1.0, pulseScale);
                
                if (flame.material) {
                    // Bright electric blue color for nitro with more glow
                    flame.material.color.set(0x00ffff);
                    flame.material.emissive.set(0x00bfff);
                    flame.material.emissiveIntensity = 5.0; // Much brighter glow
                    
                    // Fully opaque flames
                    flame.material.opacity = 1.0;
                }
                
                // Create MANY more trail particles for nitro effect (70% chance per frame instead of 30%)
                if (Math.random() > 0.3) {
                    // Create multiple particles per frame for denser effect
                    for (let i = 0; i < 3; i++) {
                        this.createNitroTrailParticle(flame.position.clone());
                    }
                }
                
                // Create extra "speed lines" particle effect
                if (Math.random() > 0.6) {
                    this.createNitroSpeedLine();
                }
            } else if (this.isAccelerating && this.velocity > 5) {
                // Regular acceleration flames (orange)
                flame.visible = true;
                
                // Randomize flame size for effect
                const pulseScale = 0.7 + Math.random() * 0.6;
                flame.scale.set(pulseScale, 0.8 + Math.random() * 0.4, pulseScale);
                
                // Reset to normal flame color
                if (flame.material) {
                    flame.material.color.set(0xff7700);
                    flame.material.emissive.set(0xff5500);
                    flame.material.emissiveIntensity = 0.5 + Math.random() * 0.5;
                    flame.material.opacity = 0.8;
                }
            } else {
                // Hide flames when not accelerating or using nitro
                flame.visible = false;
            }
        });
        
        // Update existing nitro trail particles
        this.updateNitroTrailParticles();
        
        // Add camera effect for nitro
        this.updateNitroCameraEffect(isActive);
    }
    
    // Create a nitro trail particle
    createNitroTrailParticle(position) {
        // Create larger particle
        const geometry = new THREE.SphereGeometry(0.3, 8, 8); // 50% larger particles
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 1.0  // Fully opaque
        });
        
        const particle = new THREE.Mesh(geometry, material);
        
        // Set initial position with wider spread
        const offset = new THREE.Vector3(
            (Math.random() - 0.5) * 0.8,  // Even wider spread
            (Math.random() - 0.5) * 0.8,
            (Math.random() - 0.5) * 0.8
        );
        
        // Get the car's forward direction
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
        
        // Position behind the exhaust with longer trail
        particle.position.copy(position.clone().add(forward.multiplyScalar(0.5 + Math.random() * 1.5)).add(offset));
        
        // Add to scene
        this.scene.add(particle);
        
        // Store particle with lifetime and fade properties
        if (!this.nitroParticles) {
            this.nitroParticles = [];
        }
        
        this.nitroParticles.push({
            mesh: particle,
            lifetime: 2.0,  // Even longer lifetime
            initialScale: 0.3 + Math.random() * 0.5,  // Larger initial scale
            color: new THREE.Color(0x00ffff)
        });
    }
    
    // Create speed lines for nitro effect
    createNitroSpeedLine() {
        // Create a stretched line geometry for speed effect
        const geometry = new THREE.BoxGeometry(0.05, 0.05, 2.0 + Math.random() * 4.0); // Longer speed lines
        
        // Brighter, more vibrant color for speed lines
        const hue = 0.5 + Math.random() * 0.1; // Blue to cyan
        const color = new THREE.Color().setHSL(hue, 1, 0.8); // Higher luminance
        
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.9 // More opaque
        });
        
        const speedLine = new THREE.Mesh(geometry, material);
        
        // More speed lines, covering a wider area
        const angle = Math.random() * Math.PI * 2;
        const distance = 0.8 + Math.random() * 4.0; // Closer to car + further out
        const xPos = Math.cos(angle) * distance;
        const yPos = 0.3 + Math.random() * 1.2; // More varied height
        const zPos = Math.sin(angle) * distance;
        
        speedLine.position.set(
            this.mesh.position.x + xPos,
            this.mesh.position.y + yPos,
            this.mesh.position.z + zPos
        );
        
        // Align with car's movement direction
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
        speedLine.lookAt(speedLine.position.clone().add(forward));
        
        // Add to scene
        this.scene.add(speedLine);
        
        // Store with particles
        if (!this.nitroParticles) {
            this.nitroParticles = [];
        }
        
        this.nitroParticles.push({
            mesh: speedLine,
            lifetime: 0.7, // Longer lifetime for speed lines
            initialScale: 1.5, // Larger scale
            isSpeedLine: true
        });
    }
    
    // Update nitro trail particles
    updateNitroTrailParticles() {
        if (!this.nitroParticles) return;
        
        // Process each particle
        for (let i = this.nitroParticles.length - 1; i >= 0; i--) {
            const particle = this.nitroParticles[i];
            
            // Reduce lifetime
            particle.lifetime -= 0.05;
            
            // Fade out and expand
            if (particle.mesh) {
                // Different behavior for regular particles and speed lines
                if (particle.isSpeedLine) {
                    // Speed lines stretch and fade
                    particle.mesh.scale.z = particle.initialScale * (1.0 + (1.0 - particle.lifetime) * 2.0);
                    particle.mesh.material.opacity = particle.lifetime * 0.7;
                } else {
                    // Regular particles expand and change color
                    const scale = particle.initialScale * (2.0 - particle.lifetime);
                    particle.mesh.scale.set(scale, scale, scale);
                    particle.mesh.material.opacity = particle.lifetime * 0.9;
                    
                    // Shift color from cyan to blue as it fades
                    if (particle.color) {
                        const hue = 0.5 + (0.1 * (1.0 - particle.lifetime));
                        particle.mesh.material.color.setHSL(hue, 1, 0.5 + 0.5 * particle.lifetime);
                    }
                }
            }
            
            // Remove expired particles
            if (particle.lifetime <= 0) {
                this.scene.remove(particle.mesh);
                particle.mesh.geometry.dispose();
                particle.mesh.material.dispose();
                this.nitroParticles.splice(i, 1);
            }
        }
    }
    
    // Add camera effects during nitro
    updateNitroCameraEffect(isNitroActive) {
        // Find the camera in the scene if we need to
        if (!this.camera && this.scene) {
            const cameras = this.scene.children.filter(child => child.isCamera);
            if (cameras.length > 0) {
                this.camera = cameras[0];
            }
        }
        
        // Apply FOV changes to create sense of speed
        if (this.camera && this.camera.isPerspectiveCamera) {
            const defaultFOV = 60;
            const nitroFOV = 70; // Wider FOV during nitro
            
            if (isNitroActive) {
                // Gradually increase FOV for nitro effect
                this.camera.fov = THREE.MathUtils.lerp(
                    this.camera.fov,
                    nitroFOV,
                    0.1
                );
            } else {
                // Return to normal FOV
                this.camera.fov = THREE.MathUtils.lerp(
                    this.camera.fov,
                    defaultFOV,
                    0.05
                );
            }
            
            // Update projection matrix when FOV changes
            this.camera.updateProjectionMatrix();
        }
        
        // Add screen shake effect for nitro
        if (this.camera && isNitroActive && Math.random() > 0.7) {
            const intensity = 0.03;
            this.camera.position.x += (Math.random() - 0.5) * intensity;
            this.camera.position.y += (Math.random() - 0.5) * intensity;
        }
    }
    
    // Clean up nitro particles when needed
    cleanupNitroParticles() {
        if (!this.nitroParticles) return;
        
        for (const particle of this.nitroParticles) {
            if (particle.mesh) {
                this.scene.remove(particle.mesh);
                particle.mesh.geometry.dispose();
                particle.mesh.material.dispose();
            }
        }
        
        this.nitroParticles = [];
    }
    
    // Create 3D text for drift points
    createDriftPointsText() {
        // Create a div element for the drift points
        if (!this.driftPointsText) {
            this.driftPointsText = document.createElement('div');
            this.driftPointsText.className = 'drift-points';
            this.driftPointsText.style.position = 'absolute';
            this.driftPointsText.style.color = '#ffcc00';
            this.driftPointsText.style.textShadow = '0 0 5px #ff6600';
            this.driftPointsText.style.fontSize = '28px';
            this.driftPointsText.style.fontWeight = 'bold';
            this.driftPointsText.style.transition = 'transform 0.2s ease-out';
            this.driftPointsText.style.zIndex = '100';
            document.body.appendChild(this.driftPointsText);
        }
        
        // Initialize with 0 points
        this.updateDriftPointsText(0);
    }
    
    // Update drift points text with current value and position
    updateDriftPointsText(points) {
        if (!this.driftPointsText) return;
        
        // Update text content with points and multiplier
        this.driftPointsText.textContent = `${points} × ${this.driftPointsMultiplier.toFixed(1)}`;
        
        // Make sure we have camera access
        if (!this.camera) {
            // Find the camera in the scene if available
            const cameras = this.scene.children.filter(child => child.isCamera);
            if (cameras.length > 0) {
                this.camera = cameras[0];
            } else {
                // Position at center if no camera found
                this.driftPointsText.style.left = '50%';
                this.driftPointsText.style.top = '50%';
                return;
            }
        }
        
        // Update position to follow car
        const vector = new THREE.Vector3();
        vector.setFromMatrixPosition(this.mesh.matrixWorld);
        
        // Project 3D position to 2D screen coordinates
        vector.project(this.camera);
        
        // Convert to CSS coordinates
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight - 50; // Offset above car
        
        this.driftPointsText.style.transform = `translate(-50%, -50%) scale(${1 + points/500})`;
        this.driftPointsText.style.left = `${x}px`;
        this.driftPointsText.style.top = `${y}px`;
        
        // Change color based on multiplier
        const hue = Math.min(60, 10 + (this.driftPointsMultiplier * 10));
        this.driftPointsText.style.color = `hsl(${hue}, 100%, 50%)`;
    }
    
    // Remove drift points text
    removeDriftPointsText() {
        if (this.driftPointsText) {
            // Animate out before removing
            this.driftPointsText.style.transition = 'transform 0.3s ease-in, opacity 0.3s ease-in';
            this.driftPointsText.style.transform += ' scale(1.5)';
            this.driftPointsText.style.opacity = '0';
            
            setTimeout(() => {
                if (this.driftPointsText && this.driftPointsText.parentNode) {
                    document.body.removeChild(this.driftPointsText);
                    this.driftPointsText = null;
                }
            }, 300);
        }
    }
    
    // Restart the car to its initial position
    restart() {
        // Reset position and rotation
        this.mesh.position.copy(this.initialPosition);
        this.mesh.rotation.y = this.initialRotation;
        
        // Reset physics state
        this.velocity = 0;
        this.velocityVector.set(0, 0, 0);
        this.isDrifting = false;
        this.isAccelerating = false;
        this.isBraking = false;
        this.steeringAngle = 0;
        this.driftDuration = 0;
        this.driftIntensity = 0;
        
        // Reset nitro
        this.currentNitro = this.nitroAmount;
        this.isNitroActive = false;
        
        // Reset scores
        this.activeDriftPoints = 0;
        this.removeDriftPointsText();
        
        // Restore original car colors
        this.restoreCarColors();
        
        // Reset collision state
        this.isCollided = false;
        this.collisionTimer = 0;
        
        // Reset drift effects
        this.driftEffect.stopDrift();
        
        // Clean up any remaining nitro particles
        this.cleanupNitroParticles();
    }
} 