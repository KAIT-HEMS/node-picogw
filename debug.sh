#!/bin/sh

if [ $# -eq 0 ]; then
	node --inspect main.js
elif [ $1 = "break" ]; then
	node --inspect --debug-brk main.js $2 $3 $3 $5 $6 $7 $8 $9
elif [ $1 = "help" ]; then
        echo './debug.sh [break|help]'
	echo ''
	echo 'No argument: run with node-inspector'
	echo 'break: Break at the beginning'
	echo 'help: show this message'
	echo ''
	echo 'The recommended node.js version is 7.4.0'
else
	node --inspect main.js $1 $2 $3 $3 $5 $6 $7 $8 $9
fi

