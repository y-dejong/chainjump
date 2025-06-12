
import DebugDrawRenderer from '../utils/debugDraw.mjs';
import Box2DFactory from './box2d3-wasm/entry.mjs';

const params = new URLSearchParams(window.location.search);

const box2d = await Box2DFactory();
const canvas = document.getElementById("demo-canvas");
const ctx = canvas.getContext("2d");

const lobbyelt = document.getElementById("lobby");

const ws = new WebSocket("ws://localhost:8765");
ws.onopen = () => {
    console.log("Connected to server");
    ws.send("imhub");
};

const pixelToMeters = 10;
const subStepCount = 4;

const hdRendering = params.get('hd') === '1';

const debugDraw = new DebugDrawRenderer(box2d, ctx, {pixelToMeters, autoHD: hdRendering}); // true for high dpi
debugDraw.offset = {
  x: 40,
  y: -29
};


const {
    b2DefaultWorldDef,
    b2Capsule,
    b2CreateWorld,
    b2CreateBody,
    b2CreateCapsuleShape,
    b2CreatePolygonShape,
    b2RevoluteJoint_GetAngle,
    b2CreateRevoluteJoint,
    b2CreateSegmentShape,
    b2World_Step,
    b2MakeBox,
    b2DefaultBodyDef,
    b2DefaultRevoluteJointDef,
    b2DefaultShapeDef,
    b2RevoluteJoint_EnableLimit,
    b2BodyType,
    b2Segment,
    b2RevoluteJoint_SetMotorSpeed,
    b2RevoluteJoint_SetLimits,
    b2RevoluteJoint_EnableMotor,
    b2Body_SetAwake,
    b2Body_GetPosition,
    b2Body_GetRotation,
    b2Rot_GetAngle,
    b2Joint_GetBodyA,
    b2Joint_GetBodyB,
    b2Vec2,
    b2Rot,
    b2RevoluteJoint_SetMaxMotorTorque,
    TaskSystem,
    b2CreateThreadedWorld,
    b2World_GetProfile,
} = box2d;

const worldDef = b2DefaultWorldDef();
worldDef.gravity.Set(0, -9.8);

let worldId, taskSystem;

const statsLevel = params.get('stats') || 2;

if(params.get('threading') === '1') {
  taskSystem = new TaskSystem(navigator.hardwareConcurrency);
  worldId = b2CreateThreadedWorld(worldDef, taskSystem);
} else {
  worldId = b2CreateWorld(worldDef);
}

const bd_ground = new b2DefaultBodyDef();
const groundId = b2CreateBody(worldId, bd_ground);

const shapeDefSegment = new b2DefaultShapeDef();
shapeDefSegment.density = 1.0;
shapeDefSegment.material.friction = 0.3;

// WORLD DEFINITION
{
  const segment = new b2Segment();
  segment.point1 = new b2Vec2(3, -4);
  segment.point2 = new b2Vec2(6, -7);

  b2CreateSegmentShape(groundId, shapeDefSegment, segment);
}

{
  const segment = new b2Segment();
  segment.point1 = new b2Vec2(3, -18);
  segment.point2 = new b2Vec2(22, -18)
  b2CreateSegmentShape(groundId, shapeDefSegment, segment);
}

{
  const segment = new b2Segment();
  segment.point1 = new b2Vec2(-100, -40);
    segment.point2 = new b2Vec2(100, -40);
  b2CreateSegmentShape(groundId, shapeDefSegment, segment);
}

{
  const segment = new b2Segment();
  segment.point1 = new b2Vec2(-39, 0);
    segment.point2 = new b2Vec2(-39, -40);
  b2CreateSegmentShape(groundId, shapeDefSegment, segment);
}

{
  const segment = new b2Segment();
  segment.point1 = new b2Vec2(39, 0);
    segment.point2 = new b2Vec2(39, -40);
  b2CreateSegmentShape(groundId, shapeDefSegment, segment);
}

const rot = new b2Rot();
rot.SetAngle(0);
// END WORLD DEFINITION

// MY GAME

//CHARACTER DEFINITION
function createCapsule(start, end, position) {
    const capsule = new b2Capsule();
    capsule.center1.Set(start[0], start[1]);
    capsule.center2.Set(end[0], end[1]);
    capsule.radius = 0.3;

    const capsuleBody = b2DefaultBodyDef();
    capsuleBody.type = b2BodyType.b2_dynamicBody;
    capsuleBody.enableSleep = false;
    capsuleBody.position.Set(position[0], position[1]);

    const capsuleShape = b2DefaultShapeDef();
    capsuleShape.density = 1.0;
    capsuleShape.material.friction = 0.3;
    capsuleShape.filter.categoryBits = 2; // Don't collide with other chain parts
    capsuleShape.filter.maskBits = 1;

    const capsuleBodyId = b2CreateBody(worldId, capsuleBody);
    const capsuleShapeId = b2CreateCapsuleShape(capsuleBodyId, capsuleShape, capsule);
    return [capsuleBodyId, capsuleShapeId];
}

