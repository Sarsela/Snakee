const GAME_SPEED = 130;
const CANVAS_BORDER_COLOUR = '#2a2a4a';
const CANVAS_BACKGROUND_COLOUR = "#0a0a15";
const SNAKE_HEAD_COLOUR = '#4CAF50';
const SNAKE_BODY_COLOUR = '#388E3C';
const SNAKE_BORDER_COLOUR = '#2E7D32';
const FOOD_COLOUR = '#FF1744';
const FOOD_BORDER_COLOUR = '#D50000';
const LEADERBOARD_KEY = 'snakeLeaderboard';

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
let pendingDirection = null;
let lastDirection = null;

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
const leaderboardList = document.getElementById('leaderboardList');
const resizeHandle = document.getElementById('resizeHandle');

const namePopup = document.getElementById('namePopup');
const popupNameInput = document.getElementById('popupNameInput');
const popupScore = document.getElementById('popupScore');
const popupSaveBtn = document.getElementById('popupSaveBtn');
const popupSkipBtn = document.getElementById('popupSkipBtn');


function loadLeaderboard() {
    try {
        const data = localStorage.getItem(LEADERBOARD_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
}

function saveLeaderboard(leaderboard) {
    try {
        localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
    } catch (e) {
        console.error('Ошибка сохранения:', e);
    }
}

function addScore(playerName, score) {
    if (!playerName || playerName.trim() === '') {
        return false;
    }
    
    if (score <= 0) {
        return false;
    }
    
    const leaderboard = loadLeaderboard();
    
    leaderboard.push({
        name: playerName.trim().toUpperCase(),
        score: score
    });
    
    leaderboard.sort((a, b) => b.score - a.score);
    
    if (leaderboard.length > 50) {
        leaderboard.length = 50;
    }
    
    saveLeaderboard(leaderboard);
    renderLeaderboard();
    return true;
}

function renderLeaderboard() {
    const leaderboard = loadLeaderboard();
    
    if (leaderboard.length === 0) {
        leaderboardList.innerHTML = `
            <div class="leaderboard-empty">
                НЕТ РЕКОРДОВ
            </div>
        `;
        return;
    }
    
    let html = '';
    leaderboard.forEach((item, index) => {
        const rank = index + 1;
        let rankClass = '';
        if (rank === 1) rankClass = 'top1';
        else if (rank === 2) rankClass = 'top2';
        else if (rank === 3) rankClass = 'top3';
        
        if (rank <= 10) {
            html += `
                <div class="leaderboard-item ${rankClass}">
                    <span class="rank">#${rank}</span>
                    <span class="player-name">${escapeHtml(item.name)}</span>
                    <span class="player-score">${item.score}</span>
                </div>
            `;
        }
    });
    
    leaderboardList.innerHTML = html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showPopup(score) {
    popupScore.textContent = score;
    popupNameInput.value = '';
    namePopup.style.display = 'flex';
    setTimeout(() => {
        popupNameInput.focus();
    }, 100);
    
    isGameRunning = false;
    isGameActive = false;
}

function hidePopup() {
    namePopup.style.display = 'none';
}

function handlePopupSave() {
    const name = popupNameInput.value.trim();
    if (addScore(name, score)) {
        hidePopup();
        updateStatus(`РЕКОРД ЗАПИСАН! ${name.toUpperCase()}: ${score}`, false);
        overlayButtons.style.display = 'flex';
        startButton.style.display = 'block';
        startButton.textContent = 'ИГРАТЬ СНОВА';
        restartButton.style.display = 'none';
    } else {
        popupNameInput.style.borderColor = '#f44336';
        setTimeout(() => {
            popupNameInput.style.borderColor = '#333';
        }, 1000);
    }
}

function handlePopupSkip() {
    hidePopup();
    updateStatus(`ИГРА ОКОНЧЕНА! ${score} ОЧКОВ`, true);
    overlayButtons.style.display = 'flex';
    startButton.style.display = 'block';
    startButton.textContent = 'ИГРАТЬ СНОВА';
    restartButton.style.display = 'none';
}

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
    const rect = gameContainer.getBoundingClientRect();
    const containerSize = Math.min(rect.width, rect.height);
    
    const borderPadding = 12 + 8;
    const availableSize = containerSize - borderPadding * 2;
    const finalSize = Math.max(150, availableSize);
    
    gameCanvas.style.width = finalSize + 'px';
    gameCanvas.style.height = finalSize + 'px';
    gameCanvas.width = finalSize;
    gameCanvas.height = finalSize;
    
    ctx = gameCanvas.getContext("2d");
    cellSize = finalSize / gridSize;
    
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
    pendingDirection = null;
    lastDirection = 'RIGHT';
}

function updateSizeInfo() {
    const rect = gameContainer.getBoundingClientRect();
    sizeInfo.textContent = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
}

function resetSize() {
    gameContainer.style.width = '420px';
    gameContainer.style.height = '420px';
    setTimeout(() => initCanvas(), 50);
}

function startGame() {
    if (isGameRunning) return;
    
    resetGameState();
    
    createFood();
    
    isGameRunning = true;
    isGameActive = true;
    
    overlayButtons.style.display = 'none';
    hidePopup();
    
    updateStatus('ИГРА ИДЕТ...');
    
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
    pendingDirection = null;
    lastDirection = 'RIGHT';
    
    scoreElement.textContent = String(score).padStart(4, '0');
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
    
    updateStatus('ИГРА ИДЕТ...');
    hidePopup();
    
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
        if (pendingDirection !== null) {
            const newDx = dx;
            const newDy = dy;
            
            const testHead = {
                x: snake[0].x + newDx,
                y: snake[0].y + newDy
            };
            
            const isSafe = !isPositionOnSnake(testHead.x, testHead.y, 1);
            if (isSafe) {
                applyDirection(pendingDirection);
            }
            pendingDirection = null;
        }
        
        changingDirection = false;
        clearCanvas();
        drawFood();
        advanceSnake();
        drawSnake();
        main();
    }, GAME_SPEED);
}

