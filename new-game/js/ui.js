const UI = {

    /* DOM REFERENCES */
    elements: {
        startScreen: null,
        gameScreen: null,
        gameoverScreen: null,

        hudPlayerTerritory: null,
        hudAITerritory: null,
        hudTurn: null,
        hudPhase: null,

        grid: null,

        placementPanel: null,
        actionPanel: null,
        selectedInfo: null,
        selectedDetails: null,
        unitsRemaining: null,

        btnMove: null,
        btnAttack: null,
        btnDefend: null,
        btnEndTurn: null,

        battleLog: null,

        diceOverlay: null,
        diceTitle: null,
        diceLabelAttacker: null,
        diceLabelDefender: null,
        diceBoxAttacker: null,
        diceBoxDefender: null,
        diceAttacker: null,
        diceDefender: null,
        combatRollArea: null,
        combatDetails: null,
        btnCombatContinue: null,

        tooltip: null,
        tooltipContent: null,

        gameoverTitle: null,
        gameoverMessage: null,
        gameoverStats: null
    },

    init: function () {
        this.elements.startScreen = document.getElementById('start-screen');
        this.elements.gameScreen = document.getElementById('game-screen');
        this.elements.gameoverScreen = document.getElementById('gameover-screen');

        this.elements.hudPlayerTerritory = document.getElementById('hud-player-territory');
        this.elements.hudAITerritory = document.getElementById('hud-ai-territory');
        this.elements.hudTurn = document.getElementById('hud-turn');
        this.elements.hudPhase = document.getElementById('hud-phase');

        this.elements.grid = document.getElementById('grid');

        this.elements.placementPanel = document.getElementById('placement-panel');
        this.elements.actionPanel = document.getElementById('action-panel');
        this.elements.selectedInfo = document.getElementById('selected-info');
        this.elements.selectedDetails = document.getElementById('selected-unit-details');
        this.elements.unitsRemaining = document.getElementById('units-remaining-count');

        this.elements.btnMove = document.getElementById('btn-move');
        this.elements.btnAttack = document.getElementById('btn-attack');
        this.elements.btnDefend = document.getElementById('btn-defend');
        this.elements.btnEndTurn = document.getElementById('btn-end-turn');

        this.elements.battleLog = document.getElementById('battle-log');
        this.elements.diceOverlay = document.getElementById('dice-overlay');
        this.elements.diceTitle = document.getElementById('dice-title');
        this.elements.diceLabelAttacker = document.getElementById('dice-label-attacker');
        this.elements.diceLabelDefender = document.getElementById('dice-label-defender');
        this.elements.diceBoxAttacker = document.getElementById('dice-box-attacker');
        this.elements.diceBoxDefender = document.getElementById('dice-box-defender');
        this.elements.diceAttacker = document.getElementById('dice-attacker');
        this.elements.diceDefender = document.getElementById('dice-defender');
        this.elements.combatRollArea = document.getElementById('combat-roll-area');
        this.elements.combatDetails = document.getElementById('combat-details');
        this.elements.btnCombatContinue = document.getElementById('btn-combat-continue');

        this.elements.tooltip = document.getElementById('tooltip');
        this.elements.tooltipContent = document.getElementById('tooltip-content');

        this.elements.gameoverTitle = document.getElementById('gameover-title');
        this.elements.gameoverMessage = document.getElementById('gameover-message');
        this.elements.gameoverStats = document.getElementById('gameover-stats');
    },

    /* SCREEN MANAGEMENT */

    showScreen: function (screenId) {
        this.elements.startScreen.classList.remove('active');
        this.elements.gameScreen.classList.remove('active');
        this.elements.gameoverScreen.classList.remove('active');

        document.getElementById(screenId).classList.add('active');
    },

    /* GRID RENDERING */

    renderGrid: function () {
        var gridEl = this.elements.grid;
        gridEl.innerHTML = '';

        for (var row = 0; row < GRID_SIZE; row++) {
            for (var col = 0; col < GRID_SIZE; col++) {
                var cell = Engine.grid[row][col];
                var tile = document.createElement('div');
                tile.className = 'tile';
                tile.dataset.row = row;
                tile.dataset.col = col;

                if (cell.terrain === TERRAIN.BONUS) {
                    tile.classList.add('terrain-bonus');
                } else if (cell.terrain === TERRAIN.TRAP) {
                    tile.classList.add('terrain-trap');
                }

                if (cell.owner === 'player') {
                    tile.classList.add('owner-player');
                } else if (cell.owner === 'ai') {
                    tile.classList.add('owner-ai');
                }

                if (cell.units && cell.units.length > 0) {
                    var stackDiv = document.createElement('div');
                    stackDiv.className = 'unit-stack';

                    for (var u = 0; u < cell.units.length; u++) {
                        var unit = cell.units[u];
                        var unitDiv = document.createElement('div');
                        unitDiv.className = 'unit-display';
                        unitDiv.dataset.unitId = unit.id;

                        if (unit.hasActed) unitDiv.classList.add('acted');

                        var ownerBar = document.createElement('div');
                        ownerBar.className = 'unit-owner-bar ' +
                            (unit.owner === 'player' ? 'player-bar' : 'ai-bar');
                        unitDiv.appendChild(ownerBar);

                        var iconSpan = document.createElement('span');
                        iconSpan.textContent = unit.icon;
                        unitDiv.appendChild(iconSpan);

                        var strengthSpan = document.createElement('span');
                        strengthSpan.className = 'unit-strength';
                        strengthSpan.textContent = unit.strength;
                        unitDiv.appendChild(strengthSpan);

                        if (unit.defending) {
                            var shieldSpan = document.createElement('span');
                            shieldSpan.className = 'unit-shield';
                            shieldSpan.textContent = '🛡';
                            unitDiv.appendChild(shieldSpan);
                            tile.classList.add('defend-glow');
                        }

                        if (Game.selectedUnit && Game.selectedUnit.id === unit.id) {
                            unitDiv.classList.add('unit-selected');
                        }

                        stackDiv.appendChild(unitDiv);
                    }

                    if (cell.units.length > 1) {
                        var countBadge = document.createElement('span');
                        countBadge.className = 'unit-count-badge';
                        countBadge.textContent = cell.units.length;
                        stackDiv.appendChild(countBadge);
                    }

                    tile.appendChild(stackDiv);
                }

                tile.addEventListener('click', this.createTileClickHandler(row, col));

                tile.addEventListener('mouseenter', this.createTileHoverHandler(row, col));
                tile.addEventListener('mouseleave', this.hideTooltip.bind(this));

                gridEl.appendChild(tile);
            }
        }
    },

    createTileClickHandler: function (row, col) {
        return function (event) {
            Game.handleTileClick(row, col, event);
        };
    },

    createTileHoverHandler: function (row, col) {
        var self = this;
        return function (event) {
            var units = Engine.getUnitsAt(row, col);
            if (units.length > 0) {
                self.showTooltip(units[0], event);
            }
        };
    },

    /* TILE HIGHLIGHTING */

    highlightPlacementCells: function (owner) {
        this.clearAllHighlights();
        var cells = Engine.getPlacementCells(owner);
        for (var i = 0; i < cells.length; i++) {
            var tile = this.getTileElement(cells[i].row, cells[i].col);
            if (tile) {
                tile.classList.add('placement-valid');
            }
        }
    },

    highlightMoveCells: function (unit) {
        var moves = Engine.getValidMoves(unit);
        for (var i = 0; i < moves.length; i++) {
            var tile = this.getTileElement(moves[i].row, moves[i].col);
            if (tile) {
                tile.classList.add('move-highlight');
            }
        }
    },

    highlightAttackCells: function (unit) {
        var targets = Engine.getAttackTargets(unit);
        for (var i = 0; i < targets.length; i++) {
            var tile = this.getTileElement(targets[i].row, targets[i].col);
            if (tile) {
                tile.classList.add('attack-highlight');
            }
        }
    },

    highlightSelectedTile: function (row, col) {
        var tile = this.getTileElement(row, col);
        if (tile) {
            tile.classList.add('selected-tile');
        }
    },

    clearAllHighlights: function () {
        var tiles = this.elements.grid.querySelectorAll('.tile');
        for (var i = 0; i < tiles.length; i++) {
            tiles[i].classList.remove(
                'placement-valid', 'move-highlight', 'attack-highlight', 'selected-tile'
            );
        }
    },

    flashTile: function (row, col) {
        var tile = this.getTileElement(row, col);
        if (tile) {
            tile.classList.add('flash-attack');
            setTimeout(function () {
                tile.classList.remove('flash-attack');
            }, 500);
        }
    },

    /* HUD */

    updateHUD: function () {
        this.elements.hudPlayerTerritory.textContent = Engine.countTerritory('player');
        this.elements.hudAITerritory.textContent = Engine.countTerritory('ai');
        this.elements.hudTurn.textContent = 'TURN ' + Engine.turnNumber;

        var phaseText = '';
        switch (Engine.phase) {
            case PHASE.PLACEMENT_INITIATIVE: phaseText = 'DEPLOYMENT ORDER'; break;
            case PHASE.PLACEMENT_PLAYER: phaseText = 'YOUR DEPLOYMENT'; break;
            case PHASE.PLACEMENT_AI: phaseText = 'AI DEPLOYMENT'; break;
            case PHASE.PLAYER_TURN: phaseText = 'YOUR TURN'; break;
            case PHASE.AI_TURN: phaseText = 'AI TURN'; break;
            case PHASE.GAME_OVER: phaseText = 'GAME OVER'; break;
        }

        if (Engine.pendingWinner && !Engine.isGameOver) {
            phaseText = (Engine.pendingWinner === 'player' ? '⚡ VICTORY PENDING' : '⚡ DEFEAT PENDING');
        }

        this.elements.hudPhase.textContent = phaseText;

        if (Engine.isGameOver) {
            this.elements.btnEndTurn.disabled = true;
        } else {
            this.elements.btnEndTurn.disabled = false;
        }
    },

    /* PANEL MANAGEMENT */

    showPlacementPanel: function () {
        this.elements.placementPanel.classList.remove('hidden');
        this.elements.actionPanel.classList.add('hidden');
        this.elements.selectedInfo.classList.add('hidden');
    },

    showActionPanel: function () {
        this.elements.placementPanel.classList.add('hidden');
        this.elements.actionPanel.classList.remove('hidden');
    },

    updateUnitsRemaining: function (count) {
        this.elements.unitsRemaining.textContent = count;
    },

    /* ACTION BUTTON STATES */

    updateActionButtons: function (unit) {
        if (Engine.isGameOver) {
            this.elements.btnMove.disabled = true;
            this.elements.btnAttack.disabled = true;
            this.elements.btnDefend.disabled = true;
            return;
        }

        if (!unit || unit.owner !== 'player') {
            this.elements.btnMove.disabled = true;
            this.elements.btnAttack.disabled = true;
            this.elements.btnDefend.disabled = true;
            return;
        }

        this.elements.btnMove.disabled = !Engine.canUnitMove(unit);
        this.elements.btnAttack.disabled = !Engine.canUnitAttack(unit);
        this.elements.btnDefend.disabled = !Engine.canUnitDefend(unit);
    },

    clearActionButtonHighlights: function () {
        this.elements.btnMove.classList.remove('active-action');
        this.elements.btnAttack.classList.remove('active-action');
        this.elements.btnDefend.classList.remove('active-action');
    },

    setActiveActionButton: function (action) {
        this.clearActionButtonHighlights();
        if (action === 'move') this.elements.btnMove.classList.add('active-action');
        if (action === 'attack') this.elements.btnAttack.classList.add('active-action');
    },

    /* SELECTED UNIT INFO PANEL */

    showUnitInfo: function (unit) {
        if (!unit) {
            this.elements.selectedInfo.classList.add('hidden');
            return;
        }

        this.elements.selectedInfo.classList.remove('hidden');

        var html = '';
        html += '<div class="info-row"><span class="info-label">Type</span><span class="info-value">' + unit.icon + ' ' + unit.name + '</span></div>';
        html += '<div class="info-row"><span class="info-label">Owner</span><span class="info-value">' + unit.owner.toUpperCase() + '</span></div>';
        html += '<div class="info-row"><span class="info-label">Strength</span><span class="info-value">' + unit.strength + '</span></div>';
        html += '<div class="info-row"><span class="info-label">Movement</span><span class="info-value">' + unit.movement + '</span></div>';

        var terrainMod = Engine.getTerrainModifier(unit.row, unit.col);
        if (terrainMod > 0) {
            html += '<div class="info-row"><span class="info-label">Bonus Tile</span><span class="info-value mod-bonus">+' + terrainMod + '</span></div>';
        } else if (terrainMod < 0) {
            html += '<div class="info-row"><span class="info-label">Trap Tile</span><span class="info-value mod-penalty">' + terrainMod + '</span></div>';
        }

        if (unit.defending) {
            html += '<div class="info-row"><span class="info-label">Defending</span><span class="info-value mod-defense">+' + DEFENSE_MODIFIER + '</span></div>';
        }

        var total = unit.strength + terrainMod + (unit.defending ? DEFENSE_MODIFIER : 0);
        html += '<div class="info-row" style="border-top:1px solid rgba(61,122,255,0.15); margin-top:6px; padding-top:6px;"><span class="info-label">Effective</span><span class="info-value" style="color:var(--neon-cyan)">' + total + ' + 🎲</span></div>';

        var status = unit.hasActed ? '⛔ Done' : (unit.hasMoved ? '🔄 Moved' : '✅ Ready');
        html += '<div class="info-row"><span class="info-label">Status</span><span class="info-value">' + status + '</span></div>';

        this.elements.selectedDetails.innerHTML = html;
    },

    /* BATTLE LOG */

    renderBattleLog: function () {
        var logEl = this.elements.battleLog;
        logEl.innerHTML = '';

        for (var i = 0; i < Engine.log.length; i++) {
            var entry = Engine.log[i];
            var div = document.createElement('div');
            div.className = 'log-entry log-' + entry.type;
            div.textContent = entry.message;
            logEl.appendChild(div);
        }
    },

    /* COMBAT POPUP OVERLAY */

    showDiceAnimation: function (r) {
        var self = this;

        return new Promise(function (resolve) {
            // --- 1) Reset & show the overlay ---
            self.elements.diceOverlay.classList.remove('hidden');
            self.elements.diceTitle.textContent = "⚡ COMBAT REPORT ⚡";
            self.elements.diceLabelAttacker.textContent = "ATTACKER";
            self.elements.diceLabelDefender.textContent = "DEFENDER";
            self.elements.combatRollArea.classList.remove('hidden');
            self.elements.combatDetails.classList.add('hidden');
            self.elements.btnCombatContinue.classList.add('hidden');
            self.elements.combatDetails.innerHTML = '';

            self.elements.diceBoxAttacker.classList.remove('dice-player', 'dice-ai');
            self.elements.diceBoxDefender.classList.remove('dice-player', 'dice-ai');
            self.elements.diceBoxAttacker.classList.add(
                r.attacker.owner === 'player' ? 'dice-player' : 'dice-ai'
            );
            self.elements.diceBoxDefender.classList.add(
                r.defender.owner === 'player' ? 'dice-player' : 'dice-ai'
            );

            self.elements.diceAttacker.textContent = '?';
            self.elements.diceDefender.textContent = '?';
            self.elements.diceAttacker.classList.add('rolling');
            self.elements.diceDefender.classList.add('rolling');

            var rollCount = 0;
            var rollInterval = setInterval(function () {
                self.elements.diceAttacker.textContent = Math.floor(Math.random() * 6) + 1;
                self.elements.diceDefender.textContent = Math.floor(Math.random() * 6) + 1;
                rollCount++;

                if (rollCount >= 8) {
                    clearInterval(rollInterval);
                    self.elements.diceAttacker.classList.remove('rolling');
                    self.elements.diceDefender.classList.remove('rolling');
                    self.elements.diceAttacker.textContent = r.attackerDice;
                    self.elements.diceDefender.textContent = r.defenderDice;

                    setTimeout(function () {
                        self.buildCombatBreakdown(r);
                    }, 600);
                }
            }, 100);

            function onContinue() {
                self.elements.btnCombatContinue.removeEventListener('click', onContinue);
                self.elements.diceOverlay.classList.add('hidden');
                self.renderBattleLog();
                resolve();
            }
            self.elements.btnCombatContinue.addEventListener('click', onContinue);
        });
    },

    showInitiativeAnimation: function (res, customTitle, customSub) {
        var self = this;

        return new Promise(function (resolve) {
            self.elements.diceOverlay.classList.remove('hidden');
            self.elements.diceTitle.textContent = customTitle || "🎲 INITIATIVE ROLL 🎲";
            self.elements.diceLabelAttacker.textContent = "PLAYER";
            self.elements.diceLabelDefender.textContent = "AI";
            self.elements.combatRollArea.classList.remove('hidden');
            self.elements.combatDetails.classList.add('hidden');
            self.elements.btnCombatContinue.classList.add('hidden');
            self.elements.combatDetails.innerHTML = '';

            self.elements.diceBoxAttacker.classList.remove('dice-player', 'dice-ai');
            self.elements.diceBoxDefender.classList.remove('dice-player', 'dice-ai');
            self.elements.diceBoxAttacker.classList.add('dice-player');
            self.elements.diceBoxDefender.classList.add('dice-ai');

            self.elements.diceAttacker.textContent = '?';
            self.elements.diceDefender.textContent = '?';
            self.elements.diceAttacker.classList.add('rolling');
            self.elements.diceDefender.classList.add('rolling');

            var rollCount = 0;
            var rollInterval = setInterval(function () {
                self.elements.diceAttacker.textContent = Math.floor(Math.random() * 6) + 1;
                self.elements.diceDefender.textContent = Math.floor(Math.random() * 6) + 1;
                rollCount++;

                if (rollCount >= 8) {
                    clearInterval(rollInterval);
                    self.elements.diceAttacker.classList.remove('rolling');
                    self.elements.diceDefender.classList.remove('rolling');
                    self.elements.diceAttacker.textContent = res.playerRoll;
                    self.elements.diceDefender.textContent = res.aiRoll;

                    setTimeout(function () {
                        var winnerName = res.winner === 'player' ? 'PLAYER' : 'AI';
                        var html = '';
                        if (customSub) html += '<div class="combat-card-header" style="text-align:center; border:none; margin-top:0">' + customSub + '</div>';
                        html += '<div class="combat-winner ' + (res.winner === 'player' ? 'winner-player' : 'winner-ai') + '">';
                        html += '⚔️ ' + winnerName + ' WINS ⚔️';
                        html += '</div>';
                        self.elements.combatDetails.innerHTML = html;
                        self.elements.combatDetails.classList.remove('hidden');
                        self.elements.btnCombatContinue.classList.remove('hidden');
                    }, 600);
                }
            }, 100);

            function onContinue() {
                self.elements.btnCombatContinue.removeEventListener('click', onContinue);
                self.elements.diceOverlay.classList.add('hidden');
                resolve();
            }
            self.elements.btnCombatContinue.addEventListener('click', onContinue);
        });
    },

    buildCombatBreakdown: function (r) {
        var html = '';

        var attackerCardClass = (r.attacker.owner === 'player') ? 'card-player' : 'card-ai';
        var defenderCardClass = (r.defender.owner === 'player') ? 'card-player' : 'card-ai';

        // Attacker card
        html += '<div class="combat-card ' + attackerCardClass + '">';
        html += '  <div class="combat-card-header">ATTACKER</div>';
        html += '  <div class="combat-card-unit">' + r.attacker.icon + ' ' + r.attacker.name + '</div>';
        html += this.buildStatRow('Dice Roll', r.attackerDice, '');
        html += this.buildStatRow('Base Strength', r.attacker.strength, '');
        if (r.attackerTerrainMod > 0) {
            html += this.buildStatRow('Bonus Tile', '+' + r.attackerTerrainMod, 'val-bonus');
        } else if (r.attackerTerrainMod < 0) {
            html += this.buildStatRow('Trap Tile', r.attackerTerrainMod, 'val-penalty');
        }
        if (r.attackerDefenseBonus > 0) {
            html += this.buildStatRow('Defense Bonus', '+' + r.attackerDefenseBonus, 'val-defense');
        }
        html += this.buildStatRow('Final Score', r.attackerScore, '', true);
        html += '</div>';

        // Defender card 
        html += '<div class="combat-card ' + defenderCardClass + '">';
        html += '  <div class="combat-card-header">DEFENDER</div>';
        html += '  <div class="combat-card-unit">' + r.defender.icon + ' ' + r.defender.name + '</div>';
        html += this.buildStatRow('Dice Roll', r.defenderDice, '');
        html += this.buildStatRow('Base Strength', r.defender.strength, '');
        if (r.defenderTerrainMod > 0) {
            html += this.buildStatRow('Bonus Tile', '+' + r.defenderTerrainMod, 'val-bonus');
        } else if (r.defenderTerrainMod < 0) {
            html += this.buildStatRow('Trap Tile', r.defenderTerrainMod, 'val-penalty');
        }
        if (r.defenderDefenseBonus > 0) {
            html += this.buildStatRow('Defense Bonus', '+' + r.defenderDefenseBonus, 'val-defense');
        }
        html += this.buildStatRow('Final Score', r.defenderScore, '', true);
        html += '</div>';

        // Winner banner 
        var winnerIsPlayer = r.attackerWins
            ? (r.attacker.owner === 'player')
            : (r.defender.owner === 'player');
        var winnerBannerClass = winnerIsPlayer ? 'winner-player' : 'winner-ai';

        if (r.attackerWins) {
            html += '<div class="combat-winner ' + winnerBannerClass + '">';
            html += '⚡ ATTACKER WINS |' + r.defender.name + ' DESTROYED ⚡';
            html += '</div>';
        } else {
            html += '<div class="combat-winner ' + winnerBannerClass + '">';
            html += '🛡 ATTACK REPELLED |' + r.defender.name + ' SURVIVES';
            html += '</div>';
        }

        this.elements.combatDetails.innerHTML = html;
        this.elements.combatDetails.classList.remove('hidden');
        this.elements.btnCombatContinue.classList.remove('hidden');
    },

    buildStatRow: function (label, value, cssClass, isTotal) {
        var rowClass = 'combat-row' + (isTotal ? ' row-total' : '');
        var valClass = 'combat-row-value' + (cssClass ? ' ' + cssClass : '');
        return '<div class="' + rowClass + '">' +
            '<span class="combat-row-label">' + label + '</span>' +
            '<span class="' + valClass + '">' + value + '</span>' +
            '</div>';
    },

    /* TOOLTIP */

    showTooltip: function (unit, event) {
        var html = '';
        html += '<div class="tt-title">' + unit.icon + ' ' + unit.name.toUpperCase() + '</div>';
        html += '<div class="tt-row"><span class="tt-label">Owner</span><span class="tt-value">' + unit.owner + '</span></div>';
        html += '<div class="tt-row"><span class="tt-label">Strength</span><span class="tt-value">' + unit.strength + '</span></div>';

        var terrainMod = Engine.getTerrainModifier(unit.row, unit.col);
        if (terrainMod > 0) {
            html += '<div class="tt-row"><span class="tt-label">Bonus Tile</span><span class="tt-value tt-bonus">+' + terrainMod + '</span></div>';
        } else if (terrainMod < 0) {
            html += '<div class="tt-row"><span class="tt-label">Trap Tile</span><span class="tt-value tt-penalty">' + terrainMod + '</span></div>';
        }

        if (unit.defending) {
            html += '<div class="tt-row"><span class="tt-label">Defending</span><span class="tt-value tt-defense">+' + DEFENSE_MODIFIER + '</span></div>';
        }

        this.elements.tooltipContent.innerHTML = html;
        this.elements.tooltip.classList.remove('hidden');

        var x = event.clientX + 15;
        var y = event.clientY + 15;

        if (x + 220 > window.innerWidth) x = event.clientX - 230;
        if (y + 150 > window.innerHeight) y = event.clientY - 160;

        this.elements.tooltip.style.left = x + 'px';
        this.elements.tooltip.style.top = y + 'px';
    },

    hideTooltip: function () {
        this.elements.tooltip.classList.add('hidden');
    },

    /* GAME OVER SCREEN */

    showGameOver: function () {
        var winner = Engine.winner;
        var playerTerritory = Engine.countTerritory('player');
        var aiTerritory = Engine.countTerritory('ai');
        var playerUnits = Engine.getUnitsForOwner('player').length;
        var aiUnits = Engine.getUnitsForOwner('ai').length;

        if (winner === 'player') {
            this.elements.gameoverTitle.textContent = 'VICTORY';
            this.elements.gameoverTitle.style.color = 'var(--neon-cyan)';
            this.elements.gameoverMessage.textContent = 'You dominated the battlefield.';
        } else if (winner === 'ai') {
            this.elements.gameoverTitle.textContent = 'DEFEAT';
            this.elements.gameoverTitle.style.color = 'var(--neon-red)';
            this.elements.gameoverMessage.textContent = 'The enemy prevailed.';
        } else {
            this.elements.gameoverTitle.textContent = 'DRAW';
            this.elements.gameoverTitle.style.color = 'var(--neon-yellow)';
            this.elements.gameoverMessage.textContent = 'The battle was inconclusive.';
        }

        var statsHtml = '';
        statsHtml += 'Turns Played: ' + Engine.turnNumber + '<br>';
        statsHtml += 'Player Territory: ' + playerTerritory + ' zones<br>';
        statsHtml += 'AI Territory: ' + aiTerritory + ' zones<br>';
        statsHtml += 'Player Units Remaining: ' + playerUnits + '<br>';
        statsHtml += 'AI Units Remaining: ' + aiUnits;
        this.elements.gameoverStats.innerHTML = statsHtml;

        this.showScreen('gameover-screen');
    },

    /* UTILITY */

    getTileElement: function (row, col) {
        var index = row * GRID_SIZE + col;
        var tiles = this.elements.grid.children;
        if (index >= 0 && index < tiles.length) {
            return tiles[index];
        }
        return null;
    }
};
