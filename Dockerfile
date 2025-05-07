# 構建階段
FROM node:18-alpine AS builder

# 設置工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝依賴
RUN npm ci

# 複製源代碼
COPY . .

# 構建應用
RUN npm run build

# 生產階段
FROM node:18-alpine

# 設置工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 只安裝生產依賴
RUN npm ci --only=production

# 從構建階段複製構建文件
COPY --from=builder /app/dist ./dist

# 複製其他必要文件
COPY .env.example .env

# 暴露端口
EXPOSE 3000

# 設置環境變量
ENV NODE_ENV=production

# 啟動命令
CMD ["node", "dist/app.js"] 