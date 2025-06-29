import { Forma } from 'forma-embedded-view-sdk/auto';
import { Footprint } from 'forma-embedded-view-sdk/geometry';
import type { Transform } from 'forma-embedded-view-sdk/render';
import { isGameOver, scoreSignal } from './index';
import { levelSignal } from './index';
import { maxScoreSignal } from './index';

type Vector3 = { x: number; y: number; z: number };

const keysPressed = new Set<string>();
window.addEventListener('keydown', e => keysPressed.add(e.key.toLowerCase()));
window.addEventListener('keyup', e => keysPressed.delete(e.key.toLowerCase()));



const acceleration = 6;
const maxSpeed = 10;
const turnSpeed = Math.PI / 2; // radians/sec
const friction = 3;

const followDistance = 40;
const cameraHeight = 20;


function createBlockGeometry(front_length: number = 1, back_length: number = 1, color: [number, number, number, number] = [0, 200, 255, 255]) {
    return {
        position: new Float32Array([
            // Bottom face
            -back_length, -0.5, -0.5, // 0
            -back_length, 0.5, -0.5, // 1
            front_length, 0.5, -0.5, // 2

            front_length, 0.5, -0.5, // 2
            front_length, -0.5, -0.5, // 3
            -back_length, -0.5, -0.5, // 0

            // Top face
            -back_length, -0.5, 0.5, // 4
            front_length, -0.5, 0.5, // 5
            front_length, 0.5, 0.5, // 6
            front_length, 0.5, 0.5, // 6
            -back_length, 0.5, 0.5,  // 7
            -back_length, -0.5, 0.5, // 4

            //Left Face
            -back_length, -0.5, -0.5, // 0
            front_length, -0.5, -0.5, // 0
            front_length, -0.5, 0.5, // 5

            front_length, -0.5, 0.5, // 5
            -back_length, -0.5, 0.5, // 5
            -back_length, -0.5, -0.5, // 0

            //Right Face
            -back_length, 0.5, -0.5, // 0
            -back_length, 0.5, 0.5, // 0
            front_length, 0.5, 0.5, // 5

            front_length, 0.5, 0.5, // 5
            front_length, 0.5, -0.5, // 5 
            -back_length, 0.5, -0.5, // 0


            //Rear Face
            -back_length, 0.5, -0.5, // 0
            -back_length, -0.5, -0.5, // 0
            -back_length, -0.5, 0.5, // 0

            -back_length, -0.5, 0.5, // 0
            -back_length, 0.5, 0.5, // 0
            -back_length, 0.5, -0.5, // 0

            //Front Face
            front_length, -0.5, -0.5, // 0
            front_length, 0.5, -0.5, // 0
            front_length, 0.5, 0.5, // 0

            front_length, 0.5, 0.5, // 0
            front_length, -0.5, 0.5, // 0
            front_length, -0.5, -0.5, // 0
        ]),
        color: new Uint8Array(
            Array(36).fill(color).flat() // Cyan-ish solid color
        )

    };
}




function createTransform(x: number, y: number, z: number, headingRad: number): Transform {
    const cos = Math.cos(headingRad);
    const sin = Math.sin(headingRad);

    return [
        cos, sin, 0, 0,
        -sin, cos, 0, 0,
        0, 0, 1, 0,
        x, y, z, 1
    ];
}
function applyTransformToPositions(
    positions: Float32Array,
    transform: number[]
) {
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];

        // Apply 4x4 matrix (column-major)
        const tx =
            transform[0] * x +
            transform[4] * y +
            transform[8] * z +
            transform[12];

        const ty =
            transform[1] * x +
            transform[5] * y +
            transform[9] * z +
            transform[13];

        const tz =
            transform[2] * x +
            transform[6] * y +
            transform[10] * z +
            transform[14];

        positions[i] = tx;
        positions[i + 1] = ty;
        positions[i + 2] = tz;
    }
}


let headPosition: Vector3;
let snakeHeading = 0;
let velocity = 0;
let headMeshId: string | null = null;
let pre_transforms = new Array<Transform>();
let mesh_ids = new Array<string>();
let level = 1;
let levelColor: [number, number, number, number] = [0, 200, 255, 255];
let nextLevelColor: [number, number, number, number] = [0, 200, 255, 255];
let levelUpLength = 2;
let levelLimit = 1
let gameplay: boolean = true


const eatRadius = 1; // meters
let active_items = new Array<{ id: string, x: number, y: number }>();
let worm_max_length = 1;
let score = 1;
let itemPositions: Array<[x: number, y: number, z: number]>;

