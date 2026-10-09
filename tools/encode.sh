#!/usr/bin/env bash
# Encode rendered frames + mix to an Instagram-ready MP4 (1080x1920, 30 fps, H.264 High, AAC 48k, -14 LUFS).
# usage: tools/encode.sh <framesDir> <mix.wav> <out.mp4>
set -e
FR="$1"; WAV="$2"; OUT="$3"
I=$(ffmpeg -hide_banner -nostats -i "$WAV" -af ebur128 -f null - 2>&1 | awk '/Integrated loudness/{f=1} f&&/I:/{print $2; exit}')
G=$(python3 -c "print(round(-14.0-($I),2))")
echo "measured $I LUFS -> gain $G dB"
ffmpeg -v error -y -framerate 30 -i "$FR/f%05d.jpg" -i "$WAV" \
  -filter_complex "[1:a]volume=${G}dB,alimiter=limit=0.891:attack=3:release=60:level=false[a]" \
  -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 16 -profile:v high -level 4.2 -pix_fmt yuv420p \
  -x264-params "keyint=60:min-keyint=30" -r 30 -c:a aac -b:a 320k -ar 48000 -t 40 -movflags +faststart "$OUT"
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of compact "$OUT"
