export class InputHandler {
    constructor() {
        this.keys = {
            space: false,
            arrowUp: false,
            arrowDown: false,
            arrowLeft: false,
            arrowRight: false,
            w: false,
            a: false,
            s: false,
            d: false,
            r: false,
            shift: false
        };
        
        this.previousKeys = {...this.keys};
        
        // Mobile controls state
        this.isMobile = this.detectMobile();
        this.touchControls = {
            active: false,
            joystick: {
                active: false,
                startX: 0,
                startY: 0,
                moveX: 0,
                moveY: 0,
                element: null
            },
            buttons: {
                brake: false,
                nitro: false,
                drift: false,
                restart: false
            }
        };
    }
    
    setupListeners() {
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Setup mobile controls if on mobile device
        if (this.isMobile) {
            this.setupMobileControls();
        }
        
        // Handle window resize for mobile controls
        window.addEventListener('resize', () => {
            if (this.isMobile) {
                this.updateMobileControlPositions();
            }
        });
    }
    
    detectMobile() {
        return ('ontouchstart' in window) || 
            (navigator.maxTouchPoints > 0) || 
            (navigator.msMaxTouchPoints > 0);
    }
    
    setupMobileControls() {
        // Create touch controls container
        const touchContainer = document.createElement('div');
        touchContainer.id = 'touch-controls';
        touchContainer.style.position = 'absolute';
        touchContainer.style.left = '0';
        touchContainer.style.top = '0';
        touchContainer.style.width = '100%';
        touchContainer.style.height = '100%';
        touchContainer.style.zIndex = '1000';
        touchContainer.style.pointerEvents = 'none';
        document.body.appendChild(touchContainer);
        
        // Create virtual joystick
        this.createJoystick(touchContainer);
        
        // Create action buttons
        this.createActionButtons(touchContainer);
        
        this.touchControls.active = true;
    }
    
    createJoystick(container) {
        // Create joystick container
        const joystickContainer = document.createElement('div');
        joystickContainer.id = 'joystick-container';
        joystickContainer.style.position = 'absolute';
        joystickContainer.style.left = '100px';
        joystickContainer.style.bottom = '100px';
        joystickContainer.style.width = '150px';
        joystickContainer.style.height = '150px';
        joystickContainer.style.borderRadius = '50%';
        joystickContainer.style.background = 'rgba(255, 255, 255, 0.2)';
        joystickContainer.style.border = '2px solid rgba(255, 255, 255, 0.4)';
        joystickContainer.style.pointerEvents = 'all';
        joystickContainer.style.touchAction = 'none';
        
        // Create joystick stick
        const joystickStick = document.createElement('div');
        joystickStick.id = 'joystick-stick';
        joystickStick.style.position = 'absolute';
        joystickStick.style.left = '50%';
        joystickStick.style.top = '50%';
        joystickStick.style.transform = 'translate(-50%, -50%)';
        joystickStick.style.width = '70px';
        joystickStick.style.height = '70px';
        joystickStick.style.borderRadius = '50%';
        joystickStick.style.background = 'rgba(255, 255, 255, 0.6)';
        joystickStick.style.border = '2px solid rgba(255, 255, 255, 0.8)';
        
        joystickContainer.appendChild(joystickStick);
        container.appendChild(joystickContainer);
        
        this.touchControls.joystick.element = joystickStick;
        
        // Add event listeners for joystick
        joystickContainer.addEventListener('touchstart', this.handleJoystickStart.bind(this));
        joystickContainer.addEventListener('touchmove', this.handleJoystickMove.bind(this));
        joystickContainer.addEventListener('touchend', this.handleJoystickEnd.bind(this));
    }
    
