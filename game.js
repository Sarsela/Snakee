const GAME_SPEED = 100;
const CANVAS_BORDER_COLOUR = 'black';
const CANVAS_BACKGROUND_COLOUR = "white";
const SNAKE_COLOUR = 'lightgreen';
const SNAKE_BORDER_COLOUR = 'darkgreen';
const FOOD_COLOUR = 'red';
const FOOD_BORDER_COLOUR = 'darkred';

let snake = [];
let score = 0;
let changingDirection = false;
let foodX;
let foodY;
let dx = 0;
let dy = 0;
let gameLoop = null;
let isGameRunning = false;
let isGameActive = false;
let cellSize = 20;
let gridSize = 15;

const gameCanvas = document.getElementById("gameCanvas");
let ctx;
const scoreElement = document.getElementById('score');
const gameStatusElement = document.getElementById('gameStatus');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const overlayButtons = document.querySelector('.overlay-buttons');
const gameContainer = document.getElementById('gameContainer');
const sizeInfo = document.getElementById('sizeInfo');
const resetSizeBtn = document.getElementById('resetSizeBtn');

function updateStatus(message, isError = false) {
    gameStatusElement.textContent = message;
    if (isError) {
        gameStatusElement.className = 'game-status game-over';
    } else if (isGameRunning && isGameActive) {
        gameStatusElement.className = 'game-status running';
    } else {
        gameStatusElement.className = 'game-status';
    }
}

function initCanvas() {
    const size = gameContainer.clientWidth;
    gameCanvas.width = size;
    gameCanvas.height = size;
    ctx = gameCanvas.getContext("2d");
    
    cellSize = size / gridSize;
    
    const wasRunning = isGameRunning;
    const wasActive = isGameActive;
    
    if (wasRunning) {
        isGameRunning = false;
        isGameActive = false;
        if (gameLoop) {
            clearTimeout(gameLoop);
            gameLoop = null;
        }
    }
    
    initSnake();
    
    if (wasRunning && wasActive) {
        createFood();
    } else {
        foodX = undefined;
        foodY = undefined;
    }
    
    clearCanvas();
    drawSnake();
    if (foodX !== undefined && foodY !== undefined) {
        drawFood();
    }
    
    if (wasRunning && wasActive) {
        isGameRunning = true;
        isGameActive = true;
        main();
    }
    
    updateSizeInfo();
}

function initSnake() {
    const centerX = Math.floor(gridSize / 2) * cellSize;
    const centerY = Math.floor(gridSize / 2) * cellSize;
    
    snake = [];
    for (let i = 0; i < 5; i++) {
        snake.push({
            x: centerX - i * cellSize,
            y: centerY
        });
    }
    
    dx = cellSize;
    dy = 0;
}

function updateSizeInfo() {
    const size = gameContainer.clientWidth;
    sizeInfo.textContent = `${size}x${size}`;
}

function resetSize() {
    const wasRunning = isGameRunning;
    if (wasRunning) {
        isGameRunning = false;
        isGameActive = false;
        if (gameLoop) {
            clearTimeout(gameLoop);
            gameLoop = null;
        }
    }
    
    gameContainer.style.width = '400px';
    gameContainer.style.height = '400px';
    
    const size = gameContainer.clientWidth;
    gameCanvas.width = size;
    gameCanvas.height = size;
    cellSize = size / gridSize;
    
    initSnake();
    
    foodX = undefined;
    foodY = undefined;
    
    clearCanvas();
    drawSnake();
    
    if (wasRunning) {
        createFood();
        isGameRunning = true;
        isGameActive = true;
        main();
    }
    
    updateSizeInfo();
}

function startGame() {
    if (isGameRunning) return;
    
    resetGameState();
    
    createFood();
    
    isGameRunning = true;
    isGameActive = true;
    
    overlayButtons.style.display = 'none';
    
    updateStatus('Игра идет...');
    
    clearCanvas();
    drawSnake();
    drawFood();
    
    main();
}

function resetGameState() {
    if (gameLoop) {
        clearTimeout(gameLoop);
        gameLoop = null;
    }
    
    initSnake();
    
    score = 0;
    changingDirection = false;
    isGameActive = true;
    
    scoreElement.innerHTML = score;
    foodX = undefined;
    foodY = undefined;
    
    clearCanvas();
    drawSnake();
}

function restartGame() {
    if (!isGameRunning) return;
    
    isGameRunning = false;
    isGameActive = false;
    
    if (gameLoop) {
        clearTimeout(gameLoop);
        gameLoop = null;
    }
    
    resetGameState();
    
    createFood();
    
    isGameRunning = true;
    isGameActive = true;
    
    updateStatus('Игра идет...');
    
    clearCanvas();
    drawSnake();
    drawFood();
    
    main();
}

function main() {
    if (!isGameRunning || !isGameActive) return;
    
    if (didGameEnd()) {
        gameOver();
        return;
    }
    
    gameLoop = setTimeout(function onTick() {
        changingDirection = false;
        clearCanvas();
        drawFood();
        advanceSnake();
        drawSnake();
        main();
    }, GAME_SPEED);
}

