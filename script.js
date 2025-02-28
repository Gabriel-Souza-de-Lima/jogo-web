//#region [ CONSTANTES CANVAS E MENU ] 
const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const exitbutton = document.getElementById('exitbutton');
const restartButton = document.getElementById('restartButton');
const finalScore = document.getElementById('finalScore');
const menuButton = document.getElementById('menuButton');
//#endregion

//#region [ VARIÁVEIS DE JOGO ]
var keys = {};

// Variáveis do jogo
var player;
var stars;
var obstacles;
var score;
var gameLoop;
var gameOver = false;
var enemySpeedIncrement = 0; // Variável para incrementar a velocidade dos inimigos
var lives = 3; // Vidas do jogador
//#endregion

//#region [ ÁUDIOS ]
// Objeto de áudio
var backgroundMusic = new Audio('Demo.mp3');
backgroundMusic.loop = true;

var dashSound       = new Audio('Dash.mp3');
var gameOverSound   = new Audio('Brincadeira_gente.mp3');


// Garante que o som seja carregado antes, evitando problemas de reprodução em navegadores
backgroundMusic.preload = 'auto'; 
dashSound.preload = 'auto'; 
//#endregion

//#region [ VARIÁVEIS DE DASH/INVENCIBILIDADE ]
// Variáveis do dash/invencibilidade
var isInvincible = false;
var invincibilityTimer  = 0;
var isDashing = false;
var dashTimer = 0;
var dashAvailable = true; // Para evitar ativação múltipla do dash ao segurar a tecla
var dashCooldownTimer = 0; // Tempo restante de cooldown do dash
var nextInvincibilityThreshold = 750; // Variável que controla a pontuação para ativação do efeito de invencibilidade
var bonusInvincibilityActive = false;
var bonusInvincibilityTimer = 0;
var bonusPointsCounter = 0; // Variável que controla o bônus (reseta ao morrer ou estando com o bônus atualmente ativo)
const dashCooldownTotal = 2.0; // Tempo total do cooldown
const normalSpeed = 5;
const dashSpeed = normalSpeed * 1.5; // Velocidade durante o dash
 
// Variáveis para o rastro do dash (guarda as posições anteriores para criar o efeito de rastro)
var dashTrail = [];
//#endregion

//#region [ VARIÁVEIS DE POWER UPS ]

// Variáveis e constantes para a mecânica de triplo de pontos
var triplePointsActive = false;
var triplePointsTimer  = 0;
const triplePointsDuration = 5;
var specialStar;

//#endregion

//#region [ EVENTOS DO TECLADO ] 
// Eventos do teclado
document.addEventListener('keydown', function(e) {
    keys[e.key] = true;

    // Ativar dash ao pressionar espaço, se não estiver em cooldown
    if (e.key === ' ' && dashAvailable && !isDashing && (bonusInvincibilityActive || !isInvincible) && dashCooldownTimer <= 0) {
        activateDash();
        dashAvailable = false;
    }
});

document.addEventListener('keyup', function(e) {
    keys[e.key] = false;

    // Permitir dash novamente ao soltar a tecla espaço
    if (e.key === ' ') {
        dashAvailable = true;
    }
});
//#endregion

//#region [ FUNÇÕES DO JOGO ]
// Função para iniciar o jogo
function startGame() {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
    canvas.style.display = 'block';

    // Inicializar variáveis do jogo
    player = {
        x: canvas.width - 40, // Posiciona o jogador no canto inferior direito
        y: canvas.height - 40,
        width: 40,
        height: 40,
        speed: normalSpeed
    };
    lives = 3;
    stars = [];
    obstacles = [];
    score = 0;
    gameOver = false;
    enemySpeedIncrement = 0;
    isInvincible = false;
    invincibilityTimer = 0;
    isDashing = false;
    dashTimer = 0;
    dashAvailable = true;
    dashCooldownTimer = 0;
    dashTrail = []; // Limpar o rastro ao iniciar o jogo

    // Zerar variáveis de power ups
    triplePointsActive = false;
    triplePointsTimer  = 0;
    specialStar = null;
    
    // Reproduzir música de fundo
    backgroundMusic.currentTime = 0; // Reinicia a música
    backgroundMusic.play();

    // Gerar estrelas e obstáculos iniciais
    generateStars();
    generateObstacles();

    // Iniciar loop do jogo
    clearInterval(gameLoop);
    gameLoop = setInterval(updateGame, 20);
}