function createJoint(bodyIdA, pointA, bodyIdB, pointB) {
    // pointA is local coordinates relative to bodyA
    // pointB is local coordinates relative to bodyB
    const jointDef = b2DefaultRevoluteJointDef();
    jointDef.bodyIdA = bodyIdA;
    jointDef.bodyIdB = bodyIdB;
    jointDef.localAnchorA = new b2Vec2(pointA[0], pointA[1]);
    jointDef.localAnchorB = new b2Vec2(pointB[0], pointB[1]);
    return b2CreateRevoluteJoint(worldId, jointDef);
}

/*const [bodyAId, shapeAId] = createCapsule([0.0, 0.0], [5.0, 0.0], [0.0, 0.0]);
const [bodyBId, shapeBId] = createCapsule([0.0, 0.0], [5.0, 0.0], [5.0, 0.0]);
const [bodyCId, shapeCId] = createCapsule([0.0, 0.0], [5.0, 0.0], [10.0, 0.0]);

const joint1 = createJoint(bodyAId, [5.0, 0.0], bodyBId, [0.0, 0.0]);
const joint2 = createJoint(bodyBId, [5.0, 0.0], bodyCId, [0.0, 0.0]);*/

/*
  s0.0,0.0,5.0,0.0,0.0,0.0
  s0.0,0.0,5.0,0.0,5.0,0.0
  s0.0,0.0,5.0,0.0,10.0,0.0
  j0,5.0,0.0,1,0.0,0.0
  j1,5.0,0.0,2,0.0,0.0

  s0.0,0.0,5.0,0.0,0.0,0.0;s0.0,0.0,5.0,0.0,5.0,0.0;s0.0,0.0,5.0,0.0,10.0,0.0;j0,5.0,0.0,1,0.0,0.0;j1,5.0,0.0,2,0.0,0.0
  */

function createPlayer(message) {
    const defs = message.substring(1).split(";");
    let player = {
        segments: [],
        joints: [],
        subscriptions: new Set()
    };
    for (const def of defs) {
        if (def[0] == "s") {
            const params = def.substring(1).split(",");
            player.segments.push(createCapsule(
                [params[0], params[1]],
                [params[2], params[3]],
                [params[4], params[5]]
            ));
        } else if (def[0] == "j") {
            const params = def.substring(1).split(",");
            player.joints.push(createJoint(
                player.segments[params[0]][0],
                [params[1], params[2]],
                player.segments[params[3]][0],
                [params[4], params[5]]
            ));
        }
    }

    return player;
}

// END CHARACTER DEFINITION

var players = {};
window.players = players;

ws.onmessage = (event) => processMessage(event.data);

function processMessage(data) {

    // Get correct info based on sender (identified in start of message)
    const delimiterIndex = data.indexOf(":");
    const sender = data.substring(0, delimiterIndex);
    const message = data.substring(delimiterIndex + 1);
    const eventType = message[0];
    const command = message.substring(1, 5);
    const params = message.substring(5).split(",");
    if (eventType == "h") {
        lobbyelt.innerText = "Lobby: " + params[0];
    }
    if (eventType == "w") { // Write message
        console.log(message);
        switch (command) {
            case "sped": // params: jointIndex, speed (float)
                const clamped_speed = Math.max(-60, Math.min(60, parseFloat(params[1])));
                b2RevoluteJoint_SetMotorSpeed(players[sender].joints[params[0]], clamped_speed);
                break;
            case "torq": // params: jointIndex, torque (float)
                const clamped_torque = Math.abs(Math.min(5000, parseFloat(params[1])));
                b2RevoluteJoint_SetMaxMotorTorque(players[sender].joints[params[0]], clamped_torque);
                break;
            case "mtre": //params: jointIndex, enable ("t" or "f")
                b2RevoluteJoint_EnableMotor(players[sender].joints[params[0]], params[1][0] == "t");
                break;
        }
    } else if (eventType == "r" || eventType == "R") { // Read message or subscription Read
        switch(command) {
            case "angl": //params: "j" or "s", index
                if (params[0] == "j") {
                    ws.send(`${eventType}${data};${b2RevoluteJoint_GetAngle(players[sender].joints[params[1]])}`);
                } else if (params[0] == "s") {
                    let res = `${eventType}${data};${b2Rot_GetAngle(b2Body_GetRotation(players[sender].segments[params[1]][0]))}`;
                    ws.send(res);
                }
                break;
            case "posn":
                if (params.length == 1) {
                    ws.send(`${data};${b2Body_GetPosition(players[sender].segments[params[0]][0])}`);
                }
                break;
            default:
                console.log("Got unknown data read request:" + message);
        }
    } else if (eventType == "s") { // Subscribe message
        console.log("New subscription: ", data);
        players[sender].subscriptions.add(message.substring(1));
    } else if (eventType == "u") {
        console.log("Unsubscribed: ", data);
        players[sender].subscriptions.delete(message.substring(1));
    } else if (eventType == "c") {
        players[sender] = createPlayer(message);
        console.log("Player created: " + sender);
    }
};

