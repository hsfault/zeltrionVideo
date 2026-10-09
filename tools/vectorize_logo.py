"""Trace the ZS emblem of the official logo into polygons (per colour piece) for 3D extrusion."""
import cv2, numpy as np, json, sys
img = cv2.imread("assets/src/zeltrion_logo.jpg")
x0, y0, x1, y1 = 440, 170, 1110, 860           # emblem bounding region
crop = img[y0:y1, x0:x1].astype(np.int32)
b, g, r = crop[..., 0], crop[..., 1], crop[..., 2]
maroon = ((r - g) > 45) & ((r - b) > 35) & (r < 200)
green = ((g - r) > 12) & ((g - b) > 5) & (g < 150)
pieces = []
for name, m in (("maroon", maroon), ("green", green)):
    m = m.astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    m = cv2.GaussianBlur(m, (5, 5), 0); m = (m > 127).astype(np.uint8) * 255
    cnts, hier = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    for i, c in enumerate(cnts):
        if hier[0][i][3] != -1 or cv2.contourArea(c) < 800: continue
        ap = cv2.approxPolyDP(c, 0.8, True)[:, 0, :]
        holes = []
        ch = hier[0][i][2]
        while ch != -1:
            if cv2.contourArea(cnts[ch]) > 50:
                holes.append(cv2.approxPolyDP(cnts[ch], 0.8, True)[:, 0, :].tolist())
            ch = hier[0][ch][0]
        bx, by, bw, bh = cv2.boundingRect(c)
        pieces.append(dict(color=name, area=float(cv2.contourArea(c)), bbox=[bx, by, bw, bh],
                           pts=ap.tolist(), holes=holes))
cx, cy = (x1 - x0) / 2, (y1 - y0) / 2
for p in pieces:
    print(p["color"], p["area"], p["bbox"], len(p["pts"]), len(p["holes"]))
json.dump(dict(center=[cx, cy], size=[x1 - x0, y1 - y0], pieces=pieces), open("assets/emblem.json", "w"))
dbg = np.zeros_like(img[y0:y1, x0:x1])
for p in pieces:
    col = (40, 40, 200) if p["color"] == "maroon" else (60, 200, 60)
    cv2.fillPoly(dbg, [np.array(p["pts"])] + [np.array(h) for h in p["holes"]], col)
cv2.imwrite(sys.argv[1], dbg)
