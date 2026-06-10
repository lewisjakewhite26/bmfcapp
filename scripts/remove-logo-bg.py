"""Remove outer white background from logo while keeping internal white."""
from collections import deque
from PIL import Image

LOGO_PATH = "public/logo.png"
TOLERANCE = 35


def is_outer_white(r: int, g: int, b: int, a: int) -> bool:
    return a > 10 and r >= 255 - TOLERANCE and g >= 255 - TOLERANCE and b >= 255 - TOLERANCE


def remove_outer_white(path: str) -> None:
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    pixels = img.load()
    visited = [[False] * w for _ in range(h)]
    queue: deque[tuple[int, int]] = deque()

    for x in range(w):
        for y in (0, h - 1):
            if is_outer_white(*pixels[x, y]):
                queue.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_outer_white(*pixels[x, y]):
                queue.append((x, y))

    while queue:
        x, y = queue.popleft()
        if visited[x][y]:
            continue
        visited[x][y] = True

        r, g, b, a = pixels[x, y]
        if not is_outer_white(r, g, b, a):
            continue

        pixels[x, y] = (r, g, b, 0)

        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[nx][ny]:
                queue.append((nx, ny))

    img.save(path, "PNG")


if __name__ == "__main__":
    remove_outer_white(LOGO_PATH)
    print(f"Updated {LOGO_PATH}")
