import './style.css'
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Vector3 } from 'three';

let camera, scene, renderer;
let controls, water, sun;

const loader = new GLTFLoader();
var cam = 0;
var cam_press = 0;
var can_shoot = 0;
var score = 0;
var health = 100;
var chests = 0;
var start_time, curr_time;
var SecDone = 0;
var game_on = 1;

var frame_done = 0;
var prev_sec = 0;
var fps = 0;
var fr = 0;
var elem_added = 0;

function rand_num_t(min, max) {
  var num = Math.random() * (max - min) + min;
  if (num < 30 && num > 0) {
    num = 30;
  }
  if (num > -30 && num < 0) {
    num = -30
  }
  //console.log(num)
  return num
}

function rand_num_s(min, max) {
  var num = Math.random() * (max - min) + min;
  if (num < 100 && num > 0) {
    num = 100;
  }
  if (num > -100 && num < 0) {
    num = -100
  }
  //console.log(num)
  return num
}

class Boat {
  constructor() {
    loader.load("assets/ship/scene.gltf", (gltf) => {
      scene.add(gltf.scene)
      gltf.scene.scale.set(5, 5, 5)
      gltf.scene.position.set(0, 0, 30)
      gltf.scene.rotation.y = 1.57

      this.boat = gltf.scene
      this.speed = {
        vel: 0,
        rot: 0
      }
    })
  }

  stop() {
    this.speed.vel = 0
    this.speed.rot = 0
  }

  update() {
    if (this.boat) {
      this.boat.translateX(this.speed.vel);
      this.boat.rotation.y += this.speed.rot;
    }


  }
}

const boat = new Boat()

class Treasure {
  constructor(_scene) {
    scene.add(_scene)
    _scene.scale.set(0.07, 0.07, 0.07)
    _scene.position.set(boat.boat.position.x + rand_num_t(-200, 200), -0.1, boat.boat.position.z + rand_num_t(-200, 200))

    this.treasure = _scene
  }
}

class Ship {
  constructor(_scene1) {
    scene.add(_scene1)
    _scene1.scale.set(0.012, 0.012, 0.012)
    _scene1.position.set(boat.boat.position.x + rand_num_s(-300, 300), 5, boat.boat.position.x + rand_num_s(-300, 300))
    _scene1.lookAt(boat.boat.position)

    this.ship = _scene1

  }
}

async function loadModel(url) {
  return new Promise((res, rej) => {
    loader.load(url, (gltf) => {
      res(gltf.scene)
    })
  })
}

let boatModel = null

async function createTreasure() {
  if (!boatModel) {
    boatModel = await loadModel("assets/treasure_chest/scene.gltf")
  }
  return new Treasure(boatModel.clone())
}

let treasures = []
const Treasure_count = 5

let shipModel = null

async function createShip() {
  if (!shipModel) {
    shipModel = await loadModel("assets/pship/scene.gltf")
  }

  return new Ship(shipModel.clone())
}

let ships = []
const Ship_count = 2

var cannons = [];
var ship_cannons = [];

init();
animate();

