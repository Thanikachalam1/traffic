"""
server.py

FastAPI server that:
- Accepts uploaded image or video via POST /upload_media (FormData: file)
- For image: runs a single YOLO inference and stores the resulting counts + preview image
- For video: starts a background tracking thread that updates latest_counts continuously
- Exposes GET /latest_counts (returns JSON with 'lanes' and 'peds')
- Exposes GET /preview.jpg (latest processed frame or image) for quick preview in the React app

Usage:
    pip install fastapi uvicorn ultralytics opencv-python-headless python-multipart
    uvicorn server:app --host 0.0.0.0 --port 8000
"""

import os
import time
import threading
import json
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import shutil

# NOTE: ultralytics import may print messages; it's fine.
from ultralytics import YOLO
import cv2

app = FastAPI()

# allow your React dev server; change in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
PREVIEW_PATH = "preview.jpg"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Shared latest counts object (thread-safe-ish; single-writer pattern)
latest_counts = {
    "timestamp": 0,
    "frame_idx": 0,
    "lanes": {"lane1": 0, "lane2": 0, "lane3": 0, "lane4": 0},
    "peds": {"lane1": 0, "lane2": 0, "lane3": 0, "lane4": 0},
    "by_type": {"Small": 0, "Large": 0},
    "source": None,
    "status": "idle"  # "idle", "processing", "running", "error"
}

# Tracker thread control
_worker_thread = None
_worker_stop = threading.Event()
_worker_lock = threading.Lock()

# ---- adjust these class id mappings to your model's labels ----
SMALL_CLASSES = [2, 3]   # e.g. car, motorcycle
LARGE_CLASSES = [5, 7]   # e.g. bus, truck

# Helper: assign centroid to a lane (simple quadrant/roi approach)
def assign_lane(cx, cy, frame_w, frame_h):
    # This simple heuristic maps central-top -> lane1 (N), right -> lane2 (E), bottom -> lane3 (S), left -> lane4 (W)
    mid_x = frame_w / 2
    mid_y = frame_h / 2
    # bounding box near center column -> N/S, near center row -> E/W; tune as needed
    if cy < mid_y and abs(cx - mid_x) <= frame_w * 0.35:
        return "lane1"
    if cx >= mid_x and abs(cy - mid_y) <= frame_h * 0.35:
        return "lane2"
    if cy >= mid_y and abs(cx - mid_x) <= frame_w * 0.35:
        return "lane3"
    if cx < mid_x and abs(cy - mid_y) <= frame_h * 0.35:
        return "lane4"
    # fallback to quadrant
    if cx >= mid_x and cy < mid_y:
        return "lane2"
    if cx < mid_x and cy < mid_y:
        return "lane1"
    if cx < mid_x and cy >= mid_y:
        return "lane4"
    return "lane3"

# Utility: write preview image thread-safely
def save_preview_image(frame):
    try:
        cv2.imwrite(PREVIEW_PATH, frame)
    except Exception as e:
        print("Failed to write preview image:", e)

