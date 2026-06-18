FROM nginx:alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy static website assets
COPY index.html /usr/share/nginx/html/
COPY index.css /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/
COPY cufet_data_compact.json /usr/share/nginx/html/

# Expose port 8080
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