async function init() {
  cam = 2;

  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000);
  camera.position.set(0, 30, 100);


  sun = new THREE.Vector3();

  // Water

  const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

  water = new Water(
    waterGeometry,
    {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load('assets/waternormals.jpg', function (texture) {

        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

      }),
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: scene.fog !== undefined
    }
  );

  water.rotation.x = - Math.PI / 2;

  scene.add(water);


  //// lights
  var light = new THREE.AmbientLight(0xffffff);
  light.intensity = 0.1;
  scene.add(light);



  // Skybox

  const sky = new Sky();
  sky.scale.setScalar(10000);
  scene.add(sky);

  const skyUniforms = sky.material.uniforms;

  skyUniforms['turbidity'].value = 10;
  skyUniforms['rayleigh'].value = 2;
  skyUniforms['mieCoefficient'].value = 0.005;
  skyUniforms['mieDirectionalG'].value = 0.8;

  const parameters = {
    elevation: 2,
    azimuth: 180
  };

  const pmremGenerator = new THREE.PMREMGenerator(renderer);

  function updateSun() {

    const phi = THREE.MathUtils.degToRad(90 - parameters.elevation - 30);
    const theta = THREE.MathUtils.degToRad(parameters.azimuth);

    sun.setFromSphericalCoords(1, phi, theta);

    sky.material.uniforms['sunPosition'].value.copy(sun);
    water.material.uniforms['sunDirection'].value.copy(sun).normalize();

    scene.environment = pmremGenerator.fromScene(sky).texture;

  }

  updateSun();

  function updateCamera() {
    if (cam == 1) {
      camera.position.set(boat.boat.position.x, boat.boat.position.y + 350, boat.boat.position.z);
      camera.lookAt(boat.boat.position.x, boat.boat.position.y, boat.boat.position.z);
    }

    if (cam == 0) {
      var ang = boat.boat.rotation.y;
      //console.log(ang);
      camera.position.set(boat.boat.position.x - 100 * Math.cos(ang), boat.boat.position.y + 50, boat.boat.position.z + 100 * Math.sin(ang));
      //camera.position.set(0, 30, 100)
      camera.lookAt(boat.boat.position.x, boat.boat.position.y, boat.boat.position.z);
    }

    if (cam == 2) {
      camera.position.set(0, 30, 100)
      camera.lookAt(boat.boat.position.x, boat.boat.position.y, boat.boat.position.z);
    }
  }

  controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.target.set(0, 10, 0);
  controls.minDistance = 40.0;
  controls.maxDistance = 200.0;
  controls.update();

  const waterUniforms = water.material.uniforms;

  for (let i = 0; i < Treasure_count; i++) {
    const treasure = await createTreasure()
    treasures.push(treasure)
  }

  for (let i = 0; i < Ship_count; i++) {
    const ship = await createShip()
    ships.push(ship)
  }

  start_time = new Date();

  window.addEventListener('resize', onWindowResize);

  window.addEventListener('keydown', function (e) {
    //console.log(e.key)
    var new_sped = 1.8
    var new_rot = 0.08
    if (e.key == "w") {
      boat.speed.vel = new_sped;
    }
    if (e.key == "s") {
      boat.speed.vel = -new_sped;
    }
    if (e.key == "d") {
      boat.speed.rot = -new_rot;
    }
    if (e.key == "a") {
      boat.speed.rot = new_rot;
    }
    if (e.key == "c") {
      console.log(cam_press);
      if (cam_press == 0) {
        if (cam === 0) {
          cam = 1;
        }
        else if (cam === 1) {
          cam = 2;
        }
        else if (cam === 2) {
          cam = 0;
        }
        console.log(cam);
      }
      cam_press = 1;
    }
    if (e.key == "x" && boat.boat && can_shoot > 3) {
      var cannon = new THREE.Mesh(
        new THREE.SphereGeometry(0.7, 7, 7),
        new THREE.MeshBasicMaterial({ color: 0x000000 })
      );

      cannon.position.set(boat.boat.position.x + Math.cos(boat.boat.rotation.y) * 15, boat.boat.position.y + 10, boat.boat.position.z - Math.sin(boat.boat.rotation.y) * 15);

      cannon.velocity = new THREE.Vector3(
        Math.cos(boat.boat.rotation.y) * 5,
        0,
        -Math.sin(boat.boat.rotation.y) * 5
      )
      cannon.alive = true;
      this.setTimeout(function () {
        cannon.alive = false;
        scene.remove(cannon);
      }, 10000);

      cannons.push(cannon);
      scene.add(cannon);
      can_shoot = 0;
    }

    updateCamera();
  })

  window.addEventListener('keyup', function (e) {
    if (e.key == "w") {
      boat.speed.vel = 0;
    }
    if (e.key == "s") {
      boat.speed.vel = 0;
    }
    if (e.key == "d") {
      boat.speed.rot = 0;
    }
    if (e.key == "a") {
      boat.speed.rot = 0;
    }
    if (e.key == "c") {
      cam_press = 0;
    }
  })

}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function isColliding(obj1, obj2) {
  return (
    Math.abs(obj1.position.x - obj2.position.x) < 20 &&
    Math.abs(obj1.position.z - obj2.position.z) < 20
  )
}

function isCollidingcannons(obj1, obj2) {
  return (
    Math.abs(obj1.position.x - obj2.position.x) < 13 &&
    Math.abs(obj1.position.z - obj2.position.z) < 13
  )
}


function isCollidingships(obj1, obj2) {
  return (
    Math.abs(obj1.position.x - obj2.position.x) < 30 &&
    Math.abs(obj1.position.z - obj2.position.z) < 30
  )
}

function moveShips() {
  if (boat.boat) {
    ships.forEach(ship => {
      if (ship.ship) {
        ship.ship.lookAt(boat.boat.position.x, boat.boat.position.y + 7, boat.boat.position.z);
        ship.ship.rotateOnAxis(new THREE.Vector3(0, 1, 0), Math.PI)
        ship.ship.translateZ(-0.5);
      }
    })
  }
}

