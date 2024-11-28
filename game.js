const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const TILE_SIZE = 40;
const MAX_ROWS = 20;
const MAX_COLS = 20;
let baseRows = Math.floor(canvas.height / TILE_SIZE);
let baseCols = Math.floor(canvas.width / TILE_SIZE);
let ROWS = baseRows;
let COLS = baseCols;
let maze = [];
let player = { x: 1, y: 1 };
let goal = { x: COLS - 2, y: ROWS - 2 };
let keys = {};
let level = 1;
let hearts = 3;
let timer, breakTimer;
let baseTimeLimit = 10;
let timeLeft = baseTimeLimit;
let inBreak = false;

let goalSound = new Audio('goal-sound.mp3');
goalSound.volume = 0.5;
let roundCompleteSound = new Audio('round-complete.mp3');
roundCompleteSound.volume = 0.5;

document.getElementById("startButton").onclick = function() {
    startGame();
    roundCompleteSound.play().catch((error) => {
        console.error('Auto-play prevented. Interact with the page to enable audio playback.');
    });
};

function startGame() {
    document.getElementById('welcomeScreen').style.display = 'none';
    canvas.style.display = 'block';
    startNewLevel();
    requestAnimationFrame(gameLoop);
}

function initMaze() {
    maze = Array.from({ length: ROWS }, () => Array(COLS).fill(1));
}

function generateMaze(x, y) {
    const directions = [[0, -2], [0, 2], [-2, 0], [2, 0]];
    directions.sort(() => Math.random() - 0.5);
    maze[x][y] = 0;

    for (const [dx, dy] of directions) {
        const nx = x + dx, ny = y + dy;
        if (nx > 0 && nx < ROWS - 1 && ny > 0 && ny < COLS - 1 && maze[nx][ny] === 1) {
            maze[x + dx / 2][y + dy / 2] = 0;
            maze[nx][ny] = 0;
            generateMaze(nx, ny);
        }
    }

    if (level >= 10) {
        maze[ROWS - 2][COLS - 2] = 0;
        maze[ROWS - 2][COLS - 3] = 0;
    }

    if (level > 5 && level % 5 === 0) {
        addDeadEnds();
    }
}

function addDeadEnds() {
    const deadEnds = Math.floor(level / 5) * 2;
    for (let i = 0; i < deadEnds; i++) {
        const row = Math.floor(Math.random() * (ROWS - 2)) + 1;
        const col = Math.floor(Math.random() * (COLS - 2)) + 1;
        if (maze[row][col] === 0 && (row !== 1 || col !== 1) && (row !== goal.y || col !== goal.x)) {
            maze[row][col] = 1;
        }
    }
}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            ctx.fillStyle = maze[row][col] === 1 ? '#000' : '#FFF';
            ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }

    ctx.fillStyle = 'green';
    ctx.fillRect(player.x * TILE_SIZE, player.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

    ctx.fillStyle = 'blue';
    ctx.fillRect(goal.x * TILE_SIZE, goal.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

    document.getElementById("timer").innerText = `Time: ${timeLeft}`;
    document.getElementById("level").innerText = `Level: ${level}`;
}

document.addEventListener('keydown', (e) => { keys[e.key] = true; });
document.addEventListener('keyup', (e) => { keys[e.key] = false; });

function updatePlayerPosition() {
    let { x, y } = player;

    if ((keys['ArrowUp'] || keys['w']) && y > 0 && maze[y - 1][x] === 0) player.y--;
    if ((keys['ArrowDown'] || keys['s']) && y < ROWS - 1 && maze[y + 1][x] === 0) player.y++;
    if ((keys['ArrowLeft'] || keys['a']) && x > 0 && maze[y][x - 1] === 0) player.x--;
    if ((keys['ArrowRight'] || keys['d']) && x < COLS - 1 && maze[y][x + 1] === 0) player.x++;

    if (player.x === goal.x && player.y === goal.y) {
        if (level % 5 === 0) {
            goalSound.play();
        } else {
            roundCompleteSound.play();
        }
        startNextLevel();
    }
}

function startNextLevel() {
    if (level === 9) {
        gameOver(); // End the game after level 9
    } else if (level % 5 === 0 && level > 0) {
        startBreak();
    } else {
        level++;
        startNewLevel();
    }
}

function startBreak() {
    inBreak = true;
    clearInterval(timer);

    canvas.style.display = 'none';
    document.getElementById("breakMessage").style.display = 'block';
    document.getElementById("level").innerText = `Break Time! Next stage in 10s...`;

    breakTimer = setTimeout(() => {
        inBreak = false;
        document.getElementById("breakMessage").style.display = 'none';
        canvas.style.display = 'block';

        increaseMazeSize();
        level++;
        startNewLevel();
    }, 10000);
}

function increaseMazeSize() {
    ROWS = Math.min(Math.floor(ROWS * 1.2), MAX_ROWS);
    COLS = Math.min(Math.floor(COLS * 1.2), MAX_COLS);
    canvas.width = COLS * TILE_SIZE;
    canvas.height = ROWS * TILE_SIZE;

    player = { x: 1, y: 1 };
    goal = { x: Math.max(1, COLS - 2), y: Math.max(1, ROWS - 2) };
}

function startNewLevel() {
    if (!inBreak) {
        initMaze();
        generateMaze(1, 1);
        player = { x: 1, y: 1 };

        goal = { 
            x: Math.max(1, COLS - 2), 
            y: Math.max(1, ROWS - 2) 
        };

        if (level > 5) {
            goal.x = Math.max(1, goal.x - 1);
            goal.y = Math.max(1, goal.y - 1);
        }

        timeLeft = Math.max(5, baseTimeLimit - level);
        updateHeartsDisplay();
        startTimer();
    }
}

function updateHeartsDisplay() {
    const heartsContainer = document.getElementById("hearts");
    heartsContainer.innerHTML = '';

    for (let i = 0; i < hearts; i++) {
        const heartImg = document.createElement('img');
        heartImg.src = 'heart.png'; // Updated path for heart image
        heartImg.alt = 'Heart';
        heartImg.width = 20;
        heartImg.height = 20;
        heartsContainer.appendChild(heartImg);
    }
}

function gameLoop() {
    if (!inBreak) {
        updatePlayerPosition();
        drawGame();
    }
    requestAnimationFrame(gameLoop);
}

function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
        if (!inBreak) {
            timeLeft--;
            if (timeLeft <= 0) {
                timeLeft = 0;
                loseHeart();
            }
        }
    }, 1000);
}

function loseHeart() {
    clearInterval(timer);
    hearts--;
    updateHeartsDisplay();
    if (hearts > 0) {
        startNewLevel();
    } else {
        gameOver();
    }
}

function gameOver() {
    alert("Congratulations! You've completed all levels!");
    location.reload();
}

initMaze();
generateMaze(1, 1);
drawGame();