function isPositionOnSnake(x, y, skipHead = 0) {
    for (let i = skipHead; i < snake.length; i++) {
        if (Math.abs(snake[i].x - x) < 1 && Math.abs(snake[i].y - y) < 1) {
            return true;
        }
    }
    return false;
}

function applyDirection(direction) {
    const goingUp = dy === -cellSize;
    const goingDown = dy === cellSize;
    const goingRight = dx === cellSize;
    const goingLeft = dx === -cellSize;
    
    let newDx = dx;
    let newDy = dy;
    
    if (direction === 'LEFT' && !goingRight) {
        newDx = -cellSize;
        newDy = 0;
    }
    if (direction === 'UP' && !goingDown) {
        newDx = 0;
        newDy = -cellSize;
    }
    if (direction === 'RIGHT' && !goingLeft) {
        newDx = cellSize;
        newDy = 0;
    }
    if (direction === 'DOWN' && !goingUp) {
        newDx = 0;
        newDy = cellSize;
    }
    
    const newHeadX = snake[0].x + newDx;
    const newHeadY = snake[0].y + newDy;
    
    const hitWall = newHeadX < 0 || newHeadX >= gameCanvas.width || 
                    newHeadY < 0 || newHeadY >= gameCanvas.height;
    
    if (!hitWall) {
        dx = newDx;
        dy = newDy;
    }
}