function FireShips() {
  if (boat.boat) {
    ships.forEach(ship => {
      var prob = Math.random();
      prob = prob * 100;
      //console.log(prob);
      if (ship.ship && prob < 3) {
        //console.log('fired')
        var ship_cannon = new THREE.Mesh(
          new THREE.SphereGeometry(0.7, 7, 7),
          new THREE.MeshBasicMaterial({ color: 0xDEF9A5 })
        );

        ship_cannon.begin_frame = fr
        ship_cannon.begin_sec = SecDone

        ship_cannon.position.set(ship.ship.position.x, ship.ship.position.y, ship.ship.position.z);
        ship_cannon.lookAt(boat.boat.position)

        if (ship.ship.position.z > boat.boat.position.z) {
          ship_cannon.velocity = new THREE.Vector3(
            -Math.sin(ship.ship.rotation.y) * 4,
            0,
            -Math.cos(ship.ship.rotation.y) * 4
          )
        }
        else {
          ship_cannon.velocity = new THREE.Vector3(
            -Math.sin(ship.ship.rotation.y) * 4,
            0,
            Math.cos(ship.ship.rotation.y) * 4
          )
        }

        ship_cannon.alive = true;

        ship_cannons.push(ship_cannon);
        scene.add(ship_cannon);

      }
    })
  }
}

function updateCannonBalls() {
  for (var i = 0; i < cannons.length; i++) {
    if (cannons[i] === undefined) {
      continue;
    }
    if (cannons[i].alive == false) {
      cannons.splice(i, 1);
      continue;
    }

    cannons[i].position.add(cannons[i].velocity);
  }

}

function updateShipCannonBalls() {
  for (var i = 0; i < ship_cannons.length; i++) {
    if (ship_cannons[i] === undefined) {
      continue;
    }
    if (ship_cannons[i].alive == false) {
      ship_cannons.splice(i, 1);
      continue;
    }

    //ship_cannons[i].translateZ(3);
    ship_cannons[i].position.add(ship_cannons[i].velocity);

    if (ship_cannons[i].begin_sec + 16 < SecDone) {
      ship_cannons[i].alive = false;
      scene.remove(ship_cannons[i]);
      //ship_cannons.splice(i, 1);
    }
  }
}

function checkCollisions() {
  if (boat.boat) {

    for (var t = 0; t < treasures.length; t++) {
      if (treasures[t]) {
        if (isColliding(boat.boat, treasures[t].treasure)) {
          scene.remove(treasures[t].treasure)
          treasures.splice(t, 1);
          // ADD POINTS
          chests += 1;
        }
      }
    }

    for (var c = 0; c < ship_cannons.length; c++) {
      if (ship_cannons[c] === undefined) {
        continue;
      }
      if (ship_cannons[c].alive == false) {
        continue;
      }
      if (isCollidingcannons(boat.boat, ship_cannons[c])) {
        ship_cannons[c].alive = false;
        scene.remove(ship_cannons[c]);
        ship_cannons.splice(c, 1);
        health -= 5;
      }
    }

    for (var k = 0; k < ships.length; k++) {
      if (ships[k]) {
        //console.log(ships[k].ship);
        if (isCollidingships(boat.boat, ships[k].ship)) {
          scene.remove(ships[k].ship)
          ships.splice(k, 1)
          //DEAD
          health -= 40
        }

        for (var i = 0; i < cannons.length; i++) {
          if (cannons[i] === undefined) {
            continue;
          }
          if (cannons[i].alive == false) {
            cannons.splice(i, 1);
            continue;
          }

          if (isCollidingcannons(ships[k].ship, cannons[i])) {
            scene.remove(ships[k].ship);
            ships.splice(k, 1);
            cannons[i].alive = false;
            scene.remove(cannons[i]);
            score += 10;
          }
        }
      }
    }
  }
}

function updateText() {
  document.getElementById("health").innerHTML = "Health: " + health;
  document.getElementById("score").innerHTML = "Score: " + score;
  document.getElementById("chests").innerHTML = "Chests: " + chests;
  frame_done += 1;
  if (SecDone == prev_sec + 1) {
    fps = frame_done;
    prev_sec = SecDone;
    frame_done = 0;
  }
  document.getElementById("time").innerHTML = "Time: " + SecDone;
  document.getElementById("fps").innerHTML = "fps: " + fps;
}

async function addElem() {
  const treasure = await createTreasure()
  treasures.push(treasure)

  const ship = await createShip()
  ships.push(ship)
  console.log('added')
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function gameOver() {
  if (health <= 0) {

    await sleep(500);
    game_on = 0;

    await sleep(1000);
    alert("Game Over")

  }
}

function animate() {
  if(game_on == 1)
  {
    curr_time = new Date();
    var TimeDiff = curr_time - start_time;
    TimeDiff /= 1000;
    SecDone = Math.round(TimeDiff);
  
    fr += 1;
    //console.log(SecDone);
    requestAnimationFrame(animate);
    render();
    boat.update();
    moveShips();
    updateCannonBalls();
    checkCollisions();
    can_shoot = can_shoot + 1;
    if (SecDone % 10 == 0 && elem_added == 0) {
      addElem();
      elem_added = 1;
    }
    if (SecDone % 10 == 1) {
      elem_added = 0;
    }
    FireShips();
    updateShipCannonBalls();
    updateText();
    gameOver();
  }
}

function render() {
  water.material.uniforms['time'].value += 1.0 / 60.0;
  renderer.render(scene, camera);
}