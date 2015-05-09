/**
 * Mobineers
 * Version: 1
 * Author: Michael Mao
 *
 */


settings = {
    width: 800,
    height: 500,

    // star settings
    star_w: 24,
    star_h: 22,

    // bug settings
    bug_w: 32,
    bug_h: 32,

    // popup settings
    popup_w: 179,
    popup_h: 250,

    // adjustable difficulty settings
    countdown: 30, // in seconds
    star_gen_time: 3000, // in ms
    popup_gen_time: 2500,

    max_stars: 5,
    max_bugs: 30,
    max_popups: 4,
    bugs_tolerated: 10,

    star_points: 10,
    bug_points: 2,
    star_size: 2,
    bug_size: 1.2,
    star_max_speed: 200,
    star_min_speed: 100,
    bug_max_speed: 200,
    bug_min_speed: 150
};

// Globals
var timer;
var countdownText;
var score = 0;
var scoreText;
var stateText;
var levelText;

var bin;
var stars;
var bugs;
var poof;
var popups;
var starGenerator;
var popupGenerator;

var starsCollected = 0;
var bugsCollected = 0;

var button;

// create new game
// string param is id of element to insert canvas, empty will append to body
var game = new Phaser.Game(settings.width, settings.height, Phaser.AUTO, 'game', { preload: preload, create: create, update: update });

// preload assets
function preload() {
    game.load.image('mac', 'assets/snow_leopard_desktop.jpg');
    game.load.image('bin', 'assets/bin_icon.png');
    game.load.image('gchat', 'assets/hangouts_chat.png');
    game.load.image('star', 'assets/star.png');
    game.load.spritesheet('bug', 'assets/baddie.png', settings.bug_w, settings.bug_h);
    game.load.spritesheet('poof', 'assets/poof_icon.png', 40, 40);
}

// create game objects and set attributes
function create() {
    // start physics engine
    game.physics.startSystem(Phaser.Physics.ARCADE);

    // add background
    game.add.sprite(0, 0, 'mac');

    // the trash bin
    bin = game.add.sprite(settings.width - 100, settings.height - 52, 'bin');
    game.physics.arcade.enable(bin);

    // stars group
    stars = game.add.group();
    stars.enableBody = true;
    stars.physicsBodyType = Phaser.Physics.ARCADE;
    stars.createMultiple(settings.max_stars, 'star');
    stars.setAll('scale.x', settings.star_size);
    stars.setAll('scale.y', settings.star_size);
    stars.setAll('anchor.x', 0.5);
    stars.setAll('anchor.y', 0.5);
    stars.setAll('body.collideWorldBounds', true);
    stars.setAll('body.bounce', new Phaser.Point(1, 1));
    stars.setAll('inputEnabled', true);
    stars.setAll('input.useHandCursor', true);
    stars.forEach(function(star) {
        star.events.onInputDown.add(collectStar, star);
    }, this);

    // bugs group
    bugs = game.add.group();
    bugs.enableBody = true;
    bugs.physicsBodyType = Phaser.Physics.ARCADE;
    bugs.createMultiple(settings.max_bugs, 'bug');
    bugs.setAll('scale.x', settings.bug_size);
    bugs.setAll('scale.y', settings.bug_size);
    bugs.setAll('anchor.x', 0.5);
    bugs.setAll('anchor.y', 0.5);
    bugs.setAll('body.collideWorldBounds', true);
    bugs.setAll('body.bounce', new Phaser.Point(1, 1));
    bugs.setAll('inputEnabled', true);
    bugs.setAll('input.useHandCursor', true);
    bugs.forEach(function(bug){
        bug.input.enableDrag(false);
        bug.events.onDragStart.add(startDrag, bug);
        bug.events.onDragStop.add(stopDrag, bug);

        bug.animations.add('left', [0, 1], 10, true);
        bug.animations.add('right', [2, 3], 10, true);
    }, this);

    // poof
    poof = game.add.group();
    poof.createMultiple(1, 'poof');
    poof.setAll('scale.x', settings.bug_size);
    poof.setAll('scale.y', settings.bug_size);
    poof.forEach(function(p) {
        var a = p.animations.add('disappear', [0, 1, 2, 3, 4], 10, false);
        a.onComplete.add(animStopped, p);
    }, this);

    // popups group
    popups = game.add.group();
    popups.createMultiple(settings.max_popups, 'gchat');
    popups.setAll('anchor.x', 1);
    popups.setAll('anchor.y', 1);
    popups.setAll('inputEnabled', true);
    popups.forEach(function(popup) {
        popup.events.onInputDown.add(closePopup, this);
    }, this);

    // counters
    scoreText = game.add.text(16, 16, 'Score: 0', {fill: '#FFF'});
    countdownText = game.add.text(settings.width-16, 16, 'Days to release: 30', {fill: '#FFF'});
    countdownText.anchor.set(1, 0);

    // text
    stateText = game.add.text(game.world.centerX, game.world.centerY-50, 'Push your first feature', {fill: '#FFF', align: 'center'});
    stateText.anchor.set(0.5);
    stateText.visible = false;
    levelText = game.add.text(game.world.centerX, game.world.centerY+100, 'Click here to start next sprint', {fill: '#000', align: 'center'});
    levelText.anchor.set(0.5);
    levelText.visible = false;

    // create timer, does not start it
    timer = game.time.create(false);
    timer.loop(1000, timerUpdate, this);

    // create looped event to generate objects
    starGenerator = timer.loop(settings.star_gen_time, generateStars);
    popupGenerator = timer.loop(settings.popup_gen_time, generatePopups);

    start();

    button = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
}

