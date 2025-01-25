const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

// Create a cleaner score display element
const scoreElement = document.getElementById("scoreElement");

let player = {
    x: 400,
    y: 300,
    size: 20,
    color: "blue",
    speed: 5,
    health: 100,
    angle: 0
};

player.takeDamage = function(damage) {
    this.health -= damage;
    if (this.health <= 0) {
        this.health = 0; // Ensure health doesn't go below 0
        gameOver(); // Trigger game over when health reaches 0
    }
};

function gameOver() {
    // Show the 'Start Over' message
    alert("Game Over! Press OK to start over.");
    resetGame();
}

function resetGame() {
    // Reset all relevant game variables
    player.health = 100;
    player.x = 400;
    player.y = 300;
    creatures = []; // Clear creatures
    score = 0; // Reset score
    updateScoreDisplay(); // Update score display
    // Any other reset logic goes here
}

let spells = [];
let creatures = [];
let particles = [];  // New particles array
let score = 0;
let keys = { left: false, right: false, up: false, down: false, a: false, s: false, d: false, space: false };

let cooldowns = { a: 0, s: 0, d: 0 };

document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") keys.left = true;
    if (e.key === "ArrowRight") keys.right = true;
    if (e.key === "ArrowUp") keys.up = true;
    if (e.key === "ArrowDown") keys.down = true;
    if (e.key === "a") keys.a = true;
    if (e.key === "s") keys.s = true;
    if (e.key === "d") keys.d = true;
    if (e.key === " ") keys.space = true;
});

document.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft") keys.left = false;
    if (e.key === "ArrowRight") keys.right = false;
    if (e.key === "ArrowUp") keys.up = false;
    if (e.key === "ArrowDown") keys.down = false;
    if (e.key === "a") keys.a = false;
    if (e.key === "s") keys.s = false;
    if (e.key === "d") keys.d = false;
    if (e.key === " ") keys.space = false;
});

class Particle {
    constructor(x, y, direction, speed, color, damage = 0) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 5 + 2;
        this.direction = direction;
        this.speed = speed;
        this.color = color;
        this.life = 200;  // Increased lifetime for better visibility
        this.damage = damage;
    }

    update() {
        this.x += Math.cos(this.direction) * this.speed;
        this.y += Math.sin(this.direction) * this.speed;
        this.life -= 2;  // Reduce life each frame
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }

    isAlive() {
        return this.life > 0;
    }

    checkCollision(creature) {
        const dx = this.x - creature.x;
        const dy = this.y - creature.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.size + creature.size) {
            creature.takeDamage(this.damage);
            this.life = 0;  // Destroy the particle after it hits
            return true;
        }
        return false;
    }
}



class MagicSpell {
    constructor(x, y, direction, speed, damage, color, type) {
        this.x = x;
        this.y = y;
        this.direction = direction;
        this.speed = speed;
        this.size = 10;
        this.damage = damage;
        this.color = color;
        this.type = type; // New property to distinguish spell types
        this.trail = [];
    }

    update() {
        this.x += Math.cos(this.direction) * this.speed;
        this.y += Math.sin(this.direction) * this.speed;

        if (this.type === "explosion" && Math.random() < 0.1) {
            // Add explosion effect (for area damage) when the spell is of type 'explosion'
            this.explode();
        }

        this.trail.push({ x: this.x, y: this.y });

        if (this.trail.length > 15) {
            this.trail.shift();
        }
    }

