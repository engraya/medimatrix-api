FROM postgres:16-alpine
RUN apk add --no-cache aws-cli
COPY backup.sh /usr/local/bin/backup.sh
ENTRYPOINT ["sh", "/usr/local/bin/backup.sh"]
