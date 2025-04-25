import * as THREE from 'three';

export class City {
    constructor(scene) {
        this.scene = scene;
        this.roadWidth = 15;   // Wider roads for drifting
        this.trackSize = 200;  // Larger open area
        this.buildings = [];
        this.roads = [];
        this.colliders = []; // For collision detection
        this.obstacles = []; // Special obstacles
        this.walls = []; // Boundary walls
        
        // Generate initial track
        this.generateTrack();
    }
    
    generateTrack() {
        // Create ground plane
        this.createGround();
        
        // Create boundary walls
        this.createBoundaryWalls();
        
        // Create drifting track elements
        this.createDriftingTrack();
        
        // Add track markings and decorations
        this.createTrackDecorations();
    }
    
    createGround() {
        // Create a large asphalt-like ground plane with texture
        const groundSize = this.trackSize * 1.5;
        const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
        
        // Create asphalt texture
        const gridSize = 1024;
        const gridCanvas = document.createElement('canvas');
        gridCanvas.width = gridSize;
        gridCanvas.height = gridSize;
        const ctx = gridCanvas.getContext('2d');
        
        // Fill with dark asphalt color
        ctx.fillStyle = '#222222';
        ctx.fillRect(0, 0, gridSize, gridSize);
        
        // Add some noise/grain for realism
        ctx.fillStyle = '#1a1a1a';
        for (let i = 0; i < 50000; i++) {
            const x = Math.random() * gridSize;
            const y = Math.random() * gridSize;
            const size = Math.random() * 2 + 1;
            ctx.fillRect(x, y, size, size);
        }
        
        const asphaltTexture = new THREE.CanvasTexture(gridCanvas);
        asphaltTexture.wrapS = THREE.RepeatWrapping;
        asphaltTexture.wrapT = THREE.RepeatWrapping;
        asphaltTexture.repeat.set(groundSize / 50, groundSize / 50);
        
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            roughness: 0.9,
            metalness: 0.1,
            map: asphaltTexture
        });
        
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        ground.position.y = -0.01; // Slightly below everything else
        ground.receiveShadow = true;
        
        this.scene.add(ground);
    }
    
    createBoundaryWalls() {
        // Create low walls around the track
        const wallHeight = 1.5;
        const wallThickness = 1;
        const wallLength = this.trackSize + wallThickness * 2;
        
        const wallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, wallLength);
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xff3333,
            roughness: 0.5,
            metalness: 0.2,
            emissive: 0x330000,
            emissiveIntensity: 0.2
        });
        
        // Create walls on all four sides
        const wallPositions = [
            { x: -this.trackSize/2, z: 0, rotY: 0 }, // Left wall
            { x: this.trackSize/2, z: 0, rotY: 0 },  // Right wall
            { x: 0, z: -this.trackSize/2, rotY: Math.PI / 2 }, // Front wall
            { x: 0, z: this.trackSize/2, rotY: Math.PI / 2 }   // Back wall
        ];
        
        wallPositions.forEach(pos => {
            const wall = new THREE.Mesh(wallGeometry, wallMaterial);
            wall.position.set(pos.x, wallHeight / 2, pos.z);
            wall.rotation.y = pos.rotY;
            wall.castShadow = true;
            wall.receiveShadow = true;
            
            this.scene.add(wall);
            this.walls.push(wall);
            this.colliders.push(wall);
        });
        
        // Add reflective striping on top of walls
        const stripeGeometry = new THREE.BoxGeometry(wallLength, 0.2, 0.3);
        const stripeMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.3,
            metalness: 0.8,
            emissive: 0xffffff,
            emissiveIntensity: 0.5
        });
        
        wallPositions.forEach(pos => {
            const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
            stripe.position.set(pos.x, wallHeight, pos.z);
            stripe.rotation.y = pos.rotY + Math.PI / 2;
            stripe.castShadow = true;
            
            this.scene.add(stripe);
        });
    }
    
    createDriftingTrack() {
        // Create track material
        const trackMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444,
            roughness: 0.7,
            metalness: 0.2
        });
        
        // Create a large figure-8 track in the center
        this.createFigureEight(0, 0, 70, 50, trackMaterial);
        
        // Create symmetrical drift circles on either side
        this.createDriftCircle(-60, -60, 25, trackMaterial);
        this.createDriftCircle(60, -60, 25, trackMaterial);
        
        // Create symmetrical banked curves on both sides
        this.createBankedCurve(-60, 60, Math.PI / 2, 25, 15);
        this.createBankedCurve(60, 60, Math.PI / 2, 25, 15);
        
        // Add some track decoration obstacles in symmetrical patterns
        this.createTrackObstacles();
    }
    
    createFigureEight(x, z, width, height, material) {
        // Create a figure-8 track with two circles
        const circle1Center = new THREE.Vector2(x - width/4, z);
        const circle2Center = new THREE.Vector2(x + width/4, z);
        const radius = width/4;
        
        // Create the track path
        const path = new THREE.Shape();
        
        // Outer edge of figure 8
        path.moveTo(x, z - height/2);
        path.absarc(circle1Center.x, circle1Center.y, radius, -Math.PI/2, Math.PI/2, false);
        path.absarc(circle2Center.x, circle2Center.y, radius, Math.PI/2, -Math.PI/2, false);
        path.closePath();
        
        // Inner edge (hole)
        const innerRadius = radius * 0.7;
        const hole1 = new THREE.Path();
        hole1.absarc(circle1Center.x, circle1Center.y, innerRadius, 0, 2 * Math.PI, true);
        path.holes.push(hole1);
        
        const hole2 = new THREE.Path();
        hole2.absarc(circle2Center.x, circle2Center.y, innerRadius, 0, 2 * Math.PI, true);
        path.holes.push(hole2);
        
        const geometry = new THREE.ShapeGeometry(path, 50);
        const track = new THREE.Mesh(geometry, material);
        track.rotation.x = -Math.PI / 2;
        track.position.y = 0.02;
        track.receiveShadow = true;
        
        this.scene.add(track);
        this.roads.push(track);
        
        // Add center markers for the circles
        this.addCircleMarker(circle1Center.x, circle1Center.y, 1);
        this.addCircleMarker(circle2Center.x, circle2Center.y, 1);
    }
    
    createDriftCircle(x, z, radius, material) {
        // Create a circular drift track
        const outerRadius = radius;
        const innerRadius = radius * 0.6;
        
        const path = new THREE.Shape();
        path.absarc(x, z, outerRadius, 0, 2 * Math.PI, false);
        
        // Inner edge (hole)
        const hole = new THREE.Path();
        hole.absarc(x, z, innerRadius, 0, 2 * Math.PI, true);
        path.holes.push(hole);
        
        const geometry = new THREE.ShapeGeometry(path, 50);
        const track = new THREE.Mesh(geometry, material);
        track.rotation.x = -Math.PI / 2;
        track.position.y = 0.02;
        track.receiveShadow = true;
        
        this.scene.add(track);
        this.roads.push(track);
        
        // Add center marker
        this.addCircleMarker(x, z, 1);
    }
    
    addCircleMarker(x, z, radius) {
        // Add a small marker in the center of a circle/curve
        const markerGeometry = new THREE.CylinderGeometry(radius, radius, 0.2, 16);
        const markerMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.3,
            emissive: 0xffffff,
            emissiveIntensity: 0.5
        });
        
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.set(x, 0.1, z);
        marker.castShadow = true;
        marker.receiveShadow = true;
        
        this.scene.add(marker);
    }
    
    createBankedCurve(x, z, angle, radius, width) {
        // Create a banked curve for drifting
        const curveRadius = radius;
        const curveWidth = width;
        const bankAngle = Math.PI / 6; // More pronounced banking for better drifting
        
        // Create a curved road segment with custom geometry
        const segments = 16;
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const indices = [];
        const uvs = [];
        
        // Create vertices for the curved, banked road
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const segmentAngle = angle * t;
            
            const innerRadius = curveRadius - curveWidth / 2;
            const outerRadius = curveRadius + curveWidth / 2;
            
            // Inner edge
            const ix = innerRadius * Math.cos(segmentAngle);
            const iz = innerRadius * Math.sin(segmentAngle);
            
            // Outer edge (with banking)
            const ox = outerRadius * Math.cos(segmentAngle);
            const oz = outerRadius * Math.sin(segmentAngle);
            const bankHeight = Math.sin(bankAngle) * curveWidth;
            
            vertices.push(
                x + ix, 0.05, z + iz,               // Inner vertex
                x + ox, 0.05 + bankHeight, z + oz   // Outer vertex
            );
            
            uvs.push(
                0, t,  // Inner vertex
                1, t   // Outer vertex
            );
            
            // Add faces (two triangles per segment)
            if (i < segments) {
                const baseIndex = i * 2;
                indices.push(
                    baseIndex, baseIndex + 1, baseIndex + 2,
                    baseIndex + 1, baseIndex + 3, baseIndex + 2
                );
            }
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        const roadMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444,
            roughness: 0.7,
            metalness: 0.2
        });
        
        const curvedRoad = new THREE.Mesh(geometry, roadMaterial);
        curvedRoad.castShadow = true;
        curvedRoad.receiveShadow = true;
        
        this.scene.add(curvedRoad);
        this.roads.push(curvedRoad);
    }
    
    createTrackObstacles() {
        // Create symmetrical obstacles for the track
        this.createCones();
        this.createJumpRamps();
    }
    
    createCones() {
        // Create traffic cones to mark the track in a symmetrical pattern
        const coneGeometry = new THREE.ConeGeometry(0.5, 1.5, 8);
        const coneMaterial = new THREE.MeshStandardMaterial({
            color: 0xff5500,
            roughness: 0.5,
            emissive: 0xff2200,
            emissiveIntensity: 0.3
        });
        
        // Place cones in symmetrical positions
        const conePositions = [
            // Figure-8 markings
            {x: -20, z: 0}, {x: 20, z: 0},
            {x: 0, z: -20}, {x: 0, z: 20},
            
            // Drift circle markings
            {x: -60, z: -60}, {x: 60, z: -60},
            
            // Banked curve markings
            {x: -60, z: 60}, {x: 60, z: 60}
        ];
        
        conePositions.forEach(pos => {
            const cone = new THREE.Mesh(coneGeometry, coneMaterial);
            cone.position.set(pos.x, 0.75, pos.z);
            cone.castShadow = true;
            cone.receiveShadow = true;
            
            this.scene.add(cone);
            this.obstacles.push(cone);
            this.colliders.push(cone);
        });
    }
    
    createJumpRamps() {
        // Create two symmetrical jump ramps
        const rampLength = 10;
        const rampWidth = 15;
        const rampHeight = 2;
        
        // Create ramp geometry
        const rampGeometry = new THREE.BoxGeometry(rampWidth, rampHeight, rampLength);
        
        // Position vertices to create slope
        const positionAttribute = rampGeometry.getAttribute('position');
        
        for (let i = 0; i < positionAttribute.count; i++) {
            const y = positionAttribute.getY(i);
            const z = positionAttribute.getZ(i);
            
            if (z > 0) {
                // Raise the back of the ramp
                positionAttribute.setY(i, y + rampHeight);
            }
        }
        
        rampGeometry.computeVertexNormals();
        
        // Create ramp material
        const rampMaterial = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa,
            roughness: 0.5,
            metalness: 0.7
        });
        
        // Create symmetrical ramps on both sides
        const rampPositions = [
            {x: -30, z: -70},
            {x: 30, z: -70}
        ];
        
        rampPositions.forEach(pos => {
            const ramp = new THREE.Mesh(rampGeometry, rampMaterial);
            ramp.position.set(pos.x, rampHeight / 2, pos.z);
            ramp.castShadow = true;
            ramp.receiveShadow = true;
            
            this.scene.add(ramp);
            this.obstacles.push(ramp);
            this.colliders.push(ramp);
        });
    }
    
    createTrackDecorations() {
        // Add drift track markings and decorations
        this.createTrackLines();
        this.createStartingGrid();
    }
    
    createTrackLines() {
        // Create white lines on the track for orientation in a symmetrical pattern
        const lineWidth = 0.5;
        const lineHeight = 0.05;
        
        const lineMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.4,
            emissive: 0xaaaaaa,
            emissiveIntensity: 0.3
        });
        
        // Create symmetrical line segments
        const straightLines = [
            // Center cross
            {x: 0, z: 0, width: 150, length: lineWidth, rotation: 0},  // Center horizontal
            {x: 0, z: 0, width: lineWidth, length: 150, rotation: 0},  // Center vertical
            
            // Corner markings - symmetrical
            {x: -75, z: -75, width: 20, length: lineWidth, rotation: Math.PI / 4},
            {x: 75, z: -75, width: 20, length: lineWidth, rotation: -Math.PI / 4},
            {x: -75, z: 75, width: 20, length: lineWidth, rotation: -Math.PI / 4},
            {x: 75, z: 75, width: 20, length: lineWidth, rotation: Math.PI / 4},
            
            // Start line
            {x: 0, z: 80, width: 50, length: lineWidth, rotation: 0},
        ];
        
        straightLines.forEach(line => {
            const lineGeometry = new THREE.BoxGeometry(line.width, lineHeight, line.length);
            const lineMesh = new THREE.Mesh(lineGeometry, lineMaterial);
            lineMesh.position.set(line.x, 0.03, line.z);
            lineMesh.rotation.y = line.rotation;
            lineMesh.receiveShadow = true;
            
            this.scene.add(lineMesh);
        });
    }
    
    createStartingGrid() {
        // Create a starting grid with checkered pattern
        const gridWidth = 15;
        const gridLength = 8;
        const tileSize = 1;
        
        const whiteMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.4,
            emissive: 0xaaaaaa,
            emissiveIntensity: 0.2
        });
        
        const blackMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            roughness: 0.4
        });
        
        // Create checkered pattern at starting position
        for (let x = 0; x < gridWidth; x += tileSize) {
            for (let z = 0; z < gridLength; z += tileSize) {
                // Create checkered pattern
                const isWhite = (x + z) % 2 === 0;
                const material = isWhite ? whiteMaterial : blackMaterial;
                
                const tileGeometry = new THREE.BoxGeometry(tileSize, 0.05, tileSize);
                const tile = new THREE.Mesh(tileGeometry, material);
                
                // Position at starting line
                tile.position.set(
                    20 - gridWidth/2 + x + tileSize/2,
                    0.03,
                    80 + tileSize/2 + z
                );
                tile.receiveShadow = true;
                
                this.scene.add(tile);
            }
        }
    }
    
    update(playerPosition) {
        // No dynamic updates needed for now
    }
} 