"""Encodes a folder of frame_00001.jpg... into an H.264 MP4 using Blender's bundled FFmpeg.
Run through Blender:  blender -b --factory-startup -P video/encode.py -- <frames_dir> <out.mp4> <fps>
"""
import glob
import os
import sys

import bpy

frames_dir, out_path, fps = sys.argv[sys.argv.index("--") + 1:][:3]
fps = int(fps)
files = sorted(glob.glob(os.path.join(frames_dir, "frame_*.jpg")))
if not files:
    raise SystemExit("No frames found in " + frames_dir)

scene = bpy.context.scene
first = bpy.data.images.load(files[0])
width, height = first.size
scene.render.resolution_x = width
scene.render.resolution_y = height
scene.render.resolution_percentage = 100
scene.render.fps = fps

# Colors must pass through untouched: no filmic/AgX tone mapping.
scene.view_settings.view_transform = "Standard"
scene.view_settings.look = "None"
scene.sequencer_colorspace_settings.name = "sRGB"

scene.sequence_editor_create()
strips = scene.sequence_editor.sequences
strip = strips.new_image(name="frames", filepath=files[0], channel=1, frame_start=1)
for path in files[1:]:
    strip.elements.append(os.path.basename(path))

scene.frame_start = 1
scene.frame_end = len(files)

image = scene.render.image_settings
image.file_format = "FFMPEG"
image.color_mode = "RGB"
scene.render.ffmpeg.format = "MPEG4"
scene.render.ffmpeg.codec = "H264"
scene.render.ffmpeg.constant_rate_factor = "HIGH"
scene.render.ffmpeg.ffmpeg_preset = "GOOD"
scene.render.ffmpeg.gopsize = fps
scene.render.ffmpeg.audio_codec = "NONE"
scene.render.use_sequencer = True
scene.render.filepath = out_path

bpy.ops.render.render(animation=True)
print("Wrote", out_path, "frames:", len(files))
