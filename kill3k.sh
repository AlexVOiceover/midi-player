#!/bin/bash

# Find the process using port 3000
PID=$(lsof -t -i:3000)

# Check if the PID variable is set to a non-empty string
if [ -n "$PID" ]; then
  echo "Killing process on port 3000 with PID: $PID"
  kill -9 $PID
else
  echo "No process found on port 3000."
fi
