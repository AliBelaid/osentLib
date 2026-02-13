#!/bin/sh
set -e

OPENSEARCH_URL="http://opensearch:9200"

echo "Waiting for OpenSearch to be ready..."
until curl -s "$OPENSEARCH_URL/_cluster/health" | grep -q '"status":"green"\|"status":"yellow"'; do
  sleep 2
done
echo "OpenSearch is ready."

echo "Creating index template for au-news..."
curl -s -X PUT "$OPENSEARCH_URL/_index_template/au-news-template" \
  -H "Content-Type: application/json" \
  -d @/opt/opensearch-init/index-template.json

echo ""
echo "Creating initial index au-news-000001..."
curl -s -X PUT "$OPENSEARCH_URL/au-news-000001" \
  -H "Content-Type: application/json" \
  -d '{
    "aliases": {
      "au-news": {
        "is_write_index": true
      }
    }
  }'

echo ""
echo "OpenSearch initialization complete."