function sendSubscriptions() {
    for (const [index, player] of Object.entries(players)) {
        for (const sub of player.subscriptions) {
            processMessage(`${index}:R${sub}`);
        }
    }
}

// END MY GAME

function drawInfo() {
    const hdScale = hdRendering ? (Math.min(window.devicePixelRatio || 1, 2) || 1) : 1;
    ctx.font = `${16 * hdScale}px Arial`;
    ctx.fillStyle = "black";
    ctx.fillText(`angle: ${b2RevoluteJoint_GetAngle(joint1)}`, 10 * hdScale, 40 * hdScale);
}

function drawProfile(stepDuration, profile) {
  const hdScale = hdRendering ? (Math.min(window.devicePixelRatio || 1, 2) || 1) : 1;
  ctx.font = `${16 * hdScale}px Arial`;
  ctx.fillStyle = "black";
  if (statsLevel < 1) return;
  ctx.fillText(`fps: ${Math.floor(1000/stepDuration)}`, 10 * hdScale, 20 * hdScale);
  ctx.fillText(`threading: ${taskSystem ? 'on' : 'off'}`, 100 * hdScale, 20 * hdScale);
  debugDraw.debugMemory = true;
  if (statsLevel < 2) return;
  ctx.fillText(`step: ${profile.step.toFixed(2)}ms`, 10 * hdScale, 40 * hdScale);
  ctx.fillText(`pairs: ${profile.pairs.toFixed(2)}ms`, 10 * hdScale, 60 * hdScale);
  ctx.fillText(`collide: ${profile.collide.toFixed(2)}ms`, 10 * hdScale, 80 * hdScale);
  ctx.fillText(`solve: ${profile.solve.toFixed(2)}ms`, 10 * hdScale, 100 * hdScale);
  ctx.fillText(`mergeIslands: ${profile.mergeIslands.toFixed(2)}ms`, 10 * hdScale, 120 * hdScale);
  ctx.fillText(`prepareStages: ${profile.prepareStages.toFixed(2)}ms`, 10 * hdScale, 140 * hdScale);
  ctx.fillText(`solveConstraints: ${profile.solveConstraints.toFixed(2)}ms`, 10 * hdScale, 160 * hdScale);
  ctx.fillText(`prepareConstraints: ${profile.prepareConstraints.toFixed(2)}ms`, 10 * hdScale, 180 * hdScale);
  ctx.fillText(`integrateVelocities: ${profile.integrateVelocities.toFixed(2)}ms`, 10 * hdScale, 200 * hdScale);
  ctx.fillText(`warmStart: ${profile.warmStart.toFixed(2)}ms`, 10 * hdScale, 220 * hdScale);
  ctx.fillText(`solveImpulses: ${profile.solveImpulses.toFixed(2)}ms`, 10 * hdScale, 240 * hdScale);
  ctx.fillText(`integratePositions: ${profile.integratePositions.toFixed(2)}ms`, 10 * hdScale, 260 * hdScale);
  ctx.fillText(`applyRestitution: ${profile.applyRestitution.toFixed(2)}ms`, 10 * hdScale, 280 * hdScale);
  ctx.fillText(`storeImpulses: ${profile.storeImpulses.toFixed(2)}ms`, 10 * hdScale, 300 * hdScale);
  ctx.fillText(`transforms: ${profile.transforms.toFixed(2)}ms`, 10 * hdScale, 320 * hdScale);
  ctx.fillText(`splitIslands: ${profile.splitIslands.toFixed(2)}ms`, 10 * hdScale, 340 * hdScale);
  ctx.fillText(`hitEvents: ${profile.hitEvents.toFixed(2)}ms`, 10 * hdScale, 360 * hdScale);
  ctx.fillText(`refit: ${profile.refit.toFixed(2)}ms`, 10 * hdScale, 380 * hdScale);
  ctx.fillText(`bullets: ${profile.bullets.toFixed(2)}ms`, 10 * hdScale, 400 * hdScale);
  ctx.fillText(`hitEvents: ${profile.hitEvents.toFixed(2)}ms`, 10 * hdScale, 420 * hdScale);
  ctx.fillText(`sleepIslands: ${profile.sleepIslands.toFixed(2)}ms`, 10 * hdScale, 440 * hdScale);
  ctx.fillText(`sensors: ${profile.sensors.toFixed(2)}ms`, 10 * hdScale, 460 * hdScale);
}

let handle;
function loop(prevMs) {
    const nowMs = window.performance.now();
    handle = requestAnimationFrame(loop.bind(null, nowMs));
    const deltaMs = Math.min(nowMs-prevMs, 1000/120);

    const start = performance.now();
    b2World_Step(worldId, deltaMs / 1000, subStepCount);
    const end = performance.now();
    taskSystem?.ClearTasks();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    debugDraw.Draw(worldId);

    sendSubscriptions();

    /*const duration = end - start;
    const profile = b2World_GetProfile(worldId);
    drawProfile(duration, profile);
    profile.delete();*/
};

loop(window.performance.now());