// Função para ativar o dash
function activateDash() {
    
        // Se não estiver sob bônus, aplica a invencibilidade típica do dash
        if (!bonusInvincibilityActive) {
            isInvincible = true;
            invincibilityTimer = 1.0;  // 1 segundo de invencibilidade do dash
        }

        isDashing = true;
        dashTimer = 0.7; // Duração do dash
        player.speed = dashSpeed; // Aumenta a velocidade
        dashCooldownTimer = dashCooldownTotal; // Inicia o cooldown do dash
        dashSound.currentTime = 0;
        dashSound.play().catch(error => console.warn('Erro ao reproduzir o som do dash:', error));
    }    

// Função para atualizar o estado de invencibilidade, dash e cooldown
function updateDashInvincibility() {
    if (isDashing) {
        dashTimer -= 0.02; // Diminuir o tempo restante do dash
        if (dashTimer <= 0) {
            isDashing = false;
            player.speed = normalSpeed; // Voltar à velocidade normal
            dashTrail = []; // Limpar o rastro ao finalizar o dash
        }
    }
    if (isInvincible) {
        invincibilityTimer -= 0.02; // Diminuir o tempo restante de invencibilidade
        if (invincibilityTimer <= 0) {
            isInvincible = false;
        }
    }
    if (dashCooldownTimer > 0) {
        dashCooldownTimer -= 0.02; // Diminuir o cooldown do dash
        if (dashCooldownTimer < 0) {
            dashCooldownTimer = 0; // Garantir que não fique negativo
        }
    }

    if (triplePointsActive) {
        triplePointsTimer -= 0.02;
        if (triplePointsTimer <= 0) {
            triplePointsActive = false;
        }
    }
}

// Função para atualizar o jogo
function updateGame() {
    if (gameOver) return;
    movePlayer();
    moveObstacles();
    checkCollisions();
    updateDashInvincibility(); // Atualiza o estado de dash, invencibilidade e cooldown
    updateBonusInvincibility();
    updateDashTrail(); // Atualiza o rastro durante o dash
    drawGame();
}

// Função para mover o jogador
function movePlayer() {
    if (keys['ArrowLeft'] && player.x > 0) {
        player.x -= player.speed;
    }
    if (keys['ArrowRight'] && player.x < canvas.width - player.width) {
        player.x += player.speed;
    }
    if (keys['ArrowUp'] && player.y > 0) {
        player.y -= player.speed;
    }
    if (keys['ArrowDown'] && player.y < canvas.height - player.height) {
        player.y += player.speed;
    }
}

// Função para atualizar o rastro durante o dash
function updateDashTrail() {
    if (isDashing) {
        // Adicionar a posição atual ao rastro
        dashTrail.push({
            x: player.x,
            y: player.y,
            width: player.width,
            height: player.height,
            alpha: 1.0, // Opacidade inicial
            life: dashTimer // Duração restante do dash
        });
    }

    // Atualizar o rastro
    for (let i = 0; i < dashTrail.length; i++) {
        let trail = dashTrail[i];
        trail.alpha -= 0.02 / trail.life; // Diminuir a opacidade proporcionalmente ao tempo
        if (trail.alpha <= 0) {
            dashTrail.splice(i, 1);
            i--;
        }
    }
}

// Função para mover os obstáculos
function moveObstacles() {
    obstacles.forEach(function(obstacle) {
        obstacle.x += obstacle.speed;
        // Reposicionar obstáculo se sair da tela
        if (obstacle.x > canvas.width) {
            obstacle.x = -obstacle.width;
            obstacle.y = Math.random() * (canvas.height - obstacle.height);
        }
    });
}

