#!/usr/bin/env bash
# Extract cropped 30fps JPEG sequences of the real website / dashboard recordings.
# usage: tools/extract_clips.sh <site.mp4> <dashboard.mp4>
set -e
SITE="$1"; DASH="$2"; OUT=assets/site
SC="crop=1280:612:0:81"; DC="crop=1280:614:0:52"
clip() { # name src start dur
  local n=$1 src=$2 ss=$3 d=$4 crop
  [ "$src" = S ] && f="$SITE" crop=$SC || { f="$DASH"; crop=$DC; }
  mkdir -p $OUT/$n; rm -f $OUT/$n/*.jpg
  ffmpeg -v error -ss $ss -i "$f" -t $d -vf "$crop,fps=30" -q:v 2 $OUT/$n/%04d.jpg
  echo "$n $(ls $OUT/$n | wc -l)"
}
clip home S 5.5 3.5
clip svc_intro S 13.5 1.5
clip svc18 S 15.3 2.0
clip svc_orbit S 16.0 3.0
clip svc_cards S 23.5 2.5
clip testimonials S 29.0 2.5
clip listen S 31.5 2.5
clip plan S 34.5 2.0
clip builds S 40.0 2.0
clip better S 43.5 1.5
clip founder_sec S 127.3 1.2
clip justask S 48.0 3.5
clip partners S 52.5 2.0
clip conversation S 58.0 1.5
clip footer S 59.0 2.0
clip svc_page S 63.5 2.0
clip zelrise_hero S 82.0 2.0
clip shelf S 88.5 2.0
clip book_open S 92.0 3.0
clip step S 105.5 2.0
clip about S 118.0 2.0
clip arcs S 123.0 3.0
clip departments S 130.5 1.5
clip letter S 146.0 14.0
clip sent S 192.0 2.0
clip d_login D 1.0 3.0
clip d_greet D 7.0 3.0
clip d_detail D 18.0 3.0
clip d_inbox D 31.0 3.0
clip d_team D 56.0 2.0