function initVars() {
    headPosition = null;
    snakeHeading = 0;
    velocity = 0;
    headMeshId = null;
    pre_transforms = new Array<Transform>();
    mesh_ids = new Array<string>();
    level = 1;
    levelColor = [0, 200, 255, 255];
    nextLevelColor = [0, 200, 255, 255];
    levelUpLength = 2;
    levelLimit = 1;
    worm_max_length = 1;
    score = 1
    gameplay = true;

}

export async function init() {
    initVars();
    const cam = await Forma.camera.getCurrent();
    headPosition = { ...cam.target };
    snakeHeading = Math.atan2(cam.target.y - cam.position.y, cam.target.x - cam.position.x);
    const elevation = await Forma.terrain.getElevationAt({ x: headPosition.x, y: headPosition.y });
    headPosition.z = elevation + 0.5;

    const { id } = await Forma.render.addMesh({
        geometryData: createBlockGeometry(),
        transform: geoTransform(headPosition, snakeHeading)
    });
    headMeshId = id;
    mesh_ids.push(id);
    if (itemPositions == null) {
        const road_paths = await Forma.geometry.getPathsByCategory({ category: "road" })
        itemPositions = new Array<[x: number, y: number, z: number]>();
        for (let i = 0; i < road_paths.length; i++) {
            let rp = road_paths[i];
            let fp = await Forma.geometry.getFootprint({ path: rp })
            let refined = await resamplePolyline(fp.coordinates, 5)
            itemPositions.push(...refined)
        }

        let item_pos = pickRandomPositions(itemPositions, 500)
        await spawnItems(item_pos)
    }
    moveLoop();
}

async function resamplePolyline(coords: [number, number][], spacing: number): Promise<[number, number, number][]> {
    const result: Array<[number, number, number]> = [];

    for (let i = 0; i < coords.length - 1; i++) {
        const [x1, y1] = coords[i];
        const [x2, y2] = coords[i + 1];

        const dx = x2 - x1;
        const dy = y2 - y1;
        const segmentLength = Math.hypot(dx, dy);

        const steps = Math.ceil(segmentLength / spacing);
        for (let j = 0; j <= steps; j++) {
            const t = j / steps;
            const x = x1 + t * dx;
            const y = y1 + t * dy;
            let elev = await Forma.terrain.getElevationAt({ x: x, y: y });
            result.push([x, y, elev + 1]);
        }
    }

    return result;
}
async function spawnItems(positions: Array<[number, number, number]>) {
    const geometry = createBlockGeometry(0.5, 0.5, [0, 255, 0, 255]);

    for (const [x, y, z] of positions) {

        let { id } = await Forma.render.addMesh({
            geometryData: geometry,
            transform: [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                x, y, z, 1
            ]
        });
        active_items.push({ id: id, x: x, y: y })
    }
}
function pickRandomPositions(candidates: Array<[x: number, y: number, z: number]>, count: number): Array<[number, number, number]> {
    const selected = [];
    const used = new Set<number>();

    while (selected.length < count && used.size < candidates.length) {
        const index = Math.floor(Math.random() * candidates.length);
        if (!used.has(index)) {
            used.add(index);
            selected.push(candidates[index]);
        }
    }

    return selected;
}
function geoTransform(pos: Vector3, heading: number): [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number] {
    const cos = Math.cos(heading);
    const sin = Math.sin(heading);
    return [
        cos, sin, 0, 0,
        -sin, cos, 0, 0,
        0, 0, 1, 0,
        pos.x, pos.y, pos.z, 1
    ];
}

