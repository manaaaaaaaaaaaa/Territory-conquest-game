const Game = {

    /* STATE TRACKING */

    selectedPlacementType: null,

    selectedUnit: null,

    currentAction: null,

    inputLocked: false,

    placementLimits: { soldier: 2, cavalry: 2, tank: 1 },

    placementCounts: { soldier: 0, cavalry: 0, tank: 0 },

    /* INITIALIZATION */

    init: function () {
        UI.init();

        this.setupEventListeners();

        UI.showScreen('start-screen');
    },

    setupEventListeners: function () {
        var self = this;

        document.getElementById('btn-start').addEventListener('click', function () {
            self.startGame();
        });

        document.getElementById('btn-restart').addEventListener('click', function () {
            self.startGame();
        });

        var unitButtons = document.querySelectorAll('.unit-btn');
        for (var i = 0; i < unitButtons.length; i++) {
            unitButtons[i].addEventListener('click', function () {
                self.selectPlacementType(this.dataset.type);
            });
        }

        document.getElementById('btn-move').addEventListener('click', function () {
            self.setAction('move');
        });

        document.getElementById('btn-attack').addEventListener('click', function () {
            self.setAction('attack');
        });

        document.getElementById('btn-defend').addEventListener('click', function () {
            self.performDefend();
        });

        document.getElementById('btn-end-turn').addEventListener('click', function () {
            self.endPlayerTurn();
        });
    },

    /* GAME START */

    startGame: function () {
        this.selectedPlacementType = null;
        this.selectedUnit = null;
        this.currentAction = null;
        this.inputLocked = false;

        this.placementCounts = { soldier: 0, cavalry: 0, tank: 0 };

        Engine.init();

        UI.showScreen('game-screen');

        this.updatePlacementUI();

        UI.renderGrid();
        UI.updateHUD();
        UI.renderBattleLog();

        this.startPlacementInitiative();
    },

    startPlacementInitiative: function () {
        var self = this;
        this.inputLocked = true;

        var res = Engine.rollInitiative();
        Engine.placementFirstMover = res.winner;

        UI.showInitiativeAnimation(res, "🎲 PLACEMENT ORDER 🎲", "WHO DEPLOYS FIRST?").then(function () {
            self.nextPlacementTurn();
        });
    },

    nextPlacementTurn: function () {
        var totalPlaced = Engine.playerUnitsPlaced + Engine.aiUnitsPlaced;

        if (totalPlaced >= (UNITS_PER_PLAYER * 2)) {
            this.finishPlacement();
            return;
        }

        var isFirstMoverTurn = (totalPlaced % 2 === 0);
        var currentTurn = isFirstMoverTurn ? Engine.placementFirstMover : (Engine.placementFirstMover === 'player' ? 'ai' : 'player');

        if (currentTurn === 'player') {
            Engine.phase = PHASE.PLACEMENT_PLAYER;
            this.inputLocked = false;
            UI.updateHUD();
            UI.showPlacementPanel();
            UI.highlightPlacementCells('player');
            Engine.addLog("Your turn to deploy a unit.", "phase");
        } else {
            Engine.phase = PHASE.PLACEMENT_AI;
            this.inputLocked = true;
            UI.updateHUD();
            UI.clearAllHighlights();
            Engine.addLog("AI is deploying a unit...", "phase");
            this.executeAIPlacement();
        }
    },

    executeAIPlacement: function () {
        var self = this;
        setTimeout(function () {
            AI.takePlacementTurn();
            UI.renderGrid();
            UI.renderBattleLog();
            self.nextPlacementTurn();
        }, 800);
    },

    /* PLACEMENT PHASE */

    selectPlacementType: function (type) {
        if (this.placementCounts[type] >= this.placementLimits[type]) return;

        this.selectedPlacementType = type;

        var buttons = document.querySelectorAll('.unit-btn');
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].classList.remove('selected');
            if (buttons[i].dataset.type === type) {
                buttons[i].classList.add('selected');
            }
        }
    },

    handlePlacementClick: function (row, col) {
        if (Engine.phase !== PHASE.PLACEMENT_PLAYER) return;
        if (this.inputLocked) return;

        if (!this.selectedPlacementType) return;

        var type = this.selectedPlacementType;
        if (this.placementCounts[type] >= this.placementLimits[type]) return;

        if (!Engine.isValidPlacement(row, col, 'player')) return;

        var unit = Engine.createUnit(type, 'player', row, col);
        if (!unit) return;

        Engine.playerUnitsPlaced++;
        this.placementCounts[type]++;

        if (this.placementCounts[type] >= this.placementLimits[type]) {
            this.selectedPlacementType = null;
        }

        this.updatePlacementUI();
        Engine.addLog('Player deployed ' + unit.name + ' at [' + row + ',' + col + '].', 'phase');
        UI.renderGrid();
        UI.renderBattleLog();

        this.nextPlacementTurn();
    },

    finishPlacement: function () {
        Engine.addLog("All units deployed. Rolling for first game turn...", "phase");

        this.selectedPlacementType = null;
        UI.clearAllHighlights();

        this.startInitiativePhase();
    },

    startInitiativePhase: function () {
        var self = this;
        this.inputLocked = true;

        UI.showScreen('game-screen');
        UI.showActionPanel();

        var res = Engine.rollInitiative();

        UI.showInitiativeAnimation(res, "🎲 INITIATIVE ROLL 🎲", "WHO GOES FIRST THIS ROUND?").then(function () {
            self.startFirstTurn();
        });
    },

    startFirstTurn: function () {
        Engine.startFirstTurn();
        UI.renderGrid();
        UI.updateHUD();
        UI.renderBattleLog();

        if (Engine.phase === PHASE.PLAYER_TURN) {
            this.inputLocked = false;
            Engine.addLog("It is your turn. Command your units.", "phase");
        } else {
            Engine.addLog("AI won initiative and will act first.", "phase");
            this.executeAITurn();
        }
    },

    updatePlacementUI: function () {
        var self = this;
        var totalRemaining = UNITS_PER_PLAYER - Engine.playerUnitsPlaced;

        UI.updateUnitsRemaining(totalRemaining);

        var buttons = document.querySelectorAll('.unit-btn');
        for (var i = 0; i < buttons.length; i++) {
            var type = buttons[i].dataset.type;
            var remaining = self.placementLimits[type] - self.placementCounts[type];
            var countSpan = buttons[i].querySelector('.unit-remaining');

            if (countSpan) {
                countSpan.textContent = remaining + '/' + self.placementLimits[type];
            }

            if (remaining <= 0) {
                buttons[i].disabled = true;
                buttons[i].classList.remove('selected');
                buttons[i].classList.add('unit-btn-disabled');
            } else {
                buttons[i].disabled = false;
                buttons[i].classList.remove('unit-btn-disabled');
            }
        }
    },

    /* TILE CLICK HANDLER */

    handleTileClick: function (row, col, event) {
        if (this.inputLocked || Engine.isGameOver) return;

        // Placement phase
        if (Engine.phase === PHASE.PLACEMENT_PLAYER || Engine.phase === PHASE.PLACEMENT_AI) {
            this.handlePlacementClick(row, col);
            return;
        }

        // Player turn 
        if (Engine.phase === PHASE.PLAYER_TURN) {
            this.handleGameplayClick(row, col, event);
            return;
        }

    },

    /* GAMEPLAY CLICK HANDLING */

    handleGameplayClick: function (row, col, event) {
        if (Engine.isGameOver) return;

        var clickedUnitId = null;
        if (event && event.target) {
            var unitDisplay = event.target.closest('.unit-display');
            if (unitDisplay && unitDisplay.dataset.unitId) {
                clickedUnitId = parseInt(unitDisplay.dataset.unitId, 10);
            }
        }

        var clickedUnit = null;
        if (clickedUnitId) {
            clickedUnit = Engine.getUnitById(clickedUnitId);
        } else {
            var units = Engine.getUnitsAt(row, col);
            if (units.length > 0) clickedUnit = units[0];
        }

        if (this.currentAction === 'move' && this.selectedUnit) {
            var validMoves = Engine.getValidMoves(this.selectedUnit);
            var isValidMove = false;
            for (var i = 0; i < validMoves.length; i++) {
                if (validMoves[i].row === row && validMoves[i].col === col) {
                    isValidMove = true;
                    break;
                }
            }

            if (isValidMove) {
                this.performMove(this.selectedUnit, row, col);
                return;
            }

            this.deselectUnit();
            return;
        }

        if (this.currentAction === 'attack' && this.selectedUnit) {
            var targets = Engine.getAttackTargets(this.selectedUnit);
            var targetUnit = null;

            for (var j = 0; j < targets.length; j++) {
                if (targets[j].row === row && targets[j].col === col) {
                    targetUnit = targets[j];
                    break;
                }
            }

            if (targetUnit) {
                this.performAttack(this.selectedUnit, targetUnit);
                return;
            }

            this.deselectUnit();
            return;
        }

        if (clickedUnit && clickedUnit.owner === 'player' && !clickedUnit.hasActed) {
            var anyActed = false;
            var playerUnits = Engine.getUnitsForOwner('player');
            for (var k = 0; k < playerUnits.length; k++) {
                if (playerUnits[k].hasActed) {
                    anyActed = true;
                    break;
                }
            }
            if (!anyActed) {
                this.selectUnit(clickedUnit);
            } else {
                this.deselectUnit();
            }
        } else {
            this.deselectUnit();
        }
    },

    /* UNIT SELECTION */

    selectUnit: function (unit) {
        this.selectedUnit = unit;
        this.currentAction = null;

        UI.clearAllHighlights();
        UI.highlightSelectedTile(unit.row, unit.col);
        UI.clearActionButtonHighlights();
        UI.updateActionButtons(unit);
        UI.showUnitInfo(unit);
    },

    deselectUnit: function () {
        this.selectedUnit = null;
        this.currentAction = null;

        UI.clearAllHighlights();
        UI.clearActionButtonHighlights();
        UI.updateActionButtons(null);
        UI.showUnitInfo(null);
    },

    /* ACTIONS */

    performMove: function (unit, row, col) {
        if (Engine.isGameOver) return;
        var self = this;

        var enemies = Engine.getEnemyUnitsOnTile(row, col, unit.owner);

        if (enemies.length > 0) {
            Engine.removeUnitFromTile(unit);
            var oldRow = unit.row;
            var oldCol = unit.col;
            unit.row = row;
            unit.col = col;
            Engine.grid[row][col].units.push(unit);
            UI.renderGrid();
            self.inputLocked = true;

            setTimeout(function () {
                var defender = enemies[0];
                var result = Engine.resolveCombat(unit, defender);

                UI.showDiceAnimation(result).then(function () {
                    if (result.attackerWins) {
                        Engine.grid[row][col].owner = unit.owner;
                    } else if (!result.attackerWins && result.defenderScore > result.attackerScore) {
                        Engine.removeUnit(unit);
                    } else {
                        Engine.removeUnitFromTile(unit);
                        unit.row = oldRow;
                        unit.col = oldCol;
                        Engine.grid[oldRow][oldCol].units.push(unit);
                    }
                    unit.hasMoved = true;
                    Engine.checkTerritoryVictory();
                    UI.renderGrid();
                    UI.updateHUD();
                    UI.renderBattleLog();
                    self.deselectUnit();
                    self.inputLocked = false;

                    if (Engine.phase === PHASE.GAME_OVER) {
                        setTimeout(function () { UI.showGameOver(); }, 500);
                    }
                });
            }, 1000);

        } else {
            Engine.moveUnit(unit, row, col);
            unit.hasActed = true;
            UI.renderGrid();
            UI.renderBattleLog();
            this.currentAction = null;
            self.deselectUnit();
        }
    },

    setAction: function (action) {
        if (!this.selectedUnit) return;

        if (this.currentAction === action) {
            this.currentAction = null;
            UI.clearAllHighlights();
            UI.highlightSelectedTile(this.selectedUnit.row, this.selectedUnit.col);
            UI.clearActionButtonHighlights();
            return;
        }

        this.currentAction = action;

        UI.clearAllHighlights();
        UI.highlightSelectedTile(this.selectedUnit.row, this.selectedUnit.col);
        UI.setActiveActionButton(action);

        if (action === 'move') {
            UI.highlightMoveCells(this.selectedUnit);
        } else if (action === 'attack') {
            UI.highlightAttackCells(this.selectedUnit);
        }
    },

    performAttack: function (attacker, defender) {
        if (Engine.isGameOver) return;
        var self = this;

        this.inputLocked = true;

        var result = Engine.resolveCombat(attacker, defender);

        UI.showDiceAnimation(result).then(function () {
            UI.flashTile(defender.row, defender.col);

            UI.renderGrid();
            UI.updateHUD();
            UI.renderBattleLog();

            self.deselectUnit();
            self.inputLocked = false;

            if (Engine.phase === PHASE.GAME_OVER) {
                setTimeout(function () {
                    UI.showGameOver();
                }, 500);
            }
        });
    },

    performDefend: function () {
        if (Engine.isGameOver) return;
        if (!this.selectedUnit) return;
        if (!Engine.canUnitDefend(this.selectedUnit)) return;

        Engine.defendUnit(this.selectedUnit);
        this.selectedUnit.hasActed = true;

        UI.renderGrid();
        UI.renderBattleLog();
        this.deselectUnit();
    },

    /* TURN MANAGEMENT */

    endPlayerTurn: function () {
        if (Engine.isGameOver) return;
        if (Engine.phase !== PHASE.PLAYER_TURN) return;
        this.inputLocked = true;
        this.deselectUnit();

        var gameEnded = Engine.endTurn();

        UI.updateHUD();
        UI.renderGrid();
        UI.renderBattleLog();

        if (gameEnded || Engine.isGameOver) {
            setTimeout(function () {
                UI.showGameOver();
            }, 500);
            return;
        }

        if (Engine.phase === PHASE.AI_TURN) {
            this.executeAITurn();
        } else if (Engine.phase === PHASE.INITIATIVE) {
            this.startInitiativePhase();
        }
    },

    executeAITurn: function () {
        var self = this;
        this.inputLocked = true;

        setTimeout(function () {
            AI.takeTurn().then(function () {
                var gameEnded = Engine.endTurn();

                UI.updateHUD();
                UI.renderGrid();
                UI.renderBattleLog();

                if (gameEnded || Engine.isGameOver) {
                    setTimeout(function () {
                        UI.showGameOver();
                    }, 500);
                    return;
                }

                if (Engine.phase === PHASE.PLAYER_TURN) {
                    self.inputLocked = false;
                } else if (Engine.phase === PHASE.INITIATIVE) {
                    self.startInitiativePhase();
                }
            });
        }, 600);
    }
};

/* BOOT */
document.addEventListener('DOMContentLoaded', function () {
    Game.init();
});
