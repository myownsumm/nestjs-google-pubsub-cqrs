FROM gcr.io/google.com/cloudsdktool/google-cloud-cli:alpine as builder

RUN gcloud components install pubsub-emulator
FROM node:alpine
COPY --from=builder /google-cloud-sdk/platform/pubsub-emulator /pubsub-emulator

# Environment variables for configuration
ENV PUBSUB_PROJECT_ID=integration-test-project \
    PUBSUB_TOPIC=integration-events-topic \
    PUBSUB_SUBSCRIPTION=event-bus-monitoring-sub \
    PUBSUB_EMULATOR_PORT=8090

RUN apk update \
    && apk upgrade \
    && apk add ca-certificates \
    && apk --update --no-cache add tini bash \
    && update-ca-certificates \
    && apk add --update coreutils && rm -rf /var/cache/apk/*   \
    && apk add --update openjdk11 tzdata curl unzip bash \
    && apk add --no-cache nss \
    && rm -rf /var/cache/apk/*

EXPOSE 8090

WORKDIR /usr/app
COPY ./ /usr/app
RUN npm install @google-cloud/pubsub

ENTRYPOINT ["/sbin/tini", "--"]
CMD        ["sh", "/usr/app/entrypoint.sh"]

HEALTHCHECK --interval=2s --start-period=15s --retries=5 \
    CMD sh -c "netstat -tulpen | grep 0.0.0.0:$PUBSUB_EMULATOR_PORT || exit 1"