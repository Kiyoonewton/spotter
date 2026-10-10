FROM nginx:alpine

RUN rm -f /etc/nginx/conf.d/default.conf

COPY webserver/conf.d/dev /etc/nginx/conf.d
COPY webserver/snippets /etc/nginx/snippets

EXPOSE 80