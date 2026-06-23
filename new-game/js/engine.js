/* CONSTANTS */

const GRID_SIZE = 8;

const UNITS_PER_PLAYER = 5;

const TERRITORY_WIN_LIMIT = 33;

const UNIT_TYPES = {
    soldier: { name: 'Soldier', icon: '⚔️', strength: 6, movement: 1 },
    cavalry: { name: 'Cavalry', icon: '🐎', strength: 4, movement: 2 },
    tank: { name: 'Tank', icon: '🛡️', strength: 9, movement: 1 }
};

const TERRAIN = {
    NEUTRAL: 'neutral',
    BONUS: 'bonus',
    TRAP: 'trap'
};

const PHASE = {
    PLACEMENT_INITIATIVE: 'placement_initiative',
    PLACEMENT_PLAYER: 'placement_player',
    PLACEMENT_AI: 'placement_ai',
    INITIATIVE: 'initiative',
    PLAYER_TURN: 'player_turn',
    AI_TURN: 'ai_turn',
    GAME_OVER: 'game_over'
};

const BONUS_MODIFIER = 2;
const TRAP_MODIFIER = -1;
const DEFENSE_MODIFIER = 2;

/* ENGINE OBJECT */
const Engine = {

    /* STATE VARIABLES */

    grid: [],

    units: [],

    nextUnitId: 1,

    phase: PHASE.PLACEMENT_INITIATIVE,

    turnNumber: 1,

    isGameOver: false,

    pendingWinner: null,

    winner: null,

    firstMover: null,

    placementFirstMover: null,

    playerUnitsPlaced: 0,
    aiUnitsPlaced: 0,

    log: [],

    /* INITIALIZATION */

    init: function () {
        this.grid = [];
        this.units = [];
        this.nextUnitId = 1;
        this.phase = PHASE.PLACEMENT_INITIATIVE;
        this.turnNumber = 1;
        this.isGameOver = false;
        this.pendingWinner = null;
        this.winner = null;
        this.firstMover = null;
        this.placementFirstMover = null;
        this.playerUnitsPlaced = 0;
        this.aiUnitsPlaced = 0;
        this.log = [];

        for (var row = 0; row < GRID_SIZE; row++) {
            this.grid[row] = [];
            for (var col = 0; col < GRID_SIZE; col++) {
                var owner = null;
                if (row < 2) owner = 'ai';
                if (row >= 6) owner = 'player';

                this.grid[row][col] = {
                    terrain: TERRAIN.NEUTRAL,
                    owner: owner,
                    units: []
                };
            }
        }

        this.generateTerrain();
        this.addLog('System initialized. Awaiting unit deployment.', 'phase');
    },

    generateTerrain: function () {
        var bonusCount = 6;
        var trapCount = 4;

        function randomMiddleCell() {
            var row = 2 + Math.floor(Math.random() * 4);
            var col = Math.floor(Math.random() * GRID_SIZE);
            return { row: row, col: col };
        }

        var placed = 0;
        while (placed < bonusCount) {
            var cell = randomMiddleCell();
            if (this.grid[cell.row][cell.col].terrain === TERRAIN.NEUTRAL) {
                this.grid[cell.row][cell.col].terrain = TERRAIN.BONUS;
                placed++;
            }
        }

        placed = 0;
        while (placed < trapCount) {
            var cell = randomMiddleCell();
            if (this.grid[cell.row][cell.col].terrain === TERRAIN.NEUTRAL) {
                this.grid[cell.row][cell.col].terrain = TERRAIN.TRAP;
                placed++;
            }
        }
    },

    /* UNIT CREATION */

    createUnit: function (type, owner, row, col) {
        if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;

        var typeDef = UNIT_TYPES[type];
        if (!typeDef) return null;
        if (this.grid[row][col].units.length > 0) return null;

        var unit = {
            id: this.nextUnitId++,
            owner: owner,
            type: type,
            name: typeDef.name,
            icon: typeDef.icon,
            strength: typeDef.strength,
            movement: typeDef.movement,
            defending: false,
            hasMoved: false,
            hasActed: false,
            row: row,
            col: col
        };

        this.grid[row][col].units.push(unit);
        this.grid[row][col].owner = owner;
        this.units.push(unit);

        return unit;
    },

    /* PLACEMENT VALIDATION */

    isValidPlacement: function (row, col, owner) {
        if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return false;
        if (this.grid[row][col].owner !== owner) return false;
        if (this.grid[row][col].units.length > 0) return false;
        return true;
    },

    getPlacementCells: function (owner) {
        var cells = [];
        for (var row = 0; row < GRID_SIZE; row++) {
            for (var col = 0; col < GRID_SIZE; col++) {
                if (this.isValidPlacement(row, col, owner)) {
                    cells.push({ row: row, col: col });
                }
            }
        }
        return cells;
    },

    /* MOVEMENT */

    getValidMoves: function (unit) {
        var moves = [];
        var range = unit.movement;

        for (var row = 0; row < GRID_SIZE; row++) {
            for (var col = 0; col < GRID_SIZE; col++) {
                var sameRow = (row === unit.row);
                var sameCol = (col === unit.col);
                if (!sameRow && !sameCol) continue;

                var distance = Math.abs(row - unit.row) + Math.abs(col - unit.col);
                if (distance > 0 && distance <= range) {
                    var hasEnemy = false;
                    var tileUnits = this.grid[row][col].units;
                    for (var i = 0; i < tileUnits.length; i++) {
                        if (tileUnits[i].owner !== unit.owner) {
                            hasEnemy = true;
                            break;
                        }
                    }
                    var hasFriendly = false;
                    for (var k = 0; k < tileUnits.length; k++) {
                        if (tileUnits[k].owner === unit.owner) {
                            hasFriendly = true;
                            break;
                        }
                    }
                    if (!hasFriendly) {
                        moves.push({ row: row, col: col });
                    }
                }
            }
        }
        return moves;
    },

    moveUnit: function (unit, newRow, newCol) {
        if (this.isGameOver) return false;

        var validMoves = this.getValidMoves(unit);
        var isValid = false;
        for (var i = 0; i < validMoves.length; i++) {
            if (validMoves[i].row === newRow && validMoves[i].col === newCol) {
                isValid = true;
                break;
            }
        }
        if (!isValid) return false;

        this.removeUnitFromTile(unit);
        unit.row = newRow;
        unit.col = newCol;
        this.grid[newRow][newCol].units.push(unit);
        this.grid[newRow][newCol].owner = unit.owner;
        unit.hasMoved = true;
        this.addLog(unit.name + ' (' + unit.owner + ') moved to [' + newRow + ',' + newCol + ']', 'move');
        this.checkTerritoryVictory();
        return true;
    },

    removeUnitFromTile: function (unit) {
        if (unit.row < 0 || unit.row >= GRID_SIZE || unit.col < 0 || unit.col >= GRID_SIZE) return;
        var tileUnits = this.grid[unit.row][unit.col].units;
        for (var i = 0; i < tileUnits.length; i++) {
            if (tileUnits[i].id === unit.id) {
                tileUnits.splice(i, 1);
                break;
            }
        }
    },

    /* COMBAT */

    getAttackTargets: function (unit) {
        var targets = [];
        var directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        for (var d = 0; d < directions.length; d++) {
            var r = unit.row + directions[d][0];
            var c = unit.col + directions[d][1];
            if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) continue;

            var tileUnits = this.grid[r][c].units;
            for (var i = 0; i < tileUnits.length; i++) {
                if (tileUnits[i].owner !== unit.owner) {
                    targets.push(tileUnits[i]);
                }
            }
        }
        return targets;
    },

    getAttackableTiles: function (unit) {
        var tiles = [];
        var seen = {};
        var directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        for (var d = 0; d < directions.length; d++) {
            var r = unit.row + directions[d][0];
            var c = unit.col + directions[d][1];
            if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) continue;

            var key = r + ',' + c;
            if (seen[key]) continue;

            var tileUnits = this.grid[r][c].units;
            for (var i = 0; i < tileUnits.length; i++) {
                if (tileUnits[i].owner !== unit.owner) {
                    tiles.push({ row: r, col: c });
                    seen[key] = true;
                    break;
                }
            }
        }
        return tiles;
    },

    rollDice: function () {
        return Math.floor(Math.random() * 6) + 1;
    },

    getTerrainModifier: function (row, col) {
        var terrain = this.grid[row][col].terrain;
        if (terrain === TERRAIN.BONUS) return BONUS_MODIFIER;
        if (terrain === TERRAIN.TRAP) return TRAP_MODIFIER;
        return 0;
    },

    calculateCombatScore: function (unit, diceRoll) {
        var score = unit.strength + diceRoll;
        score += this.getTerrainModifier(unit.row, unit.col);
        if (unit.defending) score += DEFENSE_MODIFIER;
        if (score < 0) score = 0;
        return score;
    },

    resolveCombat: function (attacker, defender) {
        if (this.isGameOver) return null;

        var attackerDice = this.rollDice();
        var defenderDice = this.rollDice();

        var attackerTerrainMod = this.getTerrainModifier(attacker.row, attacker.col);
        var defenderTerrainMod = this.getTerrainModifier(defender.row, defender.col);
        var attackerDefenseBonus = attacker.defending ? DEFENSE_MODIFIER : 0;
        var defenderDefenseBonus = defender.defending ? DEFENSE_MODIFIER : 0;

        var attackerScore = this.calculateCombatScore(attacker, attackerDice);
        var defenderScore = this.calculateCombatScore(defender, defenderDice);

        var attackerWins = (attackerScore > defenderScore);

        var result = {
            attacker: attacker,
            defender: defender,
            attackerDice: attackerDice,
            defenderDice: defenderDice,
            attackerTerrainMod: attackerTerrainMod,
            defenderTerrainMod: defenderTerrainMod,
            attackerDefenseBonus: attackerDefenseBonus,
            defenderDefenseBonus: defenderDefenseBonus,
            attackerScore: attackerScore,
            defenderScore: defenderScore,
            attackerWins: attackerWins
        };

        if (attackerWins) {
            var defRow = defender.row;
            var defCol = defender.col;
            this.removeUnit(defender);

            var remainingEnemies = this.getEnemyUnitsOnTile(defRow, defCol, attacker.owner);
            if (remainingEnemies.length === 0) {
                this.grid[defRow][defCol].owner = attacker.owner;
            }

            this.addLog(
                attacker.name + ' (' + attacker.owner + ') destroyed ' +
                defender.name + ' (' + defender.owner + ')! [' +
                attackerScore + ' vs ' + defenderScore + ']', 'destroy'
            );
        } else if (defenderScore > attackerScore) {
            var attRow = attacker.row;
            var attCol = attacker.col;
            this.removeUnit(attacker);
            this.grid[attRow][attCol].owner = defender.owner;

            this.addLog(
                defender.name + ' (' + defender.owner + ') repelled and destroyed ' +
                attacker.name + ' (' + attacker.owner + ')! [' +
                defenderScore + ' vs ' + attackerScore + ']', 'destroy'
            );
        } else {
            this.addLog(
                attacker.name + ' (' + attacker.owner + ') attacked ' +
                defender.name + ' (' + defender.owner + ') — TIE, nobody dies. [' +
                attackerScore + ' vs ' + defenderScore + ']', 'attack'
            );
        }

        attacker.hasActed = true;

        this.checkTerritoryVictory();
        this.checkUnitElimination();

        return result;
    },

    removeUnit: function (unit) {
        var oldRow = unit.row;
        var oldCol = unit.col;
        this.removeUnitFromTile(unit);

        for (var i = 0; i < this.units.length; i++) {
            if (this.units[i].id === unit.id) {
                this.units.splice(i, 1);
                break;
            }
        }
    },

    getEnemyUnitsOnTile: function (row, col, myOwner) {
        var enemies = [];
        var tileUnits = this.grid[row][col].units;
        for (var i = 0; i < tileUnits.length; i++) {
            if (tileUnits[i].owner !== myOwner) {
                enemies.push(tileUnits[i]);
            }
        }
        return enemies;
    },

    /* DEFENSE */

    defendUnit: function (unit) {
        unit.defending = true;
        unit.hasActed = true;
        this.addLog(unit.name + ' (' + unit.owner + ') entered defense mode.', 'defend');
    },

    /* TURN MANAGEMENT */

    startPlayerTurn: function () {
        this.phase = PHASE.PLAYER_TURN;
        for (var i = 0; i < this.units.length; i++) {
            if (this.units[i].owner === 'player') {
                this.units[i].hasMoved = false;
                this.units[i].hasActed = false;
                this.units[i].defending = false;
            }
        }
        this.addLog('--- Turn ' + this.turnNumber + ': Player\'s turn ---', 'turn');
    },

    startAITurn: function () {
        this.phase = PHASE.AI_TURN;
        for (var i = 0; i < this.units.length; i++) {
            if (this.units[i].owner === 'ai') {
                this.units[i].hasMoved = false;
                this.units[i].hasActed = false;
                this.units[i].defending = false;
            }
        }
        this.addLog('--- Turn ' + this.turnNumber + ': AI\'s turn ---', 'turn');
    },

    endTurn: function () {
        if (this.pendingWinner) {
            this.endGame(this.pendingWinner, 'Territory domination!');
            return true;
        }

        if (this.checkTurnLimit()) return true;

        if (this.phase === PHASE.PLAYER_TURN) {
            if (this.firstMover === 'player') {
                this.startAITurn();
            } else {
                this.endRound();
            }
        } else if (this.phase === PHASE.AI_TURN) {
            if (this.firstMover === 'ai') {
                this.startPlayerTurn();
            } else {
                this.endRound();
            }
        }
        return false;
    },

    endRound: function () {
        this.turnNumber++;
        this.phase = PHASE.INITIATIVE;
    },

    rollInitiative: function () {
        this.phase = PHASE.INITIATIVE;
        var pRoll = this.rollDice();
        var aRoll = this.rollDice();
        while (pRoll === aRoll) {
            pRoll = this.rollDice();
            aRoll = this.rollDice();
        }
        var winner = (pRoll > aRoll) ? 'player' : 'ai';
        this.firstMover = winner;
        return { playerRoll: pRoll, aiRoll: aRoll, winner: winner };
    },

    startFirstTurn: function () {
        if (this.firstMover === 'player') {
            this.startPlayerTurn();
        } else {
            this.startAITurn();
        }
    },

    endGame: function (winner, reason) {
        this.phase = PHASE.GAME_OVER;
        this.isGameOver = true;
        this.winner = winner;
        var label = (winner === 'draw') ? 'DRAW' : winner.toUpperCase() + ' WINS';
        this.addLog(reason + ' ' + label + '!', 'phase');
    },

    /* VICTORY CHECKS */

    checkTerritoryVictory: function () {
        if (this.isGameOver) return;
        if (this.pendingWinner) return;

        var playerTerritory = this.countTerritory('player');
        var aiTerritory = this.countTerritory('ai');

        if (playerTerritory >= TERRITORY_WIN_LIMIT) {
            this.pendingWinner = 'player';
            this.addLog('PLAYER REACHED ' + playerTerritory + ' TERRITORIES! DOMINATION PROTOCOL COMPLETE.', 'phase');
        }

        if (aiTerritory >= TERRITORY_WIN_LIMIT) {
            this.pendingWinner = 'ai';
            this.addLog('AI REACHED ' + aiTerritory + ' TERRITORIES! MISSION FAILURE.', 'phase');
        }
    },

    checkUnitElimination: function () {
        if (this.isGameOver) return false;

        var playerUnits = this.getUnitsForOwner('player');
        var aiUnits = this.getUnitsForOwner('ai');

        if (playerUnits.length === 0) {
            this.endGame('ai', 'All player units destroyed.');
            return true;
        }
        if (aiUnits.length === 0) {
            this.endGame('player', 'All AI units destroyed.');
            return true;
        }
        return false;
    },

    checkTurnLimit: function () {
        if (this.isGameOver) return false;
        if (this.turnNumber > 20) {
            var pt = this.countTerritory('player');
            var at = this.countTerritory('ai');
            if (pt > at) {
                this.endGame('player', 'Turn limit! Player leads ' + pt + '-' + at + '.');
            } else if (at > pt) {
                this.endGame('ai', 'Turn limit! AI leads ' + at + '-' + pt + '.');
            } else {
                this.endGame('draw', 'Turn limit! Tied at ' + pt + '.');
            }
            return true;
        }
        return false;
    },

    /* UTILITY FUNCTIONS */

    getUnitsForOwner: function (owner) {
        var result = [];
        for (var i = 0; i < this.units.length; i++) {
            if (this.units[i].owner === owner) result.push(this.units[i]);
        }
        return result;
    },

    countTerritory: function (owner) {
        var count = 0;
        for (var row = 0; row < GRID_SIZE; row++) {
            for (var col = 0; col < GRID_SIZE; col++) {
                if (this.grid[row][col].owner === owner) count++;
            }
        }
        return count;
    },

    getUnitsAt: function (row, col) {
        if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return [];
        return this.grid[row][col].units;
    },

    getUnitAt: function (row, col) {
        var units = this.getUnitsAt(row, col);
        return units.length > 0 ? units[0] : null;
    },

    getPlayerUnitsAt: function (row, col) {
        var result = [];
        var units = this.getUnitsAt(row, col);
        for (var i = 0; i < units.length; i++) {
            if (units[i].owner === 'player') result.push(units[i]);
        }
        return result;
    },

    getUnitById: function (id) {
        for (var i = 0; i < this.units.length; i++) {
            if (this.units[i].id === id) return this.units[i];
        }
        return null;
    },

    addLog: function (message, type) {
        this.log.unshift({
            message: message,
            type: type || 'phase',
            timestamp: Date.now()
        });
        if (this.log.length > 50) this.log.pop();
    },

    canUnitAct: function (unit) { return !unit.hasActed; },

    canUnitMove: function (unit) { return !unit.hasMoved && !unit.hasActed; },

    canUnitAttack: function (unit) {
        if (unit.hasActed) return false;
        return this.getAttackTargets(unit).length > 0;
    },

    canUnitDefend: function (unit) { return !unit.hasActed; }
};