    draw() {
        for (let i = 0; i < this.trail.length; i++) {
            const opacity = (i + 1) / this.trail.length;
            ctx.beginPath();
            ctx.arc(this.trail[i].x, this.trail[i].y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${parseInt(this.color.slice(1, 3), 16)}, ${parseInt(this.color.slice(3, 5), 16)}, ${parseInt(this.color.slice(5, 7), 16)}, ${opacity})`;
            ctx.fill();
        }

        ctx.shadowColor = this.color;
        ctx.shadowBlur = 20;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();

        ctx.shadowColor = "transparent";
    }

    explode() {
        if (this.type === "explosion") {
            for (let i = 0; i < 10; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 3 + 2;
                const particle = new Particle(this.x, this.y, angle, speed, this.color);
                particles.push(particle);
            }
        }
    }

    checkCollision(creature) {
        const dx = this.x - creature.x;
        const dy = this.y - creature.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.size + creature.size) {
            creature.takeDamage(this.damage);
            if (this.type === "explosion") {
                this.explode();
            }
            return true;
        }
        return false;
    }
}

class Creature {
    constructor(x, y, health) {
        this.x = x;
        this.y = y;
        this.health = health;
        this.size = 30;
        this.color = "green";
        this.speed = 1;
        this.dead = false;
    }

    update(player) {
        if (this.health <= 0 && !this.dead) {
            this.die();
        }

        if (this.dead) return;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const angle = Math.atan2(dy, dx);

        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;
    }

    draw() {
        if (this.dead) return;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();

        ctx.beginPath();
        ctx.rect(this.x - this.size / 2, this.y - this.size - 10, this.size, 5);
        ctx.fillStyle = "#333";
        ctx.fill();
        ctx.beginPath();
        ctx.rect(this.x - this.size / 2, this.y - this.size - 10, (this.size * this.health) / 100, 5);
        ctx.fillStyle = "green";
        ctx.fill();
    }

    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        this.color = "gray";
        this.dead = true;
        setTimeout(() => {
            creatures = creatures.filter(creature => creature !== this);
            score += 10;
            updateScoreDisplay();
        }, 500);
    }
}

class SpiralSpell {
    constructor(x, y, angle, speed, color) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.color = color;
        this.particles = [];
        this.created = false; // New flag to control particle creation
    }

    createSpiral() {
        if (!this.created) { // Only create particles once
            for (let i = 0; i < 20; i++) {
                let angle = this.angle + i * Math.PI / 10; // Increase the angle to make it spiral
                let radius = i * 2; // Increase the radius for each particle
                let speed = this.speed;
                let particle = new Particle(this.x, this.y, angle, speed, this.color);
                this.particles.push(particle);
            }
            this.created = true; // Set flag to true after particles are created
        }
    }

    update() {
        this.createSpiral();
        this.particles.forEach(particle => particle.update());
    }

    draw() {
        this.particles.forEach(particle => particle.draw());
    }



    checkCollision(creature) {
        const dx = this.x - creature.x;
        const dy = this.y - creature.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.size + creature.size) {
            creature.takeDamage(this.damage);
            this.life = 0;  // Destroy the particle after it hits
            return true;
        }
        return false;
    }
}


function castSpell(playerX, playerY, angle) {
    const now = Date.now();

    if (keys.a && now - cooldowns.a > 1) {
        const spell = new MagicSpell(playerX, playerY, angle, 5, 15, "red", "normal");
        spells.push(spell);
        cooldowns.a = now;
    } else if (keys.s && now - cooldowns.s > 150) {
        // Create a spiraling effect when "s" is pressed
        const spiralSpell = new SpiralSpell(playerX, playerY, angle, 3, "blue");
        spiralSpell.update();
        spells.push(spiralSpell);  // Add the spiral spell to the spells array
        cooldowns.s = now;
    } else if (keys.d && now - cooldowns.d > 200) {
        const spell = new MagicSpell(playerX, playerY, angle, 6, 25, "yellow", "explosion");
        spells.push(spell);
        cooldowns.d = now;
    }
}


function summonCreature() {
    const x = Math.random() * canvas.width;
    const y = 0;
    const creature = new Creature(x, y, 50);
    creatures.push(creature);
}

function update() {
    if (player.health <= 0) return; // Stop updating if player is dead

    if (keys.left && player.x - player.size > 0) player.x -= player.speed;
    if (keys.right && player.x + player.size < canvas.width) player.x += player.speed;
    if (keys.up && player.y - player.size > 0) player.y -= player.speed;
    if (keys.down && player.y + player.size < canvas.height) player.y += player.speed;

    if (keys.left) player.angle = Math.PI;
    if (keys.right) player.angle = 0;
    if (keys.up) player.angle = -Math.PI / 2;
    if (keys.down) player.angle = Math.PI / 2;

    castSpell(player.x, player.y, player.angle);

    for (let i = 0; i < spells.length; i++) {
        spells[i].update();

        if (spells[i] instanceof MagicSpell) {
            for (let j = 0; j < creatures.length; j++) {
                if (spells[i].checkCollision(creatures[j])) {
                    spells.splice(i, 1);
                    break;
                }
            }
        }
    }

    for (let i = 0; i < creatures.length; i++) {
        creatures[i].update(player);
    }

    particles = particles.filter(particle => particle.isAlive());
    particles.forEach(particle => {
        particle.update();
    });
}

// Draw Player's Health Bar
function drawPlayerHealth() {
    // Background of health bar
    ctx.beginPath();
    ctx.rect(20, 20, 200, 20);  // Draw the background
    ctx.fillStyle = "#444";      // Gray background for the bar
    ctx.fill();

    // Foreground of health bar (actual health)
    ctx.beginPath();
    ctx.rect(20, 20, (player.health * 200) / 100, 20);  // Width based on health percentage
    ctx.fillStyle = "green";    // Green color for health
    ctx.fill();
}

// In the draw function, call drawPlayerHealth to display the health bar
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw a thorny border
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#444";
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Draw the player
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();

    // Draw spells and creatures
    spells.forEach(spell => spell.draw());
    creatures.forEach(creature => creature.draw());

    // Draw particles
    particles.forEach(particle => particle.draw());

    // Draw the player's health bar
    drawPlayerHealth();
}


// Helper function to update the score display
function updateScoreDisplay() {
    scoreElement.textContent = `Score: ${score}`;
}

setInterval(() => {
    update();
    draw();
}, 1000 / 60);  // 60 FPS

// Summon creatures periodically
setInterval(() => {
    summonCreature();
}, 3000); // Spawn a creature every 3 seconds

// Draw the player with googly eyes
function drawPlayer() {
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2); // Draw the player
    ctx.fillStyle = player.color;
    ctx.fill();

    // Draw googly eyes
    const eyeSize = 5;
    const eyeOffsetX = 6;
    const eyeOffsetY = -5;

    // Left eye
    ctx.beginPath();
    ctx.arc(player.x - eyeOffsetX, player.y + eyeOffsetY, eyeSize, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();

    // Right eye
    ctx.beginPath();
    ctx.arc(player.x + eyeOffsetX, player.y + eyeOffsetY, eyeSize, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();

    // Pupils (black)
    const pupilSize = 2;
    ctx.beginPath();
    ctx.arc(player.x - eyeOffsetX, player.y + eyeOffsetY, pupilSize, 0, Math.PI * 2);
    ctx.fillStyle = "black";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(player.x + eyeOffsetX, player.y + eyeOffsetY, pupilSize, 0, Math.PI * 2);
    ctx.fillStyle = "black";
    ctx.fill();
}

// In the main draw function, replace the code that draws the player
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw the player with googly eyes
    drawPlayer();

    // Draw spells and creatures
    spells.forEach(spell => spell.draw());
    creatures.forEach(creature => creature.draw());

    // Draw particles
    particles.forEach(particle => particle.draw());
}

class Player {
    constructor(x, y, size, color, health) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.color = color;
        this.health = health;
        this.speed = 5;
    }

    // Method to check if the player collides with an enemy
    checkCollision(creature) {
        const dx = this.x - creature.x;
        const dy = this.y - creature.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.size + creature.size;  // Collision condition
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health < 0) {
            this.health = 0;
        }
    }
}
