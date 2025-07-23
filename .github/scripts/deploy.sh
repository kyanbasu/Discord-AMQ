#!/usr/bin/env bash
set -e

cd /home/ubuntu/discord-amq

echo "Pulling git"
git pull origin master

echo "Installing dependencies"
bun install

echo "Restarting service"
pm2 reload amq-server

echo "Deploy complete."