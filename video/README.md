# Video tutorial de inscripción (Code Cats Days)

`ccd-tutorial.html` dibuja el video: cada fotograma es función pura del tiempo (`window.seek(t)`).

- **Vista previa:** abrir el HTML en Chrome (se reproduce solo; espacio = pausa, ← → = ±1 s).
- **Render a MP4:** `node video/render.mjs` → `video/out/tutorial-inscripcion.mp4` (1080×1920, 30 fps, sin audio).
  Requiere Google Chrome y Blender 4.2 (rutas con `CHROME_PATH` / `BLENDER_PATH`). `--only=10` renderiza solo 10 s para probar.
- Copiar el resultado a `public/code-cats-days/tutorial-inscripcion.mp4` para publicarlo.
- Guion, textos, toques (`TAPS`), zooms (`CAM`), flechas (`CALLS`) y avisos (`TOASTS`) están al inicio del `<script>`.
- Las pantallas son maquetas simplificadas de la web real: si cambia el formulario, actualizar el HTML.
