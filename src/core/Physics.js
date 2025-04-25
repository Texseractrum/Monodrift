import * as THREE from 'three';

export class Physics {
    constructor() {
        this.gravity = 9.8;
        this.friction = 0.95; // Regular friction
        this.driftFriction = 0.995; // Almost no friction during drifting
        this.collisionObjects = [];
        
        // Raycaster for collision detection
        this.raycaster = new THREE.Raycaster();
    }
    
    addCollisionObject(object) {
        this.collisionObjects.push(object);
    }
    
    removeCollisionObject(object) {
        const index = this.collisionObjects.indexOf(object);
        if (index !== -1) {
            this.collisionObjects.splice(index, 1);
        }
    }
    
    checkCollisions(car, city) {
        // Check car collision with city objects
        // Use car's bounding box or sphere for quick checks
        if (!car.mesh || !city.colliders) return false;
        
        const carPosition = car.mesh.position.clone();
        const carDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(car.mesh.quaternion);
        
        // Set up raycaster from car position in the direction of movement
        this.raycaster.set(carPosition, carDirection);
        
        // Check collision with city objects
        const intersects = this.raycaster.intersectObjects(city.colliders, true);
        
        // If we hit something and it's close enough
        if (intersects.length > 0 && intersects[0].distance < car.collisionRadius) {
            this.handleCollision(car, intersects[0]);
            return true;
        }
        
        return false;
    }
    
    handleCollision(car, collision) {
        // Reduce speed significantly
        car.velocity *= 0.3;
        
        // Apply small bounce back
        const normal = collision.face ? collision.face.normal : new THREE.Vector3(0, 0, 1);
        const reflectionFactor = 0.5;
        
        car.velocityVector.reflect(normal).multiplyScalar(reflectionFactor);
        
        // Trigger crash effect and collision recovery
        car.triggerCrash();
        
        // Return true to indicate a collision was handled
        return true;
    }
    
    applyFriction(car, deltaTime, isDrifting) {
        // When drifting, apply much less friction to maintain speed
        let frictionFactor;
        
        if (isDrifting) {
            // Higher friction factor (closer to 1.0) = less slowdown
            frictionFactor = this.driftFriction;
            
            // Apply a strong forward momentum boost to counteract drift slowdown
            // This ensures the car maintains most of its speed during drifts
            if (car.velocity > 0) {
                const forwardBoost = 0.25 * deltaTime * car.velocity;
                car.velocity = Math.min(car.velocity + forwardBoost, car.maxSpeed);
            }
        } else {
            // Regular friction when not drifting
            frictionFactor = this.friction;
        }
        
        // Apply the appropriate friction to the velocity vector
        car.velocityVector.multiplyScalar(frictionFactor);
    }
    
    // Calculate physics for drifting - simplified version
    calculateDrift(car, steeringAngle, isDrifting, deltaTime) {
        if (isDrifting) {
            // Get car's orientation directions
            const carForwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(car.mesh.quaternion);
            const carRightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(car.mesh.quaternion);
            
            // Simplify the drift calculation - apply a basic sideways force based on steering
            // Maintain more of the forward momentum regardless of turning
            
            // Calculate basic sideways force proportional to steering input and speed
            const lateralForce = carRightDir.clone().multiplyScalar(
                steeringAngle * 3.0 * Math.abs(car.velocity) * 0.04 * deltaTime
            );
            
            // Apply strong forward force to maintain momentum in car's forward direction
            const forwardForce = carForwardDir.clone().multiplyScalar(
                Math.abs(car.velocity) * 0.2 * deltaTime
            );
            
            // Apply forces to velocity vector
            car.velocityVector.add(lateralForce);
            car.velocityVector.add(forwardForce);
            
            // Limit the angle between car direction and velocity to prevent spinning
            const velocityDir = car.velocityVector.clone().normalize();
            const currentAngle = Math.acos(velocityDir.dot(carForwardDir));
            
            // If the angle is too large, gently nudge velocity back toward car direction
            if (currentAngle > Math.PI * 0.35) {
                const correction = carForwardDir.clone().multiplyScalar(
                    0.1 * deltaTime * Math.abs(car.velocity)
                );
                car.velocityVector.add(correction);
            }
            
            // Return drift intensity for visual effects
            return Math.abs(steeringAngle) * 3.0;
        }
        
        return 0;
    }
} 