// updates executed every frame
function update() {
//    if(button.isDown) {
//        generateStars();
//    }

    // game finished
    if(settings.countdown == 0) {
        gameOver();
    }

    // determine bug direction animation
    bugs.forEachExists(function(bug){
        if(bug.body.velocity.x < 0) {
            bug.play('left');
        }
        else {
            bug.play('right');
        }
    });

    // if nothing on screen generate stars
    if(timer.running && !bugs.countLiving() && !stars.countLiving()) {
        generateStars();
    }
}

function startDrag(sprite) {
    // disable movement during drag
    sprite.body.moves = false;
}

function stopDrag(sprite) {
    // enable movement
    sprite.body.moves = true;

    game.physics.arcade.overlap(sprite, bin, function() {
        collectBug(sprite);
    });
}

function generateStars() {

    if(bugs.countLiving() < settings.bugs_tolerated) {
        var n = game.rnd.integerInRange(0, 2);

        for(var i= 0; i<n; i++) {
            // get first available star from pool
            var star = stars.getFirstExists(false);

            if(star) {
                star.exists = true;
                star.alive = true;
                star.reset(game.rnd.integerInRange(0, settings.width-1), game.rnd.integerInRange(0, settings.height-1));
                star.body.velocity.y = game.rnd.integerInRange(settings.star_min_speed, settings.star_max_speed);
                star.body.velocity.x = game.rnd.integerInRange(settings.star_min_speed, settings.star_max_speed);
            }
        }
    }
}

function generatePopups() {

    // chances increase with the number of bugs
    var b = bugs.countLiving();
    if(b > 1) {
        // chance
        var c = game.rnd.integerInRange(0, 100);

        if(c < b * 5) {
            // number of popups
            var n = (b > settings.bugs_tolerated ? 3 : game.rnd.integerInRange(0, 2));

            for(var i=0; i<n; i++) {
                var popup = popups.getFirstExists(false);

                if(popup) {
                    popup.exists = true;
                    popup.reset(settings.width-(popups.getIndex(popup)*(settings.popup_w+10))-16, settings.height);
                }
            }
        }
    }
}

function collectStar(star) {

    // update score and count
    score += settings.star_points;
    scoreText.text = 'Score: ' + score;
    starsCollected++;

    // spawn bugs
    var n = game.rnd.integerInRange(1, 4);
    for(var i=0; i<n; i++) {
        // get first available bug from pool
        var bug = bugs.getFirstExists(false);

        if(bug) {
            bug.exists = true;
            bug.alive = true;
            bug.reset(star.x, star.y);
            bug.body.velocity.y = game.rnd.integerInRange(settings.bug_min_speed, settings.bug_max_speed);
            bug.body.velocity.x = game.rnd.integerInRange(-settings.bug_max_speed, settings.bug_max_speed);
        }
    }

    // remove star
    star.kill();
}

