#!/bin/bash

branch=`git branch --show-current`

if [ $branch != "master" ]; then
  echo "Run me in master branch"
  exit
fi

git switch production || exit

git merge master --no-edit || exit

(cd frontend; npm run build)

git add frontend-dist
git commit frontend-dist -m build

git switch master