    createActionButtons(container) {
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.id = 'button-container';
        buttonContainer.style.position = 'absolute';
        buttonContainer.style.right = '50px';
        buttonContainer.style.bottom = '100px';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.flexDirection = 'column';
        buttonContainer.style.gap = '20px';
        
        // Create action buttons
        const buttons = [
            { id: 'nitro-button', label: 'NITRO', action: 'nitro' },
            { id: 'drift-button', label: 'DRIFT', action: 'drift' },
            { id: 'brake-button', label: 'BRAKE', action: 'brake' }
        ];
        
        buttons.forEach(btn => {
            const button = document.createElement('div');
            button.id = btn.id;
            button.textContent = btn.label;
            button.style.width = '100px';
            button.style.height = '100px';
            button.style.borderRadius = '50%';
            button.style.background = 'rgba(255, 255, 255, 0.2)';
            button.style.border = '2px solid rgba(255, 255, 255, 0.4)';
            button.style.display = 'flex';
            button.style.justifyContent = 'center';
            button.style.alignItems = 'center';
            button.style.fontSize = '16px';
            button.style.fontWeight = 'bold';
            button.style.color = '#fff';
            button.style.textShadow = '1px 1px 1px rgba(0, 0, 0, 0.5)';
            button.style.pointerEvents = 'all';
            button.style.userSelect = 'none';
            button.style.touchAction = 'none';
            
            // Add event listeners for buttons
            button.addEventListener('touchstart', () => this.handleButtonPress(btn.action, true));
            button.addEventListener('touchend', () => this.handleButtonPress(btn.action, false));
            
            buttonContainer.appendChild(button);
        });
        
        // Add small restart button in top right
        const restartButton = document.createElement('div');
        restartButton.id = 'restart-button';
        restartButton.textContent = 'R';
        restartButton.style.position = 'absolute';
        restartButton.style.top = '20px';
        restartButton.style.right = '20px';
        restartButton.style.width = '50px';
        restartButton.style.height = '50px';
        restartButton.style.borderRadius = '50%';
        restartButton.style.background = 'rgba(255, 0, 0, 0.3)';
        restartButton.style.border = '2px solid rgba(255, 255, 255, 0.4)';
        restartButton.style.display = 'flex';
        restartButton.style.justifyContent = 'center';
        restartButton.style.alignItems = 'center';
        restartButton.style.fontSize = '18px';
        restartButton.style.fontWeight = 'bold';
        restartButton.style.color = '#fff';
        restartButton.style.pointerEvents = 'all';
        
        restartButton.addEventListener('touchstart', () => this.handleButtonPress('restart', true));
        restartButton.addEventListener('touchend', () => this.handleButtonPress('restart', false));
        
        // Add leaderboard button for mobile
        const leaderboardButton = document.createElement('div');
        leaderboardButton.id = 'mobile-leaderboard-button';
        leaderboardButton.textContent = 'L';
        leaderboardButton.style.position = 'absolute';
        leaderboardButton.style.top = '20px';
        leaderboardButton.style.left = '20px';
        leaderboardButton.style.width = '50px';
        leaderboardButton.style.height = '50px';
        leaderboardButton.style.borderRadius = '50%';
        leaderboardButton.style.background = 'rgba(255, 204, 0, 0.3)';
        leaderboardButton.style.border = '2px solid rgba(255, 255, 255, 0.4)';
        leaderboardButton.style.display = 'flex';
        leaderboardButton.style.justifyContent = 'center';
        leaderboardButton.style.alignItems = 'center';
        leaderboardButton.style.fontSize = '18px';
        leaderboardButton.style.fontWeight = 'bold';
        leaderboardButton.style.color = '#fff';
        leaderboardButton.style.pointerEvents = 'all';
        
        leaderboardButton.addEventListener('touchstart', () => {
            // Dispatch a custom event to toggle the leaderboard
            document.dispatchEvent(new CustomEvent('toggleLeaderboard'));
        });
        
        container.appendChild(buttonContainer);
        container.appendChild(restartButton);
        container.appendChild(leaderboardButton);
    }
    
    handleJoystickStart(event) {
        event.preventDefault();
        const touch = event.touches[0];
        const joystickRect = event.target.getBoundingClientRect();
        
        this.touchControls.joystick.active = true;
        this.touchControls.joystick.startX = joystickRect.left + joystickRect.width / 2;
        this.touchControls.joystick.startY = joystickRect.top + joystickRect.height / 2;
        
        this.handleJoystickMove(event);
    }
    
    handleJoystickMove(event) {
        if (!this.touchControls.joystick.active) return;
        event.preventDefault();
        
        const touch = event.touches[0];
        const deltaX = touch.clientX - this.touchControls.joystick.startX;
        const deltaY = touch.clientY - this.touchControls.joystick.startY;
        
        // Calculate distance from center
        const distance = Math.min(50, Math.sqrt(deltaX * deltaX + deltaY * deltaY));
        const angle = Math.atan2(deltaY, deltaX);
        
        // Calculate new position with constraints
        const moveX = Math.cos(angle) * distance;
        const moveY = Math.sin(angle) * distance;
        
        // Update joystick visual position
        if (this.touchControls.joystick.element) {
            this.touchControls.joystick.element.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
        }
        
        // Update joystick state
        this.touchControls.joystick.moveX = moveX;
        this.touchControls.joystick.moveY = moveY;
        
        // Convert joystick position to key presses
        this.keys.arrowUp = moveY < -15;
        this.keys.arrowDown = moveY > 15;
        this.keys.arrowLeft = moveX < -15;
        this.keys.arrowRight = moveX > 15;
        
        // Also update WASD
        this.keys.w = this.keys.arrowUp;
        this.keys.s = this.keys.arrowDown;
        this.keys.a = this.keys.arrowLeft;
        this.keys.d = this.keys.arrowRight;
    }
    