// Função para verificar colisões
function checkCollisions() {
    // Verificar colisão com estrelas
    for (let i = stars.length - 1; i >= 0; i--) {
        let star = stars[i];
        if (circleRectCollision(star, player)) {
            stars.splice(i, 1);
        
            if (triplePointsActive) {
                score += 30;
            } else {
                score += 10;

            }
                      
            if (score >= nextInvincibilityThreshold) {
                activateBonusInvincibility();
                nextInvincibilityThreshold += 750; // Atualiza o próximo gatilho

            }
        }
    }

    // Se todas as estrelas foram coletadas, gerar novas e aumentar velocidade dos inimigos
    if (stars.length === 0) {
        generateStars();
        increaseEnemySpeed();
    }

    if (specialStar && circleRectCollision(specialStar, player)) {
        triplePointsActive = true;
        triplePointsTimer  = triplePointsDuration;

        specialStar = null;

        // Adicionar áudio de quando a estrela for coletada
    }

    // Verificar colisão com obstáculos somente se não estiver invencível
    if (!isInvincible) {
        for (let i = 0; i < obstacles.length; i++) {
            let obstacle = obstacles[i];
            if (rectsCollide(player, obstacle)) {
                loseLife();
                break;
            }
        }
    }
}

// Função para perda de vida
function loseLife() { 
    lives--;
    if (lives === 0) {
        endGame();
    } else {
        // Reposiciona o jogador para evitar colisões imediatas após perder vida
        player.x = canvas.width - player.width;
        player.y = canvas.height - player.height;
           
        // Ativa um segundo de invencibilidade após sofrer um golpe
        isInvincible = true;
        invincibilityTimer = 1.5;
    }
}

// Função para desenhar o jogo
function drawGame() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Desenhar rastro do dash
    drawDashTrail();

    // Desenhar jogador com cor diferente se estiver invencível
    if (bonusInvincibilityActive) {
        context.fillStyle = '#32CD32'; // Cor verde forte para bônus
    } else if (isInvincible) {
        context.fillStyle = '#FFD700'; // Cor dourada da invencibilidade comum
    } else {
        context.fillStyle = '#1E90FF'; // Cor padrão
    }
    
    context.fillRect(player.x, player.y, player.width, player.height);

    // Desenhar barra de cooldown acima do jogador
    const barWidth = player.width;
    const barHeight = 5;
    const x = player.x;
    const y = player.y - 10;

    if (dashCooldownTimer > 0) {
        const percentage = (dashCooldownTotal - dashCooldownTimer) / dashCooldownTotal;

        // Desenhar fundo da barra
        context.fillStyle = '#3A423C';
        context.fillRect(x, y, barWidth, barHeight);

        // Desenhar parte preenchida da barra
        context.fillStyle = '#FFA500';
        context.fillRect(x, y, barWidth * percentage, barHeight);
    } else {
        // Desenhar barra cheia quando o dash está disponível
        context.fillStyle = '#FFA500';
        context.fillRect(x, y, barWidth, barHeight);
    }

    // Desenhar estrelas
    context.fillStyle = '#FF6347';
    stars.forEach(function(star) {
        context.beginPath();
        context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        context.fill();
    });

    // Desenhar estrelas especiais
    if (specialStar) {
        context.fillStyle = '#FFD700'; // Dourado para destacar da estrela padrão
        context.beginPath();
        context.arc(specialStar.x, specialStar.y, specialStar.radius, 0, Math.PI * 2);
        context.fill();
    }

    // Desenhar obstáculos
    context.fillStyle = '#87CEEB';
    obstacles.forEach(function(obstacle) {
        context.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    });

    // Desenhar pontuação
    context.fillStyle = 'white';
    context.font = '20px Arial';
    context.textAlign = 'left';
    context.fillText('Pontuação: ' + score, 10, 20);
    context.fillText('Vidas: ' + lives, 10, 50);
}

// Função para desenhar o rastro do dash
function drawDashTrail() {
    dashTrail.forEach(function(trail) {
        context.fillStyle = `rgba(255, 210, 127, ${trail.alpha})`; // Mesma cor do jogador invencível com opacidade
        context.fillRect(trail.x, trail.y, trail.width, trail.height);
    });
}

