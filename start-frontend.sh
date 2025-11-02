#!/bin/bash

echo "Starting React Frontend..."
cd "$(dirname "$0")/frontend"
PORT=3001 npm start
