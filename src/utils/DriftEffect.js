import * as THREE from 'three';

export class DriftEffect {
    constructor(scene, car) {
        this.scene = scene;
        this.car = car;
        
        this.particles = [];
        this.maxParticles = 150;
        this.particleLifespan = 2; // seconds
        
        // Tire trails
        this.skidMarks = [];
        this.maxSkidMarks = 300;
        
        // For continuous drift effect
        this.isDrifting = false;
        this.emissionRate = 0.02; // seconds between particle emissions
        this.timeSinceLastEmission = 0;
        
        // Setup initial materials
        this.setupParticleMaterial();
    }
    
    setupParticleMaterial() {
        // Create a white particle material for smoke
        this.particleMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.7
        });
        
        // Material for skid marks (tire trails)
        this.skidMarkMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });
    }
    
    update(deltaTime, driftForce, position, rotation) {
        this.isDrifting = true;
        this.timeSinceLastEmission += deltaTime;
        
        // Update existing particles
        this.updateParticles(deltaTime);
        
        // Create new particles based on emission rate
        if (this.timeSinceLastEmission >= this.emissionRate) {
            this.timeSinceLastEmission = 0;
            this.emitParticles(position, rotation, driftForce);
            this.createSkidMark(position, rotation);
        }
    }
    
    updateParticles(deltaTime) {
        // Update each particle's position, scale, and opacity
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update lifespan
            particle.life -= deltaTime;
            
            if (particle.life <= 0) {
                // Remove dead particles
                this.scene.remove(particle.mesh);
                this.particles.splice(i, 1);
                continue;
            }
            
            // Fade out based on remaining life
            const lifeRatio = particle.life / this.particleLifespan;
            particle.mesh.material.opacity = 0.7 * lifeRatio;
            
            // Grow slightly over time
            particle.mesh.scale.set(
                particle.initialScale + (1 - lifeRatio) * 2,
                particle.initialScale + (1 - lifeRatio) * 2,
                particle.initialScale + (1 - lifeRatio) * 2
            );
            
            // Move slightly based on velocity
            particle.mesh.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
        }
        
        // Fade out skid marks over time
        for (let i = this.skidMarks.length - 1; i >= 0; i--) {
            const skid = this.skidMarks[i];
            
            skid.life -= deltaTime * 0.2; // Skid marks fade slower than smoke
            
            if (skid.life <= 0) {
                this.scene.remove(skid.mesh);
                this.skidMarks.splice(i, 1);
                continue;
            }
            
            // Fade out opacity
            skid.mesh.material.opacity = 0.8 * (skid.life / this.particleLifespan);
        }
    }
    
    emitParticles(position, rotation, driftForce) {
        // Create smoke particles at the car's tire positions
        
        // Calculate the positions of the rear tires
        const rightRearPos = new THREE.Vector3(
            position.x + Math.cos(rotation.y - Math.PI/2) * 0.5,
            position.y,
            position.z + Math.sin(rotation.y - Math.PI/2) * 0.5
        );
        
        const leftRearPos = new THREE.Vector3(
            position.x + Math.cos(rotation.y + Math.PI/2) * 0.5,
            position.y,
            position.z + Math.sin(rotation.y + Math.PI/2) * 0.5
        );
        
        // Adjust emission based on drift force
        const particleCount = Math.ceil(driftForce * 3) + 1;
        
        // Create particles
        for (let i = 0; i < particleCount; i++) {
            // Alternate between left and right tires
            const tirePos = i % 2 === 0 ? rightRearPos : leftRearPos;
            
            this.createParticle(tirePos, driftForce);
        }
    }
    
    createParticle(position, driftForce) {
        // Limit total particles
        if (this.particles.length >= this.maxParticles) {
            // Remove oldest particle
            const oldest = this.particles.shift();
            this.scene.remove(oldest.mesh);
        }
        
        // Create smoke particle geometry
        const size = 0.1 + Math.random() * 0.2;
        const geometry = new THREE.PlaneGeometry(size, size);
        
        // Clone the material to avoid affecting other particles
        const material = this.particleMaterial.clone();
        
        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);
        
        // Position at the tire
        mesh.position.copy(position);
        mesh.position.y += 0.1 + Math.random() * 0.1; // Slightly above ground
        
        // Rotate to face camera (billboard)
        mesh.rotation.x = -Math.PI / 2; // Horizontal
        
        // Random rotation for variety
        mesh.rotation.z = Math.random() * Math.PI * 2;
        
        // Add to scene
        this.scene.add(mesh);
        
        // Add to particles array with properties
        this.particles.push({
            mesh: mesh,
            life: this.particleLifespan,
            initialScale: size,
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                0.1 + Math.random() * 0.2,
                (Math.random() - 0.5) * 0.2
            )
        });
    }
    
    createSkidMark(position, rotation) {
        // Limit total skid marks
        if (this.skidMarks.length >= this.maxSkidMarks) {
            // Remove oldest skid mark
            const oldest = this.skidMarks.shift();
            this.scene.remove(oldest.mesh);
        }
        
        // Calculate the positions of the rear tires
        const rightRearPos = new THREE.Vector3(
            position.x + Math.cos(rotation.y - Math.PI/2) * 0.5,
            0.02, // Just above ground
            position.z + Math.sin(rotation.y - Math.PI/2) * 0.5
        );
        
        const leftRearPos = new THREE.Vector3(
            position.x + Math.cos(rotation.y + Math.PI/2) * 0.5,
            0.02,
            position.z + Math.sin(rotation.y + Math.PI/2) * 0.5
        );
        
        // Create skid marks for both tires
        this.createSingleSkidMark(rightRearPos, rotation);
        this.createSingleSkidMark(leftRearPos, rotation);
    }
    
    createSingleSkidMark(position, rotation) {
        // Create a small rectangular plane for the skid mark
        const geometry = new THREE.PlaneGeometry(0.15, 0.5);
        const material = this.skidMarkMaterial.clone();
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Position on the ground
        mesh.position.copy(position);
        
        // Rotate to lie flat on the ground and align with car direction
        mesh.rotation.x = -Math.PI / 2;
        mesh.rotation.z = rotation.y;
        
        this.scene.add(mesh);
        
        // Add to skid marks array
        this.skidMarks.push({
            mesh: mesh,
            life: this.particleLifespan * 2 // Skid marks last longer
        });
    }
    
    fade(deltaTime) {
        this.isDrifting = false;
        
        // Just update existing particles, but don't create new ones
        this.updateParticles(deltaTime);
    }
    
    stopDrift() {
        this.isDrifting = false;
    }
} 