const AI = {

    takePlacementTurn: function () {
        var pool = ['tank', 'soldier', 'soldier', 'cavalry', 'cavalry'];
        var placedCount = Engine.aiUnitsPlaced;
        if (placedCount >= pool.length) return;

        var typeToPlace = pool[placedCount];
        var availableCells = Engine.getPlacementCells('ai');

        if (availableCells.length > 0) {
            var cell = availableCells[Math.floor(Math.random() * availableCells.length)];
            var placed = Engine.createUnit(typeToPlace, 'ai', cell.row, cell.col);
            if (placed) {
                Engine.aiUnitsPlaced++;
                Engine.addLog('AI deployed ' + typeToPlace + ' at [' + cell.row + ',' + cell.col + '].', 'phase');
            }
        }
    },

    takeTurn: function () {
        return new Promise(function (resolve) {
            if (Engine.isGameOver) { resolve(); return; }

            var aiUnits = Engine.getUnitsForOwner('ai');

            var unit = null;
            for (var i = 0; i < aiUnits.length; i++) {
                if (!aiUnits[i].hasActed && AI.isUnitAlive(aiUnits[i])) {
                    unit = aiUnits[i];
                    break;
                }
            }

            if (!unit) { resolve(); return; }

            AI.decideAction(unit).then(function () {
                resolve();
            });
        });
    },

    decideAction: function (unit) {
        return new Promise(function (resolve) {
            if (Engine.isGameOver) { resolve(); return; }

            var targets = Engine.getAttackTargets(unit);
            if (targets.length > 0) {
                var target = AI.getWeakestUnit(targets);
                var result = Engine.resolveCombat(unit, target);

                if (result) {
                    UI.showDiceAnimation(result).then(function () {
                        UI.renderGrid();
                        UI.updateHUD();
                        resolve();
                    });
                } else {
                    resolve();
                }
                return;
            }

            if (unit.strength < 4) {
                Engine.defendUnit(unit);
                UI.renderGrid();
                resolve();
                return;
            }

            var moved = AI.moveTowardEnemy(unit);

            if (moved) {
                if (moved && moved.attackerDice !== undefined) {
                    UI.showDiceAnimation(moved).then(function () {
                        UI.renderGrid();
                        UI.updateHUD();
                        resolve();
                    });
                    return;
                }
                unit.hasActed = true;
                UI.renderGrid();
                resolve();
            } else {
                Engine.defendUnit(unit);
                UI.renderGrid();
                resolve();
            }
        });
    },

    moveTowardEnemy: function (unit) {
        if (unit.hasMoved) return false;

        var validMoves = Engine.getValidMoves(unit);
        if (validMoves.length === 0) return false;

        var playerUnits = Engine.getUnitsForOwner('player');
        if (playerUnits.length === 0) return false;

        var nearestEnemy = null;
        var nearestDist = 999;

        for (var i = 0; i < playerUnits.length; i++) {
            var dist = Math.abs(playerUnits[i].row - unit.row) +
                Math.abs(playerUnits[i].col - unit.col);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestEnemy = playerUnits[i];
            }
        }

        if (!nearestEnemy) return false;

        var bestMove = null;
        var bestDist = 999;

        for (var j = 0; j < validMoves.length; j++) {
            var move = validMoves[j];
            var dist = Math.abs(move.row - nearestEnemy.row) +
                Math.abs(move.col - nearestEnemy.col);
            if (dist < bestDist) {
                bestDist = dist;
                bestMove = move;
            }
        }

        if (!bestMove) return false;

        var enemies = Engine.getEnemyUnitsOnTile(bestMove.row, bestMove.col, unit.owner);
        if (enemies.length > 0) {
            Engine.removeUnitFromTile(unit);
            var oldRow = unit.row;
            var oldCol = unit.col;
            unit.row = bestMove.row;
            unit.col = bestMove.col;
            Engine.grid[bestMove.row][bestMove.col].units.push(unit);
            UI.renderGrid();

            var result = Engine.resolveCombat(unit, enemies[0]);
            if (result) {
                if (result.attackerWins) {
                    Engine.grid[bestMove.row][bestMove.col].owner = unit.owner;
                } else if (result.defenderScore > result.attackerScore) {
                    Engine.removeUnit(unit);
                } else {
                    Engine.removeUnitFromTile(unit);
                    unit.row = oldRow;
                    unit.col = oldCol;
                    Engine.grid[oldRow][oldCol].units.push(unit);
                }
            }
            unit.hasMoved = true;
            return result || true;
        }

        Engine.moveUnit(unit, bestMove.row, bestMove.col);
        return true;
    },

    /* HELPER FUNCTIONS */

    getWeakestUnit: function (units) {
        var weakest = units[0];
        for (var i = 1; i < units.length; i++) {
            if (units[i].strength < weakest.strength) {
                weakest = units[i];
            }
        }
        return weakest;
    },

    isUnitAlive: function (unit) {
        for (var i = 0; i < Engine.units.length; i++) {
            if (Engine.units[i].id === unit.id) return true;
        }
        return false;
    },

    shuffleArray: function (array) {
        var shuffled = array.slice();
        for (var i = shuffled.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = shuffled[i];
            shuffled[i] = shuffled[j];
            shuffled[j] = temp;
        }
        return shuffled;
    }
};