// Função para gerar estrelas normais e definir a chance a especial aparecer
function generateStars() {
    for (let i = 0; i < 10; i++) {
        let star;
        do {
            star = {
                x: Math.random() * (canvas.width - 20) + 5,
                y: Math.random() * (canvas.height - 20) + 5,
                radius: 5,
                isSpecial: false
            };
        } while (circleRectCollision(star, player));
        stars.push(star);
    }

    // A estrela especial tem 100% de chance de aparecer (uma por rodada)
    if (Math.random() < 1.0) {
        generateSpecialStar();
    }
}

// Função para gerar a estrelas especiais
function generateSpecialStar() {
    let newStar;
    do {
        newStar = {
            x: Math.random() * (canvas.width - 30) + 15,
            y: Math.random() * (canvas.height - 30) + 15,
            radius: 10,
            isSpecial: true
        };
    } while (circleRectCollision(newStar, player));

    specialStar = newStar;
}

// Função para gerar obstáculos
function generateObstacles() {
    while (obstacles.length < 5) {
        let obstacle;
        do {
            obstacle = {
                x: -70, // Inicia fora da tela, no lado esquerdo
                y: Math.random() * (canvas.height - 70),
                width: 70,
                height: 70,
                speed: 2 + Math.random() * 3 + enemySpeedIncrement // Velocidade entre 2 e 5, mais incremento
            };
        } while (rectsCollide(obstacle, player));
        obstacles.push(obstacle);
    }
}

// Função para aumentar a velocidade dos inimigos
function increaseEnemySpeed() {
    enemySpeedIncrement += 0.3; // Aumenta o incremento de velocidade
    obstacles.forEach(function(obstacle) {
        obstacle.speed += 0.3; // Aumenta a velocidade de cada inimigo
    });
}

// Função para terminar o jogo
function endGame() {
    gameOver = true;
    clearInterval(gameLoop);
    canvas.style.display = 'none';
    document.getElementById('gameOver').style.display = 'block';
    finalScore.textContent = score;
    
    // Pausar a música de fundo
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0; // Reinicia a música para a próxima partida

    // Reproduzir o som de game over
    gameOverSound.currentTime = 0; // Reinicia o áudio para garantir que toque do início
    gameOverSound.play ();
}

// Funções de colisão
function rectsCollide(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

function circleRectCollision(circle, rect) {
    let distX = Math.abs(circle.x - rect.x - rect.width / 2);
    let distY = Math.abs(circle.y - rect.y - rect.height / 2);

    if (distX > (rect.width / 2 + circle.radius)) { return false; }
    if (distY > (rect.height / 2 + circle.radius)) { return false; }

    if (distX <= (rect.width / 2)) { return true; }
    if (distY <= (rect.height / 2)) { return true; }

    let dx = distX - rect.width / 2;
    let dy = distY - rect.height / 2;
    return (dx * dx + dy * dy <= (circle.radius * circle.radius));
}

function activateBonusInvincibility() {
    bonusInvincibilityActive = true;
    bonusInvincibilityTimer = 5.0 // 5 segundos de invencibilidade

    // Implementar efeito sonoro e visual posteriormente

    console.log("🛡️ Invencibilidade bônus ativada por 5 segundos!");
}

function updateBonusInvincibility() {
    if (bonusInvincibilityActive) {
        bonusInvincibilityTimer -= 0.02;
        if (bonusInvincibilityTimer <= 0) {
            bonusInvincibilityActive = false;
            bonusInvincibilityTimer = 0; // Reset do timer, garantindo clareza
            console.log("Invencibilidade bônus finalizada.");
        }
    }
}

//#endregion

//#region [ EVENTOS DOS BOTÕES ]
// Eventos dos botões
startButton.addEventListener('click', startGame);

restartButton.addEventListener('click', startGame);

menuButton.addEventListener('click', function() {
    document.getElementById('gameOver').style.display = 'none';
    canvas.style.display = 'none';
    document.getElementById('menu').style.display = 'block';
});

exitbutton.addEventListener('click', function() {
    window.close();
});
//#endregion
