#!/usr/bin/env bash
# deploy-pages.sh — 一键部署到 GitHub Pages
# 用法：cd 到项目根目录，运行 bash deploy-pages.sh

set -e
cd "$(dirname "$0")"

REPO_NAME="balloon-stamp"
GH_USER=$(gh api user --jq '.login' 2>/dev/null || echo "BenHPM")

echo "🎮 气球大乱踩 — 部署到 GitHub Pages"
echo "======================================="

# 1. 初始化 git（如果没有）
if [ ! -d ".git" ]; then
  git init
  git checkout -b main
  git add prototype/ docs/
  git commit -m "feat: 气球大战物理手感原型（手机版虚拟按键）"
fi

# 2. 创建 GitHub repo 并推送
echo "📦 创建 GitHub 仓库..."
gh repo create "$REPO_NAME" --public \
  --description "FC 气球大战物理手感原型" \
  --source . --push 2>/dev/null || {
    echo "仓库可能已存在，尝试直接推送..."
    git remote add origin "https://github.com/$GH_USER/$REPO_NAME.git" 2>/dev/null || true
    git push -u origin main --force
  }

# 3. 启用 GitHub Pages
echo "🌐 启用 GitHub Pages..."
gh api "repos/$GH_USER/$REPO_NAME/pages" \
  --method POST \
  --field source='{"branch":"main","path":"/"}' \
  2>/dev/null || echo "Pages 可能已启用"

# 4. 把 index.html 放到根目录（GitHub Pages 默认找 index.html）
# 用 orphan branch 的方式：创建 gh-pages 分支，只包含 prototype 内容
git checkout --orphan gh-pages 2>/dev/null || git checkout gh-pages
git rm -rf . 2>/dev/null || true
cp prototype/index.html ./index.html
git add index.html
git commit -m "deploy: 气球大乱踩游戏页面" --allow-empty
git push origin gh-pages --force 2>/dev/null || true

# 设置 gh-pages 为默认 Pages 分支
gh api "repos/$GH_USER/$REPO_NAME/pages" \
  --method PUT \
  --field source='{"branch":"gh-pages","path":"/"}' \
  2>/dev/null || true

git checkout main

echo ""
echo "✅ 部署完成！"
echo ""
echo "📱 手机体验地址："
echo "   https://$GH_USER.github.io/$REPO_NAME/"
echo ""
echo "（首次部署可能需要等 1-2 分钟生效）"
