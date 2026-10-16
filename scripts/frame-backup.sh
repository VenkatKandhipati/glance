#!/usr/bin/env bash
# Read-only firmware backup of the RK3326 frame over ADB. It changes nothing on the frame.
# Saves the first 8 MiB of the NAND and partitions 1–15 (everything except userdata) to
# frames/backup-<date>/, gzipped, and checks each against a SHA-256 taken on the frame.
# frames/ is gitignored: never commit a backup.
#
#   scripts/frame-backup.sh
#
# Needs root through `su 0 <cmd>` (the RK3326 board). This is a logical capture, not a physical
# NAND image; restoring from it is untested.
set -euo pipefail

if [ "$(adb get-state 2>/dev/null)" != device ]; then
  echo "No frame found. Run scripts/frame-check.sh first." >&2
  exit 1
fi
case "$(adb shell getprop ro.build.fingerprint | tr -d '\r')" in
  rockchip/rk3326_go/*) ;;
  *) echo "This script is for the RK3326 board only (check ro.build.fingerprint)." >&2; exit 1 ;;
esac

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
OUT="$ROOT_DIR/frames/backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

# Partition sizes (KiB) and names. adb gets </dev/null below so it never eats the script's input.
PARTS=$(adb shell cat /proc/partitions | tr -d '\r')
NAMES=$(adb shell ls -l /dev/block/by-name | tr -d '\r')

# name  device  size(KiB); read in 64 KiB blocks so small partitions like frp (512 KiB) count
REGIONS=("head rknand0 8192")
for p in $(seq 1 15); do
  size_kib=$(awk -v n="rknand0p$p" '$4 == n {print $3}' <<<"$PARTS")
  label=$(awk -v n="/dev/block/rknand0p$p" '$NF == n {print $(NF-2)}' <<<"$NAMES")
  REGIONS+=("p$p-$label rknand0p$p $size_kib")
done

for region in "${REGIONS[@]}"; do
  read -r name dev kib <<<"$region"
  printf '%-14s %8s KiB ' "$name" "$kib"
  cmd="dd if=/dev/block/$dev bs=65536 count=$((kib / 64)) 2>/dev/null"
  want=$(adb shell "su 0 sh -c '$cmd | sha256sum'" </dev/null | tr -d '\r' | cut -c1-64)
  got=$(adb exec-out "su 0 $cmd" </dev/null | tee >(gzip -1 > "$OUT/$name.img.gz") | shasum -a 256 | cut -c1-64)
  if [ "$want" != "$got" ]; then
    echo "MISMATCH"; echo "frame $want"; echo "mac   $got"; exit 1
  fi
  echo "$got  $name.img" >> "$OUT/SHA256SUMS"
  echo "ok"
done

adb shell getprop ro.build.fingerprint | tr -d '\r' > "$OUT/fingerprint.txt"
adb shell cat /proc/partitions | tr -d '\r' > "$OUT/partitions.txt"
echo "Saved to $OUT ($(du -sh "$OUT" | cut -f1)). Keep a copy off this Mac."