# Single-image inference (one-off)
def process_image_file(path, model):
    try:
        frame = cv2.imread(path)
        if frame is None:
            raise RuntimeError("cv2.imread returned None")
        h, w = frame.shape[:2]
        res = model(frame)[0]  # single-image inference
        # prepare counts
        lane_sets = {"lane1": set(), "lane2": set(), "lane3": set(), "lane4": set()}
        by_type = {"Small": set(), "Large": set()}
        for box in res.boxes:
            cls = int(box.cls[0])
            xy = box.xyxy[0].cpu().numpy()
            x1, y1, x2, y2 = map(int, xy)
            cx = (x1 + x2) // 2
            cy = (y1 + y2) // 2
            vid = hash((x1, y1, x2, y2))  # no tracker id for image; use bbox hash

            lane = assign_lane(cx, cy, w, h)
            if cls in SMALL_CLASSES:
                by_type["Small"].add(vid)
            elif cls in LARGE_CLASSES:
                by_type["Large"].add(vid)
            else:
                # ignore other classes (or extend mapping)
                continue
            lane_sets[lane].add(vid)

            # draw bbox and label on frame
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 220, 0), 2)
            lbl = f"{'S' if cls in SMALL_CLASSES else 'L'}"
            cv2.putText(frame, lbl, (x1, max(16, y1-6)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 2)

        lanes_count = {k: len(v) for k, v in lane_sets.items()}
        by_type_count = {k: len(v) for k, v in by_type.items()}
        peds = {"lane1": 0, "lane2": 0, "lane3": 0, "lane4": 0}

        # update shared state
        latest_counts.update({
            "timestamp": int(time.time()),
            "frame_idx": 1,
            "lanes": lanes_count,
            "peds": peds,
            "by_type": by_type_count,
            "status": "idle",
            "source": os.path.basename(path)
        })

        save_preview_image(frame)
    except Exception as ex:
        latest_counts["status"] = "error"
        print("process_image_file error:", ex)

# Video tracking worker (runs until video ends or stop requested)
def video_tracking_worker(path, model):
    global latest_counts, _worker_stop
    print("Starting video worker for:", path)
    cap = cv2.VideoCapture(path)
    frame_idx = 0
    try:
        while cap.isOpened() and not _worker_stop.is_set():
            ret, frame = cap.read()
            if not ret:
                break
            frame_idx += 1
            h, w = frame.shape[:2]
            # run tracker-based inference (persist True to get ids)
            res = model.track(frame, persist=True)[0]

            lane_sets = {"lane1": set(), "lane2": set(), "lane3": set(), "lane4": set()}
            by_type = {"Small": set(), "Large": set()}

            for box in res.boxes:
                cls = int(box.cls[0])
                # some versions of ultralytics provide box.id; fallback if missing
                vid = int(box.id) if hasattr(box, "id") and box.id is not None else hash(tuple(map(int, box.xyxy[0].cpu().numpy())))
                xy = box.xyxy[0].cpu().numpy()
                x1, y1, x2, y2 = map(int, xy)
                cx = (x1 + x2) // 2
                cy = (y1 + y2) // 2

                lane = assign_lane(cx, cy, w, h)
                if cls in SMALL_CLASSES:
                    by_type["Small"].add(vid)
                elif cls in LARGE_CLASSES:
                    by_type["Large"].add(vid)
                else:
                    continue
                lane_sets[lane].add(vid)

                # draw bounding box with id
                cv2.rectangle(frame, (x1, y1), (x2, y2), (16, 200, 48), 2)
                cv2.putText(frame, f"ID:{vid}", (x1, max(16, y1-6)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255,255,255), 2)

            lanes_count = {k: len(v) for k, v in lane_sets.items()}
            by_type_count = {k: len(v) for k, v in by_type.items()}
            peds = {"lane1": 0, "lane2": 0, "lane3": 0, "lane4": 0}

            # update shared state
            latest_counts.update({
                "timestamp": int(time.time()),
                "frame_idx": frame_idx,
                "lanes": lanes_count,
                "peds": peds,
                "by_type": by_type_count,
                "status": "running",
                "source": os.path.basename(path)
            })

            # save preview every N frames
            if frame_idx % 3 == 0:
                save_preview_image(frame)

            # small sleep to yield; model.track speed determines real frame rate
            time.sleep(0.01)

    except Exception as e:
        print("video_tracking_worker error:", e)
        latest_counts["status"] = "error"
    finally:
        cap.release()
        latest_counts["status"] = "idle"
        print("Video worker ended for:", path)

# Endpoint: upload image or video
@app.post("/upload_media")
async def upload_media(file: UploadFile = File(...)):
    """
    Accepts a file (image or video). Saves it to uploads/ and:
    - if image: runs one-off inference and updates latest_counts & preview
    - if video: starts background tracking worker (stops previous worker)
    Returns: {ok: True, filename: ...}
    """
    # sanitize filename
    filename = os.path.basename(file.filename)
    target_path = os.path.join(UPLOAD_DIR, f"{int(time.time())}_{filename}")
    try:
        with open(target_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"file save error: {e}")

    # stop previous worker if running
    global _worker_thread, _worker_stop
    with _worker_lock:
        if _worker_thread and _worker_thread.is_alive():
            print("Stopping previous worker...")
            _worker_stop.set()
            _worker_thread.join(timeout=2)
        _worker_stop.clear()

        # try to detect file type by extension
        ext = filename.lower().split(".")[-1]
        try:
            model = YOLO("yolov8n.pt")  # adjust model path if needed
        except Exception as e:
            latest_counts["status"] = "error"
            print("Failed to load YOLO model:", e)
            raise HTTPException(status_code=500, detail=f"YOLO model load error: {e}")

        if ext in ("jpg", "jpeg", "png", "bmp", "webp"):
            # image: process once
            latest_counts["status"] = "processing"
            thread = threading.Thread(target=process_image_file, args=(target_path, model), daemon=True)
            thread.start()
            return {"ok": True, "filename": os.path.basename(target_path), "mode": "image"}
        else:
            # treat as video (mp4, mov, mkv, etc.)
            latest_counts["status"] = "starting"
            _worker_thread = threading.Thread(target=video_tracking_worker, args=(target_path, model), daemon=True)
            _worker_thread.start()
            return {"ok": True, "filename": os.path.basename(target_path), "mode": "video"}

# Endpoint: latest counts
@app.get("/latest_counts")
def get_latest_counts():
    # return a shallow copy for safety
    return dict(latest_counts)

# Endpoint: preview image (if available)
@app.get("/preview.jpg")
def get_preview():
    if os.path.exists(PREVIEW_PATH):
        return FileResponse(PREVIEW_PATH, media_type="image/jpeg")
    raise HTTPException(status_code=404, detail="No preview available")

# Optional: stop worker
@app.post("/stop")
def stop_worker():
    global _worker_thread, _worker_stop
    with _worker_lock:
        if _worker_thread and _worker_thread.is_alive():
            _worker_stop.set()
            _worker_thread.join(timeout=2)
            latest_counts["status"] = "idle"
            return {"ok": True, "stopped": True}
    return {"ok": True, "stopped": False}
