#!/usr/bin/env bash
set -e

cd $PATH

echo "Pulling git"
git pull origin main

echo "Installing dependencies"
cd ./client
npm install

cd ../server
bun install

echo "Restarting service"
pm2 reload amq-server

echo "Deploy complete."