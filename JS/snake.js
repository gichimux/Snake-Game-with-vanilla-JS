
function SnakeJS(parentElement, config){ //the global function

	let utilities = new Utilities();

	const defaultConfig = {
		autoInit : true					
		,gridWidth : 30						
		,gridHeight : 20					
		,frameInterval : 2000				
		,pointSize : 18						
		,snakeColor : "#53FC35"				
		,snakeEyeColor : "#FB4A41"			
		,candyColor : "#b11c1c"				
		,shrinkingCandyColor : "#199C2C"	
		,scoreBoardColor : "#111"		
		,scoreTextColor : "#FCE341"			
		,collisionTolerance : 2				
	};
	var config = config ? utilities.mergeObjects(defaultConfig, config) : defaultConfig ;

	const constants = {
		DIRECTION_UP : 1,
		DIRECTION_DOWN : -1,		
		DIRECTION_RIGHT : 2,
		DIRECTION_LEFT : -2,
		DEFAULT_DIRECTION : 2,
		STATE_READY : 1,
		STATE_PLAYING : 3,
		STATE_PAUSED : 2,
		STATE_GAME_OVER : 4,
		INITIAL_SNAKE_GROWTH_LEFT : 6,
		SCOREBOARD_HEIGHT : 20,
		CANDY_REGULAR : 1,
		CANDY_MASSIVE : 2,
		CANDY_SHRINKING : 3
	};

	const engine = new Engine(parentElement);

	this.init = ()=>{
		engine.initGame();
	};

	this.pause = ()=>{
		engine.pauseGame();
	};

	this.resume = ()=>{
		engine.resume();
	};

	this.getHighScore = ()=>{
		return engine.getHighScore();
	};

         /*the game object doing nearly everything*/
	function Engine(parentElement) {
		
		var     snake					// The snake itself
			,candy					// The candy which the snake eats
			,view					// The view object which draws the points to screen
			,inputInterface			// Responsible for handling input from the user
			,grid				// The grid object
			,currentState			// Possible values are found in constants.STATE_*
			,frameIntervalId		// The ID of the interval timer
			,score				// Player score
			,highScore				// Player highScore
			,collisionFramesLeft;	// If the snake collides, how many frames are left until death

		this.initGame = ()=>{

			view = new View(parentElement, config.backgroundColor);
			inputInterface = new InputInterface(this.pauseGame, this.resumeGame, startMoving);
			snake = new Snake();
			grid = new Grid(config.gridWidth, config.gridHeight);
			score = 0;
			highScore = score;
			snake.points.push(randomPoint(grid));
			snake.growthLeft = constants.INITIAL_SNAKE_GROWTH_LEFT;
			candy = randomCandy();
			view.initPlayField();
			drawCurrentScene();
			inputInterface.startListening();
			currentState = constants.STATE_READY;
		};

		this.pauseGame = ()=>{
			if (currentState === constants.STATE_PLAYING) {
				clearInterval(frameIntervalId);
				currentState = constants.STATE_PAUSED;
			}
		};

		this.resumeGame = ()=>{
			if (currentState === constants.STATE_PAUSED) {
				frameIntervalId = setInterval(nextFrame, config.frameInterval);
				currentState = constants.STATE_PLAYING;
			}
		};

		this.getHighScore = ()=>{
			return highScore;
		};

		
		const gameOver = ()=>{ //private methods
			currentState = constants.STATE_GAME_OVER;
			clearInterval(frameIntervalId);

			// Remove one point from the snakes tail and recurse with a timeout
			const removeTail = ()=>{
				if (snake.points.length > 1) {
					snake.points.pop();
					drawCurrentScene();
					setTimeout(removeTail, config.frameInterval/4);
				}
				else
					setTimeout(resurrect, config.frameInterval * 10);
			};

			const resurrect = ()=>{
				score = 0;
				snake.growthLeft = constants.INITIAL_SNAKE_GROWTH_LEFT;
				snake.alive = true;
				drawCurrentScene();
				currentState = constants.STATE_READY;
			};

			setTimeout(removeTail, config.frameInterval * 10);
		};

		const startMoving = ()=>{
			if (currentState === constants.STATE_READY) {
				frameIntervalId = setInterval(nextFrame, config.frameInterval);
				currentState = constants.STATE_PLAYING;
			}
		};

		// Calculates what the next frame will be like and draws it.
		let nextFrame = ()=>{

			// If the snake can't be moved in the desired direction due to collision
			if (!moveSnake(inputInterface.lastDirection())) {
				if (collisionFramesLeft > 0) {
					// Survives for a little longer
					collisionFramesLeft--;
					return;
				}
				else {
					// Now it's dead
					snake.alive = false;
					// Draw the dead snake
					drawCurrentScene();
					// And play game over scene
					gameOver();
					return;
				}
			}
			// It can move.
			else
				collisionFramesLeft = config.collisionTolerance;

			if (!candy.age())
					// The candy disappeared by ageing
					candy = randomCandy();

			// If the snake hits a candy
			if(candy.point.collidesWith(snake.points[0])) {
				eatCandy();
				candy = randomCandy();
			}

			drawCurrentScene();
		};

		const drawCurrentScene = ()=> {
			// Clear the view to make room for a new frame
			view.clear();
			// Draw the objects to the screen
			view.drawSnake(snake, config.snakeColor);
			view.drawCandy(candy);
			view.drawScore(score, highScore);
		};

		// Move the snake. Automatically handles self collision and walking through walls
		const moveSnake = (desiredDirection)=>{
			let head = snake.points[0];

			// The direction the snake will move in this frame
			let newDirection = actualDirection(desiredDirection || constants.DEFAULT_DIRECTION);

			let newHead = movePoint(head, newDirection);

			if (!insideGrid(newHead, grid))
				shiftPointIntoGrid(newHead, grid);

			if (snake.collidesWith(newHead, true)) {
				// Can't move. Collides with itself
				return false;
			}

			snake.direction = newDirection;
			snake.points.unshift(newHead);

			if (snake.growthLeft >= 1)
				snake.growthLeft--;
			else
				snake.points.pop();
			
			return true;
		};

		const eatCandy = ()=>{
			score += candy.score;
			highScore = Math.max(score, highScore);
			snake.growthLeft += candy.calories;
		};

		const randomCandy = ()=> {
			// Find a new position for the candy, and make sure it's not inside the snake
			do {
				var newCandyPoint = randomPoint(grid);
			} while(snake.collidesWith(newCandyPoint));
			const probabilitySeed = Math.floor(Math.random()*10);//set probabilitites for different types of candy between 0 && 9
			if (probabilitySeed <=4 )
				var newType = constants.CANDY_REGULAR;
			else if (probabilitySeed >= 6)
				var newType = constants.CANDY_MASSIVE;
			else
				var newType = constants.CANDY_SHRINKING;
			return new Candy(newCandyPoint, newType);
		};

		
		const actualDirection =(desiredDirection)=>{
			if (snake.points.length === 1)
				return desiredDirection;
			else if (utilities.oppositeDirections(snake.direction, desiredDirection)) {
				
				return snake.direction;
			}
			else {

				return desiredDirection;
			}
		};

		const movePoint = (oldPoint, direction)=>{
			var newPoint;
			with (constants) {
				switch (direction) {
				case DIRECTION_LEFT:
					newPoint = new Point(oldPoint.left-1, oldPoint.top);
					break;
				case DIRECTION_UP:
					newPoint = new Point(oldPoint.left, oldPoint.top-1);
					break;
				case DIRECTION_RIGHT:
					newPoint = new Point(oldPoint.left+1, oldPoint.top);
					break;
				case DIRECTION_DOWN:
					newPoint = new Point(oldPoint.left, oldPoint.top+1);
					break;
				}
			}
			return newPoint;
		};

		
		let shiftPointIntoGrid = (point, grid)=>{
			point.left = shiftIntoRange(point.left, grid.width);
			point.top = shiftIntoRange(point.top, grid.height);
			return point;
		};

		let shiftIntoRange = (number, range)=> {
			let shiftedNumber, steps;
			if (utilities.sign(number) == 1){
				steps = Math.floor(number/range);
				shiftedNumber = number - (range * steps);
			}
			else if (utilities.sign(number) == -1){
				steps = Math.floor(Math.abs(number)/range) + 1;
				shiftedNumber = number + (range * steps);
			}
			else {
				shiftedNumber = number;
			}
			return shiftedNumber;
		};

		const insideGrid = (point, grid)=>{
			if (point.left < 0 || point.top < 0 ||
					point.left >= grid.width || point.top >= grid.height){
				return false;
			}
			else {
				return true;
			}
		};

		const randomPoint = (grid)=>{
			let left = utilities.randomInteger(0, grid.width - 1);
			let top = utilities.randomInteger(0, grid.height - 1);
			let point = new Point(left, top);
			return point;
		};
	}

	
	function Grid(width, height) {
		this.width = width;
		this.height = height;
	}

	//the snake object
	function Snake() {
		this.direction = constants.DEFAULT_DIRECTION;
		this.points = [];
		this.growthLeft = 0;
		this.alive = true;

		this.collidesWith = function(point, simulateMovement){
			if (simulateMovement && this.growthLeft === 0)
				range = this.points.length - 1;
			else
				range = this.points.length;
			for (var i = 0; i < range; i++) {
				if (point.collidesWith(this.points[i]))
					return true;
			}
			return false;
		};
	}

        //the point object
	function Point(left, top) {
		this.left = left;
		this.top = top;

		// Check if this point collides with another
		this.collidesWith = (otherPoint)=>{
			if (otherPoint.left == this.left && otherPoint.top == this.top)
				return true;
			else
				return false;
		};
	}

	//the candy object
	function Candy(point, type){
		this.point = point,
		this.type = type,
		this.score,			// Increment in score when eaten by snake
		this.calories,		// How much growth the snake gains if it eats this candy
		this.radius,		
		this.color,			
		this.decrement,		
		this.minRadius;		

		switch (type) {
		case constants.CANDY_REGULAR:
			this.score = 5;
			this.calories = 3;
			this.radius = 0.3;
			this.color = config.candyColor;
			break;
		case constants.CANDY_MASSIVE:
			this.score = 15;
			this.calories = 5;
			this.radius = 0.45;
			this.color = config.candyColor;
			break;
		case constants.CANDY_SHRINKING:
			this.score = 50;
			this.calories = 0;
			this.radius = 0.45;
			this.color = config.shrinkingCandyColor;
			this.decrement = 0.008;
			this.minRadius = 0.05;
			break;
		}

		// Shrinks a CANDY_SHRINKING candy. Returns false if candy is below minRadius
		this.age = ()=>{
			if (this.type === constants.CANDY_SHRINKING) {
				this.radius -= this.decrement;
				if (this.radius < this.minRadius)
					return false;
				else
					return true;
			}
			else
				return true;
		};
	};
	
	function Utilities() {

		// Takes a number and returns the sign of it.
		// E.g. -56 -> -1, 57 -> 1, 0 -> 0
		this.sign = (number)=>{
			if(number > 0)
				return 1;
			else if (number < 0)
				return -1;
			else if (number === 0)
				return 0;
			else
				return undefined;
		};

		this.oppositeDirections = (direction1, direction2)=>{
	
			if (Math.abs(direction1) == Math.abs(direction2) &&
					this.sign(direction1 * direction2) == -1) {
				return true;
			}
			else {
				return false;
			}
		};


		this.mergeObjects = function mergeObjects(slave, master){
			const merged = {};
			for (key in slave) {
				if (typeof master[key] === "undefined")
					merged[key] = slave[key];
				else
					merged[key] = master[key];
			}
			return merged;
		};

		// Returns an integer between min and max, including both min and max
		this.randomInteger = (min, max)=>{
			const randomNumber = min + Math.floor(Math.random() * (max + 1));
			return randomNumber;
		};
	}

	/**
	 * the VIEW OBJECT
	 * It uses the HTML5 Canvas element for drawing.
	 */
	function View(parentElement, backgroundColor) {
		var playField,			// The DOM <canvas> element
			ctx,				// The canvas context
			snakeThickness;		// The thickness of the snake in pixels

		this.initPlayField = function(){
			snakeThickness = length(0.9);

			playField = document.createElement("canvas");
			playField.setAttribute("id", "snake-js");
			playField.setAttribute("width", config.gridWidth * config.pointSize);
			playField.setAttribute("height", config.gridHeight * config.pointSize + constants.SCOREBOARD_HEIGHT);
			parentElement.appendChild(playField);
			ctx = playField.getContext("2d");
			ctx.translate(0, constants.SCOREBOARD_HEIGHT);
		};

		// Draw the snake to screen
		this.drawSnake = (snake, color)=>{

			// If there is only one point
			if (snake.points.length === 1) {
				const position = getPointPivotPosition(snake.points[0]);

				ctx.fillStyle = color;
				ctx.beginPath();
				ctx.arc(position.left, position.top, snakeThickness/2, 0, 2*Math.PI, false);
				ctx.fill();
			}
			else {
				// Prepare drawing
				ctx.strokeStyle = color;
				ctx.lineWidth = snakeThickness;
				ctx.lineJoin = "round";
				ctx.lineCap = "round";
				
				// Bein path drawing.
				ctx.beginPath();
				
				// Loop over the points, beginning with the head
				for (var i = 0; i < snake.points.length; i++) {
					const currentPoint = snake.points[i];
					if (i === 0) {
						let currentPointPosition = getPointPivotPosition(currentPoint);
						// Don't draw anything, just move the "pencil" to the position of the head
						ctx.moveTo(currentPointPosition.left, currentPointPosition.top);
					}
					else {
						const prevPoint = snake.points[i-1];
	
						// If these points are next to each other (Snake did NOT go through the wall here)
				if(Math.abs(prevPoint.left - currentPoint.left) <= 1 && Math.abs(prevPoint.top - currentPoint.top) <= 1){
							// The position of this point in screen pixels
							let currentPointPosition = getPointPivotPosition(currentPoint);
							// Draw pencil from the position of the "pencil" to this point
							ctx.lineTo(currentPointPosition.left, currentPointPosition.top);
						}
						else {
							connectWallPoints(prevPoint, currentPoint);
						}
					}
				}
				// Now draw the snake to screen
				ctx.stroke();
			}

			// Draw the eye of the snake
			drawEye(snake, snake.direction);
		};

		this.drawCandy = (candy)=>{

			ctx.fillStyle = candy.color;

			let position = getPointPivotPosition(candy.point);

			ctx.beginPath();

			ctx.arc(position.left, position.top, length(candy.radius), 0, Math.PI*2, false);
			ctx.fill();
		};

		this.clear = (color)=> {
			ctx.fillStyle = color || backgroundColor;
			ctx.fillRect(0, 0,
					config.gridWidth * config.pointSize,
					config.gridHeight * config.pointSize);
		};

		this.drawScore = (score, highScore)=>{
			ctx.translate(0, -1 * constants.SCOREBOARD_HEIGHT);

			let bottomMargin = 5;
			let horizontalMargin = 4;

			// Draw the score board
			ctx.fillStyle = config.scoreBoardColor;
			ctx.fillRect(0, 0, config.gridWidth * config.pointSize, constants.SCOREBOARD_HEIGHT);

			// Prepare drawing text
			ctx.fillStyle = config.scoreTextColor;
			ctx.font = "bold 16px 'Courier new', monospace";

			// Draw score to the upper right corner
			ctx.textAlign = "right";
			ctx.fillText(score, config.gridWidth * config.pointSize - horizontalMargin, constants.SCOREBOARD_HEIGHT - bottomMargin);

			// Draw high score to the upper left corner
			ctx.textAlign = "left";
			ctx.fillText(highScore, horizontalMargin, constants.SCOREBOARD_HEIGHT - bottomMargin);

			// Translate back
			ctx.translate(0, constants.SCOREBOARD_HEIGHT);
		};

		// Draw the eye of the snake
		const drawEye = (snake)=> {
			let head = snake.points[0];
			let headPosition = getPointPivotPosition(head);
			// These values determine how much to the left and top the eye's pivot point is adjusted.
			let offsetLeft = length(0.125);
			let offsetTop = length(0.15);

			// Place the eye's pivot point differentely depending on which direction the snake moves
			switch (snake.direction){
			case constants.DIRECTION_LEFT:
				headPosition.left -= offsetLeft;
				headPosition.top -= offsetTop;
				break;
			case constants.DIRECTION_RIGHT:
				headPosition.left += offsetLeft;
				headPosition.top -= offsetTop;
				break;
			case constants.DIRECTION_UP:
				headPosition.left -= offsetTop;
				headPosition.top -= offsetLeft;
				break;
			case constants.DIRECTION_DOWN:
				headPosition.left += offsetTop;
				headPosition.top += offsetLeft;
				break;
			}

			// If the snake is still alive draw a circle
			if (snake.alive) {
				ctx.beginPath();
				ctx.fillStyle = config.snakeEyeColor;
				// Draw the circle
				ctx.arc(headPosition.left, headPosition.top, length(0.125), 0, Math.PI*2, false);
				// And fill it
				ctx.fill();
			}
			// If the snake is dead, draw a cross
			else {
				ctx.beginPath();
				ctx.strokeStyle = config.snakeEyeColor;
				ctx.lineWidth = 2;
				ctx.moveTo(headPosition.left - length(0.1), headPosition.top - length(0.1));
				ctx.lineTo(headPosition.left + length(0.1), headPosition.top + length(0.1));
				ctx.moveTo(headPosition.left + length(0.1), headPosition.top - length(0.1));
				ctx.lineTo(headPosition.left - length(0.1), headPosition.top + length(0.1));
				ctx.stroke();
			}
		};

		const length = (value)=>{
			return value * config.pointSize;
		};

		const getPointPivotPosition = (point)=> {
			const position = {
					left : point.left * length(1) + length(.5),
					top : point.top * length(1) + length(.5)
			};
			return position;
		};

		const connectWallPoints = (p1, p2)=> {

			// The position of these points in screen pixels
			let p2Position = getPointPivotPosition(p2);

			// This holds -1 or 1 if points are separated horizontally, else 0
			let leftOffset = utilities.sign(p2.left - p1.left);
			// This holds -1 or 1 if points are separated vertically, else 0
			let topOffset = utilities.sign(p2.top - p1.top);

			let fakeEndPoint = new Point(p1.left - leftOffset, p1.top - topOffset);
			// And get the screen position
			let fakeEndPointPosition = getPointPivotPosition(fakeEndPoint);
			// End the current line (which was initially drawn outside this method) in this fake point
			ctx.lineTo(fakeEndPointPosition.left, fakeEndPointPosition.top);

			// Let's look at p2. Create a fakepoint again and get it's position...
			let fakeStartPoint = new Point(p2.left + leftOffset, p2.top + topOffset);
			let fakeStartPointPosition = getPointPivotPosition(fakeStartPoint);
			// ...But this time, first move the pencil (without making a line) to the fake point
			ctx.moveTo(fakeStartPointPosition.left, fakeStartPointPosition.top);
			// Then make a line to p2. Note that these lines are not drawn, since this method
			// only connects the lines, the drawing is handled outside this method
			ctx.lineTo(p2Position.left, p2Position.top);
		};
	}

	/**
	 * INPUTINTERFACE OBJECT
	 */
	function InputInterface(pauseFn, resumeFn, autoPlayFn){

		var arrowKeys = [37, 38, 39, 40],	// Key codes for the arrow keys on a keyboard
			listening = false,				// Listening right now for key strokes
			lastDirection = null;			// Corresponds to the last arrow key pressed

		
		this.lastDirection = ()=>{
			return lastDirection;
		};

		// Start listening for player events
		this.startListening = ()=>{
			if (!listening) {
				window.addEventListener("keydown", handleKeyDown, true);
				window.addEventListener("keypress", disableKeyPress, true);
				window.addEventListener("blur", pauseFn, true);
				window.addEventListener("focus", resumeFn, true);
				listening = true;
			}
		};

		this.stopListening = ()=>{
			if (listening) {
				window.removeEventListener("keydown", handleKeyDown, true);
				window.removeEventListener("keypress", disableKeyPress, true);
				window.removeEventListener("blur", pauseFn, true);
				window.removeEventListener("focus", resumeFn, true);
				listening = false;
			}
		};


		let handleKeyDown = (event)=>{
			if (arrowKeys.indexOf(event.keyCode) >= 0) {
				handleArrowKeyPress(event);
			}
		};

		let disableKeyPress = (event)=>{
			if (arrowKeys.indexOf(event.keyCode) >= 0) {
				event.preventDefault();
			}
		};

		let handleArrowKeyPress = (event)=>{
			with (constants) {
				switch (event.keyCode) {
				case 37:
					lastDirection = DIRECTION_LEFT;
					break;
				case 38:
					lastDirection = DIRECTION_UP;
					break;
				case 39:
					lastDirection = DIRECTION_RIGHT;
					break;
				case 40:
					lastDirection = DIRECTION_DOWN;
					break;
				}
			}

			event.preventDefault();
			autoPlayFn();
		};
	}

	if (config.autoInit) {
		this.init();
	}
};
