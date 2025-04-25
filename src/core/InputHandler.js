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
    }
    
    setupListeners() {
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
    }
    
    handleKeyDown(event) {
        switch(event.code) {
            case 'Space':
                this.keys.space = true;
                break;
            case 'ArrowUp':
                this.keys.arrowUp = true;
                break;
            case 'KeyW':
                this.keys.w = true;
                break;
            case 'ArrowDown':
                this.keys.arrowDown = true;
                break;
            case 'KeyS':
                this.keys.s = true;
                break;
            case 'ArrowLeft':
                this.keys.arrowLeft = true;
                break;
            case 'KeyA':
                this.keys.a = true;
                break;
            case 'ArrowRight':
                this.keys.arrowRight = true;
                break;
            case 'KeyD':
                this.keys.d = true;
                break;
            case 'KeyR':
                this.keys.r = true;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.keys.shift = true;
                break;
        }
    }
    
    handleKeyUp(event) {
        switch(event.code) {
            case 'Space':
                this.keys.space = false;
                break;
            case 'ArrowUp':
                this.keys.arrowUp = false;
                break;
            case 'KeyW':
                this.keys.w = false;
                break;
            case 'ArrowDown':
                this.keys.arrowDown = false;
                break;
            case 'KeyS':
                this.keys.s = false;
                break;
            case 'ArrowLeft':
                this.keys.arrowLeft = false;
                break;
            case 'KeyA':
                this.keys.a = false;
                break;
            case 'ArrowRight':
                this.keys.arrowRight = false;
                break;
            case 'KeyD':
                this.keys.d = false;
                break;
            case 'KeyR':
                this.keys.r = false;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.keys.shift = false;
                break;
        }
    }
    
    update() {
        // Store current key state for next frame comparison
        this.previousKeys = {...this.keys};
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