function collectBug(bug) {

    // update score and count
    score += settings.bug_points;
    scoreText.text = 'Score: ' + score;
    bugsCollected++;

    // animate poof
    var p = poof.getFirstExists(false);

    if(p) {
        p.exists = true;
        p.reset(bug.x-16, bug.y-16);
        p.play('disappear');
    }

    // remove bug
    bug.kill();
}

function closePopup(popup, pointer) {

    // check if correct location was clicked
    // anchor for popups is lower left
    if(pointer.worldY > settings.height - settings.popup_h + 5 && pointer.worldY < settings.height - settings.popup_h + 18) {
        if(pointer.worldX > settings.width-(popups.getIndex(popup)*(settings.popup_w+10))-16-40 &&
            pointer.worldX < settings.width-(popups.getIndex(popup)*(settings.popup_w+10))-16) {
            // remove popup
            popup.kill();
        }
    }
}

function animStopped(sprite) {
    sprite.kill();
}

function timerUpdate() {
    settings.countdown--;
    countdownText.text = 'Days to release: ' + settings.countdown;
    if(settings.countdown <= 10) {
        // red
        countdownText.fill = '#F00';
    }
}

function getHighscore() {
    var rating = 'I know some HTML...';

    if(score > 200) rating = 'Mobineer God';
    else if(score > 175) rating = 'Mobineer Master';
    else if(score > 150) rating = 'Mobineer Team Lead';
    else if(score > 125) rating = 'Sr. Mobineer';
    else if(score > 100) rating = 'Jr. Mobineer';
    else if(score > 75) rating = 'Intern';

    return rating;
}

function start() {
    // create first star in center of screen
    var star = game.add.sprite(game.world.centerX, game.world.centerY, 'star');
    star.anchor.set(0.5);
    star.scale.set(settings.star_size, settings.star_size);
    game.physics.arcade.enable(star);
    star.inputEnabled = true;
    star.input.useHandCursor = true;
    star.events.onInputDown.add(function() {
        stateText.visible = false;
        timer.start();
        collectStar(star);
    });

    // reset countdown text
    countdownText.fill = '#FFF';
    countdownText.text = 'Days to release: 30';

    // display start text
    stateText.text = 'Push your first feature';
    stateText.visible = true;
}

function gameOver() {

    // disable all inputs and freeze
    timer.stop(false); // do not clear events
    stars.setAll('inputEnabled', false);
    bugs.setAll('inputEnabled', false);
    stars.setAll('body.moves', false);
    bugs.setAll('body.moves', false);
    bugs.forEachExists(function(bug) {
        bug.animations.stop();
    });

    // hacky way to make sure text is on top
    scoreText.text = 'Score: ' + score;
    countdownText.text = 'Days to release: ' + settings.countdown;

    // display results
    stateText.text = 'Features pushed: ' + starsCollected + '\nBugs bashed: ' + bugsCollected + '\n';
    stateText.align = 'right';
    stateText.visible = true;

    // click to restart game
    var rating = getHighscore();
    levelText.text = 'Rating: ' + rating + '\nClick here to start next sprint';
    levelText.inputEnabled = true;
    levelText.input.useHandCursor = true;
    levelText.events.onInputDown.add(restart);
    levelText.visible = true;
}

function restart() {
    stateText.visible = false;
    levelText.events.onInputDown.remove(restart);
    levelText.inputEnabled = false;
    levelText.visible = false;

    // resets score
    score = 0;
    scoreText.text = 'Score: ' + score;

    // reset counters
    settings.countdown = 30;
    starsCollected = 0;
    bugsCollected = 0;

    // reset all objects
    stars.callAllExists('kill', true);
    bugs.callAllExists('kill', true);
    poof.callAllExists('kill', true);
    popups.callAllExists('kill', true);

    // enable inputs again
    stars.setAll('inputEnabled', true);
    bugs.setAll('inputEnabled', true);
    stars.setAll('input.useHandCursor', true);
    bugs.setAll('input.useHandCursor', true);
    stars.setAll('body.moves', true);
    bugs.setAll('body.moves', true);

    // restarts current state
    // game.state.restart();
    start();
}