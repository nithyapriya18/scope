#!/bin/bash

# Lumina Scope - Extension Setup Script
# Hardcodes Bedrock model and AWS credentials for Claude Code extension

export BEDROCK_MODEL_ID=anthropic.claude-sonnet-4-6
export AWS_PROFILE=dev-admin
export AWS_REGION=us-east-2
export CLAUDE_CODE_USE_BEDROCK=1

echo "✅ Extension environment variables set:"
echo "   BEDROCK_MODEL_ID=$BEDROCK_MODEL_ID"
echo "   AWS_PROFILE=$AWS_PROFILE"
echo "   AWS_REGION=$AWS_REGION"
echo "   CLAUDE_CODE_USE_BEDROCK=$CLAUDE_CODE_USE_BEDROCK"
echo ""
echo "Now restart your IDE extension to use these settings."
