#!/usr/bin/env bash
set -e

cd /home/ubuntu/discord-amq
git pull origin main
bun install
pm2 reload amq-server