async function moveLoop() {
    let lastTime = performance.now();
    let lastTimeSnakeUpdate = 0;
    let lastOpLong: boolean = false
    let traveled = 0;
    let r = Math.random() * 255;
    let g = Math.random() * 255;
    let b = Math.random() * 255

    nextLevelColor = [r, g, b, 255];
    const tick = async () => {
        if (!gameplay) return
        const now = performance.now();
        const dt = (now - lastTime) / 1000;
        lastTime = now;

        // Apply input
        if (![...keysPressed].some(k => ['w', 'a', 's', 'd'].includes(k))) {
            if (Math.abs(velocity) > 0.01) {
                // velocity -= Math.sign(velocity) * friction * dt;
                velocity = 0
            } else {
                velocity = 0;
            }
        }

        if (keysPressed.has('a')) snakeHeading += turnSpeed * dt;
        if (keysPressed.has('d')) snakeHeading -= turnSpeed * dt;
        if (keysPressed.has('w')) velocity = maxSpeed;
        if (keysPressed.has('s')) velocity = 0;
        velocity = Math.max(Math.min(velocity, maxSpeed), -maxSpeed);
        if (velocity == 0) {
            requestAnimationFrame(tick);
            return
        }
        let dist_traveled = velocity * dt;
        traveled += dist_traveled;
        // let dist_traveled = 0.1;

        const moveVec = {
            x: Math.cos(snakeHeading) * dist_traveled,
            y: Math.sin(snakeHeading) * dist_traveled,
        };

        headPosition.x += moveVec.x;
        headPosition.y += moveVec.y;
        if (Math.abs(moveVec.x) > 0.01 || Math.abs(moveVec.y) > 0.01) {
            headPosition.z = await Forma.terrain.getElevationAt({ x: headPosition.x, y: headPosition.y }) + 0.5;
        }
        for (let i = 0; i < active_items.length; i++) {
            const item = active_items[i];
            const dx = item.x - headPosition.x;
            const dy = item.y - headPosition.y;
            const dist = Math.hypot(dx, dy);

            if (dist < eatRadius) {
                // 🐍 Eat item
                await Forma.render.remove({ id: item.id });
                active_items.splice(i, 1);

                // ➕ Grow worm
                worm_max_length += 1
                if (worm_max_length >= levelUpLength) {
                    level += 1
                    levelLimit++
                    levelUpLength += levelLimit;
                    let r = Math.random() * 255;
                    let g = Math.random() * 255;
                    let b = Math.random() * 255

                    levelColor = nextLevelColor;
                    nextLevelColor = [r, g, b, 255]
                    levelSignal.value = level
                    maxScoreSignal.value = levelUpLength;
                }


                // 🍏 Spawn a new one
                const newPos = pickRandomPositions(itemPositions, 1);
                score++
                scoreSignal.value = score;
                console.log(scoreSignal.value)
                await spawnItems(newPos);

                break; // Exit loop after eating one
            }
        }

        if (now - lastTimeSnakeUpdate > 250) {
            for (let i = 0; i < pre_transforms.length - 1; i++) {
                let tdata = pre_transforms[i]
                let tx = tdata[12];
                let ty = tdata[13];

                let cx = headPosition.x;
                let cy = headPosition.y;
                if (Math.hypot(cx - tx, cy - ty) < eatRadius) {
                    gameover()
                    isGameOver.value = true;
                    return
                }
            }
        }


        if (headMeshId && dist_traveled > 0) {
            if (now - lastTimeSnakeUpdate > 250) {
                let color = levelColor
                //add new segment if necessary
                if (worm_max_length > mesh_ids.length) {
                    let transform_data = pre_transforms[0];

                    const { id } = await Forma.render.addMesh({
                        geometryData: createBlockGeometry(0, 3),
                        transform: transform_data
                    });
                    mesh_ids.push(id);
                    color = nextLevelColor;
                }

                //move last to the new position
                let transform_data = geoTransform(headPosition, snakeHeading)
                pre_transforms.push(transform_data)
                if (pre_transforms.length > worm_max_length) {
                    pre_transforms = pre_transforms.slice(pre_transforms.length - worm_max_length)
                }

                let last = mesh_ids.pop();
                mesh_ids.unshift(last);
                let geo = createBlockGeometry(0, 3, color)

                await Forma.render.updateMesh({
                    id: last,
                    geometryData: geo,
                    transform: transform_data,
                });

                traveled = 0;

                lastTimeSnakeUpdate = now;
            }

        }

        // Camera follows
        const cameraPos: Vector3 = {
            x: headPosition.x - Math.cos(snakeHeading) * (40 + (worm_max_length - 2) * 0.8),
            y: headPosition.y - Math.sin(snakeHeading) * (40 + (worm_max_length - 2) * 0.8),
            z: headPosition.z + (20 + (worm_max_length - 2) * 0.8)
        };

        await Forma.camera.move({
            position: cameraPos,
            target: headPosition,
            transitionTimeMs: 0
        });

        requestAnimationFrame(tick);
    };

    const gameover = async () => {
        const redc: [number, number, number, number] = [255, 0, 0, 255]
        let geo = createBlockGeometry(0, 3, redc)

        let shown = true;
        let meshIdsClone = mesh_ids.slice(0);
        let interval = setInterval(async () => {
            if (mesh_ids.length > 0) {
                let id = mesh_ids.shift()
                let tf = pre_transforms.pop();
                await Forma.render.updateMesh({
                    id: id,
                    geometryData: geo,
                    transform: tf,
                });
            } else if (meshIdsClone.length > 0) {
                let midClone = meshIdsClone.pop()
                await Forma.render.remove({ id: midClone })
            } else {
                clearInterval(interval)
            }

        }, 50)


    }

    requestAnimationFrame(tick);
}

await init();
