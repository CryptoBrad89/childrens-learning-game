#!/bin/sh
exec /usr/bin/google-chrome --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows "$@"
