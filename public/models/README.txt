# Custom Car Model Instructions

Place your custom car 3D model file here as either "car.glb" or "car.gltf".

## Model Requirements

1. The model should be in either GLB or GLTF format
2. Ideally the model should:
   - Be oriented so that Z-axis is forward
   - Have a reasonable scale (around 1-2 units long)
   - Have clean geometry without excessive polygons for better performance

## Creating/Obtaining Models

You can create models using:
- Blender (free): https://www.blender.org/
- Other 3D modeling software like Maya, 3ds Max, etc.

You can also download free models from:
- Sketchfab: https://sketchfab.com/
- TurboSquid: https://www.turbosquid.com/
- CGTrader: https://www.cgtrader.com/

Make sure you have proper rights to use any downloaded models.

## Exporting from Blender

1. Create or import your car model
2. Orient it so the front of the car faces the -Z direction
3. Select File > Export > glTF 2.0 (.glb/.gltf)
4. Name the file "car.glb" or "car.gltf"
5. Place the exported file in this directory

## Adjusting in Code

If your model scale or orientation doesn't match the game's needs:
- Edit the `loadCustomModel` method in `src/entities/Car.js` to adjust:
  - `model.scale.set(x, y, z)` - Change the scale values
  - `model.rotation.y = Math.PI` - Adjust rotation as needed
  - `model.position.set(x, y, z)` - Adjust position offset as needed 