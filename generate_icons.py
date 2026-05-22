from PIL import Image, ImageDraw

def create_icon(size, color, filename):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Draw a shield-like shape
    margin = size // 8
    draw.polygon([
        (size // 2, margin), 
        (size - margin, margin * 2), 
        (size - margin, size // 2 + margin), 
        (size // 2, size - margin), 
        (margin, size // 2 + margin), 
        (margin, margin * 2)
    ], fill=color)
    img.save(filename)

import os
os.makedirs('extension/icons', exist_ok=True)

create_icon(16, (233, 30, 99), 'extension/icons/icon16.png')
create_icon(48, (233, 30, 99), 'extension/icons/icon48.png')
create_icon(128, (233, 30, 99), 'extension/icons/icon128.png')

print("Icons generated.")
