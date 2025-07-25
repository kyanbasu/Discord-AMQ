#!/usr/bin/env bash
set -e

cd /home/ubuntu/discord-amq

echo "Pulling git"
git pull origin main

echo "Installing dependencies"
cd ./client
npm install

cd ../server
bun install

echo "Restarting service"
pm2 reload amq-server
pm2 reload amq-client

echo "Deploy complete."