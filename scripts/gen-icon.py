#!/usr/bin/env python3
"""生成 1024x1024 源图标：渐变圆角方块 + 便签 + 对勾。

用法：
  python3 scripts/gen-icon.py
  npx tauri icon src-tauri/icon-source.png   # 生成全平台图标
"""

from PIL import Image, ImageDraw

SIZE = 1024
RADIUS = 232  # 接近 macOS Big Sur 的圆角比例

# 对角线渐变：左上 #6D7CFF -> 右下 #35CDC0
C1 = (109, 124, 255)
C2 = (53, 205, 192)

img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
grad = Image.new("RGBA", (SIZE, SIZE))
px = grad.load()
for y in range(SIZE):
    for x in range(SIZE):
        t = (x + y) / (2 * (SIZE - 1))
        px[x, y] = (
            round(C1[0] + (C2[0] - C1[0]) * t),
            round(C1[1] + (C2[1] - C1[1]) * t),
            round(C1[2] + (C2[2] - C1[2]) * t),
            255,
        )

mask = Image.new("L", (SIZE, SIZE), 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, SIZE - 1, SIZE - 1), radius=RADIUS, fill=255)
img.paste(grad, (0, 0), mask)

draw = ImageDraw.Draw(img)

# 便签卡片
card = (268, 214, 756, 810)
draw.rounded_rectangle(card, radius=56, fill=(255, 255, 255, 244))

# 卡片上的文字线条
line_color = (64, 78, 120, 255)
draw.rounded_rectangle((350, 356, 676, 384), radius=14, fill=line_color)
draw.rounded_rectangle((350, 452, 676, 480), radius=14, fill=line_color)
draw.rounded_rectangle((350, 548, 548, 576), radius=14, fill=line_color)

# 右下角对勾圆
check_c = (708, 726)
draw.ellipse((check_c[0] - 116, check_c[1] - 116, check_c[0] + 116, check_c[1] + 116), fill=(53, 205, 192, 255))
draw.line(
    [(check_c[0] - 52, check_c[1] + 2), (check_c[0] - 14, check_c[1] + 40), (check_c[0] + 58, check_c[1] - 44)],
    fill=(255, 255, 255, 255),
    width=30,
    joint="curve",
)

img.save("src-tauri/icon-source.png")
print("wrote src-tauri/icon-source.png")
