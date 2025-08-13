# AI Integration with Gemini 2.0

## Overview

This document describes the integration of Google Gemini 2.0 API for AI-powered task generation in the Frende platform. The AI service provides personalized, bonding-focused tasks and conversation starters for matched users.

## Architecture

### Core Components

1. **GeminiService** (`services/ai.py`)
   - Main service for Gemini AI integration
   - Handles API calls, rate limiting, and caching
   - Provides fallback mechanisms for reliability

2. **TaskContext** (`services/ai.py`)
   - Data structure for AI task generation context
   - Contains user information, match details, and task history

3. **RateLimiter** (`services/ai.py`)
   - Token bucket rate limiter for API calls
   - Prevents exceeding Gemini API rate limits
   - Configurable limits and windows

4. **TaskCache** (`services/ai.py`)
   - Simple in-memory cache for AI-generated tasks
   - Reduces API calls and improves performance
   - Configurable TTL and size limits

5. **PromptBuilder** (`services/ai.py`)
   - Builds context-aware prompts for AI generation
   - Extracts user interests from profile text
   - Creates personalized prompts based on compatibility

## Configuration

### Environment Variables

```bash
# Required for AI features
GEMINI_API_KEY=your_gemini_api_key_here

# Optional configuration
AI_RATE_LIMIT_PER_MINUTE=60
AI_MAX_TOKENS_PER_REQUEST=1000
```

### API Key Setup

1. **Get Gemini API Key**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Copy the key to your environment

2. **Configure Environment**
   ```bash
   # Add to your .env file
   GEMINI_API_KEY=your_api_key_here
   ```

## Features

### 1. AI-Powered Task Generation

The AI service generates personalized tasks based on:
- **User Profiles**: Age, profession, interests
- **Compatibility Score**: Adjusts task complexity
- **Previous Tasks**: Avoids repetition
- **Common Interests**: Focuses on shared activities

#### Task Types

- **Ice Breakers**: Light, fun questions for new matches
- **Deep Conversations**: Thought-provoking questions for compatible users
- **Shared Experiences**: Activity suggestions for bonding
- **Personal Growth**: Reflection questions for meaningful connections

### 2. Conversation Starters

AI-generated conversation starters that:
- Are personalized to user names and ages
- Encourage responses and engagement
- Avoid generic greetings
- Are culturally appropriate

### 3. Fallback Mechanisms

The system includes robust fallback mechanisms:
- **Template Fallback**: Uses predefined templates when AI is unavailable
- **Error Handling**: Graceful degradation on API failures
- **Rate Limiting**: Prevents API quota exhaustion
- **Caching**: Reduces API calls and improves performance

## API Endpoints

### Task Generation

```http
POST /tasks/
Content-Type: application/json

{
  "match_id": 123,
  "task_type": "bonding"
}
```

### Conversation Starters

```http
POST /tasks/matches/{match_id}/conversation-starter
```

## Usage Examples

### Basic Task Generation

```python
from services.tasks import task_service

# Generate a task for a match
task = await task_service.generate_task(
    match_id=123,
    task_type="bonding"
)
```

### Conversation Starter Generation

```python
from services.tasks import task_service

# Generate a conversation starter
starter = await task_service.generate_conversation_starter(
    match_id=123
)
```

### Direct AI Service Usage

```python
from services.ai import ai_service, TaskContext

# Create task context
context = TaskContext(
    user1=user1,
    user2=user2,
    match=match,
    task_type="bonding",
    previous_tasks=["Previous task"],
    compatibility_score=85
)

# Generate AI task
title, description = await ai_service.generate_task(context)
```

## Error Handling

### Common Errors

1. **AIGenerationError**
   - Raised when AI generation fails
   - Includes fallback to template tasks
   - Logged for monitoring

2. **RateLimitError**
   - Raised when API rate limit is exceeded
   - Includes retry logic and fallback
   - Configurable limits

3. **ConfigurationError**
   - Raised when API key is missing
   - Disables AI features gracefully
   - Logs warning messages

### Error Recovery

```python
try:
    task = await ai_service.generate_task(context)
except AIGenerationError as e:
    # Fallback to template generation
    task = await generate_template_task(context)
except RateLimitError as e:
    # Wait and retry, or use fallback
    await asyncio.sleep(1)
    task = await generate_template_task(context)
```

## Performance Considerations

### Rate Limiting

- **Default Limit**: 60 requests per minute
- **Configurable**: Adjust via `AI_RATE_LIMIT_PER_MINUTE`
- **Token Bucket**: Smooth rate limiting with burst allowance

### Caching

- **Cache Size**: 100 tasks (configurable)
- **TTL**: 1 hour (configurable)
- **Eviction**: LRU (Least Recently Used)

### Response Times

- **AI Generation**: 2-3 seconds average
- **Cache Hit**: <100ms
- **Fallback**: <50ms

## Monitoring and Logging

### Log Levels

- **INFO**: Successful AI generations
- **WARNING**: API failures, fallbacks
- **ERROR**: Critical failures, configuration issues

### Metrics to Monitor

- AI generation success rate
- Cache hit ratio
- API response times
- Rate limit usage
- Error rates by type

## Testing

### Unit Tests

```bash
# Run AI service tests
python -m pytest tests/test_ai.py -v
```

### Test Coverage

- Rate limiter functionality
- Cache operations
- Prompt building
- Error handling
- Fallback mechanisms

### Mock Testing

The tests include comprehensive mocking for:
- Gemini API responses
- Rate limiting scenarios
- Error conditions
- Cache behavior

## Security Considerations

### API Key Management

- Store API keys in environment variables
- Never commit keys to version control
- Use different keys for development/production

### Content Safety

- Gemini safety settings configured
- Harmful content filtering enabled
- Cultural sensitivity in prompts

### Rate Limiting

- Prevents API abuse
- Protects against quota exhaustion
- Configurable limits per environment

## Future Enhancements

### Planned Features

1. **Multi-Model Support**
   - Support for different Gemini models
   - Model selection based on task type
   - A/B testing capabilities

2. **Advanced Prompting**
   - Dynamic prompt templates
   - User feedback integration
   - Continuous prompt improvement

3. **Analytics Integration**
   - Task completion tracking
   - User engagement metrics
   - AI performance monitoring

4. **Personalization**
   - User preference learning
   - Task difficulty adaptation
   - Cultural customization

## Troubleshooting

### Common Issues

1. **API Key Not Configured**
   ```
   WARNING: Gemini API key not configured - AI features will be disabled
   ```
   - Solution: Set `GEMINI_API_KEY` environment variable

2. **Rate Limit Exceeded**
   ```
   RateLimitError: AI API rate limit exceeded
   ```
   - Solution: Wait for rate limit reset or increase limits

3. **Empty Responses**
   ```
   AIGenerationError: Empty response from Gemini API
   ```
   - Solution: Check API key validity and network connectivity

### Debug Mode

Enable debug logging for detailed AI service information:

```python
import logging
logging.getLogger('services.ai').setLevel(logging.DEBUG)
```

## Support

For issues with AI integration:

1. Check the logs for error messages
2. Verify API key configuration
3. Test with fallback mode
4. Monitor rate limit usage
5. Contact the development team

## Contributing

When contributing to AI features:

1. Follow the existing code structure
2. Add comprehensive tests
3. Update documentation
4. Consider performance implications
5. Test fallback mechanisms 