function advanceSnake() {
    const head = {x: snake[0].x + dx, y: snake[0].y + dy};
    snake.unshift(head);
    
    const didEatFood = foodX !== undefined && foodY !== undefined && 
                      Math.abs(snake[0].x - foodX) < 1 && Math.abs(snake[0].y - foodY) < 1;
    if (didEatFood) {
        score += 10;
        scoreElement.innerHTML = score;
        createFood();
    } else {
        snake.pop();
    }
}

function didGameEnd() {
    for (let i = 4; i < snake.length; i++) {
        if (Math.abs(snake[i].x - snake[0].x) < 1 && Math.abs(snake[i].y - snake[0].y) < 1) return true;
    }
    
    const hitLeftWall = snake[0].x < 0;
    const hitRightWall = snake[0].x >= gameCanvas.width;
    const hitTopWall = snake[0].y < 0;
    const hitBottomWall = snake[0].y >= gameCanvas.height;
    
    return hitLeftWall || hitRightWall || hitTopWall || hitBottomWall;
}

function createFood() {
    if (!isGameRunning && !isGameActive) {
        foodX = undefined;
        foodY = undefined;
        return;
    }
    
    const maxCells = gridSize - 1;
    let attempts = 0;
    const maxAttempts = 100;
    let newFoodX, newFoodY;
    
    do {
        newFoodX = Math.floor(Math.random() * maxCells) * cellSize;
        newFoodY = Math.floor(Math.random() * maxCells) * cellSize;
        attempts++;
        
        if (attempts > maxAttempts) {
            gameOver();
            return;
        }
    } while (isFoodOnSnake(newFoodX, newFoodY));
    
    foodX = newFoodX;
    foodY = newFoodY;
}

function isFoodOnSnake(x, y) {
    return snake.some(part => Math.abs(part.x - x) < 1 && Math.abs(part.y - y) < 1);
}

function drawSnake() {
    snake.forEach(drawSnakePart);
}

function drawSnakePart(snakePart) {
    ctx.fillStyle = SNAKE_COLOUR;
    ctx.strokeStyle = SNAKE_BORDER_COLOUR;
    ctx.fillRect(snakePart.x, snakePart.y, cellSize - 1, cellSize - 1);
    ctx.strokeRect(snakePart.x, snakePart.y, cellSize - 1, cellSize - 1);
}

function drawFood() {
    if (foodX !== undefined && foodY !== undefined) {
        ctx.fillStyle = FOOD_COLOUR;
        ctx.strokeStyle = FOOD_BORDER_COLOUR;
        ctx.fillRect(foodX, foodY, cellSize - 1, cellSize - 1);
        ctx.strokeRect(foodX, foodY, cellSize - 1, cellSize - 1);
    }
}

function clearCanvas() {
    ctx.fillStyle = CANVAS_BACKGROUND_COLOUR;
    ctx.strokeStyle = CANVAS_BORDER_COLOUR;
    ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
    ctx.strokeRect(0, 0, gameCanvas.width, gameCanvas.height);
    
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= gridSize; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, gameCanvas.height);
        ctx.stroke();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(gameCanvas.width, i * cellSize);
        ctx.stroke();
    }
}

function changeDirection(event) {
    if (!isGameRunning || !isGameActive) return;
    
    const LEFT_KEY = 37;
    const RIGHT_KEY = 39;
    const UP_KEY = 38;
    const DOWN_KEY = 40;
    
    if (changingDirection) return;
    changingDirection = true;
    
    const keyPressed = event.keyCode;
    
    const goingUp = dy === -cellSize;
    const goingDown = dy === cellSize;
    const goingRight = dx === cellSize;
    const goingLeft = dx === -cellSize;
    
    if (keyPressed === LEFT_KEY && !goingRight) {
        dx = -cellSize;
        dy = 0;
    }
    if (keyPressed === UP_KEY && !goingDown) {
        dx = 0;
        dy = -cellSize;
    }
    if (keyPressed === RIGHT_KEY && !goingLeft) {
        dx = cellSize;
        dy = 0;
    }
    if (keyPressed === DOWN_KEY && !goingUp) {
        dx = 0;
        dy = cellSize;
    }
}

function gameOver() {
    isGameActive = false;
    isGameRunning = false;
    
    if (gameLoop) {
        clearTimeout(gameLoop);
        gameLoop = null;
    }
    
    updateStatus(`Игра окончена! Ваш счет: ${score}`, true);
    
    overlayButtons.style.display = 'flex';
    startButton.style.display = 'block';
    startButton.textContent = 'Играть снова';
    restartButton.style.display = 'none';
    
    foodX = undefined;
    foodY = undefined;
    
    clearCanvas();
    drawSnake();
}

const resizeObserver = new ResizeObserver(() => {
    initCanvas();
});

resizeObserver.observe(gameContainer);

function init() {
    gameContainer.style.width = '400px';
    gameContainer.style.height = '400px';
    initCanvas();
    
    startButton.addEventListener("click", startGame);
    restartButton.addEventListener("click", restartGame);
    resetSizeBtn.addEventListener("click", resetSize);
    document.addEventListener("keydown", changeDirection);
}

init();