function advanceSnake() {
    const head = {x: snake[0].x + dx, y: snake[0].y + dy};
    snake.unshift(head);
    
    const didEatFood = foodX !== undefined && foodY !== undefined && 
                      Math.abs(snake[0].x - foodX) < 1 && Math.abs(snake[0].y - foodY) < 1;
    if (didEatFood) {
        score += 10;
        scoreElement.textContent = String(score).padStart(4, '0');
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
    snake.forEach((part, index) => {
        if (index === 0) {
            drawSnakeHead(part);
        } else {
            drawSnakeBody(part);
        }
    });
}

function drawSnakeBody(snakePart) {
    const padding = cellSize * 0.08;
    const radius = cellSize * 0.12;
    
    ctx.fillStyle = SNAKE_BODY_COLOUR;
    ctx.shadowColor = 'rgba(76, 175, 80, 0.2)';
    ctx.shadowBlur = 4;
    
    const x = snakePart.x + padding;
    const y = snakePart.y + padding;
    const w = cellSize - padding * 2;
    const h = cellSize - padding * 2;
    
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.strokeStyle = SNAKE_BORDER_COLOUR;
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

function drawSnakeHead(snakePart) {
    const padding = cellSize * 0.05;
    const radius = cellSize * 0.15;
    
    ctx.fillStyle = SNAKE_HEAD_COLOUR;
    ctx.shadowColor = 'rgba(76, 175, 80, 0.4)';
    ctx.shadowBlur = 8;
    
    const x = snakePart.x + padding;
    const y = snakePart.y + padding;
    const w = cellSize - padding * 2;
    const h = cellSize - padding * 2;
    
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#2E7D32';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawFood() {
    if (foodX !== undefined && foodY !== undefined) {
        const centerX = foodX + cellSize / 2;
        const centerY = foodY + cellSize / 2;
        const radius = cellSize * 0.35;
        
        ctx.shadowColor = 'rgba(255, 23, 68, 0.6)';
        ctx.shadowBlur = 15;
        
        ctx.fillStyle = FOOD_COLOUR;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        
        ctx.strokeStyle = FOOD_BORDER_COLOUR;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function clearCanvas() {
    ctx.fillStyle = CANVAS_BACKGROUND_COLOUR;
    ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
    
    ctx.strokeStyle = 'rgba(76, 175, 80, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridSize; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, gameCanvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(gameCanvas.width, i * cellSize);
        ctx.stroke();
    }
    
    ctx.strokeStyle = 'rgba(76, 175, 80, 0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, gameCanvas.width, gameCanvas.height);
}

function changeDirection(event) {
    if (!isGameRunning || !isGameActive) return;
    
    const key = event.key;
        const keyMap = {
        'ArrowLeft': 'LEFT',
        'ArrowUp': 'UP',
        'ArrowRight': 'RIGHT',
        'ArrowDown': 'DOWN',
        'a': 'LEFT',
        'w': 'UP',
        'd': 'RIGHT',
        's': 'DOWN',
        'A': 'LEFT',
        'W': 'UP',
        'D': 'RIGHT',
        'S': 'DOWN'
    };
    
    const direction = keyMap[key];
    if (!direction) return;
    
    event.preventDefault();
    
    const goingUp = dy === -cellSize;
    const goingDown = dy === cellSize;
    const goingRight = dx === cellSize;
    const goingLeft = dx === -cellSize;
    
    let newDx = dx;
    let newDy = dy;
    
    if (direction === 'LEFT' && !goingRight) {
        newDx = -cellSize;
        newDy = 0;
    }
    if (direction === 'UP' && !goingDown) {
        newDx = 0;
        newDy = -cellSize;
    }
    if (direction === 'RIGHT' && !goingLeft) {
        newDx = cellSize;
        newDy = 0;
    }
    if (direction === 'DOWN' && !goingUp) {
        newDx = 0;
        newDy = cellSize;
    }
    
    const newHeadX = snake[0].x + newDx;
    const newHeadY = snake[0].y + newDy;
    
    const hitWall = newHeadX < 0 || newHeadX >= gameCanvas.width || 
                    newHeadY < 0 || newHeadY >= gameCanvas.height;
    
    if (!hitWall) {
        dx = newDx;
        dy = newDy;
        pendingDirection = null;
    } else {
        pendingDirection = direction;
    }
}

function gameOver() {
    isGameActive = false;
    isGameRunning = false;
    
    if (gameLoop) {
        clearTimeout(gameLoop);
        gameLoop = null;
    }
    
    foodX = undefined;
    foodY = undefined;
    pendingDirection = null;
    
    clearCanvas();
    drawSnake();
    
    if (score > 0) {
        showPopup(score);
    } else {
        updateStatus(`НЕТ ОЧКОВ`, true);
        overlayButtons.style.display = 'flex';
        startButton.style.display = 'block';
        startButton.textContent = 'ИГРАТЬ СНОВА';
        restartButton.style.display = 'none';
    }
}


function init() {
    initCanvas();
    renderLeaderboard();
    
    startButton.addEventListener("click", startGame);
    restartButton.addEventListener("click", restartGame);
    resetSizeBtn.addEventListener("click", resetSize);
    document.addEventListener("keydown", changeDirection);
    
    popupSaveBtn.addEventListener("click", handlePopupSave);
    popupSkipBtn.addEventListener("click", handlePopupSkip);
    popupNameInput.addEventListener("keypress", function(e) {
        if (e.key === "Enter") {
            handlePopupSave();
        }
    });
    
    leaderboardList.addEventListener("dblclick", function() {
        if (confirm('Очистить таблицу?')) {
            saveLeaderboard([]);
            renderLeaderboard();
        }
    });
    
    let isResizing = false;
    let startX, startY, startWidth, startHeight;
    
    resizeHandle.addEventListener('mousedown', function(e) {
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = gameContainer.offsetWidth;
        startHeight = gameContainer.offsetHeight;
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isResizing) return;
        
        const newWidth = Math.max(250, Math.min(window.innerWidth * 0.9, startWidth + (e.clientX - startX)));
        const newHeight = Math.max(250, Math.min(window.innerHeight * 0.9, startHeight + (e.clientY - startY)));
        const size = Math.min(newWidth, newHeight);
        
        gameContainer.style.width = size + 'px';
        gameContainer.style.height = size + 'px';
        
        initCanvas();
    });
    
    document.addEventListener('mouseup', function() {
        isResizing = false;
    });
    
    const resizeObserver = new ResizeObserver(() => {
        initCanvas();
    });
    resizeObserver.observe(gameContainer);
}

init();