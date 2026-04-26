#!/bin/bash
# Pass your VM's IP as an argument when running this script
IP=$1
response=$(curl -s -o /dev/null -w "%{http_code}" http://$IP:3000)

if [ "$response" == "200" ]; then
  echo "Application is running successfully!"
else
  echo "Application failed to start! HTTP Status: $response"
fi
