# 🐍 UrbanSnake – A Game Inside Autodesk Forma

UrbanSnake is a real-time interactive game built entirely with the Autodesk Forma SDK.
You control a growing "snake" that moves through real-world road geometry.

## Forma SDK APIs used:


### 1. Camera Control – Forma.camera
Used to create a smooth, game-like third-person camera experience:
Forma.camera.getCurrent() - Forma.camera.move() -> Fetch current camera position and target to compute heading and direction. Update camera position and orientation based on snake movement.

### 3. Terrain – Forma.terrain
getElevationAt({ x, y }) –> Get ground elevation to place the snake and items on the road realistically

### 4. Mesh Rendering – Forma.render
addMesh() - updateMesh() -> Add snake and food to the scene, update the position.

### 5. Geometry Query – Forma.geometry
getPathsByCategory({ category: "road" }) –> Retrieve road centerlines as polylines
getFootprint({ path }) –> Convert road paths into usable polyline coordinates for item placement


👉 [Demo on YouTube](https://www.youtube.com/watch?v=xGknpwqVWiI)