    handleJoystickEnd(event) {
        event.preventDefault();
        this.touchControls.joystick.active = false;
        
        // Reset joystick position
        if (this.touchControls.joystick.element) {
            this.touchControls.joystick.element.style.transform = 'translate(-50%, -50%)';
        }
        
        // Reset key states
        this.keys.arrowUp = false;
        this.keys.arrowDown = false;
        this.keys.arrowLeft = false;
        this.keys.arrowRight = false;
        this.keys.w = false;
        this.keys.s = false;
        this.keys.a = false;
        this.keys.d = false;
    }
    
    handleButtonPress(action, isPressed) {
        switch (action) {
            case 'nitro':
                this.keys.shift = isPressed;
                this.touchControls.buttons.nitro = isPressed;
                break;
            case 'drift':
                this.keys.space = isPressed;
                this.touchControls.buttons.drift = isPressed;
                break;
            case 'brake':
                this.keys.arrowDown = isPressed;
                this.keys.s = isPressed;
                this.touchControls.buttons.brake = isPressed;
                break;
            case 'restart':
                this.keys.r = isPressed;
                this.touchControls.buttons.restart = isPressed;
                break;
        }
        
        // Visual feedback for button press
        const buttonId = `${action}-button`;
        const button = document.getElementById(buttonId);
        if (button) {
            if (isPressed) {
                button.style.background = 'rgba(255, 255, 255, 0.5)';
                button.style.transform = 'scale(0.95)';
            } else {
                button.style.background = 'rgba(255, 255, 255, 0.2)';
                button.style.transform = 'scale(1.0)';
            }
        }
    }
    
    updateMobileControlPositions() {
        // Adjust controls based on new screen size
        const joystickContainer = document.getElementById('joystick-container');
        const buttonContainer = document.getElementById('button-container');
        
        if (joystickContainer) {
            // Adjust joystick position based on screen size
            if (window.innerWidth < 768) {
                joystickContainer.style.left = '50px';
                joystickContainer.style.bottom = '80px';
            } else {
                joystickContainer.style.left = '100px';
                joystickContainer.style.bottom = '100px';
            }
        }
        
        if (buttonContainer) {
            // Adjust button container position
            if (window.innerWidth < 768) {
                buttonContainer.style.right = '30px';
                buttonContainer.style.bottom = '80px';
            } else {
                buttonContainer.style.right = '50px';
                buttonContainer.style.bottom = '100px';
            }
        }
    }
    
    handleKeyDown(event) {
        switch (event.key) {
            case 'ArrowUp':
                this.keys.arrowUp = true;
                break;
            case 'ArrowDown':
                this.keys.arrowDown = true;
                break;
            case 'ArrowLeft':
                this.keys.arrowLeft = true;
                break;
            case 'ArrowRight':
                this.keys.arrowRight = true;
                break;
            case 'w':
            case 'W':
                this.keys.w = true;
                break;
            case 'a':
            case 'A':
                this.keys.a = true;
                break;
            case 's':
            case 'S':
                this.keys.s = true;
                break;
            case 'd':
            case 'D':
                this.keys.d = true;
                break;
            case 'r':
            case 'R':
                this.keys.r = true;
                break;
            case ' ':
                this.keys.space = true;
                break;
            case 'Shift':
                this.keys.shift = true;
                break;
        }
    }
    
    handleKeyUp(event) {
        switch (event.key) {
            case 'ArrowUp':
                this.keys.arrowUp = false;
                break;
            case 'ArrowDown':
                this.keys.arrowDown = false;
                break;
            case 'ArrowLeft':
                this.keys.arrowLeft = false;
                break;
            case 'ArrowRight':
                this.keys.arrowRight = false;
                break;
            case 'w':
            case 'W':
                this.keys.w = false;
                break;
            case 'a':
            case 'A':
                this.keys.a = false;
                break;
            case 's':
            case 'S':
                this.keys.s = false;
                break;
            case 'd':
            case 'D':
                this.keys.d = false;
                break;
            case 'r':
            case 'R':
                this.keys.r = false;
                break;
            case ' ':
                this.keys.space = false;
                break;
            case 'Shift':
                this.keys.shift = false;
                break;
        }
    }
    
    update() {
        // Store current key state for next frame comparison
        this.previousKeys = {...this.keys};
        
        // Update joystick values if using mobile controls
        if (this.isMobile && this.touchControls.joystick.active) {
            // This is handled in the touch event handlers
        }
    }
    
    isKeyPressed(key) {
        return this.keys[key];
    }
    
    isKeyJustPressed(key) {
        return this.keys[key] && !this.previousKeys[key];
    }
    
    isKeyJustReleased(key) {
        return !this.keys[key] && this.previousKeys[key];
    }
} 