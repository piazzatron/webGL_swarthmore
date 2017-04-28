/*jshint esversion: 6 */

let i = 0;
let j = 0;
let WIDTH;
let HEIGHT;
let FAILS = 0;
let COMPLETE = false;
let FAIL = false;
let MAX_FAILS = 300;
let tiles = [];
let grid = [[]];
let INPUT_SIZE = 50;
let TILE_SIZE = 10;
let CANVAS_SIZE = 300;
let NUM_TILES = CANVAS_SIZE/TILE_SIZE;
let STRIDE = 3;
let img;
let tile_map = {
  top: {},
  left: {},
  right: {},
  bottom: {}
}
let lefts = [];

Set.prototype.intersection = function(setB) {
    var intersection = new Set();
    for (var elem of setB) {
        if (this.has(elem)) {
            intersection.add(elem);
        }
    }
    return intersection;
};

let Tile = function(image, label) {
  this.label = label;
  this.image = image;
  this.neighbors = {
    up: null,
    left: null,
    right: null,
    down: null
  };
};

function setup() {
  noLoop();
  frameRate(60);
  strokeWeight(4);
  stroke(0, 255, 200);

  createCanvas(CANVAS_SIZE, CANVAS_SIZE);

  /****************** GET SUBIMAGES *******************/
  img = loadImage('images/flowa.png',() => {
    console.log("success");
    image(img, 0, 0);

    console.log ("Breaking images into tiles...");
    for (let i = 0; i < INPUT_SIZE - TILE_SIZE; i+=STRIDE) {
      for (let j = 0; j < INPUT_SIZE - TILE_SIZE; j+=STRIDE) {
        console.log(i, j);
        let tile = get(i, j, TILE_SIZE, TILE_SIZE);
        let tileNum = tiles.length;

        tile.loadPixels();
        tiles.push(tile);

        let top = tile.get(0, 0, TILE_SIZE, 1);
        top.loadPixels();
        let top_hash = String(top.pixels);

        let bottom = tile.get(0, TILE_SIZE - 1, TILE_SIZE, 1);
        bottom.loadPixels();
        let bottom_hash = String(bottom.pixels);

        let left = tile.get(0, 0, 1, TILE_SIZE);
        left.loadPixels();
        let left_hash = String(left.pixels);

        let right = tile.get(0, TILE_SIZE - 1, TILE_SIZE, 1);
        right.loadPixels();
        let right_hash = String(right.pixels);

        // Dumb little test
        lefts.push(left);

        // Need to consider the case when the image is a repeat tile, and increment counts
        
        // Hash the edges
        if (!tile_map.top[top_hash]) {
          tile_map.top[top_hash] = [tileNum];
        } else {
          tile_map.top[top_hash].push(tileNum);
        }        

        if (!tile_map.left[left_hash]) {
          tile_map.left[left_hash] = [tileNum];
        } else {
          tile_map.left[left_hash].push(tileNum);
        }

        if (!tile_map.right[right_hash]) {
          tile_map.right[right_hash] = [tileNum];
        } else {
          tile_map.right[right_hash].push(tileNum);
        }

        if (!tile_map.bottom[bottom_hash]) {
          tile_map.bottom[bottom_hash] = [tileNum];
        } else {
          tile_map.bottom[bottom_hash].push(tileNum);
        }

        console.log("Preprocessed an image!");
      }
    }

    loop(); // kickoff drawing
  }, () => {console.log("FAIL");}
  );
}

function makeCell() {
  let possibles;

  // TOP LEFT CORNER
  possibles = tiles;
  
  // if (i === 0 && j === 0) {
  //   possibles = tiles;
  // } else if (i === 0 && j !== 0) {
  //   possibles = Array.from(grid[0][j-1].neighbors.right);
  // } else if (j === 0 && i !== 0) {
  //   possibles = Array.from(grid[i-1][0].neighbors.down);
  // } else {
  //   possibles = Array.from(grid[i-1][j].neighbors.down.intersection(grid[i][j-1].neighbors.right));
  // }

  if (!possibles.length) {
    console.log('Got stuck');
    FAIL = true;
    return false;
  }

  let index = Math.floor(Math.random() * possibles.length);
  grid[i][j] = possibles[index];

  return true;
}

function draw() {
  // for (let i = 0; i < lefts.length; i++) {
  //   console.log("DRAWING IMAGE!")
  //   image(lefts[i], (i * 15) % WIDTH, Math.floor((i*15)/WIDTH) * 15);

  //   if (i == lefts.length - 1) {
  //     noLoop();
  //   }
  // }

  if (i < NUM_TILES) {
    if (j < NUM_TILES) {
      if (makeCell()) {
        image(grid[i * NUM_TILES + j], j * TILE_SIZE, i * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        j += 1;
      } else {
        i = 0;
        j = 0;
        background(255);
      }
    } else {
      i += 1;
      j = 0;
      grid[i] = [];
    }
  } else {
    noLoop();
  }
}