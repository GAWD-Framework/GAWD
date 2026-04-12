#!/bin/bash

ROOT=$(pwd)

gnome-terminal --tab --title="Frontend" -- bash -c "cd '$ROOT/frontend'; echo 'Starting Frontend...'; npm run dev; exec bash"

gnome-terminal --tab --title="Backend" -- bash -c "cd '$ROOT/backend'; echo 'Starting Backend...'; fastapi dev server.py; exec bash"

gnome-terminal --tab --title="Database" -- bash -c "cd '$ROOT/backend/mongo'; echo 'Starting Database...'; mongod --dbpath ./ --logpath ./mongod.log; exec bash"

echo "All services started in separate tabs."