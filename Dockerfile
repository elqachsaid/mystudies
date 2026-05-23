# استخدم Node.js رسمي
FROM node:20-alpine

# مجلد العمل
WORKDIR /app

# نسخ ملفات السيرفر
COPY server/package*.json ./server/
RUN cd server && npm install --production

# نسخ كل الملفات
COPY . .

# تشغيل على البورت المحدد
ENV PORT=3001
EXPOSE 3001

# تشغيل التطبيق
CMD ["node", "server/server.js"]
